#!/usr/bin/env node
/**
 * note-edit-magazine.mjs
 * ---------------------------------------------------------------------------
 * note の有料マガジン設定（タイトル/説明/アピール/価格）と、必要なら収録記事の
 * 単品価格を、対応する _meta.yaml の値へ自動反映する再利用エンジン。
 *
 * 設計: publish-x と同じ「システム Chrome（channel:'chrome'）＋永続プロファイル」方式。
 *   組み込み Chromium だと note/Google に bot 判定されるため channel:'chrome' 必須。
 *   初回のみ手動ログイン（`npm run note-edit-session` で実施）→ セッション永続化済み前提。
 *
 * 安全段階（収益アカウントのため）:
 *   1. _meta.yaml から値抽出（リテラル正規表現・block scalar 対応）
 *   2. note 文字数制限を事前チェック（タイトル≈30字 / アピール≤250字 = 超過で保存不可）
 *   3. フォーム入力 → inputValue で読み戻し照合 → 「更新」ボタン enabled 確認
 *   4. --dry-run なら保存せずスクショのみ。本番は保存
 *   5. 保存後 note API で price/title を実体検証
 *
 * 使い方:
 *   npm run note-edit-magazine -- --key <magazineKey> --meta <path/_meta.yaml> [--articles] [--dry-run]
 *     --key      対象マガジンの note key（例: m6854c7437d4d）
 *     --meta     値の源となる _meta.yaml のパス
 *     --articles 収録記事の単品価格も articlePrice へ揃える（公開フロー経由）
 *     --dry-run  入力・検証・スクショまで（保存しない）
 *
 * 真実源: .claude/knowledge/reference/note-api-verification.md
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseNoteText, checkLimits } from './lib/note-meta.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CREATOR = 'dobokunote';
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

// ---- args ----
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const KEY = getArg('--key');
const DIR = getArg('--dir');
const TXT = getArg('--txt') || (DIR ? join(DIR, 'note掲載文.txt') : null);
const DO_ARTICLES = argv.includes('--articles');
const DRY = argv.includes('--dry-run');
if (!KEY || !TXT) {
  console.error('使い方: npm run note-edit-magazine -- --key <magazineKey> --txt <note掲載文.txt>（or --dir <magazineDir>）[--articles] [--dry-run]');
  process.exit(64);
}

// ---- note掲載文.txt 抽出（共有 lib・SoT） ----
const meta = parseNoteText(readFileSync(TXT, 'utf-8'));
const title = meta.title, desc = meta.description, appeal = meta.appealPoint;
const setPrice = String(meta.setPrice || ''), articlePrice = String(meta.articlePrice || '');
if (!title || !desc || !appeal || !setPrice) {
  console.error('PARSE_FAIL: タイトル/説明/アピール/セット価格 のいずれかが取れません', { title: !!title, desc: !!desc, appeal: !!appeal, setPrice });
  process.exit(2);
}
console.log(`抽出: title=${title.length}字 desc=${desc.length} appeal=${appeal.length} setPrice=${setPrice} articlePrice=${articlePrice || '-'}`);

// ---- note 文字数制限の事前チェック（超過は abort・lint で是正） ----
const lim = checkLimits(meta);
if (lim.length) { console.error('ABORT: note文字数制限超過 →', lim.join(' / '), '（npm run note-meta-lint で是正してください）'); process.exit(3); }

// ---- API helper（保存後検証） ----
function curlJson(url) {
  const r = spawnSync('curl', ['-sS', '-m', '30', '--ssl-no-revoke', '-H', 'User-Agent: Mozilla/5.0', url], { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
  const b = (r.stdout || '').trim();
  if (b.startsWith('{') || b.startsWith('[')) { try { return JSON.parse(b); } catch { return null; } }
  return null;
}
function magazinePrice(key) {
  for (let p = 1; p <= 4; p++) {
    const d = curlJson(`https://note.com/api/v2/creators/${CREATOR}/contents?kind=magazine&page=${p}`);
    const c = d?.data?.contents ?? [];
    const hit = c.find((m) => m.key === key);
    if (hit) return { name: hit.name, price: hit.price };
    if (d?.data?.isLastPage || c.length === 0) break;
  }
  return null;
}
function articleNotes(key) {
  const out = [];
  for (let p = 1; p <= 10; p++) {
    const d = curlJson(`https://note.com/api/v1/magazines/${key}/notes?page=${p}`);
    const notes = d?.data?.notes ?? [];
    if (notes.length === 0) break;
    out.push(...notes.map((n) => ({ key: n.key, name: n.name, price: n.price ?? 0 })));
    if (d?.data?.isLastPage) break;
  }
  return out;
}

// ---- 実行 ----
const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome',
  proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1100 },
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = ctx.pages()[0] || (await ctx.newPage());
let exitCode = 0;

async function setField(loc, value) {
  await loc.click(); await loc.fill(value);
  await loc.evaluate((e) => { e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); if (e.blur) e.blur(); });
  await page.waitForTimeout(220);
}

try {
  // ===== マガジン設定 =====
  console.log(`\n[マガジン] ${KEY} を編集`);
  await page.goto(`https://note.com/${CREATOR}/m/${KEY}/edit`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(3500);
  const titleIn = page.locator('input[type="text"]').first();
  const ta = page.locator('textarea');
  const priceIn = page.locator('input[type="number"]').first();
  await setField(titleIn, title);
  await setField(ta.nth(0), desc);
  await setField(ta.nth(1), appeal);
  await setField(priceIn, setPrice);
  await page.keyboard.press('Tab'); await page.waitForTimeout(900);
  const rb = { title: await titleIn.inputValue(), desc: await ta.nth(0).inputValue(), appeal: await ta.nth(1).inputValue(), price: await priceIn.inputValue() };
  const ok = rb.title.trim() === title.trim() && rb.desc.trim() === desc.trim() && rb.appeal.trim() === appeal.trim() && rb.price.trim() === setPrice.trim();
  const upd = page.locator('button:has-text("更新")').first();
  const disabled = await upd.isDisabled();
  console.log(`  読み戻し一致=${ok} / 更新ボタン disabled=${disabled}`);
  await page.screenshot({ path: join(ROOT, '.tmp/note-edit-magazine.png'), fullPage: true }).catch(() => {});
  if (!ok) { console.error('  ABORT: 読み戻し不一致'); exitCode = 4; }
  else if (DRY) { console.log('  [dry-run] 保存せず（.tmp/note-edit-magazine.png 確認）'); }
  // 「変更不要（既に目標値）」と「変更できない（文字数制限等）」を区別する。
  // 読み戻しが目標値と一致していれば、ボタンが無効なのは変えるものが無いからで、正常。
  // 混同すると、記事の単品価格だけ直したい再実行が毎回ここで止まる（2026-08-13 実発生）。
  else if (disabled && ok) { console.log('  変更不要（既に目標値・保存はスキップして次へ）'); }
  else if (disabled) { console.error('  ABORT: 更新ボタン無効（文字数制限・未変更の疑い）'); exitCode = 5; }
  else { await upd.click(); await page.waitForTimeout(5000); console.log('  保存（更新）クリック完了'); }

  // ===== 収録記事の単品価格 =====
  if (DO_ARTICLES && articlePrice && exitCode === 0) {
    console.log(`\n[記事] 単品価格を ¥${articlePrice} へ`);
    const notes = articleNotes(KEY);
    for (const n of notes) {
      if (String(n.price) === articlePrice) { console.log(`  ${n.key}: 既に¥${articlePrice} (skip)`); continue; }
      try {
        await page.goto(`https://editor.note.com/notes/${n.key}/edit/`, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(3000);
        await page.locator('button:has-text("公開に進む")').first().click();
        await page.waitForTimeout(3000);
        const pf = page.locator('input[placeholder="300"]').first();
        // 全選択は macOS だけ Meta+A。Ctrl+A は行頭移動の emacs binding で選択されず、
        // 既存値が残ったまま追記されて入力値が一致せず「価格入力失敗」で全件 skip する
        // （2026-08-13 に主任技士5本で実発生。note-update-body.mjs:233 と同じ罠）。
        // fill() は React の onChange を発火しない実装があるため pressSequentially を維持する。
        await pf.click();
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
        await page.keyboard.press('Delete');
        if (DRY) { console.log(`  [dry-run] ${n.key}: ¥${n.price}→¥${articlePrice}（保存せず）`); continue; }
        await pf.pressSequentially(articlePrice, { delay: 80 }); await page.waitForTimeout(300);
        if ((await pf.inputValue()).trim() !== articlePrice) { console.log(`  ${n.key}: 価格入力失敗 skip`); continue; }
        await page.locator('button:has-text("有料エリア設定")').first().click();
        await page.waitForTimeout(2500);
        const u2 = page.locator('button:has-text("更新する")').first();
        if (await u2.count() === 0 || await u2.isDisabled()) { console.log(`  ${n.key}: 更新ボタン無し/無効 skip`); continue; }
        await u2.click(); await page.waitForTimeout(5500);
        console.log(`  ${n.key}: ¥${n.price}→¥${articlePrice} 更新完了`);
      } catch (e) { console.log(`  ${n.key}: ERROR ${String(e).split('\n')[0].slice(0, 70)}`); }
    }
  }
} finally {
  await ctx.close();
}

// ===== 保存後 API 検証 =====
if (!DRY && exitCode === 0) {
  console.log('\n[検証] note API 実体確認');
  const mp = magazinePrice(KEY);
  console.log(`  マガジン: ${mp?.name} / ¥${mp?.price} (期待¥${setPrice})`);
  if (mp && String(mp.price) !== setPrice) { console.error('  ⚠ マガジン価格が一致しません'); exitCode = 6; }
  if (DO_ARTICLES && articlePrice) {
    const notes = articleNotes(KEY);
    const bad = notes.filter((n) => String(n.price) !== articlePrice);
    console.log(`  記事: ${notes.length}件中 ¥${articlePrice}=${notes.length - bad.length} / 不一致=${bad.length}`);
    if (bad.length) { console.error('  ⚠ 一部記事の価格が未反映:', bad.map((b) => b.key).join(',')); exitCode = 6; }
  }
}
console.log(`\n${exitCode === 0 ? '完了' : 'エラーあり'} (exit ${exitCode})`);
process.exit(exitCode);
