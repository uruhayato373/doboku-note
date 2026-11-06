/** X・Instagram の年間の枠を読み、実体と照合する。管理画面・check-channel-plan・予約の関門が読む。 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadRegistry } from './content-registry.mjs';
import { readDataset } from './dataset-io.mjs';
import { readJson } from './json-io.mjs';
import { ConfigChannelAnnualPlan } from './dataset-schemas-content.mjs';
import { todayJst } from './jst-date.mjs';
import { auditChannel, igPostsOf, xPostsOf } from './channel-plan-audit.mjs';
import { auditPlanMetrics, loadMetricStatuses } from './metric-status.mjs';
import { EXAM_ALIAS, X_ROOT } from './registry-x-state.mjs';
import { targetChecker } from './youtube-longform-plan.mjs';

export const loadChannelPlan = (root) => ConfigChannelAnnualPlan.parse(readDataset(root, 'config.channel-annual-plan'));

export function loadXCampaigns(root) {
  const dir = join(root, X_ROOT, 'campaigns');
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((file) => ({ file, ...readJson(root, `${X_ROOT}/campaigns/${file}`) }));
}

/** 1級と 2級にまたがる投稿は、どちらの枠にも入れてよい */
function examMatches(postExam, slotExam) {
  const exam = EXAM_ALIAS[postExam] ?? postExam;
  return exam === slotExam || (exam === 'civil-construction-1-2' && slotExam.startsWith('civil-construction-'));
}

export function loadChannelPlanAudit(root, today = todayJst()) {
  const plan = loadChannelPlan(root);
  const context = {
    cycle: plan.cycle, youtubeSlots: plan.slots, today,
    calendar: readDataset(root, 'config.exam-calendar'),
    exists: (path) => existsSync(join(root, path)),
    hasTarget: targetChecker(root),
  };
  const igRows = loadRegistry(root).publications.filter((p) => p.channel === 'instagram');
  const statuses = loadMetricStatuses(root, today);
  const withMetrics = (audit, channel) => {
    const m = auditPlanMetrics(channel.metrics.primary, statuses, channel.label);
    return { ...audit, errors: [...audit.errors, ...m.errors], warnings: [...audit.warnings, ...m.warnings], pending: [...audit.pending, ...m.pending] };
  };
  return {
    plan,
    statuses,
    youtubeMetrics: auditPlanMetrics(plan.metrics.primary, statuses, 'YouTube'),
    x: withMetrics(auditChannel(plan.channels.x, xPostsOf(plan.channels.x, loadXCampaigns(root)), context, examMatches), plan.channels.x),
    instagram: withMetrics(auditChannel(plan.channels.instagram, igPostsOf(plan.channels.instagram, igRows), context, examMatches), plan.channels.instagram),
  };
}
