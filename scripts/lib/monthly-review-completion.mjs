/** Scheduled monthly review uses the same records and routing as the interactive review. */
import { datasetDir } from './datasets.mjs';
import { checksRouting } from './review-wiring.mjs';
import { extractWeeklyHandoffItems, parseRouting } from './handoff-extraction.mjs';

export function monthlyReviewCompletion(month, reader) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error(`対象月が不正: ${month}`);
  const startDate = `${month}-01`;
  const endDate = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).toISOString().slice(0, 10);
  const json = (path) => { const text = reader.read(path); return text ? JSON.parse(text) : null; };
  const missing = [];
  const config = json('.claude/config/review-wiring.json')?.cadences?.monthly;
  if (!config) throw new Error('月次レビューの配線を読めない');
  const report = reader.read(`docs/reviews/monthly/${month}-review.md`) ?? '';
  const sections = [...new Set(config.procedure.flatMap((p) => p.sections ?? []))];
  if (!report.startsWith(`# 月次レビュー ${month}`) || sections.some((s) => !report.split(/\r?\n/).includes(`## ${s}`))) missing.push('月次レポートの必須節');
  const record = reader.list(datasetDir('business.review')).filter((p) => /\/review-[^/]+\.json$/.test(p)).map(json)
    .filter((r) => r?.kind === 'review' && r.cadence === 'monthly' && r.qualification === 'all' && r.period?.startDate === startDate && r.period?.endDate === endDate)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const snapshot = record?.snapshot ? json(record.snapshot) : null;
  if (!snapshot || snapshot.period?.startDate !== startDate || snapshot.period?.endDate !== endDate) missing.push('対象暦月のレビュー記録と snapshot');
  const checks = reader.list(datasetDir('business.checks-monthly')).filter((p) => p.includes(`/checks-monthly-${month}`)).map(json)
    .filter((r) => r?.cadence === 'monthly' && r.runKey === month).sort((a, b) => b.ranAt.localeCompare(a.ranAt))[0];
  const expected = config.checks.map((c) => c.command);
  if (!checks || !expected.length || expected.some((command) => checks.checks.filter((c) => c.command === command).length !== 1)) missing.push(`月次点検全 ${expected.length} 本の実行記録`);
  else {
    if (checks.checks.some((c) => c.state === 'broken') || checks.issuesError || checks.alertsError) missing.push('月次点検・Issue・依存アラートの検査不成立を解消');
    if (checksRouting(checks, report).unrouted.length) missing.push('月次点検と Issue の行き先');
  }
  const handoff = extractWeeklyHandoffItems(report, /^##\s+来月への申し送り\s*$/);
  if (!handoff.hasSection || handoff.items.some((i) => !parseRouting(i.text))) missing.push('来月への申し送りと行き先');
  return { month, complete: missing.length === 0, expected: 4, checked: 4, missing, provisional: record?.status === 'provisional', nextReviewDate: record?.nextReviewDate ?? null };
}

/** A completed procedure is revisited on its recorded date; missing evidence is retried. */
export function monthlyReviewDue(result, today) {
  return Boolean(result && (!result.complete || !result.nextReviewDate || result.nextReviewDate <= today));
}
