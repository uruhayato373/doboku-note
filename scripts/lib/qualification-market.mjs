/**
 * qualification-market.mjs — 資格ごとの「展開の判断材料」を正本から組み立てる（純粋関数）
 * ---------------------------------------------------------------------------
 * 展開する資格を決めるときに並べる値は、どれも別の正本が持つ。ここでは資格 id で結ぶだけで、
 * 値を写し持たない（写しは古くなる）。
 *   - 出題形式・過去問の公開範囲 … exam-formats.json
 *   - 受験者数 … exam-stats.json ／ 試験日 … exam-calendar.json ／ 買われる時期の週数 … annual-roadmap.json
 *   - 自社の売上 … .claude/state/sales/sales-log.json と coconala/orders-log.json を
 *     product-lineup.json（salesRules・rules）で「資格 × 区分」へ写す
 *   - 誰を追跡するか … {note,x,ig,coconala,youtube}-competitors.json（exams は資格 id）
 *   - 市場の混み具合 … market-scan.json の検索語で取った .claude/state/market/history/market-*.json の最新（YouTube・note）
 *     と .claude/state/coconala/market-research.json（ココナラ）
 * 呼び出し元: scripts/report-qualification-market.mjs（npm run qualification-market）・
 * scripts/check-qualification-market.mjs（CI ゲート）・管理画面 資格一覧（展開の判断）。
 * ---------------------------------------------------------------------------
 */
import { classifyProduct, classifySale } from './product-lineup.mjs';

/** 管理画面の列の並び。YouTube・note・ココナラは検索で混み具合を測り、X・Instagram は追跡数だけ持つ。 */
export const CHANNELS = ['note', 'youtube', 'coconala', 'x', 'ig'];
export const SCANNED_CHANNELS = ['youtube', 'note', 'coconala'];
/** 受験者が自分の答案を組み立てる形式。売上はここに集中している（2026-09 の実売）。 */
export const COMPOSE_TYPES = ['experience', 'essay'];
/** 市場スキャンを古いとみなす日数（四半期）。 */
export const SCAN_STALE_DAYS = 90;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const toTime = (d) => Date.parse(`${d}T00:00:00Z`);
const isoOf = (t) => new Date(t).toISOString().slice(0, 10);

/** 強い売り手の数を 無/少/中/多 に分ける。数が無ければ null（未測定）。 */
export function densityOf(count, bands) {
  if (typeof count !== 'number') return null;
  if (count >= bands.high) return 'high';
  if (count >= bands.mid) return 'mid';
  if (count >= bands.low) return 'low';
  return 'none';
}

const median = (xs) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/**
 * YouTube の検索結果（複数クエリ分）から、チャンネルごとの最大再生数を出す。
 * @param {Array<{videoId:string, channel:string, channelId:string, views:number|null}>} items
 */
export function youtubeMetrics(items, strongViews) {
  const seen = new Set();
  const byChannel = new Map();
  for (const it of items) {
    if (!it?.videoId || seen.has(it.videoId)) continue;
    seen.add(it.videoId);
    const key = it.channelId || it.channel;
    const cur = byChannel.get(key) ?? { channel: it.channel, channelId: it.channelId ?? null, maxViews: 0, videos: 0 };
    cur.videos += 1;
    cur.maxViews = Math.max(cur.maxViews, it.views ?? 0);
    byChannel.set(key, cur);
  }
  const channels = [...byChannel.values()].sort((a, b) => b.maxViews - a.maxViews);
  return {
    results: seen.size,
    channels: channels.length,
    strong: channels.filter((c) => c.maxViews >= strongViews).length,
    top: channels.slice(0, 3).map((c) => ({ name: c.channel, id: c.channelId, value: c.maxViews })),
  };
}

/**
 * note の検索結果から、有料記事を出している作者の数と価格の中央値を出す。
 * @param {Array<{key:string, creator:string, price:number, likes:number}>} items
 */
export function noteMetrics(items, totals) {
  const seen = new Set();
  const sellers = new Map();
  const prices = [];
  for (const it of items) {
    if (!it?.key || seen.has(it.key)) continue;
    seen.add(it.key);
    if (!(it.price > 0)) continue;
    prices.push(it.price);
    const cur = sellers.get(it.creator) ?? { name: it.creator, paid: 0, likes: 0 };
    cur.paid += 1;
    cur.likes += it.likes ?? 0;
    sellers.set(it.creator, cur);
  }
  const list = [...sellers.values()].sort((a, b) => b.paid - a.paid || b.likes - a.likes);
  return {
    results: seen.size,
    total: totals.length ? Math.max(...totals) : null,
    strong: list.length,
    medianPrice: median(prices),
    top: list.slice(0, 3).map((s) => ({ name: s.name, id: s.name, value: s.paid })),
  };
}

