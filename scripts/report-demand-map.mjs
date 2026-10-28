#!/usr/bin/env node
/**
 * report-demand-map.mjs — 悩みと商品候補の地図（config/demand-map.json）の月次の読み物。月次レビュー（/monthly-review）が読む。
 * ---------------------------------------------------------------------------
 * 1. 判定日が今月末までで、まだ閉じていない商品候補と打ち手（判定か延長の理由を書く対象）
 * 2. 運営者の判断待ち（status が idea の商品候補・ハブ）
 * 3. 軸（類似／差別）ごとの実売
 * 4. 悩みの言い方（phrases）を含む GSC の検索語の表示・クリック（最新の GSC の query レポート）
 * 5. 四半期の外の調査の期限と、次に調べる資格（research.rotation）
 * 外の調査そのもの（ディープリサーチ・競合の論点地図）はしない。期限は check-competitor-scan-due の demand も出す（週次）。
 *
 * 使い方:
 *   npm run report-demand-map              # 読み物（Markdown）
 *   npm run report-demand-map -- --json    # 機械可読
 *   npm run report-demand-map -- --check   # 完走だけ（quality-audit ci）
 * 終了コード: 0＝読めた / 1＝台帳が型を満たさない・打ち手の悩みの参照切れ（検査不成立ではなく正本の誤り）
 * ---------------------------------------------------------------------------
 */
import { parseCliArgs } from './lib/cli-args.mjs';
import { readDatasetIf } from './lib/dataset-io.mjs';
import { ConfigDemandMap } from './lib/dataset-schemas.mjs';
import { dueJudgements, loadDemandView, painSearchMetrics, researchDue } from './lib/demand-map.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { latestReport } from './lib/metric-reports.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const args = parseCliArgs({ json: { type: 'boolean' }, check: { type: 'boolean' } });
const today = todayJst();
const monthEnd = (() => {
  const [y, m] = today.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
})();

const map = readDatasetIf(ROOT, 'config.demand-map');
if (!map) {
  console.error('[report-demand-map] config/demand-map.json が無い'); // path-literal-ok: 利用者への案内
  process.exit(1);
}
const parsed = ConfigDemandMap.safeParse(map);
if (!parsed.success) {
  for (const issue of parsed.error.issues) console.error(`[report-demand-map] ✗ ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}
const view = loadDemandView(ROOT);
const due = dueJudgements(view, monthEnd);
const ideas = view.candidates.filter((c) => c.status === 'idea');
const hubIdeas = view.pains.flatMap((p) => (p.hubs ?? []).filter((h) => h.status === 'idea').map((h) => ({ pain: p.id, title: h.title })));
const gsc = latestReport(ROOT, 'gsc.query');
const search = gsc ? painSearchMetrics(view.pains, gsc.data.rows ?? []) : null;
const research = researchDue(map, today);

const result = {
  check: 'report-demand-map',
  today,
  until: monthEnd,
  counted: { pains: view.pains.length, positions: view.positions.length, candidates: view.candidates.length, actions: view.actions.length, gscQueries: gsc ? (gsc.data.rows ?? []).length : null },
  dueJudgements: due,
  pendingDecisions: { candidates: ideas.map((c) => ({ id: c.id, title: c.title, card: c.card ?? null })), hubs: hubIdeas },
  axisTotals: view.axisTotals,
  painSearch: search ? { source: gsc.ref, period: { startDate: gsc.data.meta?.startDate ?? null, endDate: gsc.data.meta?.endDate ?? null }, pains: search } : null,
  research,
  errors: view.errors,
};

if (args.check) {
  console.log(`[report-demand-map] 完走: 悩み ${view.pains.length}・商品候補 ${view.candidates.length}・打ち手 ${view.actions.length}・GSC 検索語 ${result.counted.gscQueries ?? '未取得'}`);
} else if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const L = [];
  L.push(`# 悩みと商品候補の月次（${today}・判定日 ${monthEnd} まで）`, '');
  L.push(`対象: 悩み ${view.pains.length}・立場 ${view.positions.length}・商品候補 ${view.candidates.length}・打ち手 ${view.actions.length}`, '');
  L.push('## 判定日が来た候補・打ち手（判定か延長の理由を書く）', '');
  if (due.length === 0) L.push('- 0 件（判定日が今月末までのものは無い）');
  for (const d of due) L.push(`- ${d.id}（${d.status}・判定日 ${d.date}）${d.title} — 停止条件: ${d.stop ?? '—'}`);
  L.push('', '## 運営者の判断待ち', '');
  L.push(`- 商品候補 ${ideas.length} 件: ${ideas.map((c) => `${c.id}${c.card ? `（${c.card}）` : ''}`).join('・') || 'なし'}`);
  L.push(`- ハブ ${hubIdeas.length} 件: ${hubIdeas.map((h) => h.title).join(' / ') || 'なし'}`);
  L.push('', '## 軸ごとの実売（販売中の候補だけ）', '');
  for (const [axis, label] of [['similar', '類似'], ['differentiated', '差別']]) {
    const t = view.axisTotals[axis];
    L.push(`- ${label}: 候補 ${t.candidates}・販売中 ${t.selling}・${t.selling ? `${t.count} 件・¥${t.yen.toLocaleString('ja-JP')}` : '販売前'}`);
  }
  L.push('', '## 悩みの言い方を含む検索語（GSC）', '');
  if (!search) L.push('- 未取得（GSC の query レポートが無い）');
  else {
    L.push(`出典: ${gsc.ref}（${result.painSearch.period.startDate ?? '?'}〜${result.painSearch.period.endDate ?? '?'}）`, '');
    for (const p of search) L.push(`- ${p.label}: ${p.queries} 語・表示 ${p.impressions}・クリック ${p.clicks}${p.top.length ? `（${p.top.map((t) => `${t.query} ${t.impressions}/${t.clicks}・${t.position}位`).join('、')}）` : ''}`);
  }
  L.push('', '## 四半期の外の調査', '');
  L.push(research.last ? `- 前回: ${research.last.date} ${research.last.qualification}（${research.last.scope}）` : '- 前回: なし');
  L.push(`- 次: ${research.next}・期限 ${research.dueDate}${research.due ? '（DUE）' : ''}。手順は docs/strategy/21「悩みの軸」の運用`);
  if (view.errors.length) L.push('', '## 正本の不整合', '', ...view.errors.map((e) => `- ${e}`));
  console.log(L.join('\n'));
}
process.exit(view.errors.length ? 1 : 0);
