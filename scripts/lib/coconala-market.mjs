/**
 * coconala-market.mjs — ココナラの市場調査（data/coconala/market-research.json）の保存形。純関数だけ（I/O なし）。
 * ---------------------------------------------------------------------------
 * 書き手: scripts/coconala-research.mjs。読み手: report-competitor-watch・scout-coconala-competitors・
 * lib/qualification-market・coconala-research の market-summary 生成。
 *
 * 版の欄は schemaVersion（旧名 version は読み込み時に schemaVersion へ揃える）。
 * schemaVersion 2（2026-10）:
 *   queries  … 検索語ごとの進み具合（keyword・resolvedUrl・pageType・totalHits・pagesScanned・complete）。出品は持たない
 *   services … 出品。URL で一意で、見つかった検索語を queries に持つ。
 *              excerpt（説明の抜粋・読み手なし）は持たない。detail は詳細ページを取ったときだけ持つ（null は書かない）
 * schemaVersion 1（旧名 version: 1）は queries[].services に出品を持ち、同じ出品を語ごとに重ねて持っていた（3,365 行・実 1,548 件）。
 * ---------------------------------------------------------------------------
 */

export const RESEARCH_VERSION = 2;

/** 検索語 keyword で見つかった出品（保存形の services から） */
export const queryServices = (research, keyword) => (research.services ?? []).filter((s) => s.queries?.includes(keyword));

/**
 * 検索語 keyword で見つけた出品を research.services へ足す。URL が既にあれば語だけ足す（先に取った値を採る）。
 * index は URL → 出品の Map（呼び手が持ち回る）。新しく足したら true。
 */
export function addService(research, index, keyword, service) {
  const known = index.get(service.url);
  if (known) {
    if (!known.queries.includes(keyword)) known.queries.push(keyword);
    return false;
  }
  const stored = { ...service, queries: [keyword] };
  delete stored.excerpt; // 読み手がいない
  if (!stored.detail) delete stored.detail; // 詳細ページを取っていなければ持たない
  research.services.push(stored);
  index.set(stored.url, stored);
  return true;
}

/** research.services の URL → 出品の Map */
export const indexServices = (research) => new Map((research.services ?? []).map((s) => [s.url, s]));

/** 版 1（語ごとに出品を重ねて持つ）→ 版 2。版 2 ならそのまま返す（冪等）。版の欄は schemaVersion に揃える（旧名 version は捨てる）。 */
export function toStoredResearch(raw) {
  const version = raw?.schemaVersion ?? raw?.version;
  if (version === RESEARCH_VERSION && Array.isArray(raw.services)) {
    if (raw.schemaVersion === RESEARCH_VERSION && raw.version === undefined) return raw;
    const { version: _legacy, schemaVersion: _current, ...rest } = raw;
    return { schemaVersion: RESEARCH_VERSION, ...rest };
  }
  const research = { schemaVersion: RESEARCH_VERSION, fetchedAt: raw.fetchedAt, method: raw.method, note: raw.note, queries: [], services: [], updatedAt: raw.updatedAt };
  const index = new Map();
  for (const { services = [], ...meta } of raw.queries ?? []) {
    research.queries.push(meta);
    for (const s of services) addService(research, index, meta.keyword, s);
  }
  return research;
}