/**
 * ココナラの検索結果（coconala-research.mjs の services）から、評価件数の多いサービスの数を出す。
 * @param {Array<{url:string, seller:string, reviews:number|null, priceYen:number|null}>} services
 */
export function coconalaMetrics(services, strongReviews, totals) {
  const seen = new Set();
  const list = [];
  for (const s of services) {
    const key = s?.url;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    list.push(s);
  }
  const strong = list.filter((s) => (s.reviews ?? 0) >= strongReviews).sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0));
  return {
    results: list.length,
    total: totals.length ? Math.max(...totals) : null,
    strong: strong.length,
    medianPrice: median(list.map((s) => s.priceYen).filter((p) => typeof p === 'number' && p > 0)),
    top: strong.slice(0, 3).map((s) => ({ name: s.seller, id: s.url, value: s.reviews })),
  };
}

/**
 * 設定・追跡リスト・売上の分類が正本と整合しているか。壁時計に依存しない（CI ゲート）。
 * @returns {string[]} 違反メッセージ
 */
export function validateMarketInputs({ registry, scanConfig, competitors, lineupConfig, sales, orders }) {
  const errors = [];
  const ids = new Set(registry.qualifications.map((q) => q.id));
  const needed = registry.qualifications.filter((q) => q.portfolio !== 'declined').map((q) => q.id);

  const isStrList = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string' && x.trim());
  for (const [id, q] of Object.entries(scanConfig.queries ?? {})) {
    if (!ids.has(id)) errors.push(`market-scan.json: ${id} は qualification-registry に無い`);
    if (!isStrList(q.keywords)) errors.push(`market-scan.json: ${id}.keywords は空でない文字列の配列`);
    if (!isStrList(q.coconala)) errors.push(`market-scan.json: ${id}.coconala は空でない文字列の配列`);
    try {
      if (typeof q.titleMatch !== 'string' || !q.titleMatch) throw new Error();
      new RegExp(q.titleMatch);
    } catch {
      errors.push(`market-scan.json: ${id}.titleMatch は正規表現の文字列`);
    }
  }
  for (const id of needed) if (!scanConfig.queries?.[id]) errors.push(`market-scan.json に ${id} の検索語が無い（見送り以外の全資格に必要）`);
  const bands = scanConfig.density?.bands ?? {};
  if (!(Number.isInteger(bands.low) && Number.isInteger(bands.mid) && Number.isInteger(bands.high) && bands.low >= 1 && bands.low <= bands.mid && bands.mid <= bands.high)) {
    errors.push('market-scan.json: density.bands は 1 以上の整数で low ≤ mid ≤ high');
  }
  for (const [ch, key] of [['youtube', 'strongViews'], ['coconala', 'strongReviews']]) {
    if (!(scanConfig.density?.[ch]?.[key] > 0)) errors.push(`market-scan.json: density.${ch}.${key} は正の数`);
  }
  for (const ch of ['youtube', 'note']) {
    if (!(Number.isInteger(scanConfig.results?.[ch]) && scanConfig.results[ch] > 0)) errors.push(`market-scan.json: results.${ch} は正の整数`);
  }

  for (const [channel, list] of Object.entries(competitors)) {
    const handles = new Set();
    for (const c of list ?? []) {
      const where = `${channel}-competitors.json ${c.handle ?? '(handle なし)'}`;
      if (typeof c.handle !== 'string' || !c.handle) errors.push(`${where}: handle が必要`);
      if (handles.has(c.handle)) errors.push(`${where}: handle が重複`);
      handles.add(c.handle);
      if (!Array.isArray(c.exams) || c.exams.length === 0) errors.push(`${where}: exams（資格 id の配列）が必要`);
      for (const e of c.exams ?? []) if (!ids.has(e)) errors.push(`${where}: exams の ${e} は qualification-registry に無い`);
    }
  }

  const unclassified = new Set();
  for (const r of sales ?? []) if (!classifySale(lineupConfig, r.productId)) unclassified.add(r.productId);
  for (const id of unclassified) errors.push(`売上 ${id} が資格へ分類できない（product-lineup.json の salesRules か rules.note に足す）`);
  for (const o of orders ?? []) {
    if (!classifyProduct(lineupConfig.rules?.coconala, String(o.serviceId))) errors.push(`ココナラ受注 ${o.serviceId} が資格へ分類できない（product-lineup.json の rules.coconala）`);
  }
  return errors;
}

