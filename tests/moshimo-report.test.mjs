import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMoshimoRows, moshimoMonthRange, validateMoshimoReport } from '../scripts/lib/moshimo-report.mjs';
import { buildProductIndex, buildProductSales, buildProductFunnel, salesOf } from '../scripts/lib/product-sales.mjs';
import { MoshimoReport, BusinessProductSales } from '../scripts/lib/dataset-schemas.mjs';
import { buildStages } from '../scripts/lib/weekly-collect-plan.mjs';

const row = { programId: '1', siteId: '672381', programName: '建設', cells: ['', '', '1,200', '20 件 0 円', '2 件 20,000 円', '1 件 10,000 円', '', '', ''] };
const make = () => ({ schemaVersion: 1, month: '2026-10', fetchedAt: '2026-11-01T00:00:00.000Z', source: { site: 'doboku-note', siteId: '672381', url: 'https://af.moshimo.com/' }, period: { from: '2026-10-01', to: '2026-10-31' }, observedRows: 1, records: parseMoshimoRows([row], '672381') });
test('月の末日と当月の取得日で区切る', () => {
  assert.deepEqual(moshimoMonthRange('2026-10', '2026-11-14'), {from:'2026-10-01',to:'2026-10-31'});
  assert.equal(moshimoMonthRange('2026-11', '2026-11-14').to, '2026-11-14');
  assert.throws(() => moshimoMonthRange('2026-13', '2026-11-14'));
});
test('別サイト・欠測・重複・列ずれは取得失敗。0 に置き換えない', () => {
  assert.equal(make().records[0].revenueYen, 10000);
  assert.throws(() => parseMoshimoRows([{...row, siteId:'638943'}], '672381'));
  assert.throws(() => parseMoshimoRows([row,row], '672381'));
  assert.throws(() => parseMoshimoRows([{...row,cells:['','','0','0 件 0 円','—','0 件 0 円','','','']}], '672381'));
  assert.throws(() => parseMoshimoRows([{...row,cells:[]}], '672381'));
});
test('保存記録の月・サイト・件数・鮮度を検算し、空の取得を通さない', () => {
  const state = MoshimoReport.parse(make());
  const args = {month:'2026-10',siteId:'672381',now:'2026-11-04T00:00:00.000Z',fresh:true};
  validateMoshimoReport(state,args);
  for(const value of [{...state,month:'2026-09'},{...state,observedRows:2},{...state,observedRows:0,records:[]}])assert.throws(()=>validateMoshimoReport(value,args));
  assert.throws(()=>validateMoshimoReport(state,{...args,now:'2026-11-14T00:00:00.000Z'}));
});
test('もしもの成果を A8 と分離し、観測した案件のみをファネルへ載せる', () => {
  const mats=[{program:'construction',mat:'moshimo:1:2'},{program:'construction',mat:'A+B+C+D'}];
  const index=buildProductIndex([],mats);
  const ledger=BusinessProductSales.parse(buildProductSales({month:'2026-10',products:[],mats,moshimoSiteId:'672381',moshimoReport:make(),catalog:{programs:{construction:{asps:{moshimo:{promotionId:'1'}}}}}}));
  assert.equal(ledger.coverage.moshimo.status,'partial');
  assert.deepEqual(ledger.rows[0].destinationIds,['moshimo:1:2']);
  assert.equal(salesOf(ledger,'moshimo','missing').status,'unmeasured');
  const report={rows:[{destination:'moshimo',productId:'moshimo:1:2',placement:'tool-end',eventName:'product_click',eventCount:2}]};
  const funnel=buildProductFunnel({report,ledgers:[ledger],index});
  assert.equal(funnel.rows[0].productId,'construction');
  assert.equal(funnel.rows[0].sales['2026-10'].amountYen,10000);
  assert.equal(index.fromDestination.has('a8:moshimo:1:2'),false);
});
test('土曜の認証・取得・検算が販売台帳より前に並ぶ', () => {
  const stages=buildStages({today:'2026-11-14'});
  assert.match(stages[0].commands[0].argv.join(' '),/a8,moshimo/);
  const i=stages.findIndex(s=>s.id==='moshimo');
  assert(i<stages.findIndex(s=>s.id==='product-sales'));
  assert.deepEqual(stages[i].commands.map(c=>c.argv.at(-1)),['2026-10','2026-11']);
  assert.deepEqual(stages[i].verify,['moshimo-report-due']);
});
