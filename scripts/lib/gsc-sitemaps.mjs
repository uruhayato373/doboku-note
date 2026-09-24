/**
 * gsc-sitemaps.mjs（lib）— Search Console の sitemap 送信・読み込み状況の判定（純関数）
 * ---------------------------------------------------------------------------
 * 取得は scripts/gsc-sitemaps.mjs（fetch-metrics.yml・週次・サービスアカウント＝ログイン不要）、
 * 週次の見張りは scripts/check-gsc-sitemaps.mjs（weekly-review-guard.yml）。
 * 送るべき sitemap の真実源は本番 robots.txt の `Sitemap:` 行（sitemap.xml と期限内の sitemap-legacy.xml）。
 * ---------------------------------------------------------------------------
 */

export const SITEMAPS_STATE = ".claude/state/metrics/gsc/sitemaps-latest.json";

/** robots.txt の `Sitemap:` 行を絶対 URL の配列で返す（重複除去・出現順）。 */
export function parseRobotsSitemaps(text) {
  const out = [];
  for (const line of String(text ?? "").split(/\r?\n/)) {
    const m = line.match(/^\s*sitemap\s*:\s*(\S+)\s*$/i);
    if (m && !out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

const DAY = 86400000;
const ageDays = (iso, now) => {
  const t = Date.parse(iso ?? "");
  return Number.isFinite(t) ? Math.floor((now.getTime() - t) / DAY) : null;
};

/**
 * 週次の判定。DUE の理由を全部返す（1 つ目で止めない）。
 * - 記録が無い／古い（fetch-metrics が止まった）
 * - robots.txt にあるのに GSC に登録されていない sitemap（送信の権限不足もここに出る）
 * - 送信が失敗した sitemap
 * - GSC が報告するエラー（警告はリダイレクトを含む旧 URL の sitemap で必ず出るので数えない）
 * - Google が長く読み込んでいない sitemap
 */
export function evaluateSitemapsDue({ latest, now = new Date(), maxRecordAgeDays = 10, maxDownloadAgeDays = 14 }) {
  const reasons = [];
  if (!latest) return { due: true, reasons: ["記録が無い（fetch-metrics の GSC sitemaps ステップが一度も完走していない）"] };
  const recordAge = ageDays(latest.fetchedAt, now);
  if (recordAge === null || recordAge > maxRecordAgeDays) reasons.push(`記録が ${recordAge ?? "?"} 日前（しきい値 ${maxRecordAgeDays} 日・fetch-metrics 停止の疑い）`);
  const listed = new Map((latest.sitemaps ?? []).map((s) => [s.path, s]));
  for (const url of latest.robotsSitemaps ?? []) {
    if (!listed.has(url)) reasons.push(`GSC に未登録: ${url}`);
  }
  for (const s of latest.submit ?? []) {
    if (s.status !== "ok") reasons.push(`送信失敗（${s.status}）: ${s.path}${s.status === "permission-denied" ? "（サービスアカウントに Search Console の「フル」権限が要る）" : ""}`);
  }
  for (const s of latest.sitemaps ?? []) {
    if (Number(s.errors) > 0) reasons.push(`GSC がエラー ${s.errors} 件を報告: ${s.path}`);
    if ((latest.robotsSitemaps ?? []).includes(s.path)) {
      const dl = ageDays(s.lastDownloaded, now);
      if (dl === null || dl > maxDownloadAgeDays) reasons.push(`Google の最終読み込みが ${dl ?? "未"} 日前: ${s.path}`);
    }
  }
  return { due: reasons.length > 0, reasons };
}
