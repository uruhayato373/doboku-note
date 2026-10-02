/**
 * ga4-snapshot.mjs — GA4 CTA スナップショットの「窓」を決める・選ぶ（DN-0062）
 *
 * なぜ共有 lib にするか:
 *   GA4 のレポート（data/ga4/reports/<日付>.json）は複数のレポートが消費する
 *   （report-buildjob-affiliate、および今後の career ファネルレポート）。選択ロジックを
 *   各レポートに複製すると、窓の扱いがレポートごとにズレる。ズレると同じデータから
 *   違う EPC が出るので、選択は 1 実装に集約する。
 *
 * 解いている問題:
 *   EPC の分子（A8 確定報酬）は月次でしか出ない。分母（GA4 クリック）は既定が
 *   「前日を終端とする 28 日」で月境界と揃わない。揃えるには GA4 側を月次で取る必要が
 *   あるが、ファイル名は取得時刻順なので、**週次 cron が 28 日窓を吐いた瞬間に月次窓が
 *   黙って負ける**（辞書順の最後が勝つため）。そこで meta.windowKind で選ぶ。
 */

import { listReports } from "../../../scripts/lib/metric-reports.mjs";

/** `--days` の既定（前日を終端とする N 日）。 */
export const DEFAULT_DAYS = 28;

function formatDate(d) {
  return d.toISOString().split("T")[0];
}

/** 前日を終端とする N 日窓。 */
export function getDaysRange(days) {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

/**
 * 取得窓を解決する。
 *
 * @param {{month?:string|null,startDate?:string|null,endDate?:string|null,days?:number}} opts
 * @returns {{startDate:string,endDate:string,windowKind:"month"|"explicit"|"days"}}
 */
export function resolveWindow(opts = {}) {
  if (opts.month) {
    const m = /^(\d{4})-(\d{2})$/.exec(opts.month);
    if (!m) throw new Error(`--month は YYYY-MM 形式で指定する（受領: ${opts.month}）`);
    const year = Number(m[1]);
    const mon = Number(m[2]);
    if (mon < 1 || mon > 12) throw new Error(`--month の月が範囲外: ${opts.month}`);
    // Date.UTC(y, mon, 0) は「mon 月の 0 日」＝前月末日。mon は 1-origin なので当月末になる。
    const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
    return {
      startDate: `${m[1]}-${m[2]}-01`,
      endDate: `${m[1]}-${m[2]}-${String(lastDay).padStart(2, "0")}`,
      windowKind: "month",
    };
  }
  if (opts.startDate || opts.endDate) {
    if (!opts.startDate || !opts.endDate) {
      throw new Error("--start と --end は両方まとめて指定する");
    }
    return { startDate: opts.startDate, endDate: opts.endDate, windowKind: "explicit" };
  }
  return { ...getDaysRange(opts.days ?? DEFAULT_DAYS), windowKind: "days" };
}

/**
 * by-label スナップショットを 1 本選ぶ。
 *
 * 月次窓があればその中で最新を、無ければ従来どおり取得時刻が最新のものを返す。
 * **windowKind 未設定の既存ファイルは "days"（28 日窓）として扱う**。
 *
 * @param {string} [root] リポジトリのルート
 * @returns {string|null} 選ばれたレポートの参照（「ファイル#枠」）。候補が無ければ null
 */
export function pickByLabelSnapshot(root = ".") {
  const all = listReports(root, "ga4.cta-clicks-by-label");
  if (!all.length) return null;
  return (all.find((r) => r.data?.meta?.windowKind === "month") ?? all[0]).ref;
}

/**
 * GA4×GSC crosswalk 用の GSC ページ別レポートを選ぶ。
 * 水曜の index-coverage.yml が書く 1000 行打ち切り版（meta.truncated）を拾わず、最新を返す。
 *
 * @param {string} [root] リポジトリのルート
 * @returns {string|null} 選ばれたレポートの参照（「ファイル#枠」）
 */
export function pickGscPage(root = ".") {
  return listReports(root, "gsc.page").find((r) => r.data?.meta && r.data.meta.truncated !== true)?.ref ?? null;
}
