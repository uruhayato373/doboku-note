#!/usr/bin/env node
/**
 * audit-reference-book-coverage.mjs — 参考文献（書籍 bundle）の章・節が、サイトのどこで扱われているかの候補表。
 *
 * 【この script がやること = 機械層のみ】
 *   - 書籍の文字起こし（content/sources/books/<dir>/ocr/*.md・Drive から手元へ複製したもの）を H2/H3 の節に分ける
 *   - 過去問の節（〔正解〕・問題N が並ぶ）は本文の網羅から外し、件数だけ別に出す（過去問は年度×問題番号で数える）
 *   - 節ごとに名詞の連なり（kuromoji）を用語として取り、書籍内の希少さ（idf）で重み付けした上位語を決める
 *   - サイト側の記事を H2/H3 の節に分け、上位語の重みのうち何割がその節に現れるかを測る
 *   - 暫定ヒント statusHint（covered / partial / gap）を付ける。**確定判定ではない**
 *
 * 【やらないこと = Evaluator 層】
 *   - 意味として扱えているかの判定、展開する・しないの決定、優先度
 *
 * サイト側の対象は、記事 frontmatter の sources にこの書籍を書いている記事の資格ディレクトリ（content/site/<dir>/）全体。
 * 書籍を参照していない記事も、同じ資格の中なら「扱っている」と数える（書籍ごとに記事を分けて書いていないため）。
 *
 * Usage:
 *   node scripts/audit-reference-book-coverage.mjs --source-id concrete-basics-5th
 *   node scripts/audit-reference-book-coverage.mjs --shelf コンクリート        # 棚の全書籍
 *   node scripts/audit-reference-book-coverage.mjs --source-id X --site-dir civil-practice   # 対象の資格を足す
 * 出力: .claude/state/book-coverage/<source-id>.json（決定的・generatedAt は --stamp のときだけ。市販書籍の見出し・用語を含むので git 管理外）
 * quality-audit には登録しない: 文字起こしが Drive 由来の手元複製で CI に無く、読むのは書籍→サイト展開の着手時だけ（定期に読む人がいない）。
 * exit 0 = 出力した / 1 = 検査不成立（文字起こしが手元に無い・節が 0・サイトの記事が 0）/ 2 = 引数・依存の不足
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import matter from 'gray-matter';
import { bookRepoRoot } from './lib/reference-book-bundle.mjs';
import { loadReferenceSources } from './lib/reference-sources.mjs';
import { REPO_ROOT, SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const require = createRequire(import.meta.url);
const NAME = 'audit-reference-book-coverage';
const args = process.argv.slice(2);
const val = (name) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : null; };
const vals = (name) => args.flatMap((a, i) => (a === name && args[i + 1] ? [args[i + 1]] : []));
const SOURCE_IDS = vals('--source-id');
const SHELF = val('--shelf');
const EXTRA_SITE_DIRS = vals('--site-dir');
const STAMP = val('--stamp');
const OUT_DIR = path.join(REPO_ROOT, '.claude/state/book-coverage');
const TOP_TERMS = 12;
const MIN_UNIT_CHARS = 150;
const COVERED = 0.55;
const PARTIAL = 0.3;

const die = (msg, code = 1) => { console.error(`[${NAME}] ✗ ${msg}`); process.exit(code); };

const refs = loadReferenceSources();
let targets = refs.sources.filter((s) => s.bookBundle && (SOURCE_IDS.includes(s.id) || (SHELF && s.shelf === SHELF)));
if (!SOURCE_IDS.length && !SHELF) die('--source-id か --shelf が必要', 2);
const unknown = SOURCE_IDS.filter((id) => !targets.some((s) => s.id === id));
if (unknown.length) die(`bookBundle を持つ参考文献に無い: ${unknown.join(', ')}`, 2);

let kuromoji;
try { kuromoji = require('kuromoji'); } catch { die('kuromoji が無い（npm ci）。検査不成立', 2); }
const tokenizer = await new Promise((resolve, reject) => {
  kuromoji.builder({ dicPath: path.join(path.dirname(require.resolve('kuromoji/package.json')), 'dict') })
    .build((err, t) => (err ? reject(err) : resolve(t)));
});

/** 図表番号・節番号・装飾など、論点でない文字列を落とす（落とさないと「図-1.19」「-5-3」が希少語として上位に来る）。 */
const cleanForTerms = (text) => text
  .replace(/<[^>\n]*>/g, ' ')
  .replace(/\*\*|__|`/g, '')
  .replace(/[（(]?(?:図|表|写真|式)\s*[-ー－]?\s*[0-9０-９]+(?:[.．・-][0-9０-９]+)*[）)]?/g, ' ')
  .replace(/[（(]?[0-9０-９]+(?:[-－][0-9０-９]+)+[）)]?/g, ' ')
  .replace(/[❶-❿①-⑳㋐-㋾]/g, ' ');

/** 名詞の連なりを1語にまとめた用語の出現回数。数・代名詞・非自立・接尾の単独、数字や記号を含む語は捨てる。 */
function termsOf(text) {
  text = cleanForTerms(text);
  const counts = new Map();
  let run = [];
  const flush = () => {
    const w = run.join('');
    if (w.length >= 2 && !/[0-9０-９.,%％＠@#*\-－—―~～|｜<>＜＞=＝/／\\()（）\[\]［］{}「」『』]/.test(w)) counts.set(w, (counts.get(w) || 0) + 1);
    run = [];
  };
  for (const tok of tokenizer.tokenize(text)) {
    const ok = tok.pos === '名詞' && !['数', '代名詞', '非自立'].includes(tok.pos_detail_1)
      && !(tok.pos_detail_1 === '接尾' && run.length === 0);
    if (ok || (tok.pos === '名詞' && tok.pos_detail_1 === '数' && run.length)) run.push(tok.surface_form);
    else flush();
  }
  flush();
  return counts;
}

const stripMdx = (s) => s
  .replace(/^import .*$/gm, '')
  .replace(/<[^>\n]+>/g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/\$\$?[^$]*\$\$?/g, ' ');

/** H2/H3 で節に分ける。見出しの無い冒頭は直前の見出し（無ければ "(冒頭)"）に入れる。 */
function splitSections(text) {
  const out = [];
  let cur = { heading: '(冒頭)', level: 2, lines: [], page: null };
  let lastPage = null;
  for (const line of text.split('\n')) {
    const pm = /<!--\s*(p\d{4})/.exec(line);
    if (pm) { lastPage = pm[1]; if (!cur.page) cur.page = lastPage; continue; }
    const hm = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (hm) {
      out.push(cur);
      cur = { heading: hm[2].replace(/\*\*/g, ''), level: hm[1].length, lines: [], page: lastPage };
      continue;
    }
    cur.lines.push(line);
  }
  out.push(cur);
  return out.map((s) => ({ ...s, body: s.lines.join('\n').trim() })).filter((s) => s.body.length || s.heading !== '(冒頭)');
}

const isExamUnit = (heading, body) => /〔正解|【正解|正解\s*[（(]\d/.test(body)
  || (body.match(/問題\s*\d+/g) || []).length >= 2
  || /〔問題\s*\d+〕/.test(body)
  || /^(平成|令和)\S*年度?\s*問題/.test(heading);

function loadBookUnits(source) {
  const dir = path.join(REPO_ROOT, bookRepoRoot(source), 'ocr');
  const pull = `npm run drive-vault-sync -- --pull --path '${path.relative(REPO_ROOT, dir)}/' で Drive から取得`;
  if (!fs.existsSync(dir)) return { error: `${dir} が無い（${pull}）` };
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md').sort();
  if (!files.length) return { error: `${dir} に文字起こしが無い（${pull}）` };
  const units = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const body = raw.startsWith('---') ? matter(raw).content : raw;
    for (const s of splitSections(body.replace(/^# .*$/m, ''))) {
      units.push({ file: f, heading: s.heading, level: s.level, page: s.page, body: s.body });
    }
  }
  return { units, files: files.length };
}

function sitePool(source) {
  const siteRoot = SITE_CONTENT_ROOT;
  const dirs = new Set(EXTRA_SITE_DIRS);
  const articles = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.mdx')) articles.push(p);
    }
  };
  walk(siteRoot);
  const parsed = [];
  for (const p of articles) {
    const rel = path.relative(siteRoot, p).split(path.sep).join('/');
    let fm;
    try { fm = matter(fs.readFileSync(p, 'utf8')); } catch { continue; }
    if (fm.data.published === false) continue;
    const ids = (Array.isArray(fm.data.sources) ? fm.data.sources : []).map((x) => String(x).split('#')[0].trim());
    if (ids.includes(source.id)) dirs.add(rel.split('/')[0]);
    parsed.push({ rel, fm });
  }
  const sections = [];
  const pool = parsed.filter((a) => dirs.has(a.rel.split('/')[0]));
  for (const a of pool) {
    const slug = a.rel.replace(/\/article\.mdx$|\.mdx$/, '');
    for (const s of splitSections(stripMdx(a.fm.content))) {
      sections.push({ article: slug, heading: s.heading, terms: termsOf(`${s.heading}\n${s.body}`) });
    }
  }
  return { dirs: [...dirs].sort(), articles: pool.length, sections };
}

const summary = [];
let failed = false;
for (const source of targets) {
  const book = loadBookUnits(source);
  if (book.error) { console.error(`[${NAME}] ✗ ${source.id}: ${book.error}（検査不成立）`); failed = true; continue; }
  const site = sitePool(source);
  if (!site.sections.length) { console.error(`[${NAME}] ✗ ${source.id}: サイト側の記事が 0（sources に宣言した記事が無い）`); failed = true; continue; }

  const units = book.units.map((u, i) => ({ ...u, id: `u${String(i + 1).padStart(4, '0')}`, chars: u.body.replace(/\s/g, '').length }));
  const textUnits = units.filter((u) => u.chars >= MIN_UNIT_CHARS && !isExamUnit(u.heading, u.body));
  const examUnits = units.filter((u) => u.chars >= MIN_UNIT_CHARS && isExamUnit(u.heading, u.body));
  const shortUnits = units.filter((u) => u.chars < MIN_UNIT_CHARS);
  if (!textUnits.length) { console.error(`[${NAME}] ✗ ${source.id}: 本文の節が 0（検査不成立）`); failed = true; continue; }

  const unitTerms = textUnits.map((u) => termsOf(`${u.heading}\n${u.heading}\n${u.body}`));
  const df = new Map();
  for (const t of unitTerms) for (const w of t.keys()) df.set(w, (df.get(w) || 0) + 1);
  const N = textUnits.length;
  const idf = (w) => Math.log((N + 1) / ((df.get(w) || 0) + 1)) + 1;

  const results = textUnits.map((u, i) => {
    const top = [...unitTerms[i].entries()]
      .map(([w, c]) => [w, (1 + Math.log(c)) * idf(w)])
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, TOP_TERMS);
    const total = top.reduce((s, [w]) => s + idf(w), 0) || 1;
    const scoreOf = (terms) => top.reduce((s, [w]) => s + (terms.has(w) ? idf(w) : 0), 0) / total;
    const bySection = site.sections.map((s) => ({ article: s.article, section: s.heading, score: scoreOf(s.terms) }))
      .sort((a, b) => b.score - a.score || a.article.localeCompare(b.article)).slice(0, 3);
    const articleTerms = new Map();
    for (const s of site.sections) {
      if (!articleTerms.has(s.article)) articleTerms.set(s.article, new Set());
      for (const w of s.terms.keys()) articleTerms.get(s.article).add(w);
    }
    const byArticle = [...articleTerms.entries()].map(([article, set]) => ({ article, score: scoreOf(set) }))
      .sort((a, b) => b.score - a.score || a.article.localeCompare(b.article)).slice(0, 2);
    const best = bySection[0]?.score ?? 0;
    return {
      id: u.id, file: u.file, page: u.page, heading: u.heading, chars: u.chars,
      topTerms: top.map(([w]) => w),
      bestSections: bySection.map((b) => ({ ...b, score: Math.round(b.score * 100) / 100 })),
      bestArticles: byArticle.map((b) => ({ ...b, score: Math.round(b.score * 100) / 100 })),
      statusHint: best >= COVERED ? 'covered' : best >= PARTIAL ? 'partial' : 'gap',
    };
  });

  const count = (k) => results.filter((r) => r.statusHint === k).length;
  const out = {
    sourceId: source.id, title: source.title, generatedAt: STAMP || null,
    thresholds: { covered: COVERED, partial: PARTIAL, topTerms: TOP_TERMS, minUnitChars: MIN_UNIT_CHARS },
    book: { ocrFiles: book.files, units: units.length, textUnits: textUnits.length, examUnits: examUnits.length, shortUnits: shortUnits.length },
    site: { dirs: site.dirs, articles: site.articles, sections: site.sections.length },
    counts: { covered: count('covered'), partial: count('partial'), gap: count('gap') },
    examUnits: examUnits.map((u) => ({ id: u.id, file: u.file, page: u.page, heading: u.heading, chars: u.chars })),
    units: results,
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${source.id}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
  summary.push(out);
  console.log(`[${NAME}] ${source.id}: 節 ${units.length}（本文 ${textUnits.length} を実検査・過去問 ${examUnits.length}・${MIN_UNIT_CHARS}字未満 ${shortUnits.length} は対象外）`
    + ` / サイト ${site.dirs.join('+')} の記事 ${site.articles}・節 ${site.sections.length}`
    + ` → covered ${out.counts.covered} / partial ${out.counts.partial} / gap ${out.counts.gap}（暫定ヒント）`
    + `\n  → ${path.relative(REPO_ROOT, outPath)}`);
}
if (failed) process.exit(1);
if (!summary.length) die('対象の書籍が 0（検査不成立）');
