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
 * サイト側の対象は、config/reference-sources.json の bookBundle.coverageSiteDirs と、記事 frontmatter の sources にこの書籍を書いている記事の
 * 資格ディレクトリ（content/site/<dir>/）全体。
 * 書籍を参照していない記事も、同じ資格の中なら「扱っている」と数える（書籍ごとに記事を分けて書いていないため）。
 *
 * Usage:
 *   node scripts/audit-reference-book-coverage.mjs --source-id concrete-basics-5th
 *   node scripts/audit-reference-book-coverage.mjs --shelf コンクリート        # 棚の全書籍
 *   node scripts/audit-reference-book-coverage.mjs --source-id X --site-dir civil-practice   # 対象の資格を足す
 *   node scripts/audit-reference-book-coverage.mjs --summary [--source-id X]   # 要約だけ作り直す（kuromoji を読まない）
 *   node scripts/audit-reference-book-coverage.mjs --source-id X --rejudge     # 判定済みの書籍の候補表を作り直す（手元の verdict.json を消す。判定はやり直す）
 *   node scripts/audit-reference-book-coverage.mjs --check --source-id X       # Evaluator の verdict.json を候補表と照らす（判定もれ・語彙・記事の実在・件数）
 *   node scripts/audit-reference-book-coverage.mjs --status                    # 全書籍の進み具合（候補表・判定・展開）を棚ごとに出す
 * 候補表と一緒に判定資料 coverage/packet.md（サイトの記事と見出し・判定する節の一覧。Evaluator が読む・git 管理外・同期しない）も書く。
 * 判定済み（coverage/verdict.json がある）書籍の候補表は、中身が変わるなら --rejudge なしでは上書きしない（判定の元になった候補表が消え、
 * 要約が新しい候補表と古い判定を組み合わせてしまう。2026-10-08 に展開後の再実行で実際に上書きした）
 * 出力（置き場は台帳 scripts/lib/datasets.mjs）:
 *   候補表 vault.book-coverage-candidates＝content/sources/books/<dir>/coverage/candidates.json（決定的・generatedAt は --stamp のときだけ）。
 *     Evaluator の意味判定は同じ coverage/verdict.json（vault.book-coverage-verdict）。どちらも市販書籍の見出し・用語を含むので git 管理外で、
 *     実体は Drive vault（npm run drive-vault-sync -- --group reference-book-coverage --commit。ほかの PC は --pull）
 *   要約 state.book-coverage＝.claude/state/book-coverage.json（git 管理・型付き・見出しを持たない）。候補表を書くたび、または --summary で
 *     書籍ごとの件数・判定日・展開した記事を書き直す。記事のコミットは空のときだけ、判定日以降にその記事を変えたコミット（[skip ci] を除く）で埋める
 * quality-audit には登録しない: 文字起こしが Drive 由来の手元複製で CI に無く、読むのは書籍→サイト展開の着手時だけ（定期に読む人がいない）。
 * exit 0 = 出力した / 1 = 検査不成立（文字起こしが手元に無い・節が 0・サイトの記事が 0）/ 2 = 引数・依存の不足
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import matter from 'gray-matter';
import { execFileSync } from 'node:child_process';
import { datasetPath } from './lib/datasets.mjs';
import { readDatasetIf } from './lib/dataset-io.mjs';
import { writeDataset } from './lib/dataset-write.mjs';
import { todayJst } from './lib/jst-date.mjs';
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
const SUMMARY_ONLY = args.includes('--summary');
const REJUDGE = args.includes('--rejudge');
const CHECK = args.includes('--check');
const STATUS = args.includes('--status');
const TOP_TERMS = 12;
const MIN_UNIT_CHARS = 150;
const COVERED = 0.55;
const PARTIAL = 0.3;

const die = (msg, code = 1) => { console.error(`[${NAME}] ✗ ${msg}`); process.exit(code); };

