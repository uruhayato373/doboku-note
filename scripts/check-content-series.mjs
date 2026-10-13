#!/usr/bin/env node
/**
 * check-content-series.mjs — サイト記事のシリーズ企画の台帳（config/content-series.json）を検査する（CI）。
 *
 * 見ること（形は check-datasets の zod、中身はここ。判定は scripts/lib/content-series.mjs）:
 *   - 根拠の id が参考文献の台帳にある（# の後ろの条番号・規格番号は除いて照合）
 *   - 計画が「既存」「補強」の項目は記事が実在する。関連記事（links）も実在する
 *   - 対象外には理由がある。入口のハブ項目・工種別ノートの資格が実在する
 *   - 書籍の全項目の割り当て（config/content-series-basis.json）: 項目数が書籍の網羅の要約と一致し、割り当て先の項目・記事が実在する。
 *     Drive がある端末では、Drive の候補表の項目 id とちょうど一致するかも見る（無い端末は件数だけで照合したと出す）
 * 状態（公開・下書き・未着手、図・写真の状態）は台帳に書かず、記事と画像の実体から出して件数だけ表示する。
 *
 * 使い方: npm run check-content-series [-- --json | --visual-jobs]
 *   --visual-jobs  合格・配置済みでない図・写真の作業一覧を JSON で出す（Codex に渡す。写真は gen-article-photo のコマンド付き）
 *   --crop-jobs [--series <id>]  シリーズの章に使う本の頁のうち、図の切り出しが終わっていない頁の一覧を JSON で出す（Codex に渡す）
 * exit: 0 合格 / 1 違反あり / 2 検査不成立（シリーズが 0 件）
 */
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { loadSeriesConfig, seriesContext, seriesView, validateSeries, loadBasis, validateBasis, basisDriveIssues, basisView, visualJobs, chapterPages, cropSummary, cropJobs } from './lib/content-series.mjs';
import { loadDriveConfig, resolveVaultRoot } from './lib/drive-vault.mjs';

const NAME = 'check-content-series';
const args = parseCliArgs({ json: { type: 'boolean' }, 'visual-jobs': { type: 'boolean' }, 'crop-jobs': { type: 'boolean' }, series: { type: 'string' } });
const config = loadSeriesConfig(REPO_ROOT);
const ctx = seriesContext(REPO_ROOT);
const basis = loadBasis(REPO_ROOT);
const view = seriesView(config, ctx.stateOf);
// --visual-jobs は一覧だけを出して終える（process.exit を直後に呼ぶとパイプで出力が切れるので、exitCode と分岐で終える）
if (args.visualJobs) process.stdout.write(`${JSON.stringify(visualJobs(view, ctx), null, 2)}\n`);
else if (args.cropJobs) process.stdout.write(`${JSON.stringify(cropJobs(basis, ctx, { series: args.series ?? null }), null, 2)}\n`);
else report();

function report() {
  let vaultRoot = null;
  try { vaultRoot = resolveVaultRoot({ cfg: loadDriveConfig() }).root ?? null; } catch { vaultRoot = null; }
  const driveIssues = basisDriveIssues(basis, vaultRoot, ctx.referenceSources);
  const issues = [...validateSeries(config, ctx), ...validateBasis(basis, config, ctx), ...(driveIssues ?? [])];
  const bv = basisView(basis);

  if (args.json) {
    process.stdout.write(`${JSON.stringify({ series: view.map((s) => ({ id: s.id, summary: s.summary })), books: bv.byBook, issues }, null, 2)}\n`);
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
    const books = Object.entries(bv.byBook);
    const units = books.reduce((n, [, t]) => n + t.units, 0);
    console.log(`[${NAME}] 書籍 ${books.length} 冊・${units} 項目の割り当てを実検査（${driveIssues === null ? 'Drive が無いので件数だけで照合' : 'Drive の候補表と id を照合'}）`);
    for (const [id, t] of books) console.log(`  ${id}: シリーズ ${t.series} / ほかの記事 ${t.article} / 使わない（理由つき） ${t.excluded}`);
    const pages = [...chapterPages(basis, ctx).values()];
    const uniq = new Map();
    for (const info of pages) for (const p of info.pages) uniq.set(`${p.book}/${p.page}`, p);
    const crop = cropSummary([...uniq.values()]);
    const noPage = pages.reduce((n, i) => n + i.noPageUnits, 0);
    console.log(`[${NAME}] 章と本の頁の結びつき: 頁 ${crop.pages}（切り出し待ち ${crop.pending}・図なし ${crop.notNeeded}・済み ${crop.done}・切り出した図 ${crop.crops}）/ 頁の取れない項目 ${noPage}（一覧は --crop-jobs）`);
    const jobs = visualJobs(view, ctx);
    console.log(`[${NAME}] 図・写真の計画 ${view.reduce((n, s) => n + s.sections.reduce((m, sec) => m + sec.items.reduce((k, i) => k + (i.visuals ?? []).length, 0), 0), 0)} 件 / 未完了 ${jobs.length} 件（一覧は --visual-jobs）`);
    for (const issue of issues) console.error(`  ✗ ${issue}`);
    console.log(`[${NAME}] ${issues.length ? '✗ FAIL' : '✓ PASS'}（違反 ${issues.length} 件）`);
    process.exitCode = issues.length ? 1 : 0;
  }
}
