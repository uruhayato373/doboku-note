/**
 * weekly-draft-sections.mjs — 週次レビューの下書き（build-weekly-review-draft.mjs）の節のうち、記録を読んで並べるだけの 3 つ（DN-1285）。
 *
 * なぜ: SNS 流入・その週の YouTube 公開本数・収益カバレッジは下書きに無く、毎回子のエージェントが探して「未取得」と書いて終わった
 * （2026-11-21 の週次レビュー）。どれも CI か台帳がすでに記録しているので、下書きが読んで出す。記録が無ければ無いと書き、0 にしない。
 *
 * 依存ゼロ（読むのは呼び出し側。ここは描画だけ）。日付は JST の YYYY-MM-DD で比べる。
 */
import { jstDayOf } from './jst-date.mjs';

const num = (v) => (v == null ? '—' : Number(v).toLocaleString('ja-JP'));
const pctText = (v) => (v == null || !Number.isFinite(v) ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`);

/**
 * SNS 流入（GA4・source 別の users と前週比）。入力は business.weekly の窓の週のファイル（fetch-metrics が金曜に書く）。
 * @param {any} doc data/business/weekly/<窓の週>.json（無ければ null）
 * @param {{ windowWeek: string, file: string }} ctx
 */
export function renderSnsInflowSection(doc, { windowWeek, file }) {
  const head = [`## SNS 流入（GA4・${windowWeek} 窓・前週比）`, ''];
  const sns = doc?.sns;
  if (!sns?.sources?.length) return [...head, `- 未取得（${file} ${doc ? 'に sns が無い' : 'が無い'}。金曜の fetch-metrics の書き戻しを確認）`, ''];
  const rows = sns.sources.map((s) => `| ${s.source} | ${num(s.thisUsers)} | ${num(s.prevUsers)} | ${pctText(s.userDeltaPct)} | ${num(s.thisSessions)} |`);
  const t = sns.total ?? {};
  return [
    ...head,
    '| 流入元 | users | 前週 | 増減 | sessions |',
    '|---|--:|--:|--:|--:|',
    ...rows,
    `| 合計 | ${num(t.thisUsers)} | ${num(t.prevUsers)} | ${pctText(t.userDeltaPct)} | ${num(t.thisSessions)} |`,
    '',
    `出所: ${file}（sns）。急落は今週 sessions ≥ 5 かつ前週比 −30% 以上、新規成長は前週 < 3 から今週 ≥ 10（collect-metrics.md）。`,
    '',
  ];
}

const inPeriod = (iso, { startDate, endDate }) => {
  if (!iso) return false;
  const d = jstDayOf(Date.parse(iso));
  return d >= startDate && d <= endDate;
};

/**
 * その週の YouTube（公開になった本数・新しく予約した本数・先の予約の残り）。入力はコンテンツ台帳の YouTube の公開。
 * 公開は status が published で publishAt がその週のもの、予約は times.scheduled がその週のもの。
 * @param {Array<{ channel: string, exam: string, format: string, status: string, publishAt?: string, times?: Record<string, string> }>} publications
 * @param {{ startDate: string, endDate: string }} period
 */
export function renderYoutubeWeekSection(publications, period) {
  const yt = publications.filter((p) => p.channel === 'youtube');
  const head = [`## YouTube の公開（${period.startDate}〜${period.endDate}）`, ''];
  if (!yt.length) return [...head, '- 未取得（コンテンツ台帳（registry.youtube）に YouTube の公開が 1 件も無い）', ''];
  const published = yt.filter((p) => p.status === 'published' && inPeriod(p.publishAt, period));
  const scheduledThisWeek = yt.filter((p) => inPeriod(p.times?.scheduled, period));
  const upcoming = yt.filter((p) => p.status === 'scheduled' && p.publishAt && jstDayOf(Date.parse(p.publishAt)) > period.endDate);
  const byExam = (list) => {
    const m = new Map();
    for (const p of list) m.set(`${p.exam}・${p.format}`, (m.get(`${p.exam}・${p.format}`) ?? 0) + 1);
    return [...m].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k} ${v}`).join(' / ') || 'なし';
  };
  return [
    ...head,
    `- 公開になった本数: ${published.length}（${byExam(published)}）`,
    `- この週に新しく予約した本数: ${scheduledThisWeek.length}（${byExam(scheduledThisWeek)}）`,
    `- 先の予約の残り: ${upcoming.length}`,
    `- 台帳の全件: ${yt.length}（状態は台帳の記録。YouTube 側との照合は verify-video-publication）`,
    '',
  ];
}

/**
 * 収益カバレッジ（高流入なのに収益導線が無いページ）。入力は report-monetization-coverage の報告（coverage-latest.md）。
 * 載せるのは冒頭の要約と要対応ギャップの表の上位 maxRows 行だけ（報告は 400 行を超える）。残りの節は出所の全文で読む。
 * 流入の窓が古ければ注意を出す。
 * @param {string | null} report coverage-latest.md の本文
 * @param {{ file: string, trafficEnd?: string | null, windowEnd: string, maxRows?: number }} ctx
 */
export function renderCoverageSection(report, { file, trafficEnd = null, windowEnd, maxRows = 10 }) {
  const head = ['## 収益カバレッジ ダッシュボード', ''];
  if (!report?.trim()) return [...head, `- 未取得（${file} が無い。npm run report-monetization-coverage で作る）`, ''];
  const lines = report.replace(/^## 収益カバレッジ ダッシュボード\s*\n/, '').split('\n');
  const out = [];
  const rest = [];
  let section = null;
  let gapRows = 0;
  let cut = 0;
  for (const line of lines) {
    if (/^### /.test(line)) section = line.replace(/^### /, '').trim();
    if (section && !/要対応ギャップ/.test(section)) {
      if (/^### /.test(line)) rest.push(section);
      continue;
    }
    const isRow = section && /^\| `/.test(line);
    if (isRow && gapRows >= maxRows) { cut += 1; continue; }
    if (isRow) gapRows += 1;
    out.push(line);
  }
  const body = out.join('\n').trim().split('\n');
  if (cut) body.push(`| ほか ${cut} 件 | | | |`);
  const stale = trafficEnd && trafficEnd < windowEnd ? [`> [!warning] 流入の窓の終わり ${trafficEnd} が、レビューの窓の終わり ${windowEnd} より前（金曜の fetch-metrics の後に report-monetization-coverage が回っていない）`, ''] : [];
  return [...head, ...stale, ...body, '', `出所: ${file}${rest.length ? `（ほかの節: ${rest.join('・')}）` : ''}`, ''];
}
