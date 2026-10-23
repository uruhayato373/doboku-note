#!/usr/bin/env node
import { resolveProfileDir } from './lib/playwright-auth-profile.mjs';
/**
 * note-magazine-remove-articles.mjs
 * ---------------------------------------------------------------------------
 * 既存の note 記事を、指定マガジンの「収録」から外すブラウザ CLI（note-magazine-add-articles の逆）。
 * 記事ページ `/n/{key}` の「記事を追加」ダイアログで、ターゲット行の「追加済」を押して off にする。
 * 記事そのものは消さない・非公開にしない（収録の解除だけ）。
 *
 * 安全段階:
 *   1. 外す対象は --notes で明示。API で「いま収録されている」ものだけに絞る（冪等）。
 *   2. 既定は dry-run（行の状態を読むだけで押さない）。実際に外すのは --commit 必須。
 *   3. 完了後 note API でターゲット収録から消えたことを assert（残れば exit 6）。
 *
 * 使い方:
 *   node scripts/note-magazine-remove-articles.mjs --target <magazineKey> --notes <k1,k2> [--limit N] [--commit]
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { leanContextOptions } from './lib/playwright-launch.mjs';
import { NOTE_CREATOR as CREATOR } from './lib/site-identity.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { curlJson as apiCurlJson } from './lib/note-api.mjs';

const PROFILE = resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT });
const TMP = join(ROOT, '.tmp');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

// ---- args ----
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const TARGET = getArg('--target');
const NOTES = (getArg('--notes') || '').split(',').map((s) => s.trim()).filter(Boolean);
const LIMIT = parseInt(getArg('--limit') || '0', 10) || 0; // 0 = 無制限
const COMMIT = argv.includes('--commit'); // これが無い限り実追加しない（安全既定）
const DRY = !COMMIT;

if (!TARGET || NOTES.length === 0) {
  console.error('使い方: node scripts/note-magazine-remove-articles.mjs --target <magazineKey> --notes <n1,n2> [--commit] [--limit N]');
  process.exit(64);
}

// ---- API helper（プロキシ + 失効チェック無効化。HTML が返ったら null） ----
// note API の取得は lib/note-api.mjs の curlJson に集約（DN-0694）。ここは「JSON か null」の従来の形に合わせる薄い包み
const curlJson = (url) => apiCurlJson(url).json;
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
console.log('=== note マガジン 記事の収録解除 ===');
console.log(`target : ${TARGET}`);
console.log(`notes  : ${NOTES.join(', ') || '(none)'}`);
console.log(`mode   : ${DRY ? 'DRY-RUN（--commit で本番）' : 'COMMIT（実解除）'}`);
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

// 外す対象 = 明示指定 ∩ 現収録（冪等）
let toRemove = NOTES.filter((k) => currentKeys.has(k)).map((k) => current.find((n) => n.key === k));
const notIn = NOTES.filter((k) => !currentKeys.has(k));
if (LIMIT > 0) toRemove = toRemove.slice(0, LIMIT);
console.log(`\n--- 解除計画 ---`);
console.log(`指定 ${NOTES.length} 件 / 収録に無い(skip) ${notIn.length} 件 / 今回外す ${toRemove.length} 件${LIMIT ? `（--limit ${LIMIT} 適用）` : ''}`);
for (const n of toRemove) console.log(`  - ${n.key}  ${String(n.name).slice(0, 50)}`);
if (toRemove.length === 0) { console.log('\n解除対象なし。完了。'); process.exit(0); }

mkdirSync(TMP, { recursive: true });

// ---- ブラウザ ----
let ctx;
try {
  ctx = await chromium.launchPersistentContext(PROFILE, leanContextOptions({
    headless: false, channel: 'chrome',
    proxy: PROXY ? { server: PROXY } : undefined,
    ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  }));
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
async function removeOne(noteKey, idx) {
  const name = targetMeta.name;
  const url = `https://note.com/${CREATOR}/n/${noteKey}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2800);

  // 「記事を追加」ボタン → マガジン選択ダイアログ
  const trigger = page.getByRole('button', { name: '記事を追加' }).first();
  if (!(await trigger.count())) { console.log(`  ${noteKey}: 「記事を追加」ボタンが無い（ログイン/オーナー権限/UI変更を確認）`); return 'trigger-miss'; }
  await trigger.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1800);
  const dlg = page.locator('[role="dialog"],[aria-modal="true"]').first();
  if (!(await dlg.count())) { console.log(`  ${noteKey}: ダイアログが開かず`); return 'dialog-miss'; }
  // ターゲットマガジン行を名前で特定 → 直後のボタン（追加/追加済）で判定
  const nameLoc = dlg.getByText(name, { exact: false }).first();
  if (!(await nameLoc.count())) { console.log(`  ${noteKey}: ダイアログに「${name}」が無い`); await closeDialog(dlg); return 'target-not-in-dialog'; }
  const stateBtn = nameLoc.locator('xpath=following::button[normalize-space()="追加" or normalize-space()="追加済"][1]');
  if (!(await stateBtn.count())) { console.log(`  ${noteKey}: 行の追加ボタンが見つからず`); await closeDialog(dlg); return 'button-miss'; }
  const label = (await stateBtn.first().innerText().catch(() => '')).replace(/\s+/g, '').trim();
  const rowText = (await nameLoc.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  if (!label.includes('追加済')) { console.log(`  ${noteKey}: 行「${rowText}」は未追加 (skip)`); await closeDialog(dlg); return 'already'; }

  if (DRY) { console.log(`  ${noteKey}: [dry-run] 行「${rowText}」=「${label}」→ 解除直前で停止（押さない）`); await closeDialog(dlg); return 'dry-ok'; }

  await stateBtn.first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1200);
  // 読み戻し: 同行が「追加」へ戻ったか
  const after = (await nameLoc.locator('xpath=following::button[normalize-space()="追加" or normalize-space()="追加済"][1]').first().innerText().catch(() => '')).replace(/\s+/g, '');
  await page.screenshot({ path: join(TMP, `note-remove-${idx}-after.png`) }).catch(() => {});
  await closeDialog(dlg);
  return after === '追加' ? 'removed' : 'removed-unconfirmed';
}

const results = { removed: 0, already: 0, dry: 0, miss: 0 };
try {
  let i = 0;
  for (const n of toRemove) {
    i++;
    process.stdout.write(`[${i}/${toRemove.length}] ${n.key} ... `);
    let r;
    try { r = await removeOne(n.key, i); } catch (e) { r = 'error:' + String(e).split('\n')[0].slice(0, 60); }
    console.log(r);
    if (r === 'removed') results.removed++;
    else if (r === 'already') results.already++;
    else if (r === 'dry-ok') results.dry++;
    else results.miss++;
    await page.waitForTimeout(1200 + (i % 3) * 400); // 軽い間隔（bot 検知緩和、index で揺らぎ）
  }
} finally {
  await ctx.close();
}

console.log(`\n--- 実行結果 ---`);
console.log(`解除 ${results.removed} / 既存 ${results.already} / dry ${results.dry} / 未処理(要調整) ${results.miss}`);

// ---- 完了後 API 検証 ----
if (COMMIT && results.removed > 0) {
  console.log('\n[検証] note API でターゲット収録を実体確認');
  const after = fetchMagazineNotes(TARGET);
  const afterKeys = new Set(after.map((n) => n.key));
  const want = toRemove.map((n) => n.key);
  const ok = want.filter((k) => !afterKeys.has(k)).length;
  console.log(`  収録: ${current.length} → ${after.length} 件（期待-${results.removed}）`);
  console.log(`  収録から消えたことの確認: ${ok}/${want.length}`);
  if (ok < want.length) { console.error('  ⚠ 一部が収録に残っている。.tmp スクショ確認 → セレクタ調整 → 再実行（冪等）'); process.exit(6); }
}

const exit = results.miss > 0 && !DRY ? 7 : 0;
console.log(`\n${exit === 0 ? '完了' : '一部未処理'} (exit ${exit})`);
process.exit(exit);
