import { assertPreservationReady, THUMBNAIL_RETRY_NOT_BEFORE } from './youtube-migration-finalize.mjs';

export const DELIVERY_PHASES = ['audit', 'thumbnail', 'activate', 'delete', 'schedule', 'upload'];
export function pacificDay(ms) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);
}
export function nextPacificReset(ms) {
  const day = pacificDay(ms);
  // Find the first minute of the next Pacific day; this also handles DST.
  let next = Math.floor(ms / 60000) * 60000 + 60000;
  while (pacificDay(next) === day) next += 60000;
  return new Date(next).toISOString();
}
export function quotaPause(error, phase, ms) {
  const status = error.response?.status;
  const reasons = error.response?.data?.error?.errors?.map(e => e.reason) ?? [];
  if (![403, 429].includes(status) || !reasons.some(r => /^(uploadLimitExceeded|dailyLimitExceeded|quotaExceeded|rateLimitExceeded|uploadRateLimitExceeded)$/.test(r))) return null;
  if (phase === 'thumbnail') return { scope: 'thumbnail', until: new Date(ms + 24 * 3600e3).toISOString() };
  if (phase === 'upload') return { scope: 'upload', until: reasons.includes('uploadLimitExceeded') ? new Date(ms + 24 * 3600e3).toISOString() : nextPacificReset(ms) };
  return { scope: 'all', until: nextPacificReset(ms) };
}
const future = (value, ms) => Number.isFinite(Date.parse(value)) && Date.parse(value) > ms;
export function deliveryDecision(item, receipt, ms, publication) {
  if (!item.media) return { blocked: 'render' };
  if (!receipt?.newId) return receipt?.phase === 'upload-intent' ? { blocked: 'upload-outcome-uncertain' } : { phase: 'upload' };
  if (receipt.phase === 'deleted') {
    if (!publication || receipt.publication) return { complete: true };
    if (!future(publication.publishAt, ms + 5 * 60000)) return { blocked: 'expired-publication-slot' };
    if (!receipt.relatedVerification?.matched || !/^[\w-]{11}$/.test(receipt.relatedVerification.relatedVideoId ?? '')) return { blocked: 'related-target-identity' };
    return { phase: 'schedule' };
  }
  if (receipt.activation) {
    if (!receipt.linkVerification?.matched || receipt.linkVerification.newId !== receipt.newId) return { blocked: 'dependent-links' };
    const audit = receipt.deletionAudit;
    if (!audit?.matched || audit.oldId !== receipt.oldId || audit.newId !== receipt.newId || !Number.isFinite(Date.parse(audit.checkedAt)) || Date.parse(audit.checkedAt) > ms + 5000 || ms - Date.parse(audit.checkedAt) > 3600e3) return { blocked: 'fresh-deletion-audit' };
    return { phase: 'delete' };
  }
  if (!receipt.processingVerifiedAt || !receipt.preservationAudit?.playlistInventoryComplete) return { phase: 'audit' };
  if (receipt.thumbnail?.phase === 'intent') return { blocked: 'thumbnail-outcome-uncertain' };
  if (receipt.thumbnail?.phase !== 'verified' || receipt.thumbnail.expectedSha256 !== item.thumbnail.sha256) return { phase: 'thumbnail' };
  try { assertPreservationReady(receipt, item); } catch { return { blocked: 'playback-related-or-preservation-review' }; }
  return { phase: 'activate' };
}

/** Resume the private journal. Neither a missing proof nor elapsed time is approval. */
export async function runDelivery({ config, entries, load, loadState, saveState, act, publicationFor = () => null, commit = false, now = () => Date.now(), onProgress = () => {} }) {
  if (config.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(config.planSha256 ?? '')) throw new Error('Invalid delivery configuration');
  for (const phase of DELIVERY_PHASES) {
    if (!Number.isInteger(config.dailyLimits?.[phase]) || config.dailyLimits[phase] < 0 || config.dailyLimits[phase] > 100) throw new Error('Invalid daily limit');
  }
  const summary = { enabled: config.enabled === true, dryRun: !commit, total: entries.length, actions: {}, waiting: {}, complete: 0 };
  if (!summary.enabled) return summary;
  let state = (await loadState()) ?? {};
  if (state.planSha256 && state.planSha256 !== config.planSha256) throw new Error('Delivery plan changed; reconcile private state first');
  state.planSha256 = config.planSha256;
  state.cooldowns ??= {};
  if (state.day !== pacificDay(now())) { state.day = pacificDay(now()); state.used = {}; }
  state.used ??= {};
  const persist = async () => { if (commit) await saveState(state); };
  for (const phase of DELIVERY_PHASES) {
    for (const item of entries) {
      const ms = now();
      // A long run crossing midnight must use the new day's budget.
      if (state.day !== pacificDay(ms)) { state.day = pacificDay(ms); state.used = {}; }
      if (future(state.cooldowns.all, ms)) break;
      if (future(state.cooldowns[phase], ms)) break;
      if (phase === 'upload' && future(config.uploadRetryNotBefore, ms)) break;
      if (phase === 'thumbnail' && future(THUMBNAIL_RETRY_NOT_BEFORE, ms)) break;
      if (phase === 'delete' && config.deleteOldVersions !== true) break;
      if ((state.used[phase] ?? 0) >= config.dailyLimits[phase]) break;
      const decision = deliveryDecision(item, await load(item.oldVideo.id), ms, publicationFor(item));
      if (decision.phase !== phase) continue;
      if (!commit) { summary.actions[phase] = (summary.actions[phase] ?? 0) + 1; state.used[phase] = (state.used[phase] ?? 0) + 1; continue; }
      // Reserve quota durably before API calls, including uncertain outcomes.
      state.used[phase] = (state.used[phase] ?? 0) + 1;
      await persist();
      try {
        const result = await act(phase, item, publicationFor(item));
        summary.actions[phase] = (summary.actions[phase] ?? 0) + 1;
        if (result.phase === 'thumbnail-rate-limit-wait') break;
      } catch (error) {
        const pause = quotaPause(error, phase, now());
        if (!pause) throw error;
        state.cooldowns[pause.scope] = pause.until;
        await persist();
        break;
      }
      await onProgress(summary);
    }
  }
  for (const item of entries) {
    const decision = deliveryDecision(item, await load(item.oldVideo.id), now(), publicationFor(item));
    if (decision.complete) summary.complete++;
    else { const reason = decision.blocked ?? `pending-${decision.phase}`; summary.waiting[reason] = (summary.waiting[reason] ?? 0) + 1; }
  }
  summary.cooldowns = { ...state.cooldowns };
  if (future(config.uploadRetryNotBefore, now())) summary.cooldowns.upload = config.uploadRetryNotBefore;
  if (future(THUMBNAIL_RETRY_NOT_BEFORE, now())) summary.cooldowns.thumbnail = THUMBNAIL_RETRY_NOT_BEFORE;
  state.lastRun = { checkedAt: new Date(now()).toISOString(), summary };
  await persist();
  return summary;
}
