/**
 * coconala-price-parity.mjs — ココナラ PDF 商品が note より安く売られていないかの判定（純粋関数）
 * ---------------------------------------------------------------------------
 * 価格ルール（2026-09-23 ユーザー決定・ココナラ展開キット.md §2）:
 *   ココナラの PDF 商品は「note で同じ中身を最安で買う価格 × 1.1」を、ココナラの価格刻み
 *   （¥10,000 以下は ¥500、超は ¥1,000）で切り上げた額以上にする。手数料の差を埋め、note より安く売らない。
 *
 * カタログの notePriceBasis（文字列）で「note で同じ中身を買う方法」を書く:
 *   'a + b'            … note の a と b を買う（合計）
 *   'a | b + c'        … a か、b と c の組み合わせ。安い方が基準（買い手はどちらでも同じ中身が手に入る）
 *   'each: a | b'      … 購入者の部門などで a か b のどちらか1つを送る。高い方が基準（どちらを送っても下回らない）
 * note と同じ中身を持たない PDF は notePriceExempt に理由を書く。
 * ---------------------------------------------------------------------------
 */

/** note-magazines.ts の本文から id → 価格（円）を取り出す。価格に金額が無いもの（会員特典など）は null */
export function parseNotePrices(ts) {
  const prices = {};
  const re = /id:\s*'([^']+)'/g;
  const hits = [];
  let m;
  while ((m = re.exec(ts))) hits.push({ id: m[1], at: m.index });
  hits.forEach((cur, i) => {
    const slice = ts.slice(cur.at, hits[i + 1] ? hits[i + 1].at : ts.length);
    const pm = slice.match(/price:\s*'¥([\d,]+)/);
    prices[cur.id] = pm ? Number(pm[1].replace(/,/g, '')) : null;
  });
  return prices;
}

/** notePriceBasis を評価して基準額を返す。未知の id や金額の無い id があれば error を返す */
export function evalNoteBasis(expr, prices) {
  const each = /^\s*each:/.test(expr);
  const body = expr.replace(/^\s*each:/, '');
  const totals = [];
  for (const alt of body.split('|')) {
    let sum = 0;
    for (const id of alt.split('+').map((s) => s.trim()).filter(Boolean)) {
      if (!(id in prices)) return { error: `note-magazines.ts に無い id: ${id}` };
      if (prices[id] == null) return { error: `金額が読めない note 商品: ${id}` };
      sum += prices[id];
    }
    totals.push(sum);
  }
  if (!totals.length) return { error: '空の notePriceBasis' };
  return { floor: each ? Math.max(...totals) : Math.min(...totals), each };
}

/** ココナラの価格刻みで切り上げる（¥10,000 以下は ¥500、超は ¥1,000） */
export function ceilToCoconalaStep(yen) {
  const step = yen <= 10000 ? 500 : 1000;
  return Math.ceil(yen / step) * step;
}

/** 価格ルールの下限（note 基準 × 1.1 を刻みで切り上げ） */
export const minCoconalaPrice = (noteFloor) => ceilToCoconalaStep(Math.round(noteFloor * 1.1));

/**
 * PDF 商品（id が -pdf で終わり、paused 以外）を検査する。
 * @param {{id:string,status:string,priceYen:number|null,notePriceBasis?:string|null,notePriceExempt?:string|null}[]} services
 * @param {Record<string, number|null>} prices
 * @returns {{violations:string[], rows:{id:string,priceYen:number,noteFloor:number,min:number}[], exempt:string[]}}
 */
export function checkPriceParity(services, prices) {
  const violations = [];
  const rows = [];
  const exempt = [];
  for (const s of services) {
    if (!s.id.endsWith('-pdf') || s.status === 'paused') continue;
    if (s.notePriceExempt) { exempt.push(s.id); continue; }
    if (!s.notePriceBasis) {
      violations.push(`[${s.id}] notePriceBasis（note で同じ中身を買う方法）も notePriceExempt（対象外の理由）も無い`);
      continue;
    }
    const r = evalNoteBasis(s.notePriceBasis, prices);
    if (r.error) { violations.push(`[${s.id}] notePriceBasis を評価できない: ${r.error}`); continue; }
    const min = minCoconalaPrice(r.floor);
    rows.push({ id: s.id, priceYen: s.priceYen, noteFloor: r.floor, min });
    if (s.priceYen == null || s.priceYen < min) {
      violations.push(`[${s.id}] ¥${s.priceYen} は価格ルールの下限 ¥${min}（note 基準 ¥${r.floor} × 1.1 を刻みで切り上げ）を下回る`);
    }
  }
  return { violations, rows, exempt };
}
