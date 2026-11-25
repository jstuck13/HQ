# -*- coding: utf-8 -*-
import os, re, sys, subprocess
os.chdir(r'C:\Users\jpstu\dev\hq')
R = 'test/browser'
CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
PAGES = sys.argv[1].split(',')
probe = open(f'{R}/align-probe.js', encoding='utf-8').read()
width = sys.argv[2] if len(sys.argv) > 2 else '1440'
# The dbg-<page>.html copies exist only to carry a seed shim, and for days this probe measured them while the
# real pages moved on underneath — which is how the report came to say "7 to look at" every single run, naming
# faults that had already been fixed and missing ones that had not. The copy is now rebuilt from the live page
# on every run, keeping only the shim, so a stale measurement is no longer possible.
def fresh(p):
    f = f'{R}/dbg-{p}.html'
    try:
        old = open(f, encoding='utf-8').read()
        shim = re.search(r'<script>\s*const _D=Date.*?</script>\n?', old, re.S).group(0)
    except Exception:
        return open(f, encoding='utf-8').read()          # no shim to keep: take the copy as it stands
    s = (open(p + '.html', encoding='utf-8').read()
         .replace('<meta charset="utf-8">', '<meta charset="utf-8"><base href="/">')
         .replace('<script src="clock.js"></script>', shim + '<script src="clock.js"></script>'))
    if shim not in s:
        raise SystemExit(f'{p}: the seed shim no longer attaches — rebuild dbg-{p}.html by hand')
    open(f, 'w', encoding='utf-8', newline='\n').write(s)
    return s

for p in PAGES:
    src = fresh(p)
    out = f'{R}/al-{p}.html'
    open(out, 'w', encoding='utf-8', newline='\n').write(src.replace('</body>', f'<script>{probe}</script></body>'))
    r = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-prefers-reduced-motion',
                        f'--window-size={width},1800', '--virtual-time-budget=9000', '--dump-dom',
                        f'http://localhost:8766/{out}'], capture_output=True, timeout=240)
    m = re.search(r'<title>(.*?)</title>', r.stdout.decode('utf-8', 'ignore'), re.S)
    t = m.group(1) if m else '(no title)'
    print(f'=== {p}')
    for line in t.replace('ALIGN ', '').split(' || '):
        print('   ', line.strip())
