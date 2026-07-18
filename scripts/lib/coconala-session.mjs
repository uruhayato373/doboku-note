/**
 * coconala-session.mjs — ココナラ Playwright 自動操作の共有セッション基盤
 * ---------------------------------------------------------------------------
 * note-publish.mjs の「システム Chrome(channel:chrome) + 永続プロファイル +
 * account gate」方式を踏襲。ココナラ専用の永続プロファイル
 * (.local/playwright-coconala-profile) を使い、ログイン状態を跨いで保持する。
 *
 * 安全弁（収益アカウントのため note と同思想）:
 *   - launchContext: 永続プロファイル。初回だけ headed でユーザーが手動ログイン。
 *   - waitForLogin: ログイン済み状態を polling で確認（未ログインなら手動ログインを待つ）。
 *   - assertAccount: 期待 sellerName（coconala-account.json の sellerName）と一致を assert。
 *       不一致は呼び出し側で即中断（誤アカウント操作の防止）。sellerName 未設定時は
 *       「ログイン済みであること」だけを確認する（初回出品前は名前が未確定なため）。
 *
 * log/エラーは呼び出し側のスクリプトが握る。ここは部品のみ。
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PROFILE = join(ROOT, '.local/playwright-coconala-profile');
export const ACCOUNT_PATH = join(ROOT, '.claude/config/coconala-account.json');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** coconala-account.json を読む（無ければ空オブジェクト） */
export function readAccount() {
  try {
    return JSON.parse(readFileSync(ACCOUNT_PATH, 'utf8'));
  } catch {
    return {};
  }
}

export const CATALOG_PATH = join(ROOT, 'src/lib/coconala-services.ts');
export const LISTINGS_PATH = join(ROOT, '.claude/config/coconala-listings.json');

/**
 * カタログ SoT（coconala-services.ts）から id/status/serviceUrl/priceYen/title を抽出。
 * check-coconala-wiring.mjs と同じ正規表現方式（TS を node で直接 import できないため）。
 * @returns {Record<string, {id,status,serviceUrl,priceYen,title,listedAt}>}
 */
export function readCatalog() {
  const ts = readFileSync(CATALOG_PATH, 'utf-8');
  const rawStart = ts.indexOf('const SERVICES_RAW');
  const body = rawStart >= 0 ? ts.slice(rawStart) : ts;
  const re = /id:\s*'([^']+)',\s*status:\s*'([^']+)',\s*serviceUrl:\s*'([^']*)'/g;
  const hits = [];
  let m;
  while ((m = re.exec(body))) hits.push({ id: m[1], status: m[2], serviceUrl: m[3], at: m.index });
  const out = {};
  hits.forEach((cur, i) => {
    const slice = body.slice(cur.at, hits[i + 1] ? hits[i + 1].at : body.length);
    const pm = slice.match(/priceYen:\s*(\d+)/);
    const tm = slice.match(/title:\s*'([^']*)'|title:\s*"([^"]*)"/);
    const lm = slice.match(/listedAt:\s*'([^']*)'/);
    out[cur.id] = {
      id: cur.id,
      status: cur.status,
      serviceUrl: cur.serviceUrl,
      priceYen: pm ? parseInt(pm[1], 10) : null,
      title: tm ? (tm[1] || tm[2]) : '',
      listedAt: lm ? lm[1] : null,
    };
  });
  return out;
}

/** listings SoT（coconala-listings.json）を読む */
export function readListings() {
  try {
    return JSON.parse(readFileSync(LISTINGS_PATH, 'utf8')).listings || {};
  } catch {
    return {};
  }
}

/** カタログ（coconala-services.ts）の該当 service を status:'listed' + serviceUrl + listedAt に書き戻す */
export function writeBackCatalog(id, url, today) {
  try {
    let ts = readFileSync(CATALOG_PATH, 'utf-8');
    const day = today || new Date().toISOString().slice(0, 10);
    const idRe = new RegExp(`(id:\\s*'${id}',[\\s\\S]*?)(\\n\\s*\\},)`);
    const m = ts.match(idRe);
    if (!m) return false;
    let block = m[1];
    block = block.replace(/status:\s*'[^']*'/, "status: 'listed'");
    block = block.replace(/serviceUrl:\s*'[^']*'/, `serviceUrl: '${url}'`);
    if (/listedAt:/.test(block)) block = block.replace(/listedAt:\s*'[^']*'/, `listedAt: '${day}'`);
    else block = block.replace(/(weeklyCapacity:\s*\d+,)/, `$1\n    listedAt: '${day}',`);
    ts = ts.replace(idRe, block + m[2]);
    writeFileSync(CATALOG_PATH, ts);
    return true;
  } catch { return false; }
}

