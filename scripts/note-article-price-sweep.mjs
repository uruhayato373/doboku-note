#!/usr/bin/env node
/**
 * note-article-price-sweep.mjs
 * ---------------------------------------------------------------------------
 * 複数マガジンの収録記事（単品）の価格を一括変更する Playwright スクリプト。
 * note-edit-magazine.mjs の --articles ロジックを独立化・拡張。
 *
 * 設計: 「システム Chrome（channel:'chrome'）＋永続プロファイル」方式。
 *   初回のみ手動ログイン（`npm run note-edit-session` で実施）→ セッション永続化済み前提。
 *
 * 安全弁:
 *   1. 既定は dry-run（変更プレビューのみ）
 *   2. note API で対象記事を事前列挙し、現価格と変更後価格を表示
 *   3. --commit で実変更
 *   4. 変更後 note API で実体検証
 *
 * 使い方:
 *   # 建設部門マガジン（BK系）の全記事を ¥780 に
 *   node scripts/note-article-price-sweep.mjs --magazines m0f3bc3933454,m9e825cfd8348,... --price 780
 *
 *   # note-magazines.ts から pe-construction-* の published:true を自動抽出
 *   node scripts/note-article-price-sweep.mjs --pattern pe-construction --price 780
 *
 *   # 実変更
 *   node scripts/note-article-price-sweep.mjs --pattern pe-construction --price 780 --commit
 *
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CREATOR = 'dobokunote';
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

// ---- args ----
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const MAGAZINES_ARG = getArg('--magazines'); // comma-separated keys
const PATTERN = getArg('--pattern');          // note-magazines.ts の id パターン
const PRICE = getArg('--price');
const COMMIT = argv.includes('--commit');

if (!PRICE || (!MAGAZINES_ARG && !PATTERN)) {
  console.error(`使い方:
  node scripts/note-article-price-sweep.mjs --magazines <key1,key2,...> --price <price> [--commit]
  node scripts/note-article-price-sweep.mjs --pattern <id-pattern> --price <price> [--commit]

例:
  # 建設部門マガジンを ¥780 に（dry-run）
  node scripts/note-article-price-sweep.mjs --pattern pe-construction --price 780

  # 実変更
  node scripts/note-article-price-sweep.mjs --pattern pe-construction --price 780 --commit
`);
  process.exit(64);
}

// ---- note API helper ----
function curlJson(url) {
  const r = spawnSync('curl', ['-sS', '-m', '30', '--ssl-no-revoke', '-H', 'User-Agent: Mozilla/5.0', url], { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
  const b = (r.stdout || '').trim();
  if (b.startsWith('{') || b.startsWith('[')) { try { return JSON.parse(b); } catch { return null; } }
  return null;
}

function articleNotes(key) {
  const out = [];
  for (let p = 1; p <= 20; p++) {
    const d = curlJson(`https://note.com/api/v1/magazines/${key}/notes?page=${p}`);
    const notes = d?.data?.notes ?? [];
    if (notes.length === 0) break;
    out.push(...notes.map((n) => ({ key: n.key, name: n.name, price: n.price ?? 0, magazineKey: key })));
    if (d?.data?.isLastPage) break;
  }
  return out;
}

// ---- マガジンキー解決 ----
let magazineKeys = [];

if (MAGAZINES_ARG) {
  magazineKeys = MAGAZINES_ARG.split(',').map((k) => k.trim()).filter(Boolean);
} else if (PATTERN) {
  // note-magazines.ts から id パターンでフィルタ
  const tsPath = join(ROOT, 'src/lib/note-magazines.ts');
  const ts = readFileSync(tsPath, 'utf-8');
  // 簡易パース: 'id': { ... noteUrl: 'https://note.com/.../m/KEY' ... published: true }
  const re = new RegExp(`'(${PATTERN}[^']*)':\\s*\\{[^}]*noteUrl:\\s*['"]https://note\\.com/[^/]+/m/([a-z0-9]+)['"][^}]*published:\\s*true`, 'g');
  let m;
  while ((m = re.exec(ts))) {
    magazineKeys.push(m[2]);
  }
  console.log(`[pattern] "${PATTERN}" にマッチ: ${magazineKeys.length} マガジン`);
}

if (magazineKeys.length === 0) {
  console.error('対象マガジンが見つかりません');
  process.exit(1);
}

// ---- 対象記事を列挙 ----
console.log(`\n[1] 対象記事を列挙（${magazineKeys.length} マガジン）`);
const allArticles = [];
for (const k of magazineKeys) {
  const notes = articleNotes(k);
  console.log(`  ${k}: ${notes.length} 記事`);
  allArticles.push(...notes);
}

const toChange = allArticles.filter((a) => String(a.price) !== PRICE);
const alreadyOk = allArticles.filter((a) => String(a.price) === PRICE);

console.log(`\n[2] 価格変更対象`);
console.log(`  全記事: ${allArticles.length}`);
console.log(`  既に ¥${PRICE}: ${alreadyOk.length} (skip)`);
console.log(`  変更対象: ${toChange.length}`);

if (toChange.length === 0) {
  console.log('\n全て既に目標価格です。終了。');
  process.exit(0);
}

// ---- 変更対象を表示 ----
console.log(`\n[3] 変更内容プレビュー`);
for (const a of toChange.slice(0, 20)) {
  console.log(`  ${a.key}: ¥${a.price} → ¥${PRICE}  "${a.name.slice(0, 40)}"`);
}
if (toChange.length > 20) console.log(`  ... 他 ${toChange.length - 20} 件`);

if (!COMMIT) {
  console.log(`\n[dry-run] --commit を付けると実変更します。`);
  process.exit(0);
}

// ---- Playwright で価格変更 ----
console.log(`\n[4] 価格変更を実行（${toChange.length} 件）`);

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome',
  proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 },
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = ctx.pages()[0] || (await ctx.newPage());

let success = 0, failed = 0;
const errors = [];

try {
  for (const a of toChange) {
    try {
      // 記事編集画面を開く
      await page.goto(`https://editor.note.com/notes/${a.key}/edit/`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(2500);

      // 「公開に進む」をクリック
      const nextBtn = page.locator('button:has-text("公開に進む")').first();
      if (await nextBtn.count() === 0) { throw new Error('公開に進む ボタン未検出'); }
      await nextBtn.click();
      await page.waitForTimeout(3000);

      // 価格入力欄を探す（input[placeholder="300"] or input#price）
      let priceInput = page.locator('input[placeholder="300"]').first();
      if (await priceInput.count() === 0) {
        priceInput = page.locator('input#price').first();
      }
      if (await priceInput.count() === 0) { throw new Error('価格入力欄 未検出'); }

      // 価格をクリア＆入力
      await priceInput.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Delete');
      await priceInput.pressSequentially(PRICE, { delay: 60 });
      await page.waitForTimeout(300);

      // 入力値を確認
      const inputVal = await priceInput.inputValue();
      if (inputVal.trim() !== PRICE) { throw new Error(`価格入力失敗: ${inputVal}`); }

      // 有料エリア設定をクリック（公開済み記事の更新に必要）
      const areaBtn = page.locator('button:has-text("有料エリア設定")').first();
      if (await areaBtn.count()) {
        await areaBtn.click();
        await page.waitForTimeout(2500);
      }

      // 更新するボタンをクリック
      const updateBtn = page.locator('button:has-text("更新する")').first();
      if (await updateBtn.count() === 0 || await updateBtn.isDisabled()) {
        throw new Error('更新ボタン 無し/無効');
      }
      await updateBtn.click();
      await page.waitForTimeout(4500);

      console.log(`  ✓ ${a.key}: ¥${a.price} → ¥${PRICE}`);
      success++;
    } catch (e) {
      console.log(`  ✗ ${a.key}: ${String(e).split('\n')[0].slice(0, 60)}`);
      errors.push({ key: a.key, error: String(e).split('\n')[0] });
      failed++;
    }
  }
} finally {
  await ctx.close();
}

// ---- 検証 ----
console.log(`\n[5] 変更後検証`);
let verified = 0, notVerified = 0;
for (const a of toChange) {
  // 再取得して価格確認
  const notes = articleNotes(a.magazineKey);
  const updated = notes.find((n) => n.key === a.key);
  if (updated && String(updated.price) === PRICE) {
    verified++;
  } else {
    notVerified++;
    console.log(`  ⚠ ${a.key}: 期待¥${PRICE} / 実際¥${updated?.price ?? '?'}`);
  }
}

console.log(`\n[結果]`);
console.log(`  成功: ${success} / 失敗: ${failed}`);
console.log(`  検証OK: ${verified} / 検証NG: ${notVerified}`);

if (errors.length) {
  console.log(`\n[エラー詳細]`);
  for (const e of errors) {
    console.log(`  ${e.key}: ${e.error}`);
  }
}

process.exit(failed > 0 || notVerified > 0 ? 1 : 0);
