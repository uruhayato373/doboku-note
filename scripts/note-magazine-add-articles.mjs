#!/usr/bin/env node
/**
 * note-magazine-add-articles.mjs
 * ---------------------------------------------------------------------------
 * 既存の note 記事を、別の有料マガジンへ「収録（追加）」するブラウザ CLI。
 * note-edit-magazine（設定/価格専用）では扱わない「収録マガジンへの追加」操作を担う。
 *
 * 設計: note-edit-session / note-edit-magazine と同じ「システム Chrome
 *   （channel:'chrome'）＋永続プロファイル（.local/playwright-note-profile）」方式。
 *   初回ログインは `npm run note-edit-session` で済ませておく前提。
 *
 * 安全段階（収益アカウントのため）:
 *   1. 追加対象は API 差分で自動算出（手動列挙なし・冪等）:
 *        toAdd = (ソースマガジン群の収録記事 ∪ 明示指定記事) − ターゲットの現収録
 *   2. 既定は dry-run（計画表示＋スクショのみ）。実際の追加は --commit 必須。
 *   3. --probe: 1記事目で実 DOM のボタン/メニュー文言をダンプ（セレクタ確定支援）。
 *   4. 各ステップ .tmp/ にスクショ。
 *   5. 完了後 note API でターゲット収録数・対象記事の収録を実体検証
 *      （[[feedback_publish_x_false_success]] 偽成功の罠を回避）。
 *
 * 実行環境: Windows(会社PC)で動作確認済（2026-06-15、完全パックへ63記事を投入し API 検証）。
 *   channel:'chrome'＋ignoreHTTPSErrors で社内プロキシ(TLS傍受)を越える。Mac でも可。
 * 確定フロー（実機 probe 済）: 記事ページ `/n/{key}` の「記事を追加」ボタン → ダイアログ
 *   「記事を追加」（自分の全マガジン一覧・各行に 追加/追加済 トグル）→ ターゲット行で判定→押す。
 *
 * 使い方:
 *   # 計画だけ確認（API 差分・ブラウザ起動せず）
 *   node scripts/note-magazine-add-articles.mjs --target m171222175fac \
 *     --from m09440aa379cf,mf0f98993407f --plan-only
 *
 *   # dry-run（ブラウザ起動・1記目で probe・追加はしない）
 *   node scripts/note-magazine-add-articles.mjs --target m171222175fac \
 *     --from m09440aa379cf --probe
 *
 *   # 本番（実際にマガジンへ追加）
 *   node scripts/note-magazine-add-articles.mjs --target m171222175fac \
 *     --from m09440aa379cf,mf0f98993407f,m32a8a5b3b473 --commit
 *
 *   # 個別記事も足す（クリーンアップ: 下水道R6 等）
 *   node scripts/note-magazine-add-articles.mjs --target m171222175fac \
 *     --notes nXXXXXXXX,nYYYYYYYY --commit
 *
 * 真実源: docs/reference/note-api-verification.md / 決定: 総監マガジン構成_決定2026.md
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CREATOR = 'dobokunote';
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const TMP = join(ROOT, '.tmp');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

// ---- args ----
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const TARGET = getArg('--target');
const FROM = (getArg('--from') || '').split(',').map((s) => s.trim()).filter(Boolean);
const NOTES = (getArg('--notes') || '').split(',').map((s) => s.trim()).filter(Boolean);
const LIMIT = parseInt(getArg('--limit') || '0', 10) || 0; // 0 = 無制限
const PLAN_ONLY = argv.includes('--plan-only');
const PROBE = argv.includes('--probe');
const COMMIT = argv.includes('--commit'); // これが無い限り実追加しない（安全既定）
const DRY = !COMMIT;

if (!TARGET || (FROM.length === 0 && NOTES.length === 0)) {
  console.error('使い方: node scripts/note-magazine-add-articles.mjs --target <magazineKey> (--from <k1,k2> | --notes <n1,n2>) [--plan-only] [--probe] [--commit] [--limit N]');
  process.exit(64);
}

// ---- API helper（プロキシ + 失効チェック無効化。HTML が返ったら null） ----
function curlJson(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = spawnSync('curl',
      ['-sS', '-m', '30', '--ssl-no-revoke', '-H', 'User-Agent: Mozilla/5.0', '-H', 'Accept: application/json', url],
      { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
    const b = (r.stdout || '').trim();
    if (b.startsWith('{') || b.startsWith('[')) { try { return JSON.parse(b); } catch { /* retry */ } }
  }
  return null;
}
function fetchMagazineNotes(key) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const d = curlJson(`https://note.com/api/v1/magazines/${key}/notes?page=${page}`);
    const notes = d?.data?.notes ?? [];
    if (notes.length === 0) break;
    out.push(...notes.map((n) => ({ key: n.key, name: n.name, price: n.price ?? 0 })));
    if (d?.data?.isLastPage) break;
  }
  return out;
}
function magazineMeta(key) {
  for (let p = 1; p <= 20; p++) {
    const d = curlJson(`https://note.com/api/v2/creators/${CREATOR}/contents?kind=magazine&page=${p}`);
    const c = d?.data?.contents ?? [];
    const hit = c.find((m) => m.key === key);
    if (hit) return { name: hit.name, price: hit.price };
    if (d?.data?.isLastPage || c.length === 0) break;
  }
  return null;
}

