#!/usr/bin/env node
/**
 * report-search-opportunities.mjs — 検索キーワード戦略のクラスター別集計と改善候補（read-only）
 * ---------------------------------------------------------------------------
 * config/search-strategy.json のクラスターごとに、最新の GSC 検索語×ページ集計（CI 供給）から
 * 表示・クリック・上位の帯の件数・改善候補の帯の件数（帯の境目は config の striking）と、重ならない直前の期間との差を出す。
 * 改善候補＝改善候補の帯で表示がある検索語をページ単位に束ねたもの。観察中（SEO Rank Watch）・実験の段階と前回の判定
 * （実験台帳の kind: search-strategy）・未起票の印を付ける（印は search-opportunities.mjs の candidateMarks）。取得はしない。
 *
 * 読み手: 週次レビュー（--json の fileable の上位を npm run search-improvement -- add で起票）・月次レビュー（クラスター別の推移と experiments の判定）。
 *
 * 使い方:
 *   node scripts/report-search-opportunities.mjs          # 人が読む出力
 *   node scripts/report-search-opportunities.mjs --json   # 週次・月次が読む JSON
 *
 * 終了コード: 0 = 読めた / 2 = 設定か GSC の検索語×ページ集計が無い（検査不成立）
 * ---------------------------------------------------------------------------
 */
import { buildSearchOpportunities, candidateMarks } from './lib/search-opportunities.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

let r;
try {
  r = buildSearchOpportunities(ROOT);
} catch (e) {
  console.error(`[report-search-opportunities] 設定を読めない: ${e.message} — 検査不成立`);
  process.exit(2);
}
if (!r.period) {
  console.error('[report-search-opportunities] GSC の検索語×ページ集計（gsc-page-query-*.json）が無い — 検査不成立');
  process.exit(2);
}

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(r, null, 2)}\n`);
} else {
  const d = (now, before) => (before == null || now == null ? '' : `（前 ${before}）`);
  console.log(`[report-search-opportunities] ${r.period.startDate}〜${r.period.endDate}（比較 ${r.previous ? `${r.previous.startDate}〜${r.previous.endDate}` : 'なし'}）/ クラスター ${r.clusters.length}`);
  const { top, striking } = r.bands;
  for (const c of r.clusters) {
    console.log(`\n■ ${c.label}: 検索語 ${c.queries} / 表示 ${c.impressions}${d(c.impressions, c.previous?.impressions)} / クリック ${c.clicks} / ${top} ${c.top10}${d(c.top10, c.previous?.top10)} / ${striking} ${c.striking} / 平均 ${c.avgPosition ?? '—'}位`);
    for (const p of c.candidates) {
      const mark = candidateMarks(p).map((m) => m.label).join('・');
      console.log(`  - ${p.page}  表示 ${p.impressions}・最良 ${p.bestPosition}位${mark ? `  [${mark}]` : ''}`);
      for (const q of p.queries.slice(0, 3)) console.log(`      ${q.position}位 ${q.impressions}回  ${q.query}`);
    }
    if (c.candidateTotal > c.candidates.length) console.log(`  …ほか ${c.candidateTotal - c.candidates.length} ページ`);
    if (c.bing) {
      console.log(`  [Bing] 検索語 ${c.bing.queries} / ${top} ${c.bing.top10} / ${striking}の候補 ${c.bing.candidateTotal}（ページは Bing の集計に無い）`);
      for (const q of c.bing.candidates) console.log(`      ${q.position}位 ${q.impressions}回  ${q.query}`);
    }
  }
}