/** 区分の受験者数。stages があればその区分（2級の first は前期・後期の多い方）、無ければ最初の区分に latest を置く。 */
function examineesFor(latest, key, isFirst) {
  if (!latest) return null;
  if (latest.stages) {
    if (typeof latest.stages[key]?.examinees === 'number') return latest.stages[key].examinees;
    const prefixed = Object.entries(latest.stages).filter(([k, v]) => k.startsWith(key) && typeof v?.examinees === 'number').map(([, v]) => v.examinees);
    return prefixed.length ? Math.max(...prefixed) : null;
  }
  return isFirst && typeof latest.examinees === 'number' ? latest.examinees : null;
}

const MAIN_EXAM_KEYS = ['exam', 'written', 'cbtStart', 'training', 'first'];

/** 区分の試験日。これからの最も近い日、無ければ最後の日。日付が無く期間だけなら window を返す。 */
function examDateFor(cal, key, isFirst, today) {
  const events = Object.entries(cal?.events ?? {}).filter(([, e]) => e?.kind === 'exam');
  let dates = events.filter(([k]) => k === key || k.startsWith(key)).map(([, e]) => e.date);
  if (dates.length === 0 && isFirst) dates = events.filter(([k]) => MAIN_EXAM_KEYS.includes(k)).map(([, e]) => e.date);
  dates.sort();
  const date = dates.find((d) => d >= today) ?? dates.at(-1) ?? null;
  if (date) return { date, window: null };
  const period = Object.entries(cal?.periods ?? {}).find(([k]) => k.toLowerCase().includes(key.toLowerCase()))?.[1];
  return { date: null, window: period?.window ?? null };
}

/** 売上を「資格 id → { total, byStage, byMonth }」に集計する。複数マスに写る商品は等分する。 */
export function salesByQualification({ lineupConfig, sales, orders }) {
  const out = {};
  const add = (cells, yen, date) => {
    for (const cell of cells) {
      const [id, stage] = cell.split(':');
      const share = yen / cells.length;
      const q = (out[id] ??= { total: 0, byStage: {}, byMonth: {} });
      q.total += share;
      q.byStage[stage] = (q.byStage[stage] ?? 0) + share;
      const m = String(date ?? '').slice(0, 7);
      if (m) q.byMonth[m] = (q.byMonth[m] ?? 0) + share;
    }
  };
  for (const r of sales ?? []) {
    const cells = classifySale(lineupConfig, r.productId);
    if (cells) add(cells, r.price ?? 0, r.date);
  }
  for (const o of orders ?? []) {
    const cells = classifyProduct(lineupConfig.rules?.coconala, String(o.serviceId));
    if (cells) add(cells, o.priceYen ?? 0, o.date);
  }
  for (const q of Object.values(out)) {
    q.total = Math.round(q.total);
    for (const k of Object.keys(q.byStage)) q.byStage[k] = Math.round(q.byStage[k]);
    for (const k of Object.keys(q.byMonth)) q.byMonth[k] = Math.round(q.byMonth[k]);
  }
  return out;
}

/**
 * 資格ごとの判断材料を 1 行にまとめる。
 * @param {{ registry:any, formats:any, examStats:any, calendar:any, lineupConfig:any, sales:any[], orders:any[],
 *   competitors: Record<string, any[]>, scanConfig:any, snapshot:any|null, coconalaResearch:any|null,
 *   buyWindowWeeks:number, today:string }} input today は JST の YYYY-MM-DD
 */
