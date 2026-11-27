# -*- coding: utf-8 -*-
# A debug pass: rebuild every test copy from the current sources, then on each page
#   1. trap errors and unhandled rejections while it loads and renders
#   2. click every state-changing control and measure what moved
#   3. screenshot desktop and phone
import os, re, sys, subprocess, json

os.chdir(r'C:\Users\jpstu\dev\hq')
R = 'test/browser'
CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
PAGES = ['today', 'calendar', 'finances', 'library', 'school', 'health', 'review', 'groceries', 'investments', 'study']
only = sys.argv[1].split(',') if len(sys.argv) > 1 else PAGES

ERR_TRAP = """<script>
window.__errs=[];
addEventListener('error',e=>window.__errs.push('error: '+(e.message||e.type)+(e.filename?' @'+e.filename.split('/').pop()+':'+e.lineno:'')));
addEventListener('unhandledrejection',e=>window.__errs.push('rejection: '+((e.reason&&e.reason.message)||e.reason)));
const _e=console.error; console.error=(...a)=>{window.__errs.push('console: '+String(a[0]).slice(0,120)); _e(...a);};
</script>"""

REPORT = """<script>window.addEventListener('load',()=>setTimeout(()=>{
  const counts={}; document.querySelectorAll('li,h2,h3,button,input').forEach(el=>{counts[el.tagName]=(counts[el.tagName]||0)+1;});
  const empties=[...document.querySelectorAll('.empty')].length;
  const overflow=document.documentElement.scrollWidth>document.documentElement.clientWidth+1;
  document.title='ERRS['+(window.__errs.join(' ~ ')||'none')+'] li:'+(counts.LI||0)+' btn:'+(counts.BUTTON||0)+' empty:'+empties+' xOverflow:'+overflow;
},2600));</script>"""

# The dbg-<page>.html copy exists only to carry a seed shim. alignrun and flowrun were taught to rebuild it
# from the live page on every run after the alignment probe spent days measuring week-old markup; this one was
# not, so the click sweep went on loading whatever the last run happened to leave behind. It rebuilds too now.
def seedFor(page):
    """The frozen clock and seeded documents a page is probed against. A seed is an input, and is tracked; the
    dbg-<page>.html copy built from it is output, and is not — they used to be the same file, so every probe
    run left the repository dirty, which is the opposite of what tracking the harness was for."""
    for f in (f'{R}/seed/{page}.html', f'{R}/seed/_default.html'):
        if os.path.exists(f):
            return open(f, encoding='utf-8').read().strip()
    return None

def fresh(page):
    f = f'{R}/dbg-{page}.html'
    shim = seedFor(page)
    if shim is None:
        return open(f, encoding='utf-8').read()   # no seed of its own: take the copy as it stands
    s = (open(page + '.html', encoding='utf-8').read()
         .replace('<meta charset="utf-8">', '<meta charset="utf-8"><base href="/">')
         .replace('<script src="clock.js"></script>', shim + '<script src="clock.js"></script>'))
    if shim not in s:
        raise SystemExit(f'{page}: the seed shim no longer attaches - rebuild dbg-{page}.html by hand')
    open(f, 'w', encoding='utf-8', newline='\n').write(s)
    return s

def build(page, tail):
    src = fresh(page)
    out = f'{R}/dbg2-{page}.html'
    open(out, 'w', encoding='utf-8', newline='\n').write(src.replace('<script src="clock.js">', ERR_TRAP + '<script src="clock.js">').replace('</body>', tail + '</body>'))
    return out

def run(path, width=1440, height=1700, budget=14000, shot=None, reduced=True):
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars']
    if reduced: cmd.append('--force-prefers-reduced-motion')
    cmd += [f'--window-size={width},{height}', f'--virtual-time-budget={budget}']
    cmd += [f'--screenshot={shot}'] if shot else ['--dump-dom']
    cmd.append('http://localhost:8766/' + path)
    r = subprocess.run(cmd, capture_output=True, timeout=240)
    if shot: return ''
    m = re.search(r'<title>(.*?)</title>', r.stdout.decode('utf-8', 'ignore'), re.S)
    return m.group(1) if m else '(no title)'

# rebuild every copy from the live sources first
sub = subprocess.run([sys.executable, r'C:\Users\jpstu\AppData\Local\Temp\claude\C--Users-jpstu-dev\35b18e34-398e-493e-a68c-515926b2c7a2\scratchpad\rebuild.py', ','.join(only), 'dbg'], capture_output=True, timeout=1200)
print('rebuilt:', sub.returncode == 0)

probe = open(f'{R}/shift-probe.js', encoding='utf-8').read()
for p in only:
    print('\n=====', p)
    print('  load  ', run(build(p, REPORT))[:260])
    print('  shift ', run(build(p, '<script>' + probe + '</script>'), budget=20000)[:220])
    for w, h, tag in [(1440, 1800, 'd'), (500, 2600, 'p')]:
        run(f'{R}/dbg2-{p}.html'.replace(R + '/', R + '/'), w, h, 9000, shot=f'C:/Users/jpstu/dev/hq/{R}/dbg-{tag}-{p}.png')
    print('  shots  ', f'{R}/dbg-d-{p}.png', f'{R}/dbg-p-{p}.png')
