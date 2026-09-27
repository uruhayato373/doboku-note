/**
 * coconala-catalog.mjs — ココナラのカタログ SoT（coconala-services.ts）と出品投入 SoT（coconala-listings.json）を読む
 * ---------------------------------------------------------------------------
 * ブラウザを開かない読み取り専用の関数だけを置く（Playwright を import しない）。
 * 出品・編集スクリプトは coconala-session.mjs 経由で、CI のオフライン／公開ページ検査は直接これを使う。
 * TS を node で直接 import できないため、正規表現でエントリを切り出す（check-coconala-wiring.mjs と同じ方式）。
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CATALOG_PATH = join(ROOT, 'src/lib/coconala-services.ts');
export const LISTINGS_PATH = join(ROOT, '.claude/config/coconala-listings.json');

/**
 * カタログ TS の本文からサービスを抽出する（純粋関数）。
 * @returns {Record<string, {id,status,serviceUrl,priceYen,title,shortTitle,listedAt,examScope,pauseReason}>}
 */
export function parseCatalog(ts) {
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
    const sm = slice.match(/shortTitle:\s*'([^']*)'/);
    const lm = slice.match(/listedAt:\s*'([^']*)'/);
    // examScope: ['civil-1'] → ['civil-1']（サムネの級別テーマ選択が使う）
    const em = slice.match(/examScope:\s*\[([^\]]*)\]/);
    // paused の理由。'retired'（恒久廃止）と 'absence'（長期不在の一時休止）を区別する。
    // これが無いと一括復帰で恒久廃止した商品まで復活する（coconala-pause --resume --absence が使う）。
    const rm = slice.match(/pauseReason:\s*'([^']*)'/);
    out[cur.id] = {
      id: cur.id,
      status: cur.status,
      serviceUrl: cur.serviceUrl,
      priceYen: pm ? parseInt(pm[1], 10) : null,
      title: tm ? (tm[1] || tm[2]) : '',
      shortTitle: sm ? sm[1] : null,
      listedAt: lm ? lm[1] : null,
      examScope: em ? [...em[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [],
      pauseReason: rm ? rm[1] : null,
    };
  });
  return out;
}

/** カタログ SoT を読む */
export function readCatalog() {
  return parseCatalog(readFileSync(CATALOG_PATH, 'utf-8'));
}

/** listings SoT（coconala-listings.json）を読む */
export function readListings() {
  try {
    return JSON.parse(readFileSync(LISTINGS_PATH, 'utf8')).listings || {};
  } catch {
    return {};
  }
}