const refs = loadReferenceSources();
const books = refs.sources.filter((s) => s.bookBundle);
let targets = books.filter((s) => SOURCE_IDS.includes(s.id) || (SHELF && s.shelf === SHELF));
if (!SOURCE_IDS.length && !SHELF && !SUMMARY_ONLY && !STATUS) die('--source-id か --shelf が必要', 2);
const unknown = SOURCE_IDS.filter((id) => !targets.some((s) => s.id === id));
if (unknown.length) die(`bookBundle を持つ参考文献に無い: ${unknown.join(', ')}`, 2);

const coverageValues = (source) => ({ values: { name: source.bookBundle.directory } });
/** 判定日以降にその記事を変えたコミット（新しい順・[skip ci] の自動コミットを除く） */
const commitsOf = (article, since) => {
  const sinceArg = `--since=${since}T00:00:00+09:00`;
  const dir = `${path.relative(REPO_ROOT, SITE_CONTENT_ROOT)}/${article}/`;
  const out = execFileSync('git', ['-C', REPO_ROOT, 'log', sinceArg, '--format=%h %s', '--', dir], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return out.split('\n').filter((l) => l && !l.includes('[skip ci]')).map((l) => l.split(' ')[0]);
};

/**
 * 要約（state.book-coverage）を書き直す。手元に候補表がある書籍だけを更新し、ほかの書籍の行と、記録済みの判定日・コミットは残す。
 * @returns {number} 更新した書籍の数
 */
function writeSummary(sources) {
  const prev = readDatasetIf(REPO_ROOT, 'state.book-coverage');
  const rows = { ...(prev?.books ?? {}) };
  let updated = 0;
  for (const source of sources) {
    const cand = readDatasetIf(REPO_ROOT, 'vault.book-coverage-candidates', coverageValues(source));
    if (!cand) continue;
    const verdict = readDatasetIf(REPO_ROOT, 'vault.book-coverage-verdict', coverageValues(source));
    const old = rows[source.id];
    const judgedAt = verdict ? (old?.judgedAt ?? todayJst()) : null;
    const plan = verdict?.plan ?? [];
    const v = verdict?.counts ?? {};
    rows[source.id] = {
      candidates: { generatedAt: cand.generatedAt, units: cand.book.units, textUnits: cand.book.textUnits, examUnits: cand.book.examUnits, ...cand.counts },
      verdict: verdict
        ? { judged: verdict.judged, covered: v.covered ?? 0, partial: v.partial ?? 0, gap: v.gap ?? 0, outOfScope: v['out-of-scope'] ?? 0, additions: plan.reduce((n, p) => n + (p.additions?.length ?? 0), 0) }
        : null,
      judgedAt,
      expansions: [...new Set(plan.map((p) => p.article))].map((article) => {
        const kept = old?.expansions.find((e) => e.article === article);
        return kept?.commits.length ? kept : { article, commits: commitsOf(article, judgedAt) };
      }),
    };
    updated++;
  }
  const sorted = Object.fromEntries(Object.keys(rows).sort().map((id) => [id, rows[id]]));
  writeDataset(REPO_ROOT, 'state.book-coverage', {
    schemaVersion: 1,
    description: '書籍ごとの網羅の要約（audit-reference-book-coverage が書く）。市販書籍の見出しは持たない。見出しを含む候補表と意味判定は Drive vault の 原資料PDF/書籍/<dir>/coverage/（台帳 vault.book-coverage-*）',
    books: sorted,
  });
  return updated;
}

const VERDICTS = ['covered', 'partial', 'gap', 'out-of-scope'];
/** 判定する節（機械の暫定ヒントが covered でないもの）。packet.md と --check が同じ集合を使う */
const unitsToJudge = (cand) => cand.units.filter((u) => u.statusHint !== 'covered');
const siteArticleExists = (slug) => fs.existsSync(path.join(SITE_CONTENT_ROOT, slug, 'article.mdx')) || fs.existsSync(path.join(SITE_CONTENT_ROOT, `${slug}.mdx`));

/** verdict.json を候補表と照らした違反（空なら合格）。Evaluator が書き終える前に回す決定的なゲート */
function verdictProblems(source) {
  const cand = readDatasetIf(REPO_ROOT, 'vault.book-coverage-candidates', coverageValues(source));
  if (!cand) return ['候補表が無い（先に候補表を作る）'];
  const verdict = readDatasetIf(REPO_ROOT, 'vault.book-coverage-verdict', coverageValues(source));
  if (!verdict) return ['verdict.json が無い'];
  const p = [];
  const want = unitsToJudge(cand).map((u) => u.id);
  const seen = new Map();
  for (const u of verdict.units ?? []) {
    seen.set(u.id, (seen.get(u.id) ?? 0) + 1);
    if (!VERDICTS.includes(u.verdict)) p.push(`${u.id}: verdict「${u.verdict}」は ${VERDICTS.join('/')} のどれか`);
    if (['covered', 'partial'].includes(u.verdict)) {
      const slug = String(u.where ?? '').split('#')[0];
      if (!slug || !siteArticleExists(slug)) p.push(`${u.id}: where「${u.where}」の記事が content/site/ に無い（<資格>/<slug>#見出し）`);
    }
    if (u.verdict === 'partial' && !(Array.isArray(u.missing) && u.missing.length)) p.push(`${u.id}: partial は missing（欠けている要素）が要る`);
    if (u.verdict === 'out-of-scope' && !u.reason) p.push(`${u.id}: out-of-scope は reason が要る`);
  }
  const missing = want.filter((id) => !seen.has(id));
  if (missing.length) p.push(`判定していない節 ${missing.length} 件: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ' …' : ''}`);
  const dup = [...seen].filter(([, n]) => n > 1).map(([id]) => id);
  if (dup.length) p.push(`同じ節を 2 回以上判定: ${dup.join(', ')}`);
  const tally = Object.fromEntries(VERDICTS.map((v) => [v, (verdict.units ?? []).filter((u) => u.verdict === v).length]));
  for (const v of VERDICTS) if ((verdict.counts?.[v] ?? 0) !== tally[v]) p.push(`counts.${v}=${verdict.counts?.[v]} が units の件数 ${tally[v]} と合わない`);
  if (verdict.judged !== (verdict.units ?? []).length) p.push(`judged=${verdict.judged} が units の件数 ${(verdict.units ?? []).length} と合わない`);
  if (verdict.sourceId !== source.id) p.push(`sourceId「${verdict.sourceId}」が ${source.id} でない`);
  const open = new Set((verdict.units ?? []).filter((u) => ['gap', 'partial'].includes(u.verdict)).map((u) => u.id));
  const planned = new Set();
  for (const a of verdict.plan ?? []) {
    if (!a.new && !siteArticleExists(a.article)) p.push(`plan: 記事「${a.article}」が無い（新しい記事なら new: true と title）`);
    if (a.new && !(a.title && /^[a-z0-9-]+\/[a-z0-9-]+$/.test(a.article))) p.push(`plan: 新しい記事「${a.article}」は <資格>/<slug> と title が要る`);
    for (const x of a.additions ?? []) {
      if (!['A', 'B', 'C'].includes(x.priority)) p.push(`plan ${a.article}「${x.heading}」: priority は A/B/C`);
      for (const id of x.unitIds ?? []) {
        if (!open.has(id)) p.push(`plan ${a.article}: unitIds の ${id} は gap/partial の節でない`);
        planned.add(id);
      }
    }
  }
  const unplanned = [...open].filter((id) => !planned.has(id));
  if (unplanned.length) p.push(`gap/partial なのに計画に入っていない節 ${unplanned.length} 件: ${unplanned.slice(0, 10).join(', ')}（展開しないなら out-of-scope にして reason を書く）`);
  return p;
}

/** 判定資料（Evaluator が読む）。サイトの記事と見出し・判定する節。本の見出しを含むので候補表と同じ git 管理外の置き場 */
function writePacket(source, cand, articles) {
  const judge = unitsToJudge(cand);
  // 見出しまで出すのは、判定する節の候補に挙がった記事だけ（資格によっては記事が 700 を超え、全部の見出しを並べると資料が 400KB を超える）
  const near = new Set(judge.flatMap((u) => [...u.bestSections.map((b) => b.article), ...u.bestArticles.map((b) => b.article)]));
  const nearList = articles.filter((a) => near.has(a.slug));
  const others = articles.filter((a) => !near.has(a.slug));
  const lines = [`# 判定資料: ${source.title}（${source.id}）`, '', `サイト側の対象: ${cand.site.dirs.join(' + ')}（記事 ${articles.length}。うち候補に挙がった ${nearList.length} 本は見出しまで）`, '', '## 候補に挙がった記事と見出し（H2/H3）', ''];
  for (const a of nearList) lines.push(`- **${a.slug}**（${a.title}・${a.chars}字）: ${a.headings.map((h) => (h.level === 3 ? `　${h.heading}` : h.heading)).join(' / ')}`);
  lines.push('', `## そのほかの記事（${others.length} 本。中身は content/site/<slug>/article.mdx を grep で探す）`, '');
  lines.push(others.length > 200 ? others.map((a) => a.slug).join(' / ') : others.map((a) => `${a.slug}（${a.title}）`).join(' / '));
  lines.push('', `## 本の節（gap / partial の暫定ヒントが付いたもの・${judge.length} 件）`, '', '各行: id・ページ・見出し・字数・暫定ヒント・上位語・サイト側の最有力節（score）', '');
  for (const u of judge) {
    const best = u.bestSections.slice(0, 2).map((b) => `${b.article}#${b.section} ${b.score}`).join(' | ');
    lines.push(`- ${u.id} ${u.page ?? '-'} 「${u.heading}」${u.chars}字 [${u.statusHint}] 語=${u.topTerms.slice(0, 8).join(',')} 候補=${best}`);
  }
  const file = path.join(path.dirname(path.join(REPO_ROOT, datasetPath('vault.book-coverage-candidates', coverageValues(source).values))), 'packet.md');
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
  return file;
}

if (CHECK) {
  if (!targets.length) die('--check は --source-id か --shelf が要る', 2);
  let bad = 0;
  for (const source of targets) {
    const p = verdictProblems(source);
    if (p.length) bad++;
    console.log(`[${NAME} --check] ${source.id}: ${p.length ? `✗ 違反 ${p.length} 件` : '✓ 判定もれ・語彙・記事の実在・件数・計画の割り当ては整合'}`);
    for (const x of p.slice(0, 30)) console.log(`  - ${x}`);
  }
  console.log(`[${NAME} --check] ${targets.length} 冊を実検査 / 違反のある書籍 ${bad}`);
  process.exit(bad ? 1 : 0);
}

if (STATUS) {
  const rows = readDatasetIf(REPO_ROOT, 'state.book-coverage')?.books ?? {};
  const shelves = new Map();
  for (const s of books) {
    const r = rows[s.id];
    const done = r ? r.expansions.filter((e) => e.commits.length).length : 0;
    const stage = !r ? '未着手' : !r.verdict ? '候補表のみ' : !r.expansions.length ? '判定済み（展開不要）' : done === r.expansions.length ? '展開済み' : `展開中 ${done}/${r.expansions.length} 記事`;
    const line = `  ${s.id.padEnd(36)} ${stage}${r?.verdict ? `（gap ${r.verdict.gap}・partial ${r.verdict.partial}・追記 ${r.verdict.additions}）` : r ? `（本文 ${r.candidates.textUnits} 節）` : ''}`;
    const k = s.shelf ?? '（棚なし）';
    if (!shelves.has(k)) shelves.set(k, []);
    shelves.get(k).push({ line, stage });
  }
  const all = [...shelves.values()].flat();
  const count = (f) => all.filter((x) => f(x.stage)).length;
  console.log(`[${NAME} --status] 書籍 ${all.length} 冊 / 判定済み ${count((x) => x.startsWith('判定済み') || x.startsWith('展開'))}（うち展開済み ${count((x) => x === '展開済み')}）/ 候補表のみ ${count((x) => x === '候補表のみ')} / 未着手 ${count((x) => x === '未着手')}（要約 ${datasetPath('state.book-coverage')}）`);
  for (const [k, xs] of shelves) {
    console.log(`${k}`);
    for (const x of xs) console.log(x.line);
  }
  process.exit(0);
}

if (SUMMARY_ONLY) {
  const n = writeSummary(targets.length ? targets : books);
  console.log(`[${NAME}] 要約 ${datasetPath('state.book-coverage')} を書いた（手元に候補表がある書籍 ${n} 冊を更新）`);
  if (n === 0) die('手元に候補表がある書籍が 0（drive-vault-sync --pull で取り戻すか、候補表を作る）。検査不成立');
  process.exit(0);
}

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
  const dirs = new Set([...EXTRA_SITE_DIRS, ...(source.bookBundle.coverageSiteDirs ?? [])]);
  const missingDirs = [...dirs].filter((d) => !fs.existsSync(path.join(siteRoot, d)));
  if (missingDirs.length) throw new Error(`${source.id}: coverageSiteDirs の資格ディレクトリが content/site/ に無い: ${missingDirs.join(', ')}`);
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
  const list = pool.map((a) => {
    const slug = a.rel.replace(/\/article\.mdx$|\.mdx$/, '');
    const body = stripMdx(a.fm.content);
    const headings = splitSections(body).filter((x) => x.heading !== '(冒頭)').map((x) => ({ level: x.level, heading: x.heading }));
    return { slug, title: String(a.fm.data.title ?? slug), chars: body.replace(/\s/g, '').length, headings };
  }).sort((x, y) => x.slug.localeCompare(y.slug));
  return { dirs: [...dirs].sort(), articles: pool.length, sections, list };
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
  const outPath = path.join(REPO_ROOT, datasetPath('vault.book-coverage-candidates', coverageValues(source).values));
  const verdictPath = path.join(REPO_ROOT, datasetPath('vault.book-coverage-verdict', coverageValues(source).values));
  const text = `${JSON.stringify(out, null, 2)}\n`;
  const judged = fs.existsSync(verdictPath);
  if (judged && fs.existsSync(outPath) && fs.readFileSync(outPath, 'utf8') !== text) {
    if (!REJUDGE) {
      console.error(`[${NAME}] ✗ ${source.id}: 判定済み（${path.relative(REPO_ROOT, verdictPath)}）の候補表が変わるので上書きしない。判定をやり直すなら --rejudge（手元の verdict.json を消す。Drive vault の写しは残る）`);
      failed = true;
      continue;
    }
    fs.unlinkSync(verdictPath);
    console.log(`[${NAME}] ${source.id}: --rejudge のため手元の判定 ${path.relative(REPO_ROOT, verdictPath)} を消した（判定をやり直してから drive-vault-sync する）`);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, text);
  writePacket(source, out, site.list);
  summary.push(out);
  console.log(`[${NAME}] ${source.id}: 節 ${units.length}（本文 ${textUnits.length} を実検査・過去問 ${examUnits.length}・${MIN_UNIT_CHARS}字未満 ${shortUnits.length} は対象外）`
    + ` / サイト ${site.dirs.join('+')} の記事 ${site.articles}・節 ${site.sections.length}`
    + ` → covered ${out.counts.covered} / partial ${out.counts.partial} / gap ${out.counts.gap}（暫定ヒント）`
    + `\n  → ${path.relative(REPO_ROOT, outPath)}`);
}
if (summary.length) console.log(`[${NAME}] 要約 ${datasetPath('state.book-coverage')} を更新（${writeSummary(summary.map((o) => targets.find((s) => s.id === o.sourceId)))} 冊）`);
if (failed) process.exit(1);
if (!summary.length) die('対象の書籍が 0（検査不成立）');
