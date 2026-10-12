/**
 * seo-build-summary.mjs — check-seo-build の build ごとの結果を日ごとの履歴にまとめ、前週比を出す（DN-0676）。
 *
 * なぜ: warn（jsonld_recommended_missing 約 1,390 件など）は CI のログにしか残らず、誰も見ていなかった。
 * CI が build 後に 1 回分の結果（check-seo-build の --summary-out）を作り、record-seo-build-summary.mjs が
 * data/analysis/seo-build-summary.json（台帳 id analysis.seo-build-summary）の履歴へ日付単位で追記する。
 * 週次レビューの下書き（build-weekly-review-draft.mjs）が renderSeoBuildSection で件数と前週比を出す。
 *
 * 依存ゼロ（zod を読まない）。型は dataset-schemas-analysis.mjs の SeoBuildSummary。
 */

/** 履歴に残す日数の上限（日付ごとに 1 行・約 1 年分） */
export const MAX_HISTORY = 400;

const sortedCounts = (rec) => Object.fromEntries(Object.entries(rec ?? {}).sort(([a], [b]) => a.localeCompare(b)));

/**
 * check-seo-build の 1 回分の結果（--summary-out）から履歴の 1 行を作る。
 * @param {{ generatedAt: string, sitemapUrls: number, checked: number, errors: number, warnings: number, errorsByCode: Record<string, number>, warningsByCode: Record<string, number> }} run
 * @param {string} date JST の YYYY-MM-DD
 */
export function entryFromRun(run, date) {
  return {
    date,
    generatedAt: run.generatedAt,
    sitemapUrls: run.sitemapUrls,
    checked: run.checked,
    errors: run.errors,
    warnings: run.warnings,
    errorsByCode: sortedCounts(run.errorsByCode),
    warningsByCode: sortedCounts(run.warningsByCode),
  };
}

const sameCounts = (a, b) =>
  a.sitemapUrls === b.sitemapUrls && a.checked === b.checked && a.errors === b.errors && a.warnings === b.warnings
  && JSON.stringify(a.errorsByCode) === JSON.stringify(b.errorsByCode)
  && JSON.stringify(a.warningsByCode) === JSON.stringify(b.warningsByCode);

/**
 * 履歴へ 1 行を足す。同じ日付の行があれば置き換える（1 日に develop への push は何度もある）。
 * 件数が同じなら既存の行を残す（時刻だけ違う書き戻しコミットを作らない）。日付の昇順・上限 MAX_HISTORY 日。
 * @returns {{ history: object[], changed: boolean }}
 */
export function recordEntry(history, entry, max = MAX_HISTORY) {
  const same = history.find((h) => h.date === entry.date);
  if (same && sameCounts(same, entry)) return { history, changed: false };
  const next = [...history.filter((h) => h.date !== entry.date), entry].sort((a, b) => a.date.localeCompare(b.date));
  return { history: next.slice(-max), changed: true };
}

const shiftDate = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/**
 * 最新の行と、その 7 日前以前で最も新しい行（前週）を返す。履歴が 7 日に満たなければ previous は null。
 * @returns {{ latest: object, previous: object | null } | null} 履歴が空なら null
 */
export function latestAndWeekAgo(history) {
  if (!history.length) return null;
  const latest = history[history.length - 1];
  const cutoff = shiftDate(latest.date, -7);
  const previous = [...history].reverse().find((h) => h.date <= cutoff) ?? null;
  return { latest, previous };
}

const fmtDiff = (now, before) => (before == null ? '—' : now === before ? '±0' : `${now > before ? '+' : ''}${now - before}`);

/**
 * 週次レビューの下書きの節（Markdown の行）。履歴が無い・古いときはその旨を書く（0 件と読ませない）。
 * @param {object[] | null} history 台帳の history（ファイルが無ければ null）
 * @param {string} today JST の今日
 */
export function renderSeoBuildSection(history, today) {
  const lines = ['## build 後 SEO スキャン（check-seo-build・CI が develop の push ごとに記録）', ''];
  const pair = history && latestAndWeekAgo(history);
  if (!pair) {
    lines.push('- （未取得: 台帳 analysis.seo-build-summary に記録が無い。CI の「Publish SEO build summary」を確認）', '');
    return lines;
  }
  const { latest, previous } = pair;
  const ageDays = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${latest.date}T00:00:00Z`)) / 86_400_000);
  lines.push(`- 最新の記録: ${latest.date}${ageDays > 7 ? `（**${ageDays} 日前**。CI の書き戻しが止まっていないか確認）` : ''}。検査 ${latest.checked} URL / sitemap ${latest.sitemapUrls} URL`);
  lines.push(`- error ${latest.errors}（前週比 ${fmtDiff(latest.errors, previous?.errors)}）/ warn ${latest.warnings}（前週比 ${fmtDiff(latest.warnings, previous?.warnings)}）`);
  lines.push(previous ? `- 前週の記録: ${previous.date}` : '- 前週の記録: なし（履歴が 7 日に満たない）');
  const codes = [...new Set([...Object.keys(latest.errorsByCode), ...Object.keys(latest.warningsByCode), ...Object.keys(previous?.errorsByCode ?? {}), ...Object.keys(previous?.warningsByCode ?? {})])];
  if (codes.length) {
    lines.push('', '| 型 | 区分 | 件数 | 前週比 |', '|---|---|--:|--:|');
    for (const code of codes.sort()) {
      const isError = code in latest.errorsByCode || code in (previous?.errorsByCode ?? {});
      const now = (isError ? latest.errorsByCode : latest.warningsByCode)[code] ?? 0;
      const before = previous ? (isError ? previous.errorsByCode : previous.warningsByCode)[code] ?? 0 : null;
      lines.push(`| ${code} | ${isError ? 'error' : 'warn'} | ${now} | ${fmtDiff(now, before)} |`);
    }
  }
  lines.push('');
  return lines;
}
