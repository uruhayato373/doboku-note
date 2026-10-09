#!/usr/bin/env node
import { resolveProfileDir } from './lib/playwright-auth-profile.mjs';
/**
 * note-magazine-cover.mjs
 * ---------------------------------------------------------------------------
 * note 有料マガジンの「見出し画像（eyecatch/cover）」を設定する再利用エンジン。
 * note-magazine-create（新規作成）/ note-edit-magazine（タイトル等編集）が扱わない
 * マガジンのカバー画像アップロードを担う。マガジン設定ページ
 * （https://note.com/{creator}/m/{key}/edit）でカバーをアップロードして保存する。
 *
 * 設計: 他 note 系スクリプトと同じ「システム Chrome(channel:chrome) + 永続プロファイル
 *   + proxy + ignoreHTTPSErrors」方式（会社PCの社内プロキシ越え・bot 回避）。
 *
 * 既定は PROBE（フォーム構造ダンプ・保存しない）。--commit でアップロード保存。
 *
 * 使い方:
 *   node scripts/note-magazine-cover.mjs --key <magKey> --dir <magazineDir>            # probe
 *   node scripts/note-magazine-cover.mjs --key <magKey> --dir <magazineDir> --commit   # 実保存
 *   node scripts/note-magazine-cover.mjs --key <magKey> --image <path.png> --commit    # 明示画像
 *     （--dir 指定時は <dir>/_cover.png を既定カバーに解決）
 *
 * 安全弁（収益アカウント）: account=dobokunote を assert / 既定 probe /
 *   保存後に note API で eyecatch!=null を実体検証（偽成功ガード）。
 * 真実源: .claude/knowledge/reference/note-api-verification.md
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leanContextOptions } from './lib/playwright-launch.mjs';
import { NOTE_CREATOR as CREATOR } from './lib/site-identity.mjs';
import { fetchCreatorMagazines } from './lib/note-api.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT });
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const KEY = getArg('--key');
const DIR = getArg('--dir');
const IMAGE = getArg('--image') || (DIR ? join(ROOT, DIR, '_cover.png') : null);
if (!KEY) { console.error('--key <magKey> required'); process.exit(1); }
if (!IMAGE || !existsSync(IMAGE)) { console.error('cover image not found: ' + IMAGE + '（--image か --dir で指定。Drive vault へ退避済みなら node scripts/drive-vault-sync.mjs --pull --group note-magazine-cover-png --commit で復元できる）'); process.exit(1); }
console.log(`[prep] key=${KEY} image=${IMAGE} mode=${COMMIT ? 'COMMIT(保存)' : 'PROBE'}`);

// 一覧の読み取りは共通の fetchCreatorMagazines（isLastPage まで読み、件数の欠落は投げる）。以前は自前で 12 ページ
// （1 ページ 6 誌＝72 誌）までしか読まず、73 誌目以降は登録に成功しても「未発見」で exit 6 になっていた（2026-10-07・111 誌）。
async function magazineCover(key) {
  try {
    const hit = (await fetchCreatorMagazines(CREATOR)).find((m) => m.key === key);
    return hit ? { name: hit.name, cover: hit.cover } : null;
  } catch (error) {
    console.error(`  [api] マガジン一覧を読めない: ${error.message}`);
    return null;
  }
}
// 登録前のカバー。保存後は「カバーがある」ではなく「これから変わった」で判定する（もとからカバーのある誌の偽成功を防ぐ）
const BEFORE = (await magazineCover(KEY))?.cover ?? null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ctx = await chromium.launchPersistentContext(PROFILE, leanContextOptions({
  headless: false, channel: 'chrome', proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1100 }, args: ['--disable-blink-features=AutomationControlled'],
}));
let exitCode = 0;
try {
  const page = ctx.pages()[0] || (await ctx.newPage());

  // account ゲート
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 }); await sleep(2500);
  if (!(await page.evaluate(() => document.body.innerText || '')).includes(CREATOR)) { console.error('ABORT: account != dobokunote'); await ctx.close(); process.exit(2); }
  console.log('[1] account gate OK (dobokunote)');

  // マガジン編集ページ
  await page.goto(`https://note.com/${CREATOR}/m/${KEY}/edit`, { waitUntil: 'networkidle', timeout: 60000 }); await sleep(3500);
  console.log('[2] magazine edit:', page.url());

  // フォーム構造ダンプ（カバー関連コントロールの探索）
  const probe = await page.evaluate(() => ({
    fileInputs: Array.from(document.querySelectorAll('input[type=file]')).map((i) => ({ id: i.id, accept: i.accept, name: i.name, hidden: i.offsetParent === null })),
    imgButtons: Array.from(document.querySelectorAll('button,[role=button],label,a')).map((b) => ({ t: (b.innerText || '').trim().slice(0, 16), al: (b.getAttribute('aria-label') || '').slice(0, 20) })).filter((b) => /画像|カバー|見出し|変更|追加|アップロード|カメラ|サムネ/.test(b.t + b.al)),
    imgs: Array.from(document.querySelectorAll('img')).map((i) => (i.src || '').slice(0, 60)).filter((s) => s).slice(0, 8),
    bodyHints: ['見出し画像', 'カバー画像', '画像を追加', '画像を変更', 'マガジン名'].filter((h) => document.body.innerText.includes(h)),
  }));
  console.log('[probe]', JSON.stringify(probe, null, 1));
  await page.screenshot({ path: join(ROOT, '.tmp/mag-cover-edit.png'), fullPage: true }).catch(() => {});

  if (!COMMIT) { console.log('PROBE のみ（--commit で保存）'); await ctx.close(); process.exit(0); }

  // --- カバーアップロード ---
  // (1) 画像追加/変更ボタンを開く（あれば）
  const opener = page.locator('button, [role=button], label, a').filter({ hasText: /画像を追加|画像を変更|見出し画像|カバー/ });
  if (await opener.count()) { try { await opener.first().click({ timeout: 6000 }); await sleep(1200); console.log('[3] opener clicked'); } catch (e) { console.log('[3] opener skip:', e.message.split('\n')[0]); } }
  const up = page.getByText('画像をアップロード', { exact: false });
  if (await up.count()) { try { await up.first().click(); await sleep(1000); console.log('[3] 画像をアップロード clicked'); } catch {} }

  // (2) file input に setInputFiles（hidden でも setInputFiles は効く）
  const fileInput = page.locator('input[type=file]').first();
  if (!(await fileInput.count())) { console.error('ABORT: file input 未検出'); await page.screenshot({ path: join(ROOT, '.tmp/mag-cover-nofileinput.png') }).catch(() => {}); await ctx.close(); process.exit(4); }
  await fileInput.setInputFiles(IMAGE, { timeout: 10000 }); await sleep(3000);
  console.log('[4] image setInputFiles');
  await page.screenshot({ path: join(ROOT, '.tmp/mag-cover-uploaded.png'), fullPage: true }).catch(() => {});

  // (3) クロップ/位置調整ダイアログの確定ボタン（label が版で揺れるため動的に解決）
  await sleep(1500);
  const dlgBtns = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]') || document.querySelector('.ReactModal__Content') || document.body;
    return Array.from(dlg.querySelectorAll('button')).map((b) => (b.innerText || '').trim()).filter(Boolean);
  });
  console.log('[5] dialog buttons:', JSON.stringify(dlgBtns));
  // 確定ボタン優先順: 明示語 → ダイアログ内で キャンセル/閉じる でない最後のボタン
  let clicked = false;
  const prefer = page.getByRole('button', { name: /切り抜く|この画像|使用|適用|保存|完了|決定|設定|OK|追加/ });
  if (await prefer.count()) { try { await prefer.last().click({ timeout: 6000 }); clicked = true; console.log('[5] crop 確定（明示語）'); } catch (e) { console.log('[5] prefer click err:', e.message.split('\n')[0]); } }
  if (!clicked) {
    const primary = await page.evaluate(() => {
      const dlg = document.querySelector('[role=dialog]') || document.querySelector('.ReactModal__Content');
      if (!dlg) return false;
      const cands = Array.from(dlg.querySelectorAll('button')).filter((b) => { const t = (b.innerText || '').trim(); return t && !/キャンセル|閉じる|戻る/.test(t); });
      if (!cands.length) return false;
      cands[cands.length - 1].setAttribute('data-mc-primary', '1'); return true;
    });
    if (primary) { try { await page.click('[data-mc-primary="1"]'); clicked = true; console.log('[5] crop 確定（dialog primary）'); } catch (e) { console.log('[5] primary click err:', e.message.split('\n')[0]); } }
  }
  if (clicked) await sleep(3000); else console.log('[5] crop 確定ボタン未検出（ダイアログ無し?）');

  // (3b) 新カバーのプレビュー実体出現を待つ（アップロード完了前に「更新」を押すと画像なし保存になる: 2026-07-25）
  let previewOk = false;
  for (let i = 0; i < 20 && !previewOk; i++) {
    previewOk = await page.evaluate(() => [...document.querySelectorAll('img')].some((im) => /blob:|st-note|uploads/.test(im.src || '') && !/default_magazine/.test(im.src || '') && im.width > 100));
    if (!previewOk) await sleep(1500);
  }
  console.log('[5b] カバープレビュー実体=' + previewOk);
  if (!previewOk) { console.error('ABORT: プレビュー未出現→保存せず中断'); await page.screenshot({ path: join(ROOT, '.tmp/mag-cover-nopreview.png') }).catch(() => {}); await ctx.close(); process.exit(5); }

  // (4) マガジン設定の「更新」保存
  const upd = page.locator('button:has-text("更新")').first();
  if (await upd.count()) {
    const disabled = await upd.isDisabled();
    console.log('[6] 更新ボタン disabled=' + disabled);
    if (!disabled) { await upd.click(); await sleep(3000); console.log('[6] 更新クリック'); }
    else { console.log('[6] 更新無効（変更未検出の疑い）— 画像のみで保存不要の可能性'); }
  } else { console.log('[6] 更新ボタン未検出'); }
  // (4b) 反映を API ポーリングで待ってからブラウザを閉じる（送信中クローズによる保存ロスト防止）
  for (let i = 0; i < 12; i++) {
    const m = await magazineCover(KEY);
    if (m?.cover && m.cover !== BEFORE) { console.log('[6b] API 反映確認 (' + (i + 1) + '回目)'); break; }
    await sleep(2500);
  }
  await page.screenshot({ path: join(ROOT, '.tmp/mag-cover-saved.png'), fullPage: true }).catch(() => {});
} finally { await ctx.close(); }

// 保存後 API 検証
if (COMMIT && exitCode === 0) {
  console.log('\n[検証] note API で cover 実体確認');
  const m = await magazineCover(KEY);
  console.log(`  マガジン: ${m?.name} / cover=${m?.cover ? (m.cover === BEFORE ? '変わらない ✗ ' : 'SET ✓ ') + m.cover.slice(0, 70) : 'null ✗'}`);
  if (!m) { console.error('  ⚠ マガジンを一覧で見つけられない（検証不成立）'); exitCode = 6; }
  else if (!m.cover) { console.error('  ⚠ cover が未反映（保存失敗の疑い）'); exitCode = 6; }
  else if (m.cover === BEFORE) { console.error('  ⚠ cover が登録前と同じ（保存失敗の疑い）'); exitCode = 6; }
}
console.log(`\n${exitCode === 0 ? '完了' : 'エラーあり'} (exit ${exitCode})`);
process.exit(exitCode);