// ---- 計画算出（API 差分） ----
console.log('=== note マガジン 記事追加 ===');
console.log(`target : ${TARGET}`);
console.log(`from   : ${FROM.join(', ') || '(none)'}`);
console.log(`notes  : ${NOTES.join(', ') || '(none)'}`);
console.log(`mode   : ${DRY ? 'DRY-RUN（--commit で本番）' : 'COMMIT（実追加）'}${PROBE ? ' +probe' : ''}`);
console.log(`proxy  : ${PROXY || '(none)'}\n`);

const targetMeta = magazineMeta(TARGET);
if (!targetMeta) {
  console.error(`ERROR: ターゲットマガジン ${TARGET} を取得できません（プロキシ/疎通/キー誤り）。`);
  console.error('  手動確認: curl -sS --ssl-no-revoke "https://note.com/api/v2/creators/dobokunote/contents?kind=magazine&page=1"');
  process.exit(1);
}
const current = fetchMagazineNotes(TARGET);
const currentKeys = new Set(current.map((n) => n.key));
console.log(`ターゲット「${targetMeta.name}」¥${targetMeta.price} 現収録: ${current.length} 件`);

// ソース群 ∪ 明示指定 を集約（重複排除）
const candidate = new Map(); // key -> {key,name,src}
for (const src of FROM) {
  const notes = fetchMagazineNotes(src);
  console.log(`  source ${src}: ${notes.length} 件`);
  for (const n of notes) if (!candidate.has(n.key)) candidate.set(n.key, { ...n, src });
}
for (const nk of NOTES) if (!candidate.has(nk)) candidate.set(nk, { key: nk, name: '(明示指定・名称未取得)', src: '--notes' });

// 差分 = candidate − current
let toAdd = [...candidate.values()].filter((n) => !currentKeys.has(n.key));
const already = [...candidate.values()].filter((n) => currentKeys.has(n.key)).length;
if (LIMIT > 0) toAdd = toAdd.slice(0, LIMIT);

console.log(`\n--- 追加計画 ---`);
console.log(`候補 ${candidate.size} 件 / 既収録(skip) ${already} 件 / 今回追加 ${toAdd.length} 件${LIMIT ? `（--limit ${LIMIT} 適用）` : ''}`);
for (const n of toAdd) console.log(`  + ${n.key}  [${n.src}]  ${String(n.name).slice(0, 50)}`);

if (toAdd.length === 0) { console.log('\n追加対象なし（すべて収録済み）。完了。'); process.exit(0); }
if (PLAN_ONLY) { console.log('\n--plan-only: ブラウザ起動せず終了。'); process.exit(0); }

mkdirSync(TMP, { recursive: true });

// ---- ブラウザ ----
let ctx;
try {
  ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false, channel: 'chrome',
    proxy: PROXY ? { server: PROXY } : undefined,
    ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
} catch (e) {
  const msg = String(e).split('\n')[0];
  console.error('\nLAUNCH_FAIL:', msg);
  if (/not found|Executable doesn't exist|channel/.test(msg)) {
    console.error('→ システム Chrome 未検出。Google Chrome をインストール（Edge は channel を "msedge" に）。');
  }
  process.exit(11);
}
const page = ctx.pages()[0] || (await ctx.newPage());

