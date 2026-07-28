#!/usr/bin/env node
/**
 * check-note-attachments.mjs
 * ---------------------------------------------------------------------------
 * 「PDF を配ると書いてある note 記事に、実際に PDF が添付されているか」を検査する。
 *
 * 2026-07-28 の事故: 1級土木 一次過去問PDF（¥1,980）が本文で「この記事の末尾に添付」と
 * 約束しているのに **note ライブに添付が無い**（購入しても PDF が手に入らない）状態で公開
 * されていた。同型が他2本。PDF 実体はビルド済みでローカルにあり、アップロードだけが漏れて
 * いた＝「公開」と「添付」が別工程で、後者を忘れても誰も落とさなかった。
 *
 * 2層に分ける（CI で見える範囲と、ログインしないと見えない範囲が違うため）:
 *   --source（既定・CI 可・ネットワーク不要）
 *       本文が PDF 配布を約束している記事に、添付すべき PDF 実体がディスク上にあるか。
 *       「約束したが PDF を作っていない／置き場がずれた」を落とす。
 *   --live（ローカル専用・要ログイン Playwright）
 *       添付すべき PDF がある記事の**ライブ**に、実際に添付リンクがその本数あるか。
 *       「作ったがアップロードしていない」を落とす＝今回の事故そのもの。
 *
 * なぜ --live を CI に載せないか: 有料エリア内の添付カードは**未ログインの HTML には出ない**
 * （2026-07-28 実測＝添付済み記事2本とも未ログイン HTML で出現0）。Actions からは原理的に
 * 見えないので、載っているフリをさせない（CLAUDE.md §9「検査ゼロを PASS と呼ばない」）。
 *
 * 使い方:
 *   node scripts/check-note-attachments.mjs                 # source 層（CI）
 *   node scripts/check-note-attachments.mjs --live          # live 層（要ログイン・約15分）
 *   node scripts/check-note-attachments.mjs --live --only n155093f42183,na84b001e827e
 *   node scripts/check-note-attachments.mjs --json
 * ---------------------------------------------------------------------------
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = join(ROOT, 'docs/note');
const ALLOW_PATH = join(ROOT, '.claude/config/note-attachments-allow.json');

const argv = process.argv.slice(2);
const LIVE = argv.includes('--live');
const STAGED = argv.includes('--staged');
const JSON_OUT = argv.includes('--json');
const ONLY = (() => { const i = argv.indexOf('--only'); return i >= 0 ? new Set(argv[i + 1].split(',').map((s) => s.trim())) : null; })();

const ARTICLE_RE = /^article(-[^/\\]+)?\.md$/;      // 型別 article-II1.md 等を落とさない
const TYPE_PDF = { II1: /-II-1-/, II2: /-II-2-/, III: /-III-/ };
// 本文が「PDF を配る」と約束している signature。prose 側の網。
const PROMISE_RE = /(印刷用PDF|末尾に添付|記事末尾に添付|添付しています|PDF[^\n]{0,24}(ダウンロード|添付)|ダウンロードできます)/;

const allow = existsSync(ALLOW_PATH) ? JSON.parse(readFileSync(ALLOW_PATH, 'utf8')) : { entries: [] };
const allowMap = new Map((allow.entries || []).map((e) => [e.noteId, e]));

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (ARTICLE_RE.test(e.name)) acc.push(p);
  }
  return acc;
}
const fm = (raw, k) => {
  const block = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  return (block.match(new RegExp('^' + k + ':\\s*(?:"(.*?)"|\'(.*?)\'|(.+?))\\s*$', 'm')) || []).slice(1).find(Boolean) || '';
};

// --- 記事ごとに「添付されているべき PDF」を実体から決める（frontmatter に依存しない） ---
function expectedPdfs(file) {
  const dir = dirname(file);
  const name = file.split(/[\\/]/).pop();
  const here = readdirSync(dir).filter((f) => /\.pdf$/i.test(f)).map((f) => join(dir, f));
  const sub = join(dir, 'pdf');
  const nested = existsSync(sub) ? readdirSync(sub).filter((f) => /\.pdf$/i.test(f)).map((f) => join(sub, f)) : [];
  const type = (name.match(/^article-(.+)\.md$/) || [])[1];
  if (type && TYPE_PDF[type]) {
    const hit = here.find((p) => TYPE_PDF[type].test(p.split(/[\\/]/).pop()));
    return hit ? [hit] : [];
  }
  // 型別 article がある dir の素の article.md は、型別の PDF を自分のものと見なさない
  if (!type) {
    const siblingTyped = readdirSync(dir).some((f) => /^article-.+\.md$/.test(f));
    if (siblingTyped) return nested;
  }
  return [...here, ...nested];
}

// --staged: 今回コミットする article*.md だけを見る（pre-commit 用・全量は CI）
let stagedSet = null;
if (STAGED) {
  const { execFileSync } = await import('node:child_process');
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' });
  stagedSet = new Set(out.split(/\r?\n/).filter((p) => /^docs\/note\/.*\/article(-[^/]+)?\.md$/.test(p)));
}

const targets = [];
for (const file of walk(BASE)) {
  if (stagedSet && !stagedSet.has(relative(ROOT, file).replace(/\\/g, '/'))) continue;
  const raw = readFileSync(file, 'utf8');
  const noteId = fm(raw, 'noteId');
  if (!noteId) continue;                                   // 未公開はスキップ
  if (fm(raw, 'noteStatus') && fm(raw, 'noteStatus') !== 'published') continue;
  if (ONLY && !ONLY.has(noteId)) continue;
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');
  targets.push({
    file: relative(ROOT, file).replace(/\\/g, '/'),
    noteId,
    title: (body.split(/\r?\n/).find((l) => l.startsWith('# ')) || '').slice(2, 54),
    promises: PROMISE_RE.test(body),
    expected: expectedPdfs(file).map((p) => relative(ROOT, p).replace(/\\/g, '/')),
    allow: allowMap.get(noteId) || null,
  });
}

// ============================ source 層 ============================
if (!LIVE) {
  const violations = targets.filter((t) => t.promises && t.expected.length === 0 && !t.allow);
  const withPdf = targets.filter((t) => t.expected.length > 0);
  if (JSON_OUT) {
    console.log(JSON.stringify({ mode: 'source', inspected: targets.length, withPdf: withPdf.length, violations }, null, 2));
  } else {
    console.log(`[check-note-attachments${STAGED ? ' --staged' : ' --source'}] 実検査 ${targets.length} 件（公開済み・noteId 付き）`);
    console.log(`  PDF 配布を約束: ${targets.filter((t) => t.promises).length} 件 / 添付すべき PDF 実体あり: ${withPdf.length} 件 / allowlist: ${allowMap.size} 件`);
    if (violations.length) {
      console.error(`\n✗ 約束しているのに PDF 実体が見つからない: ${violations.length} 件`);
      for (const v of violations) console.error(`  ${v.noteId}  ${v.title}\n      ${v.file}`);
      console.error('\n  → PDF を生成して記事 dir（または <dir>/pdf/）へ置くか、正当な例外なら .claude/config/note-attachments-allow.json に理由付きで登録する');
    } else {
      console.log('\n✓ 約束と PDF 実体の不一致なし');
    }
    console.log(`\n  ライブに実際に添付されているかは CI では見えない（有料エリアの添付カードは未ログイン HTML に出ない）。`);
    console.log(`  ローカルで: node scripts/check-note-attachments.mjs --live`);
  }
  // 検査ゼロで PASS を返さない（--staged は「note 記事を触っていない」が正常なので除く）
  if (!STAGED && targets.length === 0) { console.error('✗ 検査対象0件＝走査が壊れている疑い（検査不成立）'); process.exit(1); }
  process.exit(violations.length ? 1 : 0);
}

// ============================ live 層 ============================
const need = targets.filter((t) => t.expected.length > 0);
if (need.length === 0) { console.error('✗ 検査対象0件＝走査が壊れている疑い（検査不成立）'); process.exit(1); }

const { chromium } = await import('playwright');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ctx = await chromium.launchPersistentContext(PROFILE, { headless: false, channel: 'chrome', viewport: { width: 1280, height: 900 } });
const page = ctx.pages()[0] || (await ctx.newPage());
await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded' });
await sleep(1500);
if (!(await page.evaluate(() => document.body.innerText.includes('dobokunote')))) {
  console.error('✗ ABORT: note にログインしていない（npm run note-edit-session で1回ログインする）');
  await ctx.close(); process.exit(2);
}
console.log(`[check-note-attachments --live] 対象 ${need.length} 件を実査（著者ログイン＝有料エリアも見える）\n`);

const short = []; const fetchFail = []; let ok = 0;
for (const [i, t] of need.entries()) {
  let live = null;
  for (let attempt = 0; attempt < 2 && live === null; attempt++) {
    try {
      await page.goto(`https://note.com/dobokunote/n/${t.noteId}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(2500);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1500);
      live = await page.evaluate(() => [...document.querySelectorAll('a')]
        .filter((a) => /api\/v2\/attachments\/download/.test(a.getAttribute('href') || '')).length);
    } catch { await sleep(3000); }
  }
  if (live === null) { fetchFail.push(t); console.log(`  [${i + 1}/${need.length}] FETCH_ERR ${t.noteId}`); continue; }
  const want = t.allow?.expected ?? t.expected.length;
  if (live < want) { short.push({ ...t, live, want }); console.log(`  [${i + 1}/${need.length}] ✗ live=${live}/期待${want}  ${t.noteId}  ${t.title}`); }
  else { ok++; if ((i + 1) % 20 === 0) console.log(`  [${i + 1}/${need.length}] …OK ${ok}`); }
}
await ctx.close();

const inspected = need.length - fetchFail.length;
console.log(`\n実検査 ${inspected} 件（対象 ${need.length}・取得失敗 ${fetchFail.length}）: 充足 ${ok} / 不足 ${short.length}`);

// 復旧は note の 1日100アップロード上限で複数日に分かれる。別日・別PCから再開できるよう
// 欠落リストを state に残す（.tmp は git 管理外で、過去の添付 done-log はこれで失われている）。
if (!ONLY) {
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const outPath = join(ROOT, '.claude/state/note-attachments-missing.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify({
    measuredAt: new Date().toISOString().slice(0, 10),
    inspected, target: need.length, fetchFail: fetchFail.length, satisfied: ok,
    missing: short.map((s) => ({ noteId: s.noteId, title: s.title, live: s.live, want: s.want, pdfs: s.expected })),
  }, null, 2) + '\n');
  console.log(`\n欠落リスト: .claude/state/note-attachments-missing.json（${short.length} 件）`);
}
if (short.length) {
  console.error('\n✗ ライブに PDF が添付されていない（購入者が受け取れない）:');
  for (const s of short) {
    console.error(`  ${s.noteId}  live=${s.live}/期待${s.want}  ${s.title}`);
    for (const p of s.expected) console.error(`      node scripts/note-attach-file.mjs --note ${s.noteId} --file "${p}" --commit`);
  }
}
if (fetchFail.length / need.length > 0.2) { console.error('\n✗ 取得失敗が支配的＝検査不成立'); process.exit(1); }
process.exit(short.length ? 1 : 0);