export function buildMarketView(input) {
  const { registry, formats, examStats, calendar, lineupConfig, competitors, scanConfig, snapshot, coconalaResearch, buyWindowWeeks, today } = input;
  const sales = salesByQualification(input);
  const bands = scanConfig.density.bands;
  const coconalaByKeyword = new Map((coconalaResearch?.queries ?? []).map((q) => [q.keyword, q]));
  // ココナラは取得済みの全検索結果を 1 つにまとめ、タイトル条件で資格へ振り分ける（汎用の語「経験記述 添削」等で
  // 取れたサービスも数える）。資格専用の語が未取得なら、その値は下限（partial）。
  const coconalaPool = [...(coconalaResearch?.queries ?? []).filter((x) => x.complete || (x.services ?? []).length > 0).flatMap((x) => x.services ?? [])];

  const rows = registry.qualifications.map((q) => {
    const fmt = formats.exams?.[q.id] ?? null;
    const latest = examStats.exams?.[q.id]?.latest ?? null;
    const cal = calendar.exams?.[q.id];
    const actions = [];

    const stages = (fmt?.stages ?? []).map((s, i) => {
      const exam = examDateFor(cal, s.key, i === 0, today);
      const buy = exam.date ? { from: isoOf(toTime(exam.date) - buyWindowWeeks * 7 * DAY_MS), to: exam.date } : null;
      return {
        key: s.key,
        label: s.label,
        types: s.types,
        compose: s.types.some((t) => COMPOSE_TYPES.includes(t)),
        examinees: examineesFor(latest, s.key, i === 0),
        examDate: exam.date,
        examWindow: exam.window,
        buy,
        salesYen: sales[q.id]?.byStage?.[s.key] ?? 0,
      };
    });
    if (!fmt) actions.push('出題形式が exam-formats.json に無い');
    for (const x of fmt?.verification?.unresolved ?? []) actions.push(`出題形式の未確認: ${x}`);
    const composeCounts = stages.filter((s) => s.compose && typeof s.examinees === 'number').map((s) => s.examinees);

    // 市場（検索で測る 3 チャネル）
    const qc = scanConfig.queries?.[q.id] ?? null;
    const fetched = [];
    const missing = [];
    const pick = (bucket, keys) =>
      (keys ?? []).flatMap((k) => {
        const hit = snapshot?.[bucket]?.[k];
        if (!hit || hit.error) {
          missing.push(`${bucket}「${k}」`);
          return [];
        }
        fetched.push(hit.fetchedAt.slice(0, 10));
        return [hit];
      });
    const yt = pick('youtube', qc?.keywords);
    const nt = pick('note', qc?.keywords);
    const cc = (qc?.coconala ?? []).flatMap((k) => {
      const hit = coconalaByKeyword.get(k);
      if (!hit?.complete) {
        missing.push(`coconala「${k}」`);
        return [];
      }
      return [hit];
    });
    const coconalaPartial = cc.length < (qc?.coconala ?? []).length;
    // タイトルがその資格のものだけを数える（検索語だけだと無関係の大型チャンネルや別資格が混ざる）
    const re = qc?.titleMatch ? new RegExp(qc.titleMatch) : null;
    const mine = (title) => !re || re.test(String(title ?? '').normalize('NFKC'));
    const tracked = (ch) => (competitors[ch] ?? []).filter((c) => (c.exams ?? []).includes(q.id)).map((c) => c.label || c.handle);

    const channels = {};
    if (qc) {
      const ytm = yt.length ? youtubeMetrics(yt.flatMap((h) => h.items).filter((it) => mine(it.title)), scanConfig.density.youtube.strongViews) : null;
      const ntm = nt.length ? noteMetrics(nt.flatMap((h) => h.items).filter((it) => mine(it.title)), nt.map((h) => h.total).filter((n) => typeof n === 'number')) : null;
      const ccm = coconalaPool.length ? coconalaMetrics(coconalaPool.filter((sv) => mine(sv.title)), scanConfig.density.coconala.strongReviews, cc.map((h) => h.totalHits).filter((n) => typeof n === 'number')) : null;
      channels.youtube = { ...(ytm ?? {}), density: densityOf(ytm?.strong, bands), tracked: tracked('youtube') };
      channels.note = { ...(ntm ?? {}), density: densityOf(ntm?.strong, bands), tracked: tracked('note') };
      channels.coconala = { ...(ccm ?? {}), density: densityOf(ccm?.strong, bands), partial: coconalaPartial, tracked: tracked('coconala') };
    }
    channels.x = { density: null, tracked: tracked('x') };
    channels.ig = { density: null, tracked: tracked('ig') };

    const scannedAt = fetched.length ? fetched.sort()[0] : null;
    if (q.portfolio !== 'declined') {
      if (missing.length) actions.push(`市場スキャン未取得: ${missing.join('・')}`);
      if (scannedAt && (toTime(today) - toTime(scannedAt)) / DAY_MS > SCAN_STALE_DAYS) actions.push(`市場スキャンが ${scannedAt}（${SCAN_STALE_DAYS} 日超）`);
    }

    return {
      id: q.id,
      label: q.label,
      family: q.family,
      portfolio: q.portfolio,
      stages,
      composeExaminees: composeCounts.length ? Math.max(...composeCounts) : null,
      pastExams: fmt?.pastExams ?? null,
      salesYen: sales[q.id]?.total ?? 0,
      salesByMonth: sales[q.id]?.byMonth ?? {},
      channels,
      scannedAt,
      actions,
    };
  });
  return { today, rows, formatTypes: formats.formatTypes ?? {}, pastExamLevels: formats.pastExamLevels ?? {} };
}

export { ISO_DATE };
