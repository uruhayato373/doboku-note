/** もしもの月次成果。読めない値・別サイト・重複行を 0 に変換しない。 */
import { jstDayOf } from './jst-date.mjs';

export function moshimoMonthRange(month, today) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month > today.slice(0, 7)) throw new Error('対象月が不正');
  const [y, m] = month.split('-').map(Number);
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { from: `${month}-01`, to: end < today ? end : today };
}

function countYen(text) {
  const value = String(text ?? '').normalize('NFKC').replaceAll(',', '');
  const n = value.match(/(?:^|\s)(\d+)\s*件/);
  const yen = value.match(/(?:^|\s)(\d+)\s*円/);
  if (!n || !yen) throw new Error(`件数・金額を読めない: ${value}`);
  return { count: Number(n[1]), yen: Number(yen[1]) };
}

export function parseMoshimoRows(rows, expectedSiteId) {
  const seen = new Set();
  return rows.map(r => {
    if (r.siteId !== expectedSiteId || !/^\d+$/.test(r.programId) || seen.has(r.programId)) throw new Error('別サイト・案件 ID 不正・重複行');
    seen.add(r.programId);
    if (r.cells.length < 9) throw new Error('成果テーブルの列不足');
    const impressions = r.cells[2].normalize('NFKC').replaceAll(',', '').trim();
    if (!/^\d+(?:\s*(?:回|件))?$/.test(impressions)) throw new Error('表示数を読めない');
    const clicks = countYen(r.cells[3]);
    const conversions = countYen(r.cells[4]);
    const approved = countYen(r.cells[5]);
    return { programId: r.programId, programName: r.programName, impressions: parseInt(impressions, 10), clicks: clicks.count, clickRevenueYen: clicks.yen, conversions: conversions.count, grossRevenueYen: conversions.yen, approved: approved.count, revenueYen: approved.yen };
  });
}

export function validateMoshimoReport(report, { month, siteId, now = new Date().toISOString(), fresh = false }) {
  if (!report || report.month !== month || report.source.siteId !== siteId || report.source.site !== 'doboku-note') throw new Error(`${month}: サイト別の成果が未取得`);
  const expected = moshimoMonthRange(month, jstDayOf(report.fetchedAt));
  if (report.period.from !== expected.from || report.period.to !== expected.to || report.observedRows !== report.records.length || !report.observedRows) throw new Error(`${month}: 期間・検査件数が不正`);
  if (fresh && (Date.parse(now) - Date.parse(report.fetchedAt)) / 86400000 > 10) throw new Error(`${month}: 取得が 10 日より古い`);
}
