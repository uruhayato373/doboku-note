export function assessDelivery(state, { planSha256, total, requireDeleted = false, now = Date.now() }) {
  const summary = state?.lastRun?.summary, time = Date.parse(state?.lastRun?.checkedAt);
  if (state?.planSha256 !== planSha256 || !Number.isInteger(total) || total < 1 || summary?.total !== total || summary?.dryRun !== false || !Number.isInteger(summary?.deleted) || summary.deleted < 0 || summary.deleted > total || !Number.isFinite(time) || time > now + 5000 || now - time > 36 * 3600e3) return { code: 2, reason: 'verification-not-established-or-stale' };
  return { code: requireDeleted && summary.deleted !== total ? 1 : 0, total, deleted: summary.deleted, remaining: total - summary.deleted, waiting: summary.waiting, checkedAt: state.lastRun.checkedAt };
}
