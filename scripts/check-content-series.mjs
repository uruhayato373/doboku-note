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
 *   - 章の骨子（content/sources/series/<シリーズ>/<項目>.md）: どの論点にも一次資料（台帳の法令・要領・白書の id か URL）があり、
 *     根拠の id・本の id が実在し（Drive があれば本の項目 id も）、frontmatter が置き場と合い、確認済みなら論点と確認日がある
 * 状態（公開・下書き・未着手、骨子、図・写真の状態）は台帳に書かず、記事・骨子・画像の実体から出して件数だけ表示する。
 *
 * 使い方: npm run check-content-series [-- --json | --visual-jobs]
 *   --visual-jobs  合格・配置済みでない図・写真の作業一覧を JSON で出す（Codex に渡す。写真は gen-article-photo のコマンド付き）
 *   --crop-jobs [--series <id>]  シリーズの章に使う本の頁のうち、図の切り出しが終わっていない頁の一覧を JSON で出す（Codex に渡す）
 *   --packet <シリーズ id>/<項目 id> --article <content/site/…/article.mdx>  章の資料（割り当てた本の項目の一覧）を
 *                .tmp/book-coverage/series/<slug>.packet.md へ書く（Drive が要る。workflow series-chapter の入力・book-coverage-expansion.md §4）
 *   --suggest <シリーズ id>/<項目 id>  章の題・注記・骨子の論点の語から、Drive の候補表の本の項目を根拠の候補として並べ、
 *                .tmp/book-coverage/series/<シリーズ>__<項目>.suggest.md へ書く（見出しを含むので .tmp だけ。Drive が要る）
 * exit: 0 合格 / 1 違反あり / 2 検査不成立（シリーズが 0 件）
 */
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { loadSeriesConfig, seriesContext, seriesView, validateSeries, loadBasis, validateBasis, basisDriveIssues, basisView, visualJobs, chapterPages, cropSummary, cropJobs, chapterPacket, loadOutlines, outlineIssues, suggestUnits } from './lib/content-series.mjs';
import { driveUnreadableWarning, loadDriveConfig, readVaultJson, resolveVaultRoot } from './lib/drive-vault.mjs';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const NAME = 'check-content-series';
const args = parseCliArgs({ json: { type: 'boolean' }, 'visual-jobs': { type: 'boolean' }, 'crop-jobs': { type: 'boolean' }, series: { type: 'string' }, packet: { type: 'string' }, article: { type: 'string' }, suggest: { type: 'string' } });
const config = loadSeriesConfig(REPO_ROOT);
const ctx = seriesContext(REPO_ROOT);
const basis = loadBasis(REPO_ROOT);
const vaultRoot = vault();
// 本の項目 id の照合と根拠の候補は Drive の候補表から（無い端末では照合しない）
// Drive の読み取りが失敗した本（ETIMEDOUT など）は Drive が無いのと同じ扱いにし、件数を WARN で出す
const candidates = new Map();
const unreadableBooks = new Set();
let unreadableCode = null;
const candidatesOf = (bookId) => {
  if (!candidates.has(bookId)) {
    const src = ctx.referenceSources.find((s) => s.id === bookId);
    const file = vaultRoot && src?.origin?.vaultDir ? join(vaultRoot, ...src.origin.vaultDir.split('/'), 'coverage', 'candidates.json') : null;
    let units = null;
    if (file && existsSync(file)) {
      const r = readVaultJson(file);
      if (r.ok) units = r.data.units;
      else { unreadableBooks.add(bookId); unreadableCode ??= r.code; }
    }
    candidates.set(bookId, units);
  }
  return candidates.get(bookId);
};
ctx.bookUnits = (bookId) => { const u = candidatesOf(bookId); return u ? new Set(u.map((x) => x.id)) : null; };
const outlineSet = loadOutlines(REPO_ROOT, config);
const view = seriesView(config, ctx.stateOf, outlineSet.outlines, ctx);
// --visual-jobs は一覧だけを出して終える（process.exit を直後に呼ぶとパイプで出力が切れるので、exitCode と分岐で終える）
if (args.visualJobs) process.stdout.write(`${JSON.stringify(visualJobs(view, ctx), null, 2)}\n`);
else if (args.cropJobs) process.stdout.write(`${JSON.stringify(cropJobs(basis, ctx, { series: args.series ?? null }), null, 2)}\n`);
else if (args.packet) writePacket();
else if (args.suggest) writeSuggest();
else report();

function vault() {
  try { return resolveVaultRoot({ cfg: loadDriveConfig() }).root ?? null; } catch { return null; }
}

function writeSuggest() {
  const [seriesId, itemId] = args.suggest.split('/');
  const series = (config.series ?? []).find((s) => s.id === seriesId);
  const item = series?.sections.flatMap((sec) => sec.items).find((i) => i.id === itemId);
  if (!item) {
    console.error(`[${NAME}] 台帳に無い章: ${args.suggest}`);
    process.exitCode = 2;
    return;
  }
  const books = ctx.referenceSources
    .filter((s) => s.origin?.kind === 'drive' && candidatesOf(s.id))
    .map((s) => ({ id: s.id, title: s.shortTitle ?? s.title, units: candidatesOf(s.id) }));
  if (books.length === 0) {
    console.error(`[${NAME}] Drive の候補表が 1 冊も無い（Drive をつなぐ）`);
    process.exitCode = 2;
    return;
  }
  const outline = outlineSet.outlines.get(args.suggest);
  const query = [item.title, item.note ?? '', ...(outline?.points ?? []).map((p) => p.text)].join(' ');
  const rows = suggestUnits(query, books);
  const md = [
    `# ${itemId} ${item.title}（根拠の候補・本の項目）`, '',
    `候補表 ${books.length} 冊・${books.reduce((n, b) => n + b.units.length, 0)} 項目から、章の題・注記・骨子の論点 ${outline?.points.length ?? 0} 個の語で並べた上位 ${rows.length} 件。骨子には \`- 本: <本 id>/<項目 id>\` で書く（見出しは写さない）。`, '',
    ...rows.map((r) => `- ${r.book}/${r.unit} ${r.page ?? ''} 「${r.heading}」（${r.title}・${r.score.toFixed(2)}）`), '',
  ].join('\n');
  const out = join(REPO_ROOT, '.tmp', 'book-coverage', 'series', `${seriesId}__${itemId}.suggest.md`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, md);
  console.log(`[${NAME}] ${args.suggest}: 候補表 ${books.length} 冊から ${rows.length} 件 → ${out.slice(REPO_ROOT.length + 1)}`);
}