/**
 * 永続プロファイルで Chrome を起動。note と同じ channel:chrome + proxy + ignoreHTTPSErrors。
 * headless は既定 false（ログイン状態の目視・初回ログインのため）。--headless で上書き可。
 */
export async function launchContext({ headless = false } = {}) {
  return chromium.launchPersistentContext(PROFILE, {
    headless,
    channel: 'chrome',
    proxy: PROXY ? { server: PROXY } : undefined,
    ignoreHTTPSErrors: true,
    viewport: { width: 1366, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
}

/**
 * ログイン済み状態を待つ。coconala.com/mypage を開き、ログインフォームでなく
 * マイページ内容が描画されるまで polling する。初回は headed 画面でユーザーが
 * 手動ログインするのを待つ（最大 waitMinutes 分）。
 * @returns {Promise<{ok:boolean, reason?:string}>}
 */
// ログイン確認は /mypage/dashboard を使う（/mypage は描画が重く domcontentloaded でも
// 60s タイムアウトすることがある。dashboard は安定して返る＝2026-07-18 実測）。
const LOGIN_CHECK_URL = 'https://coconala.com/mypage/dashboard';

/** goto を軽リトライで堅牢化（重いページの単発タイムアウトを吸収） */
async function gotoResilient(page, url, { tries = 2, timeout = 45000 } = {}) {
  for (let i = 0; i < tries; i++) {
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout }); return true; }
    catch { if (i === tries - 1) return false; await sleep(1500); }
  }
  return false;
}

export async function waitForLogin(page, { waitMinutes = 6, tag = '[login]' } = {}) {
  await gotoResilient(page, LOGIN_CHECK_URL);
  try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch {}
  const deadline = Date.now() + waitMinutes * 60_000;
  let warned = false;
  while (Date.now() < deadline) {
    // ログイン判定: URL が /login でない かつ ヘッダにマイページ/出品導線 or アバターがある
    const state = await page.evaluate(() => {
      const url = location.href;
      const bodyText = document.body?.innerText || '';
      const onLogin = /\/login|\/signup/.test(url) || /ログイン|会員登録/.test(document.title || '');
      // ログイン後のマイページに出る要素の広めの検出（DOM 変更に強いよう複数シグナル）
      const signedIn =
        /マイページ|出品管理|取引管理|お知らせ|ログアウト/.test(bodyText) ||
        !!document.querySelector('[href*="/mypage"], [href*="/logout"], [data-testid*="user"], img[alt*="プロフィール"]');
      return { url, onLogin, signedIn };
    });
    if (!state.onLogin && state.signedIn) return { ok: true };
    if (!warned) {
      console.log(`${tag} 未ログイン。開いた Chrome でココナラにログインしてください（最大 ${waitMinutes} 分待機）…`);
      warned = true;
    }
    await sleep(3000);
    // ユーザーが手動でログインページから遷移した場合に備え再訪
    if (/\/login|\/signup/.test(page.url())) {
      await gotoResilient(page, LOGIN_CHECK_URL, { tries: 1 });
    }
  }
  return { ok: false, reason: `ログイン待機がタイムアウト（${waitMinutes}分）` };
}

/**
 * ログイン中のアカウントが期待 sellerName と一致するか assert。
 * sellerName 未設定（初回出品前）なら「ログイン済み」だけを確認して pass する。
 * @returns {Promise<{ok:boolean, seller?:string, reason?:string}>}
 */
export async function assertAccount(page, { tag = '[account]' } = {}) {
  const acct = readAccount();
  const expected = (acct.sellerName || '').trim();
  if (!expected) {
    console.log(`${tag} sellerName 未設定のため「ログイン済み」のみ確認（coconala-account.json に sellerName を入れると厳格 assert）`);
    return { ok: true, seller: '' };
  }
  // 出品サービス管理ページはグローバルヘッダ＋プロフィール名を確実に描画する。
  // 本文テキストに期待 sellerName が含まれるかで判定（DOM 変更に強い包含チェック）。
  await gotoResilient(page, 'https://coconala.com/mypage/services_lists');
  try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch {}
  let contains = false;
  for (let i = 0; i < 6; i++) {
    contains = await page.evaluate((exp) => (document.body?.innerText || '').includes(exp), expected);
    if (contains) break;
    await sleep(1500);
  }
  if (contains) {
    console.log(`${tag} OK: マイページに期待アカウント "${expected}" を確認`);
    return { ok: true, seller: expected };
  }
  return { ok: false, seller: '', reason: `マイページに期待 sellerName "${expected}" が見つからない（別アカウントでログイン中の疑い）` };
}

/** .tmp/coconala/ 配下のスクショパスを返す（存在保証は呼び出し側 or fs） */
export function shotPath(name) {
  return join(ROOT, '.tmp/coconala', name);
}
