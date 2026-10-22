/**
 * note-single-price.mjs — note の単品（config/products.json の channel=note・tier=single＝マガジンに入れず 1 本で売る記事）の
 * 価格・公開状態を、公開 API で読んだ記事の状態と照合する純関数（DN-0704）。
 *
 * 取得はしない。呼び出し側（scripts/verify-note-magazines.mjs）が scripts/lib/note-api.mjs の fetchNote で読み、
 * 結果（state / status / price / error）を id ごとに渡す。テストは取得結果を注入して判定だけを見る。
 *
 * 正本の価格は catalog.price の先頭の ¥金額（"¥2,480（予想模試3回・PDF6冊）" → 2480）。price 欄の無い単品は
 * 無料記事（精読ガイド等）なので 0 円として照合する（有料なのに price を書き忘れた単品はズレとして出る）。
 */
import { singleKeyOf } from './product-registry.mjs';
import { fetchFailDominant } from './inconclusive-gate.mjs';

/** 価格文字列から先頭の ¥金額を数値で取り出す（"¥3,480（…）" → 3480）。読めなければ null */
export function priceNum(str) {
  if (!str) return null;
  const m = String(str).match(/¥?\s*([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
}

/**
 * 照合の対象（公開中の単品）を選ぶ。未公開（published:false）と販売終了（retiredAt）は対象外として数える。
 * @returns {{ targets: Array<{id: string, key: string|null, noteUrl: string, priceStr: string|null, expected: number|null}>, skipped: Array<{id: string, reason: string}> }}
 */
export function singleTargets(products) {
  const targets = [];
  const skipped = [];
  for (const p of products) {
    if (p.channel !== 'note' || p.tier !== 'single') continue;
    const c = p.catalog ?? {};
    if (c.retiredAt) { skipped.push({ id: p.id, reason: '販売終了' }); continue; }
    if (c.published !== true) { skipped.push({ id: p.id, reason: '未公開' }); continue; }
    const noteUrl = c.noteUrl ?? '';
    const priceStr = c.price ?? null;
    targets.push({
      id: p.id,
      key: noteUrl ? singleKeyOf(noteUrl) : null,
      noteUrl,
      priceStr,
      expected: priceStr == null ? 0 : priceNum(priceStr),
    });
  }
  return { targets, skipped };
}

/** 公開 API で読む対象（記事キーがあり、正本の価格が読めるもの） */
export const fetchable = (t) => Boolean(t.key) && t.expected != null;

/**
 * 正本と公開 API の結果を照合する。
 * @param {ReturnType<typeof singleTargets>['targets']} targets
 * @param {Map<string, {state: 'alive'|'unmeasurable'|'dead'|'unknown', status: string|null, price: number|null, error: string|null}>} results id → fetchNote の戻り
 * @returns {{ total: number, attempted: number, checked: number, matched: Array<object>, issues: string[], failed: Array<{id: string, key: string, error: string}>, inconclusive: boolean }}
 *   attempted＝API を読もうとした件数、checked＝読めて判定できた件数。inconclusive は「検査ゼロ」か取得失敗が支配的。
 */
export function reconcileSinglePrices(targets, results) {
  const issues = [];
  const failed = [];
  const matched = [];
  let attempted = 0;
  let checked = 0;
  for (const t of targets) {
    if (!t.key) { issues.push(`[記事URLなし] ${t.id}: noteUrl が記事 URL（/n/…）でない（${t.noteUrl || '空'}）`); continue; }
    if (t.expected == null) { issues.push(`[価格読めず] ${t.id}: 正本の price「${t.priceStr}」から金額を読めない`); continue; }
    attempted += 1;
    const r = results.get(t.id);
    if (!r || r.state === 'unknown') { failed.push({ id: t.id, key: t.key, error: r?.error ?? '未取得' }); continue; }
    checked += 1;
    if (r.state === 'dead') { issues.push(`[非公開化?] ${t.id}: 記事 ${t.key} が公開 API で見えない（削除・下書き・非公開を区別しない）`); continue; }
    if (r.status !== 'published') { issues.push(`[公開状態] ${t.id}: 記事 ${t.key} の status=${r.status}（published でない）`); continue; }
    if (r.price !== t.expected) {
      const sot = t.priceStr == null ? '¥0（price 欄なし＝無料扱い）' : `¥${t.expected}`;
      issues.push(`[価格ドリフト] ${t.id}: 正本${sot} ≠ note¥${r.price}（${t.key}）`);
      continue;
    }
    matched.push({ id: t.id, key: t.key, price: r.price });
  }
  const inconclusive = checked === 0 || fetchFailDominant(failed.length, attempted);
  return { total: targets.length, attempted, checked, matched, issues, failed, inconclusive };
}