function writePacket() {
  const [seriesId, itemId] = args.packet.split('/');
  const m = /^content\/site\/[a-z0-9-]+\/([a-z0-9-]+)\/article\.mdx$/.exec(args.article ?? '');
  if (!seriesId || !itemId || !m) {
    console.error(`usage: node scripts/${NAME}.mjs --packet <シリーズ id>/<項目 id> --article content/site/<区分>/<slug>/article.mdx`);
    process.exitCode = 2;
    return;
  }
  const packet = chapterPacket(basis, config, ctx, vault(), seriesId, itemId, args.article);
  if (!packet) {
    console.error(`[${NAME}] Drive が無いので章の資料を作れない（項目の見出しは Drive の候補表にある）`);
    process.exitCode = 2;
    return;
  }
  const out = join(REPO_ROOT, '.tmp', 'book-coverage', 'series', `${m[1]}.packet.md`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, packet.markdown);
  console.log(`[${NAME}] ${args.packet}: 本の項目 ${packet.units} 件 → ${out.slice(REPO_ROOT.length + 1)}`);
}

function report() {
  const drive = basisDriveIssues(basis, vaultRoot, ctx.referenceSources);
  for (const b of drive?.unreadable ?? []) unreadableBooks.add(b);
  unreadableCode ??= drive?.code ?? null;
  const issues = [...validateSeries(config, ctx), ...validateBasis(basis, config, ctx), ...(drive?.issues ?? []), ...outlineIssues(outlineSet, ctx)];
  const bv = basisView(basis);

  if (args.json) {
    process.stdout.write(`${JSON.stringify({ series: view.map((s) => ({ id: s.id, summary: s.summary })), books: bv.byBook, issues, driveUnreadable: [...unreadableBooks] }, null, 2)}\n`);
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
    console.log(`[${NAME}] 書籍 ${books.length} 冊・${units} 項目の割り当てを実検査（${drive === null ? 'Drive が無いので件数だけで照合' : `Drive の候補表と id を照合 ${drive.checked} 冊${drive.unreadable.length ? `・読めず件数だけ ${drive.unreadable.length} 冊` : ''}`}）`);
    for (const [id, t] of books) console.log(`  ${id}: シリーズ ${t.series} / ほかの記事 ${t.article} / 使わない（理由つき） ${t.excluded}${t.revisit ? `（うち判定し直す候補 ${t.revisit}）` : ""}`);
    const pages = [...chapterPages(basis, ctx).values()];
    const uniq = new Map();
    for (const info of pages) for (const p of info.pages) uniq.set(`${p.book}/${p.page}`, p);
    const crop = cropSummary([...uniq.values()]);
    const noPage = pages.reduce((n, i) => n + i.noPageUnits, 0);
    console.log(`[${NAME}] 章と本の頁の結びつき: 頁 ${crop.pages}（切り出し待ち ${crop.pending}・図なし ${crop.notNeeded}・済み ${crop.done}・切り出した図 ${crop.crops}）/ 頁の取れない項目 ${noPage}（一覧は --crop-jobs）`);
    const items = view.flatMap((s) => s.sections.flatMap((sec) => sec.items));
    const ol = items.map((i) => i.outline).filter((o) => o && o.status !== 'none');
    console.log(`[${NAME}] 章の骨子 ${ol.length} 本を実検査（確認済み ${ol.filter((o) => o.status === 'approved').length}・下書き ${ol.filter((o) => o.status === 'draft').length}・骨子なし ${items.length - ol.length}）/ 論点 ${ol.reduce((n, o) => n + o.points, 0)}（一次資料あり ${ol.reduce((n, o) => n + o.withPrimary, 0)}）/ URL だけの根拠 ${ol.reduce((n, o) => n + o.urlRefs, 0)} 件（記事を書く前に参考文献の台帳へ）/ 本の項目 ${ol.reduce((n, o) => n + o.bookRefs, 0)} 件（${!vaultRoot ? 'Drive が無いので id の形だけ' : unreadableBooks.size ? `Drive の候補表と照合・読めない ${unreadableBooks.size} 冊の分は id の形だけ` : 'Drive の候補表と照合'}）`);
    const jobs = visualJobs(view, ctx);
    console.log(`[${NAME}] 図・写真の計画 ${view.reduce((n, s) => n + s.sections.reduce((m, sec) => m + sec.items.reduce((k, i) => k + (i.visuals ?? []).length, 0), 0), 0)} 件 / 未完了 ${jobs.length} 件（一覧は --visual-jobs）`);
    if (unreadableBooks.size) console.warn(driveUnreadableWarning(NAME, unreadableBooks.size, unreadableCode));
    for (const issue of issues) console.error(`  ✗ ${issue}`);
    console.log(`[${NAME}] ${issues.length ? '✗ FAIL' : '✓ PASS'}（違反 ${issues.length} 件）`);
    process.exitCode = issues.length ? 1 : 0;
  }
}
