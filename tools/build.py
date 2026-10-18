#!/usr/bin/env python3
"""Bundle the start-up CSS and scripts for the public site.

index.html loads 9 stylesheets and 15 scripts one by one; on the hosted site each is a separate request.
This writes dist/index.html (same page) that loads one dist/css/app.css and one dist/js/app.js instead,
in the same order. Lazy views, map files, images and fonts are untouched and still load from the root.
Run from the repo root:  python3 tools/build.py
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()

css = re.findall(r'^<link rel="stylesheet" href="(css/[^"]+)">\n', html, re.M)
js = re.findall(r'^<script src="((?:js|data)/[^"]+)"></script>\n', html, re.M)
if len(css) < 5 or len(js) < 10:
    sys.exit('unexpected index.html: %d css, %d js' % (len(css), len(js)))

def bundle(files, sep):
    out = []
    for f in files:
        src = open(os.path.join(ROOT, f), encoding='utf-8').read()
        out.append(sep % f + src.rstrip() + '\n')
    return ''.join(out)

os.makedirs(os.path.join(DIST, 'css'), exist_ok=True)
os.makedirs(os.path.join(DIST, 'js'), exist_ok=True)
# url() in the stylesheets only point at fonts.gstatic.com, so moving them into one file changes nothing.
open(os.path.join(DIST, 'css', 'app.css'), 'w', encoding='utf-8').write(bundle(css, '/* ---- %s ---- */\n'))
# each script ends its own statements; ';' guards against a file ending in an expression.
open(os.path.join(DIST, 'js', 'app.js'), 'w', encoding='utf-8').write(bundle(js, ';\n/* ---- %s ---- */\n'))

lines_css = ''.join('<link rel="stylesheet" href="%s">\n' % f for f in css)
lines_js = ''.join('<script src="%s"></script>\n' % f for f in js)
out = html.replace(lines_css, '<link rel="stylesheet" href="css/app.css">\n', 1)
# scripts are not contiguous (a comment sits before boot.js), so swap them one by one: first -> bundle, rest -> gone
first = True
for f in js:
    tag = '<script src="%s"></script>\n' % f
    out = out.replace(tag, '<script src="js/app.js"></script>\n' if first else '', 1)
    first = False
# start fetching the script bundle together with the stylesheet instead of after it
out = out.replace('</head>', '<link rel="preload" as="script" href="js/app.js">\n</head>', 1)
if out.count('<link rel="stylesheet"') != 1 or out.count('<script src=') != 1:
    sys.exit('replacement failed')
open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8').write(out)
print('css %d files, js %d files -> dist/' % (len(css), len(js)))