// ログイン状態の確認（未ログインなら note-edit-session を案内して中断）
await page.goto(`https://note.com/${CREATOR}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
await page.waitForTimeout(2000);
const head = (await page.innerText('body').catch(() => '')).replace(/\s+/g, ' ').slice(0, 400);
if (/会員登録/.test(head) && !/ログアウト|アカウント設定|クリエイターページ/.test(head)) {
  console.error('\nNOT_LOGGED_IN: 永続プロファイルが未ログインです。先に `npm run note-edit-session` でログインしてください。');
  await ctx.close();
  process.exit(12);
}

/** ダイアログを閉じる（次の記事へ進む前のクリーンアップ）。 */
async function closeDialog(dlg) {
  try {
    const c = dlg.getByRole('button', { name: /閉じる/ }).first();
    if (await c.count()) { await c.click({ timeout: 3000 }); await page.waitForTimeout(400); }
    else { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  } catch { /* noop */ }
}

/**
 * 1記事をターゲットマガジンへ収録する（確定フロー・2026-06-15 実機 probe 済）。
 *   記事ページ `/n/{key}` の「記事を追加」ボタン → ダイアログ「記事を追加」（自分の全マガジン一覧）
 *   → ターゲットマガジン名の行の次ボタン（「追加」/「追加済」）で状態判定 → 「追加」なら押す。
 */
async function addOne(noteKey, idx) {
  const name = targetMeta.name;
  const url = `https://note.com/${CREATOR}/n/${noteKey}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2800);
  if (PROBE && idx === 1) await page.screenshot({ path: join(TMP, `note-add-${idx}-01-article.png`) }).catch(() => {});

  // 「記事を追加」ボタン → マガジン選択ダイアログ
  const trigger = page.getByRole('button', { name: '記事を追加' }).first();
  if (!(await trigger.count())) { console.log(`  ${noteKey}: 「記事を追加」ボタンが無い（ログイン/オーナー権限/UI変更を確認）`); return 'trigger-miss'; }
  await trigger.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1800);
  const dlg = page.locator('[role="dialog"],[aria-modal="true"]').first();
  if (!(await dlg.count())) { console.log(`  ${noteKey}: ダイアログが開かず`); return 'dialog-miss'; }
  if (PROBE && idx === 1) {
    await page.screenshot({ path: join(TMP, `note-add-${idx}-02-dialog.png`) }).catch(() => {});
    const btns = await dlg.locator('button').allInnerTexts().catch(() => []);
    console.log(`  [probe] dialog buttons=${JSON.stringify([...new Set(btns.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, 16))}`);
  }

  // ターゲットマガジン行を名前で特定 → 直後のボタン（追加/追加済）で判定
  const nameLoc = dlg.getByText(name, { exact: false }).first();
  if (!(await nameLoc.count())) { console.log(`  ${noteKey}: ダイアログに「${name}」が無い`); await closeDialog(dlg); return 'target-not-in-dialog'; }
  const stateBtn = nameLoc.locator('xpath=following::button[normalize-space()="追加" or normalize-space()="追加済"][1]');
  if (!(await stateBtn.count())) { console.log(`  ${noteKey}: 行の追加ボタンが見つからず`); await closeDialog(dlg); return 'button-miss'; }
  const label = (await stateBtn.first().innerText().catch(() => '')).replace(/\s+/g, '').trim();
  if (label.includes('追加済')) { console.log(`  ${noteKey}: 既に追加済み (skip)`); await closeDialog(dlg); return 'already'; }

  if (DRY) { console.log(`  ${noteKey}: [dry-run] 「${name}」行=「${label}」→ 追加直前で停止（押さない）`); await closeDialog(dlg); return 'dry-ok'; }

  await stateBtn.first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1200);
  // 読み戻し: 同行が「追加済」へ変化したか
  const after = (await nameLoc.locator('xpath=following::button[normalize-space()="追加" or normalize-space()="追加済"][1]').first().innerText().catch(() => '')).replace(/\s+/g, '');
  await page.screenshot({ path: join(TMP, `note-add-${idx}-03-after.png`) }).catch(() => {});
  await closeDialog(dlg);
  return after.includes('追加済') ? 'added' : 'added-unconfirmed';
}

const results = { added: 0, already: 0, dry: 0, miss: 0 };
try {
  let i = 0;
  for (const n of toAdd) {
    i++;
    process.stdout.write(`[${i}/${toAdd.length}] ${n.key} ... `);
    let r;
    try { r = await addOne(n.key, i); } catch (e) { r = 'error:' + String(e).split('\n')[0].slice(0, 60); }
    console.log(r);
    if (r === 'added') results.added++;
    else if (r === 'already') results.already++;
    else if (r === 'dry-ok') results.dry++;
    else results.miss++;
    await page.waitForTimeout(1200 + (i % 3) * 400); // 軽い間隔（bot 検知緩和、index で揺らぎ）
  }
} finally {
  await ctx.close();
}

console.log(`\n--- 実行結果 ---`);
console.log(`追加 ${results.added} / 既存 ${results.already} / dry ${results.dry} / 未処理(要調整) ${results.miss}`);

// ---- 完了後 API 検証 ----
if (COMMIT && results.added > 0) {
  console.log('\n[検証] note API でターゲット収録を実体確認');
  const after = fetchMagazineNotes(TARGET);
  const afterKeys = new Set(after.map((n) => n.key));
  const want = toAdd.map((n) => n.key);
  const ok = want.filter((k) => afterKeys.has(k)).length;
  console.log(`  収録: ${current.length} → ${after.length} 件（期待+${results.added}）`);
  console.log(`  追加対象の収録確認: ${ok}/${want.length}`);
  if (ok < want.length) { console.error('  ⚠ 一部が未収録。.tmp スクショ確認 → セレクタ調整 → 再実行（冪等）'); process.exit(6); }
}

const exit = results.miss > 0 && !DRY ? 7 : 0;
console.log(`\n${exit === 0 ? '完了' : '一部未処理'} (exit ${exit})`);
process.exit(exit);
