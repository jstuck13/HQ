# -*- coding: utf-8 -*-
# Drive each page the way a person does — type into the forms, submit them, tick things, open the panels — and
# report what the documents did. A static screenshot cannot see any of this.
#
#   python .impeccable/review/flowrun.py today,list
#
# The dbg-<page>.html copy is rebuilt from the live page on every run, keeping only its seed shim. The alignment
# probe spent days measuring stale copies and reporting faults that were already fixed; this cannot.
import os, re, sys, subprocess
sys.stdout.reconfigure(encoding='utf-8', errors='replace')   # the arrows and quotes in a report are not worth a crash
os.chdir(r'C:\Users\jpstu\dev\hq')
R = 'test/browser'
CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
PAGES = sys.argv[1].split(',')
flows = open(f'{R}/flows.js', encoding='utf-8').read()
width = sys.argv[2] if len(sys.argv) > 2 else '1440'

def fresh(p):
    f = f'{R}/dbg-{p}.html'
    old = open(f, encoding='utf-8').read()
    m = re.search(r'<script>\s*const _D=Date.*?</script>\n?', old, re.S)
    if not m:
        raise SystemExit(f'{p}: no seed shim in dbg-{p}.html')
    shim = m.group(0)
    s = (open(p + '.html', encoding='utf-8').read()
         .replace('<meta charset="utf-8">', '<meta charset="utf-8"><base href="/">')
         .replace('<script src="clock.js"></script>', shim + '<script src="clock.js"></script>'))
    if shim not in s:
        raise SystemExit(f'{p}: the seed shim no longer attaches — rebuild dbg-{p}.html by hand')
    open(f, 'w', encoding='utf-8', newline='\n').write(s)
    return s

fail = 0
for p in PAGES:
    src = fresh(p)
    out = f'{R}/fl-{p}.html'
    # the errors are caught before anything else loads, so a throw during the page's own setup is seen too
    catch = '<script>window.__errs=[];addEventListener("error",e=>__errs.push("error: "+e.message));addEventListener("unhandledrejection",e=>__errs.push("rejection: "+((e.reason&&e.reason.message)||e.reason)));</script>'
    body = src.replace('<base href="/">', '<base href="/">' + catch).replace('</body>', f'<script>{flows}</script></body>')
    open(out, 'w', encoding='utf-8', newline='\n').write(body)
    r = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-prefers-reduced-motion',
                        f'--window-size={width},1800', '--virtual-time-budget=20000', '--dump-dom',
                        f'http://localhost:8766/{out}'], capture_output=True, timeout=300)
    m = re.search(r'<title>(.*?)</title>', r.stdout.decode('utf-8', 'ignore'), re.S)
    said = (m.group(1) if m else '(no title: the page never finished)').strip()
    bad = re.search(r'NOT SAVED|THREW|ERRS|STUCK|undefined|NaN|\[object|Invalid Date|SPILL|SIDEWAYS', said)
    if bad: fail += 1
    print(f'=== {p} @ {width}')
    for line in said.split(' | '):
        mark = '  !' if re.search(r'NOT SAVED|THREW|ERRS|STUCK|undefined|NaN|\[object|Invalid Date|SPILL|SIDEWAYS', line) else '   '
        print(f'{mark} {line}')
print(f'\n{fail} of {len(PAGES)} pages with something to look at')
