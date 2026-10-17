/** Review completion is evidence, not the mere presence of a Markdown file. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { datasetDir, datasetPath } from './datasets.mjs';
import { addDays, isoWeekKey, reviewWindowOfWeek, weekPeriod } from './review-week.mjs';
import { checksRouting } from './review-wiring.mjs';
import { parseBacklog, TODO_DIR } from './backlog-lib.mjs';
import { selectBacklogVerification } from './backlog-verification.mjs';

export function reviewReader(root, ref = null) {
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return {
    read: (path) => {
      if (ref) { try { return git(['show', `${ref}:${path}`]); } catch { return null; } }
      return existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : null;
    },
    list: (dir) => ref ? git(['ls-tree', '--name-only', ref, `${dir}/`]).trim().split('\n').filter(Boolean)
      : existsSync(join(root, dir)) ? readdirSync(join(root, dir)).map((f) => `${dir}/${f}`) : [],
  };
}

export function weeklyReviewCompletion(week, reader) {
  const missing = [], checked = [];
  const readJson = (path) => {
    const text = reader.read(path);
    if (!text) return null;
    try { return JSON.parse(text); } catch { missing.push(`${path} を JSON として読めない`); return null; }
  };
  const reportPath = `docs/reviews/weekly/${week}-review.md`;
  const report = reader.read(reportPath);
  checked.push('review');
  if (!report || !report.startsWith(`# 週次レビュー ${week}`) || report.includes(`<!-- weekly-review:draft ${week} -->`)) missing.push(`${reportPath} の完成本文`);
  const nextWeek = isoWeekKey(addDays(weekPeriod(week).startDate, 7));
  const plan = reader.read('.claude/todo/weekly.md');
  checked.push('weeklyPlan');
  if (!new RegExp(`^# .*${nextWeek}`).test(plan ?? '')) missing.push(`翌週 ${nextWeek} の週間計画`);
  const window = reviewWindowOfWeek(week);
  const records = reader.list(datasetDir('business.review')).filter((f) => /\/review-[^/]+\.json$/.test(f)).map(readJson).filter(Boolean);
  const record = records.filter((r) => r.kind === 'review' && r.cadence === 'weekly' && r.period?.startDate === window.startDate && r.period?.endDate === window.endDate).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  checked.push('businessReview');
  if (!record || !record.snapshot || !readJson(record.snapshot)) missing.push(`${window.startDate}〜${window.endDate} の事業レビュー記録と snapshot`);
  const config = readJson('.claude/config/review-wiring.json');
  const expected = config?.cadences?.weekly?.checks?.map((k) => k.command) ?? [];
  const checks = reader.list(datasetDir('business.checks-weekly')).filter((f) => f.includes(`/checks-weekly-${week}`)).map(readJson).filter(Boolean).sort((a, b) => b.ranAt.localeCompare(a.ranAt))[0];
  checked.push('checks');
  if (!checks || !expected.length || checks.runKey !== week || expected.some((cmd) => checks.checks.filter((c) => c.command === cmd).length !== 1)) missing.push(`点検全 ${expected.length} 本の実行記録`);
  else {
    if (checks.checks.some((c) => c.state === 'broken') || checks.issuesError || checks.alertsError) missing.push('点検・Issue・依存アラートの検査不成立を解消');
    const routing = checksRouting(checks, report ?? '');
    if (routing.unrouted.length) missing.push(`点検と Issue の行き先 ${routing.unrouted.map((r) => r.key).join(', ')}`);
  }
  const verify = readJson(datasetPath('state.backlog-verify-status'));
  checked.push('backlogVerification');
  if (!verify || isoWeekKey(verify.updatedAt) !== week || !verify.commands) missing.push('当週の backlog 検証記録');
  else {
    const selected = selectBacklogVerification(parseBacklog(reader.read(`${TODO_DIR}/backlog.md`) ?? ''), verify.updatedAt);
    const expectedCommands = [...new Set(selected.targets.map((c) => c.verify))];
    if (!selected.candidates.length || expectedCommands.some((command) => !verify.commands[command])) missing.push('backlog の時期到来した全 [検証:] コマンドの実行記録');
    if (selected.notDue.some((card) => !verify.notDue?.some((saved) => saved.id === card.id && saved.command === card.command && typeof saved.reason === 'string' && saved.reason.trim()))) missing.push('backlog の時期未到来カードと対象外理由の記録');
    if (Object.values(verify.commands).some((c) => c.status === 'error' || ['timeout', 'inconclusive', 'skipped'].includes(c.outcome))) missing.push('backlog 検証の timeout・検査不成立・skip を解消');
    if (!verify.coverage || verify.coverage.candidateCards !== selected.candidates.length || verify.coverage.targetedCards !== selected.targets.length || verify.coverage.notDueCards !== selected.notDue.length || verify.coverage.targeted !== expectedCommands.length || verify.coverage.targeted !== verify.coverage.executed || verify.coverage.executed !== Object.keys(verify.commands).length) missing.push('backlog 検証の対象数と実検査数の一致');
  }
  return { week, complete: missing.length === 0, checked: checked.length, expected: 5, missing, provisional: record?.status === 'provisional' };
}
