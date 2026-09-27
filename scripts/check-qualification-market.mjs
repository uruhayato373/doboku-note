#!/usr/bin/env node
/**
 * check-qualification-market.mjs — 展開の判断材料の正本が整合しているかの CI ゲート
 * ---------------------------------------------------------------------------
 * 検査（すべて diff だけで決まる。壁時計に依存しない）:
 *   - market-scan.json: 資格 id が registry にあり、見送り以外の全資格に検索語がある・閾値の形
 *   - {note,x,ig,coconala,youtube}-competitors.json: exams が registry の資格 id・handle の重複なし
 *   - 売上（sales-log.json）とココナラ受注（orders-log.json）が product-lineup.json で資格へ分類できる
 * 出題形式（exam-formats.json）と registry の id 整合は npm run check-exam-calendar が見る。
 * 市場スキャンの古さ（90 日）は壁時計に依存するので npm run qualification-market の要対応に出す（月次レビューが読む）。
 *
 *   npm run check-qualification-market
 * 違反があれば exit 1。検査対象を 1 件も読めなければ exit 1（検査不成立）。
 * ---------------------------------------------------------------------------
 */
import { loadMarketInputs, COMPETITOR_CHANNELS } from './lib/market-inputs.mjs';
import { validateMarketInputs } from './lib/qualification-market.mjs';

const input = loadMarketInputs(process.cwd());
const counts = {
  資格: input.registry.qualifications.length,
  検索語の資格: Object.keys(input.scanConfig.queries ?? {}).length,
  追跡アカウント: COMPETITOR_CHANNELS.reduce((n, ch) => n + input.competitors[ch].length, 0),
  売上: input.sales.length,
  ココナラ受注: input.orders.length,
};
console.log(`[check-qualification-market] 対象 ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join('・')}`);
if (counts.資格 === 0 || counts.検索語の資格 === 0) {
  console.error('[check-qualification-market] 検査不成立: 資格か検索語を 1 件も読めなかった');
  process.exit(1);
}
const errors = validateMarketInputs(input);
if (errors.length) {
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(`[check-qualification-market] NG ${errors.length} 件`);
  process.exit(1);
}
console.log('[check-qualification-market] OK');
