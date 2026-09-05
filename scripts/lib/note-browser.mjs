/**
 * note-browser.mjs — note.com 編集スクリプト共通の Playwright ブラウザ起動 / account ゲート
 * ---------------------------------------------------------------------------
 * account ゲート（/settings/account を開いて body に期待アカウント名が
 * 出るまで polling する）と launchPersistentContext の起動オプションが、note-*.mjs /
 * check-note-*.mjs 側で 15 本以上コピペされ、リトライ回数・待機 ms・viewport・
 * proxy/ignoreHTTPSErrors の有無がファイルごとに少しずつズレていた
 * （note-update-body paste 無音失敗事故の震源のひとつ）。ここへ一元化する。
 *
 * 設計方針（外科的移行のため）:
 *   - このファイルは console.log/error を一切出さない。判定結果（{ok, ...}）を
 *     返すだけで、メッセージ文言・exit code は呼び出し側スクリプトが今までどおり
 *     自分で持つ。スクリプトごとに文言が違う（"ABORT: account != dobokunote" /
 *     "✗ ABORT: note にログインしていない（npm run note-edit-session で1回ログインする）"
 *     等）ため、文言まで lib に寄せると移行のたびに出力差分が生まれてしまう。
 *   - リトライ回数・待機 ms・viewport 等は全部 opts 引数。デフォルト値は既存実装で
 *     もっとも多い組み合わせ（10 回 × 2000ms・1366x1000）に合わせたが、
 *     各スクリプトは自分の実測値（12×2500 / 10×1500 等）を明示的に渡して
 *     移行前の挙動を再現すること（デフォルト任せにしない）。
 *
 * 有料境界（paidBoundary）判定ロジックはここには置かない・置かないでください。
 * 収益直結のため各スクリプトへインライン保持する。
 * 既存実装は一括移行せず、修正対象になった時点でこの共有 lib へ移し、挙動同一を確認する。
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveProfileDir } from './playwright-auth-profile.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** 全 note-*.mjs / check-note-*.mjs が共有する永続プロファイル（note ログインセッション）。 */
export const PROFILE = resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT });

/** 会社 PC のプロキシ越しに Chrome を起動するため。未設定なら undefined（システム既定）。 */
const ENV_PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * note 編集スクリプト共通のブラウザ起動。
 *
 * 既存 15 本以上の実測でもっとも多い形
 *   `chromium.launchPersistentContext(PROFILE, { headless:false, channel:'chrome',
 *      proxy: PROXY ? {server:PROXY} : undefined, ignoreHTTPSErrors:true,
 *      viewport:{width:1366,height:1000}, args:['--disable-blink-features=AutomationControlled'] })`
 * を既定値として関数化した。viewport だけがスクリプトごとに 1366x1000 / 1366x1100 /
 * 1400x1050 / 1280x900 とズレていたので、そこだけ opts.viewport で吸収する。
 *
 * @param {object} [opts]
 * @param {string} [opts.profile=PROFILE]  永続プロファイルのパス
 * @param {boolean} [opts.headless=false]  既定は headed（目視ログイン・bot 判定回避のため）
 * @param {{width:number,height:number}} [opts.viewport={width:1366,height:1000}]
 * @param {string} [opts.proxy]  未指定なら環境変数 HTTPS_PROXY/HTTP_PROXY を使う
 * @param {string[]} [opts.extraArgs=[]]  '--disable-blink-features=AutomationControlled' に追加する Chrome 起動引数
 * @returns {Promise<import('playwright').BrowserContext>}
 */
export async function launchNoteContext(opts = {}) {
  const {
    profile = PROFILE,
    headless = false,
    viewport = { width: 1366, height: 1000 },
    proxy = ENV_PROXY,
    extraArgs = [],
  } = opts;
  return chromium.launchPersistentContext(profile, {
    headless,
    channel: 'chrome', // システム Chrome（組み込み Chromium は note/Google に bot 判定される）
    proxy: proxy ? { server: proxy } : undefined,
    ignoreHTTPSErrors: true,
    viewport,
    args: ['--disable-blink-features=AutomationControlled', ...extraArgs],
  });
}

/**
 * account ゲート判定。/settings/account（または任意 url）を開き、body の innerText に
 * 期待アカウント名が出るまで最大 attempts 回 polling する。
 *
 * 既存実装は 2 系統あった。どちらも同じ形（attempts × intervalMs）に一般化できる:
 *   - 単発チェック（check-note-attachments 等）: goto → sleep(1500) → 1回 evaluate
 *     = attempts:1, intervalMs:1500 と等価
 *   - リトライループ（note-delete-note / note-publish / note-update-body 等）:
 *     for (12 or 10 回) { sleep(2500 or 2000); evaluate（時々 try/catch で握りつぶし） }
 *     = attempts:12/10, intervalMs:2500/2000 と等価
 *
 * evaluate を try/catch で包むのは、ページ遷移中の一時的な失敗でループを壊さないため
 * （note-delete-note / note-publish が既にこの形）。単発チェック系にとっては
 * 「evaluate が例外を投げたら未捕捉クラッシュ」から「ABORT で穏当に失敗」に変わる、
 * 唯一のわずかな挙動差分（成功パスの出力には影響しない）。
 *
 * @param {import('playwright').Page} page
 * @param {object} [opts]
 * @param {string} [opts.expected='dobokunote']  body innerText に含まれるべき文字列
 * @param {string|null} [opts.url='https://note.com/settings/account']
 *   非 null なら内部で goto する。呼び出し側が既に該当ページを開いている場合は null を渡す
 *   （goto のタイムアウト/待機を呼び出し側の既存コードのまま変えたくない場合はこちら）。
 * @param {number} [opts.gotoTimeoutMs=60000]
 * @param {boolean} [opts.waitNetworkIdle=false]  goto 後に networkidle を待つか（note-delete-note 系）
 * @param {number} [opts.attempts=10]     最大チェック回数（1 なら単発チェックと等価）
 * @param {number} [opts.intervalMs=2000] 各チェック前に待つ ms
 * @returns {Promise<{ok: boolean, attemptsUsed: number}>}
 */
export async function assertAccountGate(page, opts = {}) {
  const {
    expected = 'dobokunote',
    url = 'https://note.com/settings/account',
    gotoTimeoutMs = 60000,
    waitNetworkIdle = false,
    attempts = 10,
    intervalMs = 2000,
  } = opts;

  if (url) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: gotoTimeoutMs });
    if (waitNetworkIdle) {
      try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch { /* 重いページの単発タイムアウトは無視 */ }
    }
  }

  for (let i = 0; i < attempts; i += 1) {
    await sleep(intervalMs);
    let text = '';
    try { text = await page.evaluate(() => document.body.innerText || ''); } catch { /* 遷移中の一時的失敗は次の試行へ */ }
    if (text.includes(expected)) return { ok: true, attemptsUsed: i + 1 };
  }
  return { ok: false, attemptsUsed: attempts };
}
