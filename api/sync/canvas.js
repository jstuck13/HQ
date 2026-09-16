// Canvas → School. Courses become course tiles; planner items (assignments, quizzes, discussions) become due items.
// Needs CANVAS_URL (https://yourschool.instructure.com) and CANVAS_TOKEN (Account → Settings → New Access Token).
import { syncRoute, fetchAll } from './_run.js';

const iso = d => d.toISOString().slice(0, 10);

export default syncRoute('canvas', async ({ getDoc, putDoc }) => {
  const base = (process.env.CANVAS_URL || process.env.CANVAS_LINK || '').trim().replace(/\/$/, ''), token = (process.env.CANVAS_TOKEN || '').trim();
  if (!base || !token) throw new Error('CANVAS_URL (or CANVAS_LINK) and CANVAS_TOKEN are not set');
  if (!/^https?:\/\//.test(base)) throw new Error('CANVAS_URL should start with https://');
  const headers = { Authorization: `Bearer ${token}` };

  const courses = await fetchAll(`${base}/api/v1/courses?enrollment_state=active&per_page=50`, headers);
  const from = new Date(); from.setDate(from.getDate() - 14);
  const to = new Date(); to.setDate(to.getDate() + 90);
  const items = await fetchAll(`${base}/api/v1/planner/items?start_date=${iso(from)}&end_date=${iso(to)}&per_page=100`, headers);

  const school = (await getDoc('school')) || { courses: [], items: [], sessions: [] };
  school.courses ??= []; school.items ??= []; school.sessions ??= []; school.ignored ??= [];
  const byId = (arr, id) => arr.find(x => x.id === id);

  // courses: keep confidence and hand-added links; refresh the name and the Canvas link
  let nc = 0;
  for (const c of courses) {
    if (!c.name) continue;
    const id = `canvas:${c.id}`, existing = byId(school.courses, id);
    if (school.ignored.includes(id)) continue;
    const canvasLink = { t: 'Canvas', u: `${base}/courses/${c.id}`, source: 'canvas' };
    const tidy = n => String(n).replace(/\s*\((?:Fall|Spring|Summer|Winter|Autumn)\s*\d{4}\)\s*$/i, '').trim();   // "MATH-2650-100 (Fall 2026)" → "MATH-2650-100"
    if (existing) { existing.name = tidy(c.course_code && c.name.length > 40 ? c.course_code : c.name); existing.links = [canvasLink, ...existing.links.filter(l => l.source !== 'canvas')]; }
    else { school.courses.push({ id, name: tidy(c.course_code && c.name.length > 40 ? c.course_code : c.name), conf: 3, links: [canvasLink], source: 'canvas' }); nc++; }
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
    const record = { id, course: `canvas:${p.course_id}`, title, type, due: iso(new Date(due)), source: 'canvas', url: p.html_url ? `${base}${p.html_url}` : undefined };
    if (existing) { Object.assign(existing, record, { done: existing.done || submitted }); nu++; }
    else { school.items.push({ ...record, done: submitted }); ni++; }
  }
  await putDoc('school', school);
  return { courses: courses.length, newCourses: nc, items: items.length, newItems: ni, updatedItems: nu };
});
