# -*- coding: utf-8 -*-
# every quotation on a Study card, checked word for word against the source text
import json, re, os, glob, sys
os.chdir(r'C:\Users\jpstu\dev\hq')
SP = os.path.dirname(sorted(glob.glob(r'C:\Users\jpstu\AppData\Local\Temp\claude\C--Users-jpstu-dev\*\scratchpad\ench-secs.json'))[0])
def clean(s):                                      # words only: the editions' inline section numbers are not part of the text
    s = re.sub(r'[^a-z0-9]+', ' ', s.lower())
    return re.sub(r' +', ' ', re.sub(r'\b\d+\b', ' ', s)).strip()
def src(f):                                        # join words broken across a line, drop the editions' footnote marks
    t = open(os.path.join(SP, f), encoding='utf-8').read()
    t = re.sub(r'-\s*\n', '', t)
    t = re.sub(r'\[\s*(?:[A-Z]|\d+)\s*\]', ' ', t)
    return clean(t)
pool = {
  'Enchiridion': src('enchiridion.txt'),
  'Meditations': src('gb-15877.txt'),
  'Letters':     src('seneca-letters.txt'),
}
def sources(src):
    return [v for k, v in pool.items() if k in src]

bad = unchecked = 0
for path in ('stoics',):
    for c in json.load(open(f'paths/{path}.json', encoding='utf-8'))['cards']:
        pools = sources(c['source'])
        if not pools:
            unchecked += 1; print('  -- %s not checkable: %s' % (c['id'], c['source'])); continue
        miss = []
        for chunk in re.split(r'\s*(?:\.\.\.|\u2026)\s*|\n\n', c['text']):
            chunk = re.sub(r'^(Epictetus|Seneca|Marcus):\s*', '', chunk.strip())
            if not chunk: continue
            w = clean(chunk).split()
            for i in range(0, max(1, len(w) - 7), 4):
                seg = ' '.join(w[i:i + 8])
                if not any(seg in p for p in pools): miss.append(seg)
        if miss:
            bad += 1; print('  !! %s (%s): %s' % (c['id'], c['source'][:44], ' | '.join(miss[:2])))
print('cards not verbatim: %d; cards with no source text on hand: %d' % (bad, unchecked))
sys.exit(1 if bad else 0)
