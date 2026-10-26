#!/usr/bin/env node
/* 巣立ちマップ — string-table check (SYSTEM, v7).
   node tools/strings-check.js [--json]
   Loads every js/*.js and js/views/*.js the way the app does (one shared SM.strings table; a later file's key
   REPLACES an earlier one — core.js SM.strings is a plain Object.assign), then reports:
     dup-in-file   a key written twice in one file (the first copy is silently lost: the {n}/{total} bug)
     collision     the same key defined by two files (the one loaded last wins, everywhere)
     missing       t('key') / SM.t('key') with a literal key that no table defines (the raw key would show)
     vars          a {placeholder} that one language has and another lacks, or a literal t('key', {…}) call that
                   does not pass a placeholder the string needs (it would be dropped)
     ja-english    a ja / jr string with Latin words and no Japanese at all (English leaking into Japanese)
     no-ja / no-en a table entry without its Japanese / English text
   Exit code 1 when anything but the informational sections is found. Nothing here touches the network. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const JSON_OUT = process.argv.includes('--json');

// load order: index.html's start-up scripts, then every lazy view (window.__smLazy order does not matter for
// collisions: any two files defining one key are reported)
function order() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const start = [...html.matchAll(/^<script src="((?:js|data)\/[^"]+)"><\/script>$/gm)].map(m => m[1]);
  const all = [];
  for (const dir of ['js', 'js/views']) {
    for (const f of fs.readdirSync(path.join(ROOT, dir)).sort()) if (f.endsWith('.js')) all.push(dir + '/' + f);
  }
  const rest = all.filter(f => !start.includes(f));
  return start.filter(f => f.startsWith('js/')).concat(rest);
}

// a universal stand-in for the DOM: any property, any call, any construction
function stub() {
  const f = function () { };
  return new Proxy(f, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => '';
      if (k === 'length') return 0;
      if (k === 'then') return undefined;
      return stub();
    },
    apply() { return stub(); },
    construct() { return stub(); },
    has() { return true; }
  });
}

const defs = {};      // key -> [{file, value}]
let current = null;
function makeCtx() {
  const SM = {
    data: { programs: [], areas: [], lessons: [], timeline: [] }, views: {}, acts: {}, ui: {},
    t: k => k, L: o => (o && o.ja) || '', lang: () => 'ja', esc: s => String(s), on() { }, icon: () => '',
    state: { answers: {}, settings: {}, saved: [], learned: [] }, isJunior: () => false, useJr: () => false
  };
  // core.js defines its own SM.strings: keep ours (a recorder), whatever a file assigns
  const rec = function (obj) { if (obj) for (const k of Object.keys(obj)) (defs[k] = defs[k] || []).push({ file: current, value: obj[k] }); };
  Object.defineProperty(SM, 'strings', { get: () => rec, set() { }, enumerable: true });
  const ctx = {
    SM, console: { log() { }, warn() { }, error() { }, info() { } }, document: stub(), navigator: stub(), location: stub(),
    history: stub(), localStorage: stub(), sessionStorage: stub(), matchMedia: () => ({ matches: false, addEventListener() { }, addListener() { } }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() { }, requestIdleCallback: () => 0, setTimeout: () => 0, clearTimeout() { },
    setInterval: () => 0, clearInterval() { }, performance: { now: () => 0 }, getComputedStyle: () => stub(), addEventListener() { },
    removeEventListener() { }, Element: function () { }, HTMLElement: function () { }, Node: function () { }, CSS: stub(),
    IntersectionObserver: function () { return stub(); }, ResizeObserver: function () { return stub(); },
    MutationObserver: function () { return stub(); }, innerWidth: 390, innerHeight: 844, devicePixelRatio: 2, screen: stub()
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  return vm.createContext(ctx);
}

// deliberate exceptions, each checked by hand: the language switch names English in English; the 中学生 line
// leaves the interest amount out on purpose
const ALLOW = { 'ja-english': ['set.lang'], vars: ['ln.c.never'] };

const files = order();
const ctx = makeCtx();
const loadErr = [];
const src = {};
for (const f of files) {
  current = f;
  src[f] = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try { vm.runInContext(src[f], ctx, { filename: f, timeout: 2000 }); }
  catch (e) { loadErr.push(f + ': ' + String(e && e.message).slice(0, 120)); }
}

const out = { dupInFile: [], collision: [], missing: [], vars: [], jaEnglish: [], noJa: [], noEn: [], dynamic: [], loadErr };

// 1. the same key twice in one file's source (JS keeps only the last; the first is lost without a trace)
const KEY_RE = /(?:^|[{,(])\s*'([a-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_\-]+)+)'\s*:/gm;
for (const f of files) {
  const seen = {};
  let m;
  KEY_RE.lastIndex = 0;
  while ((m = KEY_RE.exec(src[f]))) {
    const line = src[f].slice(0, m.index).split('\n').length;
    (seen[m[1]] = seen[m[1]] || []).push(line);
  }
  for (const k of Object.keys(seen)) if (seen[k].length > 1) out.dupInFile.push(f + '  ' + k + '  (lines ' + seen[k].join(', ') + ')');
}

// 2. one key, two files
for (const k of Object.keys(defs)) {
  const fs2 = [...new Set(defs[k].map(d => d.file))];
  if (fs2.length > 1) out.collision.push(k + '  ' + fs2.join(' + ') + '  (last wins: ' + defs[k][defs[k].length - 1].file + ')');
}

// 3. entries: placeholders per language, English leaking into Japanese, missing languages
const PH = /\{(\w+)\}/g;
function phs(s) { return typeof s === 'string' ? [...s.matchAll(PH)].map(m => m[1]).sort() : []; }
function hasJa(s) { return /[぀-ヿ㐀-鿿]/.test(s); }
const final = {};
for (const k of Object.keys(defs)) final[k] = defs[k][defs[k].length - 1];
for (const k of Object.keys(final)) {
  const { file, value: e } = final[k];
  if (typeof e === 'string') continue;
  if (!e || typeof e !== 'object') continue;
  const langs = ['ja', 'jr', 'en'].filter(l => typeof e[l] === 'string');
  if (typeof e.ja !== 'string') out.noJa.push(k + '  ' + file);
  if (typeof e.en !== 'string' && e.ja) out.noEn.push(k + '  ' + file);
  const sets = langs.map(l => [l, phs(e[l]).join(',')]);
  // an empty string is a deliberate "say nothing here" and carries no placeholders
  const filled = sets.filter(([l]) => e[l] !== '');
  if (new Set(filled.map(s => s[1])).size > 1 && !ALLOW.vars.includes(k)) out.vars.push(k + '  ' + filled.map(s => s[0] + ':{' + s[1] + '}').join(' ') + '  ' + file);
  for (const l of ['ja', 'jr']) {
    const s = e[l];
    if (typeof s === 'string' && s.trim() && !hasJa(s) && !ALLOW['ja-english'].includes(k) && /[A-Za-z]{3,}/.test(s.replace(/\{\w+\}/g, '').replace(/<[^>]+>/g, '').replace(/LINE|SNS|SOS|URL|NPO|PDF|Esc|OK|Economix JP|Google|ID/g, ''))) out.jaEnglish.push(k + '.' + l + '  ' + JSON.stringify(s) + '  ' + file);
  }
}

// 4. literal keys used but never defined; literal calls missing a placeholder
const USE_RE = /(?:\bSM\.t|(?<![\w.])t|\btt|\bT)\(\s*'([a-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_\-]+)+)'\s*(\)|,)/g;
const DYN_RE = /(?:\bSM\.t|(?<![\w.])t)\(\s*'([a-z][A-Za-z0-9_.\-]*\.)'\s*\+/g;
for (const f of files) {
  let m;
  USE_RE.lastIndex = 0;
  while ((m = USE_RE.exec(src[f]))) {
    const k = m[1];
    const line = src[f].slice(0, m.index).split('\n').length;
    if (!final[k]) { out.missing.push(f + ':' + line + '  ' + k); continue; }
    const e = final[k].value;
    const need = new Set([].concat(...['ja', 'jr', 'en'].map(l => phs(typeof e === 'string' ? e : e && e[l]))));
    if (!need.size) continue;
    if (m[2] === ')') { out.vars.push(f + ':' + line + '  t(\'' + k + '\') without vars, needs {' + [...need].join(',') + '}'); continue; }
    // the object literal right after the comma (best effort: one level of braces)
    const rest = src[f].slice(USE_RE.lastIndex, USE_RE.lastIndex + 400);
    const om = rest.match(/^\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/);
    if (!om) continue;   // a variable: cannot tell
    const given = new Set([...om[1].matchAll(/(?:^|,)\s*['"]?(\w+)['"]?\s*:/g)].map(x => x[1]));
    const lack = [...need].filter(n => !given.has(n));
    if (lack.length) out.vars.push(f + ':' + line + '  t(\'' + k + '\', {' + [...given].join(',') + '}) lacks {' + lack.join(',') + '}');
  }
  DYN_RE.lastIndex = 0;
  while ((m = DYN_RE.exec(src[f]))) {
    const pre = m[1];
    const n = Object.keys(final).filter(k => k.startsWith(pre)).length;
    const line = src[f].slice(0, m.index).split('\n').length;
    out.dynamic.push(f + ':' + line + '  ' + pre + '*  (' + n + ' keys)');
  }
}

if (JSON_OUT) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
const titles = {
  loadErr: 'files that threw while loading (their later tables may be missing from this check)',
  dupInFile: 'same key twice in one file (first copy lost)', collision: 'same key in two files (last loaded wins)',
  missing: 't(\'…\') keys that no table defines (the raw key would show)', vars: 'placeholder mismatches',
  jaEnglish: 'ja / jr strings that look English', noJa: 'entries without ja', noEn: 'entries without en',
  dynamic: 'dynamic keys (informational: check the prefix has every key the code builds)'
};
let bad = 0;
console.log('string tables: ' + Object.keys(final).length + ' keys from ' + files.length + ' files');
for (const k of Object.keys(titles)) {
  const list = out[k];
  console.log('\n## ' + titles[k] + ': ' + list.length);
  list.forEach(x => console.log('  ' + x));
  if (k !== 'dynamic' && k !== 'loadErr') bad += list.length;
}
process.exit(bad ? 1 : 0);
