// Canvas → School. Courses become course tiles; planner items (assignments, quizzes, discussions) become due items.
// Needs CANVAS_URL (https://yourschool.instructure.com) and CANVAS_TOKEN (Account → Settings → New Access Token).
import { syncRoute, fetchAll } from './_run.js';

const iso = d => d.toISOString().slice(0, 10);

export default syncRoute('canvas', async ({ getDoc, putDoc }) => {
  const base = (process.env.CANVAS_URL || process.env.CANVAS_LINK || '').trim().replace(/\/$/, ''), token = (process.env.CANVAS_TOKEN || '').trim();
  if (!base || !token) throw new Error('CANVAS_URL (or CANVAS_LINK) and CANVAS_TOKEN are not set');
  if (!/^https?:\/\//.test(base)) throw new Error('CANVAS_URL should start with https://');
  const headers = { Authorization: `Bearer ${token}` };

  const courses = await fetchAll(`${base}/api/v1/courses?enrollment_state=active&include[]=total_scores&per_page=50`, headers);
  const from = new Date(); from.setDate(from.getDate() - 14);
  const to = new Date(); to.setDate(to.getDate() + 90);
  const items = await fetchAll(`${base}/api/v1/planner/items?start_date=${iso(from)}&end_date=${iso(to)}&per_page=100`, headers);

  const school = (await getDoc('school')) || { courses: [], items: [], sessions: [] };
  school.courses ??= []; school.items ??= []; school.sessions ??= []; school.ignored ??= [];
  const byId = (arr, id) => arr.find(x => x.id === id);

  // The running mark is a snapshot that the next sync would overwrite, so a term's worth of them is kept
  // beside it: one entry a day, the last of the day winning, and the whole term is well under a kilobyte.
  const remember = (course, m) => {
    course.marks ??= [];
    const last = course.marks[course.marks.length - 1];
    if (last && last.d === m.at) { last.pct = m.pct; last.letter = m.letter; return; }
    if (last && last.pct === m.pct && last.letter === m.letter) return;   // an unchanged mark is not a new reading
    course.marks.push({ d: m.at, pct: m.pct, letter: m.letter });
    if (course.marks.length > 200) course.marks = course.marks.slice(-200);
  };

  // courses: keep confidence and hand-added links; refresh the name and the Canvas link
  let nc = 0;
  for (const c of courses) {
    if (!c.name) continue;
    const id = `canvas:${c.id}`, existing = byId(school.courses, id);
    if (school.ignored.includes(id)) continue;
    const canvasLink = { t: 'Canvas', u: `${base}/courses/${c.id}`, source: 'canvas' };
    const tidy = n => String(n).replace(/\s*\((?:Fall|Spring|Summer|Winter|Autumn)\s*\d{4}\)\s*$/i, '').trim();   // "MATH-2650-100 (Fall 2026)" → "MATH-2650-100"
    // Canvas reports the running mark on the student enrolment, and there are three answers here rather than
    // two: a score, an enrolment saying there is none, and no enrolment mentioned at all. The third arrives on
    // a perfectly good response and is not a teacher withdrawing a grade — so only the second clears a mark
    // that is already here. Treating silence as withdrawal threw away a mark Canvas simply had not repeated.
    const en = (c.enrollments || []).find(e => e.type === 'student' || e.computed_current_score != null);
    const mark = en && en.computed_current_score != null ? { pct: +en.computed_current_score, letter: en.computed_current_grade || undefined, at: new Date().toISOString().slice(0, 10) } : undefined;
    if (existing) { existing.name = tidy(c.course_code && c.name.length > 40 ? c.course_code : c.name); existing.links = [canvasLink, ...existing.links.filter(l => l.source !== 'canvas')];
      if (mark) { existing.mark = mark; remember(existing, mark); }
      else if (en) delete existing.mark; }                 // said out loud: there is no score on this course
    else { const fresh = { id, name: tidy(c.course_code && c.name.length > 40 ? c.course_code : c.name), conf: 3, links: [canvasLink], source: 'canvas', mark };
      if (mark) remember(fresh, mark);
      school.courses.push(fresh); nc++; }
  }

  // items: due date and title follow Canvas; "done" is Canvas-submitted OR ticked by hand (never un-ticks a hand tick)
  let ni = 0, nu = 0;
  for (const p of items) {
    const kind = p.plannable_type; if (!['assignment', 'quiz', 'discussion_topic'].includes(kind)) continue;
    const due = p.plannable_date || p.plannable?.due_at; if (!due) continue;
    const id = `canvas:${kind}:${p.plannable_id}`, title = p.plannable?.title || 'Untitled';
    if (school.ignored.includes(id)) continue;
    const type = kind === 'quiz' || /\b(exam|test|midterm|final)\b/i.test(title) ? 'test' : kind === 'discussion_topic' ? 'reading' : 'assignment';
    const submitted = !!(p.submissions && (p.submissions.submitted || p.submissions.graded));
    const existing = byId(school.items, id);
    const pts = p.plannable && p.plannable.points_possible != null ? +p.plannable.points_possible : undefined;
    const record = { id, course: `canvas:${p.course_id}`, title, type, due: iso(new Date(due)), source: 'canvas', url: p.html_url ? `${base}${p.html_url}` : undefined, pts };
    if (existing) { Object.assign(existing, record, { done: existing.done || submitted }); nu++; }
    else { school.items.push({ ...record, done: submitted }); ni++; }
  }
  // what each finished piece of work actually scored. The planner does not carry it, so the submissions are asked
  // for course by course — only for courses that have items here, and only the graded ones are kept.
  let scored = 0, noturn = 0, noGrades;
  const mine = new Set(school.items.filter(i => i.source === 'canvas').map(i => i.course));
  for (const c of courses) {
    if (!mine.has(`canvas:${c.id}`)) continue;
    let subs = [];
    // include the assignment so a quiz or discussion can be matched by name: the planner numbers those by quiz or
    // topic id, which is not the assignment id a submission carries, so the id alone only ever matches an assignment.
    try { subs = await fetchAll(`${base}/api/v1/courses/${c.id}/students/submissions?student_ids[]=self&include[]=assignment&per_page=100`, headers); }
    catch (e) { noGrades = `${noGrades ? noGrades + '; ' : ''}${c.name}: ${String(e.message || e).slice(0, 60)}`; continue; }
    for (const s of subs) {
      const a = s.assignment, name = a && a.name;
      const it = school.items.find(i => i.id === `canvas:assignment:${s.assignment_id}`)
              || (name && school.items.find(i => i.course === `canvas:${c.id}` && i.source === 'canvas' && i.title === name));
      if (!it) continue;
      // Canvas says how a piece of work is handed in. "none" and "on_paper" mean nothing goes through Canvas —
      // a quiz sat in the lab, attendance, a paper given to the teacher — so the due date is when a mark is
      // entered, not when anything is owed. A choice made by hand on the School page is never overwritten.
      if (a && Array.isArray(a.submission_types) && !it.byHand) {
        if (a.submission_types.every(t => t === 'none' || t === 'on_paper')) { if (!it.noturn) { it.noturn = true; noturn++; } }
        else delete it.noturn;
      }
      if (s.score == null || s.workflow_state !== 'graded') continue;
      it.score = +s.score; if (s.grade && isNaN(+s.grade)) it.grade = s.grade;
      if (it.pts == null && a && a.points_possible != null) it.pts = +a.points_possible;
      it.done = true; scored++;
    }
  }

  await putDoc('school', school);
  return { courses: courses.length, newCourses: nc, items: items.length, newItems: ni, updatedItems: nu, scored, noturn: noturn || undefined, noGrades,
           marks: school.courses.filter(c => c.mark).map(c => `${c.name} ${Math.round(c.mark.pct)}%`).join(', ') || undefined };
});
