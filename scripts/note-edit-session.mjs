#!/usr/bin/env node
/**
 * note-edit-session.mjs
 * ---------------------------------------------------------------------------
 * ヘッド付き Chromium を「永続プロファイル」で起動し、note の編集画面まで開いて
 * 待機する半自動ランチャ。読み取り検証（verify-note-magazines）の書き込み版。
 *
 * 設計方針:
 *   - 初回のみ画面で手動ログイン（パスワードはスクリプトが一切扱わない）。
 *     セッションは userDataDir に永続化され、次回からは自動でログイン済みになる。
 *   - 指定 URL（マガジン設定 / 記事編集）まで自動で到達して待機するだけ。
 *     編集・保存は人手で行う（自動保存はしない: note 規約・bot 検知・誤操作回避）。
 *   - 会社 PC プロキシ対応: HTTP(S)_PROXY を Chromium に渡し、ignoreHTTPSErrors。
 *
 * 使い方:
 *   npm run note-edit-session                      # マガジン設定一覧を開く
 *   npm run note-edit-session -- <note の URL>       # 指定ページを開く
 *   npm run note-edit-session -- m6854c7437d4d       # マガジン key だけでも可
 *
 * セッション保存先: ~/.doboku-note-session（リポジトリ外。cookie を含むため git に入れない）
 * 前提: chromium バイナリは導入済（@playwright/test 1.59.x）。未導入なら
 *       `npx playwright install chromium` を先に実行。
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
// publish-x と同じ「システム Chrome + 永続プロファイル」方式。
// 組み込み Chromium だと Google/note に bot 判定されるため channel:'chrome' 必須。
const userDataDir = join(PROJECT_ROOT, '.local/playwright-note-profile');

// 引数を URL へ正規化（フルURL / マガジンkey / パスのいずれも受ける）
let target = process.argv[2] || 'https://note.com/sitesettings/magazines';
if (/^m[0-9a-f]{6,}$/.test(target)) {
  target = `https://note.com/dobokunote/m/${target}`;
} else if (!/^https?:\/\//.test(target)) {
  target = 'https://note.com/' + target.replace(/^\//, '');
}

console.log('=== note 編集セッション ===');
console.log('セッション保存先:', userDataDir, '（リポジトリ外・git管理しない）');
console.log('proxy            :', proxy || '(none)');
console.log('開く URL         :', target);

let ctx;
try {
  ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome', // システム Chrome（組み込み Chromium は bot 判定される）
    proxy: proxy ? { server: proxy } : undefined,
    ignoreHTTPSErrors: true,
    viewport: { width: 1366, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
} catch (e) {
  const msg = String(e).split('\n')[0];
  console.error('\nLAUNCH_FAIL:', msg);
  if (/not found|Executable doesn't exist|channel/.test(msg)) {
    console.error('→ システム Chrome が見つからない可能性。Google Chrome をインストールしてください（Edge では channel を "msedge" に変更）。');
  }
  process.exit(11);
}

const page = ctx.pages()[0] || (await ctx.newPage());
try {
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });
} catch (e) {
  console.log('goto 警告:', String(e).split('\n')[0]);
}

await page.waitForTimeout(2000);
const head = (await page.innerText('body').catch(() => '')).replace(/\s+/g, ' ').slice(0, 400);
const loggedOut = /会員登録/.test(head) && !/ログアウト|アカウント設定/.test(head);

console.log('');
if (loggedOut) {
  console.log('[要ログイン] 画面で初回ログインしてください（パスワードはこのスクリプトが扱いません）。');
  console.log('  ログイン後、目的の編集画面へ移動 → タイトル等を編集 → 保存してください。');
  console.log('  セッションは保存され、次回からは自動でログイン済みになります。');
} else {
  console.log('[ログイン済み] ページを開きました。編集 → 保存してください。');
}
console.log('');
console.log('ウィンドウを閉じると終了します（Ctrl+C でも可）。');

// ブラウザが閉じられるまで待機
await new Promise((resolve) => {
  ctx.on('close', resolve);
});
console.log('セッション終了。');
process.exit(0);
