import test from 'node:test';
import assert from 'node:assert/strict';
import { assignAffiliateVariant, AFFILIATE_VARIANT_KEY, parseAffiliateExperimentLabel } from '../src/lib/affiliate-experiment.mjs';
import { buildAffiliateExperimentRequest, parseAffiliateExperimentRows, summarizeAffiliateExperiment, recordAffiliateExperimentMeasurements } from '../scripts/lib/affiliate-experiment-report.mjs';
import { Ga4Reports } from '../scripts/lib/dataset-schemas-search.mjs';

test('訪問者の案を保存し、再訪・別の掲載面でも変えない。3案を同率で割り当てる', () => {
  for (const [random, expected] of [[0, 'A'], [0.34, 'B'], [0.99, 'C']]) {
    const memory = new Map();
    const storage = { getItem:k => memory.get(k), setItem:(k,v) => memory.set(k,v) };
    assert.equal(assignAffiliateVariant(storage, () => random), expected);
    assert.equal(assignAffiliateVariant(storage, () => 1 - random), expected);
    assert.equal(memory.get(AFFILIATE_VARIANT_KEY), expected);
  }
  const blocked = { getItem:() => { throw Error('denied'); }, setItem:() => { throw Error('denied'); } };
  assert.equal(assignAffiliateVariant(blocked, () => 0.5), 'B');
  assert.equal(parseAffiliateExperimentLabel('EXP-018:A:buildjob:article-mid'), null);
});

test('登録済みのevent_labelと標準次元で案・案件・面・端末・日付を取得する', () => {
  const req = buildAffiliateExperimentRequest({ propertyId:'properties/419382901', startDate:'2026-10-08', endDate:'2026-10-14' });
  assert.deepEqual(req.dimensions.map(d => d.name), ['pagePath', 'customEvent:event_label', 'deviceCategory', 'date', 'eventName']);
  const raw = event => ({ dimensionValues:['/exam/civil-construction-1/guide/market-value', 'EXP-019:B:buildjob:article-inline', 'mobile', '20261009', event].map(value => ({value})), metricValues:[{value:'3'}] });
  const rows = parseAffiliateExperimentRows([raw('affiliate_experiment_impression'),raw('affiliate_experiment_click')]);
  assert.equal(rows[0].variant, 'B');
  assert.equal(rows[0].date, '2026-10-09');
  const summary = summarizeAffiliateExperiment(rows);
  assert.equal(summary[0].ctr, null, '表示0をCTR0にしない');
  assert.equal(summary[1].ctr, 1);
  assert.equal(summary[1].evidence, 'insufficient-data', '少数の100%を勝者と呼ばない');
  const day = {schemaVersion:1,source:'ga4',date:'2026-10-15',reports:{'affiliate-experiment':{stamp:'2026-10-15T01-00-00',meta:{startDate:'2026-10-08',endDate:'2026-10-14',windowKind:'days',japanOnly:true,propertyId:'properties/419382901',rowCount:2,truncated:false,limited:false,status:'available'},rows,summary}}};
  assert.ok(Ga4Reports.safeParse(day).success);
});

test('CIの実測だけを台帳へ追記する。再取得・開始前・未取得・打切りは成功に数えない', () => {
  const ledger = {experiments:[{id:'EXP-019',status:'running',measurementPlan:{kind:'affiliate-design',startDate:'2026-10-08'},measurements:[]}]};
  const base = {experiment:'EXP-019',variant:'C',program:'buildjob',placement:'article-mid',page:'/exam/example',device:'desktop',eventName:'affiliate_experiment_impression',eventCount:20};
  const report = {ref:'data/ga4/reports/2026-10-15.json#affiliate-experiment',stamp:'2026-10-15T01-00-00',data:{meta:{startDate:'2026-10-07',endDate:'2026-10-14',truncated:false,limited:false},rows:[{...base,date:'2026-10-07'},{...base,date:'2026-10-09'}]}};
  assert.equal(recordAffiliateExperimentMeasurements(ledger, report, '2026-10-15T01:00:00Z').appended,1);
  assert.equal(ledger.experiments[0].measurements[0].variants[2].impressions,20);
  assert.equal(recordAffiliateExperimentMeasurements(ledger, report, '2026-10-15T02:00:00Z').appended,0);
  assert.equal(recordAffiliateExperimentMeasurements(ledger, null, '2026-10-15T02:00:00Z').appended,0);
  assert.equal(recordAffiliateExperimentMeasurements(ledger, {...report,stamp:'new',data:{...report.data,meta:{truncated:true}}},'2026-10-15T02:00:00Z').appended,0);
  assert.equal(ledger.experiments[0].status,'running');
  const later = {...report,stamp:'later',data:{...report.data,meta:{...report.data.meta,startDate:'2026-11-01',endDate:'2026-11-28'},rows:[{...base,date:'2026-11-02'}]}};
  assert.equal(recordAffiliateExperimentMeasurements(ledger,later,'2026-11-29T01:00:00Z').appended,1);
  assert.equal(ledger.experiments[0].measurements[1].window.startDate,'2026-11-01','28日窓を開始日からの全期間と偽らない');
});
