#!/usr/bin/env node
/**
 * check-content-series.mjs — サイト記事のシリーズ企画の台帳（config/content-series.json）を検査する（CI）。
 *
 * 見ること（形は check-datasets の zod、中身はここ。判定は scripts/lib/content-series.mjs）:
 *   - 根拠の id が参考文献の台帳にある（# の後ろの条番号・規格番号は除いて照合）
 *   - 計画が「既存」「補強」の項目は記事が実在する。関連記事（links）も実在する
 *   - 対象外には理由がある。入口のハブ項目・工種別ノートの資格が実在する
 * 状態（公開・下書き・未着手）は台帳に書かず、記事の実体から出して件数だけ表示する。
 *
 * 使い方: npm run check-content-series [-- --json]
 * exit: 0 合格 / 1 違反あり / 2 検査不成立（シリーズが 0 件）
 */
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { loadSeriesConfig, seriesContext, seriesView, validateSeries } from './lib/content-series.mjs';

const NAME = 'check-content-series';
const args = parseCliArgs({ json: { type: 'boolean' } });
const config = loadSeriesConfig(REPO_ROOT);
const ctx = seriesContext(REPO_ROOT);
const issues = validateSeries(config, ctx);
const view = seriesView(config, ctx.stateOf);

if (args.json) {
  process.stdout.write(`${JSON.stringify({ series: view.map((s) => ({ id: s.id, summary: s.summary })), issues }, null, 2)}\n`);
  process.exitCode = view.length === 0 ? 2 : issues.length ? 1 : 0;
} else {
  if (view.length === 0) {
    console.error(`[${NAME}] 検査不成立: シリーズが 0 件`);
    process.exit(2);
  }
  const refs = view.flatMap((s) => s.sections.flatMap((sec) => sec.items));
  const sourceRefs = refs.reduce((n, i) => n + (i.sources ?? []).length, 0);
  const articleRefs = refs.reduce((n, i) => n + (i.paths ?? []).length + (i.links ?? []).length, 0);
  console.log(`[${NAME}] シリーズ ${view.length} / 項目 ${refs.length} / 根拠の id ${sourceRefs} 件・記事の参照 ${articleRefs} 件を実検査`);
  for (const s of view) {
    const m = s.summary;
    console.log(`  ${s.id}（${s.title}）: 新規 ${m.newTotal}（公開 ${m.published}・下書き ${m.draft}・未着手 ${m.planned}）/ 補強待ち ${m.strengthen} / 既存 ${m.existing} / 対象外 ${m.excluded}`);
  }
  for (const issue of issues) console.error(`  ✗ ${issue}`);
  console.log(`[${NAME}] ${issues.length ? '✗ FAIL' : '✓ PASS'}（違反 ${issues.length} 件）`);
  process.exitCode = issues.length ? 1 : 0;
}
