/**
 * EXP-053 の GA4 の行（cta-clicks-by-label）を案ごと・置き場所ごとに合計する純関数（scripts/report-note-body-experiment.mjs）。
 */
import { NOTE_BODY_VARIANTS, parseNoteBodyExperimentLabel } from '../../src/lib/note-body-experiment.mjs';

export function summarizeNoteBodyExperiment(rows) {
  const arms = new Map(NOTE_BODY_VARIANTS.map((v) => [v, { variant: v, impressions: 0, clicks: 0 }]));
  const placements = new Map();
  for (const r of rows ?? []) {
    const parsed = parseNoteBodyExperimentLabel(r.label);
    if (!parsed) continue;
    const field = r.eventName === 'note_body_experiment_impression' ? 'impressions' : r.eventName === 'note_body_experiment_click' ? 'clicks' : null;
    if (!field) continue;
    arms.get(parsed.variant)[field] += r.eventCount;
    const key = `${parsed.placement}\u0000${parsed.variant}`;
    const p = placements.get(key) ?? { placement: parsed.placement, variant: parsed.variant, impressions: 0, clicks: 0 };
    p[field] += r.eventCount;
    placements.set(key, p);
  }
  const withCtr = (x) => ({ ...x, ctr: x.impressions > 0 ? x.clicks / x.impressions : null });
  return {
    arms: [...arms.values()].map(withCtr),
    byPlacement: [...placements.values()].sort((a, b) => a.placement.localeCompare(b.placement) || a.variant.localeCompare(b.variant)).map(withCtr),
  };
}
