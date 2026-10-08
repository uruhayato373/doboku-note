import { AFFILIATE_EXPERIMENT_ID, AFFILIATE_EXPERIMENT_EVENTS, AFFILIATE_VARIANTS, parseAffiliateExperimentLabel } from '../../src/lib/affiliate-experiment.mjs';
import { andFilter, japanFilter } from '../../.claude/scripts/lib/ga4-client.mjs';

export function buildAffiliateExperimentRequest({ propertyId, startDate, endDate, japanOnly = true }) {
  return {
    property: propertyId,
    dateRanges: [{ startDate, endDate }],
    dimensions: ['pagePath', 'customEvent:event_label', 'deviceCategory', 'date', 'eventName'].map(name => ({ name })),
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: andFilter([
      { filter: { fieldName: 'eventName', inListFilter: { values: AFFILIATE_EXPERIMENT_EVENTS } } },
      { filter: { fieldName: 'customEvent:event_label', stringFilter: { matchType: 'BEGINS_WITH', value: `${AFFILIATE_EXPERIMENT_ID}:` } } },
      japanOnly ? japanFilter() : null,
    ]),
  };
}

export function parseAffiliateExperimentRows(rows) {
  return rows.map(row => {
    const dims = row.dimensionValues.map(v => v.value);
    const parsed = parseAffiliateExperimentLabel(dims[1]);
    if (!parsed) throw new Error(`Invalid experiment label: ${dims[1]}`);
    return { ...parsed, page: dims[0], device: dims[2], date: dims[3].replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'), eventName: dims[4], eventCount: Number(row.metricValues[0].value) };
  });
}

/** イベント回数の記述集計。勝者の自動判定はしない。未表示の CTR は null。 */
export function summarizeAffiliateExperiment(rows) {
  return AFFILIATE_VARIANTS.map(variant => {
    const selected = rows.filter(r => r.variant === variant);
    const sum = event => selected.filter(r => r.eventName === event).reduce((n, r) => n + r.eventCount, 0);
    const impressions = sum('affiliate_experiment_impression');
    const clicks = sum('affiliate_experiment_click');
    const pageViews = sum('affiliate_experiment_page_view');
    const noteImpressions = sum('note_experiment_impression');
    const noteClicks = sum('note_experiment_click');
    return { variant, impressions, clicks, pageViews, noteImpressions, noteClicks,
      ctr: impressions ? clicks / impressions : null,
      clicksPerPageView: pageViews ? clicks / pageViews : null,
      noteCtr: noteImpressions ? noteClicks / noteImpressions : null,
      evidence: clicks >= 20 && impressions >= 1000 ? 'review-required' : 'insufficient-data' };
  });
}

/** CIの週次測定に既存の保存レポートを渡す。同じ取得を重ねて記録しない。 */
export function recordAffiliateExperimentMeasurements(ledger, report, measuredAt) {
  const targets = ledger.experiments.filter(e => ['running', 'measuring'].includes(e.status) && e.measurementPlan?.kind === 'affiliate-design');
  let appended = 0;
  for (const experiment of targets) {
    if (!report || report.data.meta?.truncated || report.data.meta?.limited || report.data.rows.length === 0) continue;
    const key = `${report.ref}:${report.stamp}`;
    if (experiment.measurements?.some(m => m.sourceReport === key)) continue;
    const startDate = report.data.meta.startDate > experiment.measurementPlan.startDate ? report.data.meta.startDate : experiment.measurementPlan.startDate;
    const rows = report.data.rows.filter(r => r.experiment === experiment.id && r.date >= startDate && r.date <= report.data.meta.endDate);
    if (!rows.length) continue;
    (experiment.measurements ??= []).push({ source: 'auto', measuredAt, sourceReport: key,
      metric: 'affiliate-design', window: { startDate, endDate: report.data.meta.endDate },
      variants: summarizeAffiliateExperiment(rows), verdictHint: 'review-required',
      note: '取得窓内の案別イベント回数。週次の窓は重複するため足し合わせない。少数・案別の構成差・同一訪問者の複数表示を確認して人が裁定する。A8成果の案別帰属は未取得。' });
    appended++;
  }
  return { targets: targets.length, appended, waiting: targets.length - appended };
}
