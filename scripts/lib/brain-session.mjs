/**
 * brain-session.mjs — Brain（brain-market.com）Playwright 自動操作の共有セッション基盤
 * ---------------------------------------------------------------------------
 * coconala-session.mjs と同思想。永続プロファイル（.local/playwright-brain-profile）で
 * ログイン状態を跨いで保持する。ログイン・CAPTCHA は人（スクリプトは待つだけ）。
 *
 * 提供:
 *   - launchContext: 永続プロファイルで Chrome を起動
 *   - waitForLogin: ログイン済み（「記事を書く」可視）まで polling（navigation 競合に耐性）
 *   - assertAccount: sellerName（brain-account.json）が可視テキストに現れるか best-effort 確認
 *   - readCatalog / readListings / writeBackCatalog: SoT の読み書き
 * 挙動のクセ（同意モーダル・セッション状態・可視テキスト assert 等）は
 * .claude/knowledge/reference/brain-operations.md が真実源。
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { todayJst } from './jst-date.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PROFILE = join(ROOT, '.local/playwright-brain-profile');
export const ACCOUNT_PATH = join(ROOT, '.claude/config/brain-account.json');
export const CATALOG_PATH = join(ROOT, 'src/lib/brain-products.ts');
export const LISTINGS_PATH = join(ROOT, '.claude/config/brain-listings.json');
export const DIST_DIR = join(ROOT, '.claude/config/brain/dist');
export const DIST_BASE_URL = 'https://storage.doboku-note.com/brain/dist/';

const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

export function readAccount() {
  try { return JSON.parse(readFileSync(ACCOUNT_PATH, 'utf-8')); } catch { return {}; }
}

export function readListings() {
  const j = JSON.parse(readFileSync(LISTINGS_PATH, 'utf-8'));
  return j.listings || {};
}

/** カタログ SoT から id/status/articleId/priceYen/title/distFile を抽出（TS を regex 解析） */
export function readCatalog() {
  const src = readFileSync(CATALOG_PATH, 'utf-8');
  const out = [];
  const re = /id:\s*'([^']+)',\s*status:\s*'([^']+)',\s*articleId:\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(src))) {
    const slice = src.slice(m.index, m.index + 2000);
    const price = slice.match(/priceYen:\s*(\d+)/);
    const title = slice.match(/title:\s*'([^']+)'/) || slice.match(/title:\s*\n?\s*'([^']+)'/);
    const dist = slice.match(/distFile:\s*'([^']*)'/);
    out.push({
      id: m[1], status: m[2], articleId: m[3],
      priceYen: price ? parseInt(price[1], 10) : null,
      title: title ? title[1] : '',
      distFile: dist ? dist[1] : '',
    });
  }
  return out;
}

/** 申請成功をカタログへ書き戻す（status/articleId/productUrl/submittedAt） */
export function writeBackCatalog(serviceId, articleId) {
  let src = readFileSync(CATALOG_PATH, 'utf-8');
  const blockRe = new RegExp(`('${serviceId}':\\s*\\{[\\s\\S]*?\\n  \\},)`);
  const bm = src.match(blockRe);
  if (!bm) return false;
  let block = bm[1];
  const today = todayJst();
  block = block.replace(/status:\s*'[^']*'/, "status: 'submitted'");
  block = block.replace(/articleId:\s*'[^']*'/, `articleId: '${articleId}'`);
  block = block.replace(/productUrl:\s*'[^']*'/, `productUrl: 'https://brain-market.com/a/${articleId}'`);
  if (/submittedAt:/.test(block)) block = block.replace(/submittedAt:\s*'[^']*'/, `submittedAt: '${today}'`);
  else block = block.replace(/(distFile:\s*'[^']*',)/, `$1\n    submittedAt: '${today}',`);
  src = src.replace(blockRe, block);
  writeFileSync(CATALOG_PATH, src);
  return true;
}

export async function launchContext({ headless = false } = {}) {
  return chromium.launchPersistentContext(PROFILE, {
    headless,
    channel: 'chrome',
    proxy: PROXY ? { server: PROXY } : undefined,
    ignoreHTTPSErrors: true,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
}

/**
 * ログイン済みを待つ。「記事を書く」ボタンの可視で判定。
 * ログイン中のページ遷移で evaluate が落ちるため try/catch で polling（実測の弱点対策）。
 */
export async function waitForLogin(page, { waitMinutes = 6, tag = '[brain]' } = {}) {
  const deadline = Date.now() + waitMinutes * 60_000;
  let announced = false;
  while (Date.now() < deadline) {
    try {
      const state = await page.evaluate(() => {
        const txt = document.body?.innerText || '';
        return { write: /記事を書く/.test(txt), login: /ログイン/.test(txt) && /新規登録/.test(txt) };
      });
      if (state.write) return { ok: true };
      if (state.login && !announced) {
        console.log(`${tag} 未ログイン。開いた Chrome で Brain にログインしてください（最大 ${waitMinutes} 分待機）…`);
        announced = true;
      }
    } catch { /* navigation 中は無視して次の poll へ */ }
    await page.waitForTimeout(3000);
  }
  return { ok: false, reason: 'ログイン待ちタイムアウト' };
}

/** sellerName が可視テキストに現れるか（メニュー内のため best-effort。不在でも warn のみ） */
export async function assertAccount(page, { tag = '[brain]' } = {}) {
  const acc = readAccount();
  if (!acc.sellerName) return { ok: true, name: null };
  try {
    const found = await page.evaluate((name) => (document.body?.innerText || '').includes(name), acc.sellerName);
    if (found) console.log(`${tag} OK: ページに期待アカウント "${acc.sellerName}" を確認`);
    else console.log(`${tag} ⚠ アカウント名 "${acc.sellerName}" を可視テキストで確認できず（メニュー未展開の可能性・続行）`);
    return { ok: true, name: acc.sellerName, found };
  } catch { return { ok: true, name: acc.sellerName, found: false }; }
}
