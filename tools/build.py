#!/usr/bin/env python3
"""Bundle the start-up CSS and scripts for the public site.

index.html loads 10 stylesheets and 17 scripts one by one; on the hosted site each is a separate request.
This writes dist/index.html (same page) that loads one dist/css/app.css and one dist/js/app.js instead,
in the same order. Lazy views, map files, images and fonts are untouched and still load from the root.
Run from the repo root:  python3 tools/build.py
"""
import hashlib, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()

css = re.findall(r'^<link rel="stylesheet" href="(css/[^"]+)">\n', html, re.M)
js = re.findall(r'^<script src="((?:js|data)/[^"]+)"></script>\n', html, re.M)
if len(css) < 5 or len(js) < 10:
    sys.exit('unexpected index.html: %d css, %d js' % (len(css), len(js)))

# v7: a data file that is not there (yet) is left out with a warning instead of failing the build; the page works
# without it (each data file only adds records). A missing js/ or css/ file still stops the build.
missing = [f for f in css + js if not os.path.isfile(os.path.join(ROOT, f))]
for f in missing:
    if not f.startswith('data/'):
        sys.exit('missing start-up file: %s' % f)
    print('warning: %s is missing; the bundle goes without it' % f, file=sys.stderr)

def bundle(files, sep):
    out = []
    for f in files:
        if f in missing:
            continue
        src = open(os.path.join(ROOT, f), encoding='utf-8').read()
        out.append(sep % f + src.rstrip() + '\n')
    return ''.join(out)

os.makedirs(os.path.join(DIST, 'css'), exist_ok=True)
os.makedirs(os.path.join(DIST, 'js'), exist_ok=True)
# url() in the stylesheets only point at fonts.gstatic.com, so moving them into one file changes nothing.
open(os.path.join(DIST, 'css', 'app.css'), 'w', encoding='utf-8').write(bundle(css, '/* ---- %s ---- */\n'))
# each script ends its own statements; ';' guards against a file ending in an expression.
app_js = bundle(js, ';\n/* ---- %s ---- */\n')
open(os.path.join(DIST, 'js', 'app.js'), 'w', encoding='utf-8').write(app_js)

# v8: minify the script bundle when terser can be found (node + the terser package, resolved through NODE_PATH or a
# node_modules next to tools/). Without it the bundle ships as written: same behaviour, ~1.5 MB instead of ~0.9 MB.
# Only local names are mangled (toplevel off): every file is an IIFE on window.SM, nothing reads function names.
def minify_js(path):
    import subprocess, shutil
    node = shutil.which('node')
    if not node:
        print('note: node not found; dist/js/app.js is not minified', file=sys.stderr); return False
    env = dict(os.environ)
    extra = [os.path.join(ROOT, 'tools', 'node_modules'), '/opt/node-tools/node_modules']
    env['NODE_PATH'] = os.pathsep.join([p for p in [env.get('NODE_PATH', '')] + extra if p])
    script = (
        "const T=require('terser');const fs=require('fs');const src=fs.readFileSync(process.argv[1],'utf8');"
        "T.minify(src,{compress:{passes:1,keep_fargs:true},mangle:{toplevel:false},format:{comments:false,ascii_only:false}})"
        ".then(r=>{if(!r.code)throw new Error('empty');fs.writeFileSync(process.argv[1],r.code);console.log('minified',src.length,'->',r.code.length);})"
        ".catch(e=>{console.error(String(e));process.exit(2);});")
    try:
        r = subprocess.run([node, '-e', script, path], env=env, capture_output=True, text=True, timeout=300)
    except Exception as e:
        print('note: minify skipped (%s)' % e, file=sys.stderr); return False
    if r.returncode != 0:
        print('note: terser not available or failed (%s); dist/js/app.js is not minified' % r.stderr.strip().splitlines()[-1:] , file=sys.stderr); return False
    print(r.stdout.strip()); return True
if os.environ.get('SM_NO_MINIFY') != '1':
    minify_js(os.path.join(DIST, 'js', 'app.js'))

# Build id: a hash of every file the app can load. index.html's head gate exposes it as window.__smV and every
# lazy file is requested as file?v=<id>; the bundles get the same query. The host caches files for a year, so a
# new id is what makes returning phones fetch this release instead of mixing it with the last one.
h = hashlib.sha1()
for top in ('index.html', 'js', 'css', 'data', 'assets'):
    base = os.path.join(ROOT, top)
    paths = [base] if os.path.isfile(base) else sorted(os.path.join(d, f) for d, _, fs in os.walk(base) for f in fs)
    for path in paths:
        h.update(os.path.relpath(path, ROOT).encode()); h.update(open(path, 'rb').read())
BUILD = h.hexdigest()[:10]

lines_css = ''.join('<link rel="stylesheet" href="%s">\n' % f for f in css)
lines_js = ''.join('<script src="%s"></script>\n' % f for f in js)
out = html.replace(lines_css, '<link rel="stylesheet" href="css/app.css?v=%s">\n' % BUILD, 1)
# scripts are not contiguous (a comment sits before boot.js), so swap them one by one: first -> bundle, rest -> gone
first = True
for f in js:
    tag = '<script src="%s"></script>\n' % f
    out = out.replace(tag, '<script src="js/app.js?v=%s"></script>\n' % BUILD if first else '', 1)
    first = False
# start fetching the script bundle together with the stylesheet instead of after it
out = out.replace('</head>', '<link rel="preload" as="script" href="js/app.js?v=%s">\n</head>' % BUILD, 1)
out, n = re.subn(r"(w\.__smV = ')([^']+)(')", lambda m: m.group(1) + m.group(2).split('+')[0] + '+' + BUILD + m.group(3), out, count=1)
if n != 1:
    sys.exit('build id stamp failed')
if out.count('<link rel="stylesheet"') != 1 or out.count('<script src=') != 1:
    sys.exit('replacement failed')
open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8').write(out)
print('css %d files, js %d files -> dist/ (build %s)' % (len(css), len(js) - len(missing), BUILD))
