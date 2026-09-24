import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { reviewPeriod, duePeriods, direction, saveRecord, records, buildReport, snapshot, assertLocalWrite, strategyForRecord, noteArticleQualification, validateRecord, latestAll, unionDaily, noteMonthFacts, kdpMonthFacts, coconalaDmDate, coconalaInquiryFacts, coconalaViewFacts } from '../scripts/lib/business-direction.mjs';
const now = new Date('2026-09-13T01:00:00Z'), period = { startDate: '2026-08-01', endDate: '2026-08-31' };
function fixture(t) {
 const root=mkdtempSync(join(tmpdir(),'business-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 for(const p of ['.claude/config','.claude/state/sales','.claude/state/metrics/ga4','.claude/state/metrics/note','.claude/state/coconala','scripts/kindle-published'])mkdirSync(join(root,p),{recursive:true});
 writeFileSync(join(root,'.claude/config/business-direction.json'),readFileSync('.claude/config/business-direction.json'));
 writeFileSync(join(root,'scripts/kindle-published/catalog.json'),JSON.stringify({books:[]}));
 writeFileSync(join(root,'.claude/state/experiments.json'),JSON.stringify({experiments:[{id:'SEO-test'},{id:'perf-lcp-mobile-2026-W17'}]})); return root;
}
const measure = (values = { notePv: 10 }) => ({kind:'measurement', qualification:'all', period, channel:'note', subject:'aggregate', source:'note新ダッシュボード・全記事',coverage:'complete',values});
test('calendar periods are completed JST weeks and months',()=>{
 assert.deepEqual(reviewPeriod('weekly','2026-09-13'),{startDate:'2026-08-31',endDate:'2026-09-06'});
 assert.deepEqual(reviewPeriod('weekly','2026-09-14'),{startDate:'2026-09-07',endDate:'2026-09-13'});
 assert.deepEqual(reviewPeriod('monthly','2026-03-01'),{startDate:'2026-02-01',endDate:'2026-02-28'});
});
test('an unfinished monthly period is skipped without blocking the finished weekly one',()=>{
 const ids=r=>({due:r.due.map(d=>d.cadence),skipped:r.skipped.map(d=>d.cadence)});
 // 2026-10-02 は月初の金曜。9月は終了日から4日未満なので月次だけ skip し、週次は取得する。
 assert.deepEqual(ids(duePeriods(['weekly','monthly'],'2026-10-02')),{due:['weekly'],skipped:['monthly']});
 assert.deepEqual(duePeriods(['weekly','monthly'],'2026-10-02').due[0].period,{startDate:'2026-09-21',endDate:'2026-09-27'});
 assert.deepEqual(ids(duePeriods(['weekly','monthly'],'2026-09-25')),{due:['weekly','monthly'],skipped:[]});
 assert.deepEqual(ids(duePeriods(['weekly','monthly'],'2026-10-09')),{due:['weekly','monthly'],skipped:[]});
 assert.deepEqual(ids(duePeriods(['monthly'],'2026-10-03')),{due:[],skipped:['monthly']});
 assert.deepEqual(ids(duePeriods(['monthly'],'2026-10-04')),{due:['monthly'],skipped:[]});
});
test('missing is null, sales coverage partial, no invented earnings',t=>{
 const root=fixture(t);writeFileSync(join(root,'.claude/state/sales/sales-log.json'),JSON.stringify({sales:[{date:'2026-08-10',price:1000}]}));
 const r=buildReport(root,period,now);assert.equal(r.cells.find(c=>c.metric==='noteRevenue').value,1000);assert.equal(r.cells.find(c=>c.metric==='noteRevenue').coverage,'partial');assert.equal(r.cells.find(c=>c.metric==='notePv').value,null);assert.equal(r.operatingBalance[0].value,null);
});
test('KDP monthly ledger enters business review with completeness and qualification attribution',t=>{
 const root=fixture(t);
 const books=[
  {bookId:'A-01',title:'civil',royalty:700},
  {bookId:'f-01',title:'sokan',royalty:300},
  {bookId:'g-01',title:'concrete',royalty:200},
 ];
 writeFileSync(join(root,'scripts/kindle-published/catalog.json'),JSON.stringify({books:books.map(book=>({id:book.bookId,status:'live'}))}));
 writeFileSync(join(root,'.claude/state/sales/kdp-royalties.json'),JSON.stringify({months:{'2026-08':{range:{start:'2026-08-01',end:'2026-08-31'},estimated:false,total:{bookCount:3,royalty:1200},kenpPagesRead:88,books}}}));
 const r=buildReport(root,period,now);
 assert.equal(r.cells.find(c=>c.qualification==='all'&&c.metric==='kdpRoyalty').value,1200);
 assert.equal(r.cells.find(c=>c.qualification==='all'&&c.metric==='kdpRoyalty').coverage,'complete');
 assert.equal(r.cells.find(c=>c.qualification==='civil-construction-1'&&c.metric==='kdpRoyalty').value,700);
 assert.equal(r.cells.find(c=>c.qualification==='pe-comprehensive-management'&&c.metric==='kdpRoyalty').value,300);
 assert.equal(r.cells.find(c=>c.qualification==='rccm'&&c.metric==='kdpRoyalty').value,0);
});
test('note monthly traffic enters all as complete and qualification rows as partial',t=>{
 const root=fixture(t);
 writeFileSync(join(root,'.claude/state/metrics/note/referrers-2026-08.json'),JSON.stringify({month:'2026-08',period:{from:'2026-08-01',to:'2026-08-31'},summary:{pageViews:100,impressions:1000,salesYen:5000}}));
 writeFileSync(join(root,'.claude/state/metrics/note/articles-pv-2026-08.json'),JSON.stringify({rows:[
  {title:'1級土木 二次対策',pageViews:20,impressions:200},
  {title:'技術士 建設部門｜必須科目I',pageViews:30,impressions:300},
  {title:'資格横断記事',pageViews:50,impressions:500},
 ]}));
 writeFileSync(join(root,'.claude/state/note-published.json'),JSON.stringify({items:[]}));
 const r=buildReport(root,period,now);
 assert.equal(r.cells.find(c=>c.qualification==='all'&&c.metric==='notePv').value,100);
 assert.equal(r.cells.find(c=>c.qualification==='all'&&c.metric==='notePv').coverage,'complete');
 assert.equal(r.cells.find(c=>c.qualification==='civil-construction-1'&&c.metric==='notePv').value,20);
 assert.equal(r.cells.find(c=>c.qualification==='civil-construction-1'&&c.metric==='notePv').coverage,'partial');
 assert.equal(r.cells.find(c=>c.qualification==='pe-construction'&&c.metric==='noteImpressions').value,300);
 assert.equal(r.cells.find(c=>c.qualification==='rccm'&&c.metric==='notePv').value,0);
});
test('note sales become complete only when monthly display matches and every product id is resolved',t=>{
 const root=fixture(t);
 writeFileSync(join(root,'.claude/state/metrics/note/referrers-2026-08.json'),JSON.stringify({month:'2026-08',period:{from:'2026-08-01',to:'2026-08-31'},summary:{pageViews:100,impressions:1000,salesYen:3000}}));
 writeFileSync(join(root,'.claude/state/sales/sales-log.json'),JSON.stringify({sales:[
  {date:'2026-08-01',productId:'article:civil-1-keiken-pack-24',price:1000},
  {date:'2026-08-02',productId:'pe-construction-required-magazine',price:2000},
 ]}));
 const r=buildReport(root,period,now);
 assert.equal(r.cells.find(c=>c.qualification==='all'&&c.metric==='noteRevenue').coverage,'complete');
 assert.equal(r.cells.find(c=>c.qualification==='civil-construction-1'&&c.metric==='noteRevenue').value,1000);
 assert.equal(r.cells.find(c=>c.qualification==='pe-construction'&&c.metric==='noteRevenue').value,2000);
});
test('note article classification uses published slug and safe title fallbacks',()=>{
 assert.equal(noteArticleQualification('任意タイトル',[{title:'任意タイトル',slug:'技術士総監/example'}]),'pe-comprehensive-management');
 assert.equal(noteArticleQualification('技術士 建設部門｜道路 R07',[]),'pe-construction');
 assert.equal(noteArticleQualification('2級土木 二次対策',[{title:'2級土木 二次対策',slug:'1級・2級土木/x'}]),null);
});
test('coconala transaction snapshot supplies exact monthly orders and revenue',t=>{
 const root=fixture(t);
 writeFileSync(join(root,'.claude/state/coconala/orders-snapshot.json'),JSON.stringify({status:'ok',scan:{tabsOk:7,tabsTotal:7},orders:[
  {talkroomId:'1',soldOn:'2026-08-04',priceYen:2500},
  {talkroomId:'2',soldOn:'2026-08-06',priceYen:7500},
 ]}));
 writeFileSync(join(root,'.claude/state/coconala/orders-log.json'),JSON.stringify({orders:[
  {talkroomId:'1',serviceId:'coconala-1kyu-moshi-pdf',grade:1},
  {talkroomId:'2',serviceId:'coconala-1kyu-full-pdf',grade:1},
 ]}));
 const r=buildReport(root,period,now);
 assert.equal(r.cells.find(c=>c.qualification==='all'&&c.metric==='coconalaOrders').value,2);
 assert.equal(r.cells.find(c=>c.qualification==='all'&&c.metric==='coconalaRevenue').value,10000);
 assert.equal(r.cells.find(c=>c.qualification==='civil-construction-1'&&c.metric==='coconalaRevenue').value,10000);
 assert.equal(r.cells.find(c=>c.qualification==='rccm'&&c.metric==='coconalaOrders').value,0);
 assert.equal(r.cells.find(c=>c.qualification==='pe-construction'&&c.metric==='coconalaOrders').coverage,'not-applicable');
});
test('daily users never summed and different windows never substituted',t=>{
 const root=fixture(t);writeFileSync(join(root,'.claude/state/metrics/ga4/ga4-date-test.json'),JSON.stringify({meta:period,rows:[{activeUsers:10},{activeUsers:10}]}));
 assert.equal(buildReport(root,period,now).cells[0].value,null);
 saveRecord(root,measure(),now);assert.equal(buildReport(root,{startDate:'2026-09-01',endDate:'2026-09-07'},now).cells.find(c=>c.metric==='notePv').value,null);
});
test('corrections preserve history and reject duplicates and invalid definitions',t=>{
 const root=fixture(t), first=saveRecord(root,measure(),now);
 assert.throws(()=>saveRecord(root,measure(),now),/同じ計測/);
 assert.throws(()=>saveRecord(root,measure({oldViews:10}),now),/不正/);
 assert.throws(()=>saveRecord(root,measure({notePv:-1}),now),/不正/);
 saveRecord(root,{...measure({notePv:12}),supersedes:first.file},new Date('2026-09-13T02:00:00Z'));
 assert.equal(records(root).length,2);assert.equal(JSON.parse(readFileSync(join(root,first.file))).values.notePv,10);assert.equal(buildReport(root,period,now).cells.find(c=>c.metric==='notePv').value,12);
});
test('product observations are not an aggregate and mixed coverage does not produce profit',t=>{
 const root=fixture(t);saveRecord(root,{...measure(),subject:'article-123'},now);
 assert.equal(buildReport(root,period,now).cells.find(c=>c.metric==='notePv').value,null);
 saveRecord(root,{...measure(),channel:'operations',values:{netReceipts:1000,costYen:null},coverage:'partial'},now);
 assert.equal(buildReport(root,period,now).operatingBalance[0].value,null);
});
test('reviews require matching frozen evidence, all qualifications and actual experiment IDs',t=>{
 const root=fixture(t), snap=snapshot(root,period,now), c=direction(root);
 const review={kind:'review',qualification:'all',period,cadence:'monthly',status:'provisional',findings:'全資格の計測が不足している。',decision:'取得から進める。',nextAction:'資格別に次月の計測を開始する。',nextReviewDate:'2026-09-20',snapshot:snap.file,qualificationsReviewed:c.qualifications.map(q=>q.id),experimentIds:['SEO-test','perf-lcp-mobile-2026-W17']};
 assert.throws(()=>saveRecord(root,{...review,status:'complete'},now),/不足/);
 assert.throws(()=>saveRecord(root,{...review,experimentIds:['EXP-999']},now),/ないID/);
 saveRecord(root,review,now);assert.equal(buildReport(root,period,new Date('2026-09-21T00:00:00Z')).followups.length,1);assert.throws(()=>saveRecord(root,review,now),/同じ期間/);
});
test('targets require real complete baselines',t=>{
 const root=fixture(t);const first=snapshot(root,period,now);
 const target={kind:'target',qualification:'all',period,metric:'notePv',value:20,direction:'at-least',effectiveDate:'2026-09-01',reviewDate:'2026-10-01',reason:'同じ対象の実測から設定する。',snapshot:first.file};
 assert.throws(()=>saveRecord(root,target,now),/実測/);
 saveRecord(root,measure(),now);const second=snapshot(root,period,now);saveRecord(root,{...target,snapshot:second.file},now);
});
test('write endpoint requires local same-origin JSON',()=>{
 const make=(origin,host='127.0.0.1:3021')=>new Request('http://127.0.0.1:3021/metrics/business/record',{method:'POST',headers:{origin,host,'content-type':'application/json'}});
 assert.doesNotThrow(()=>assertLocalWrite(make('http://127.0.0.1:3021')));
 assert.doesNotThrow(()=>assertLocalWrite(new Request('http://localhost:3021/metrics/business/record',{method:'POST',headers:{origin:'http://127.0.0.1:3021',host:'127.0.0.1:3021','content-type':'application/json'}})));
 assert.throws(()=>assertLocalWrite(make('https://evil.example')));
 assert.throws(()=>assertLocalWrite(make('http://127.0.0.1:3021','evil.example')));
});
test('instagram and cloudflare source facts are all-only with period coverage',t=>{
 const root=fixture(t);
 mkdirSync(join(root,'.claude/state/metrics/instagram'),{recursive:true});
 mkdirSync(join(root,'.claude/state/metrics/cloudflare'),{recursive:true});
 writeFileSync(join(root,'.claude/state/metrics/instagram/ig-insights-2026-08-15.json'),JSON.stringify({fetchedAt:'2026-08-16T00:00:00Z',account:{followersCount:500},daily:Array.from({length:31},(_, i)=>({date:`2026-08-${String(i+1).padStart(2,'0')}`,reach:10}))}));
 writeFileSync(join(root,'.claude/state/metrics/cloudflare/cf-zone-2026-08-15.json'),JSON.stringify({fetchedAt:'2026-08-16T00:00:00Z',daily:Array.from({length:30},(_, i)=>({date:`2026-08-${String(i+1).padStart(2,'0')}`,jp:{requests:100},other:{requests:20}}))}));
 const r=buildReport(root,period,now);
 assert.equal(r.cells.find(c=>c.qualification==='all'&&c.metric==='igReach').value,310);
 assert.equal(r.cells.find(c=>c.qualification==='all'&&c.metric==='igReach').coverage,'complete');
 assert.equal(r.cells.find(c=>c.qualification==='all'&&c.metric==='igFollowers').value,500);
 assert.equal(r.cells.find(c=>c.qualification==='civil-construction-1'&&c.metric==='igReach').coverage,'not-applicable');
 assert.equal(r.cells.find(c=>c.qualification==='all'&&c.metric==='cfRequestsJp').value,3000);
 assert.equal(r.cells.find(c=>c.qualification==='all'&&c.metric==='cfRequestsOther').value,600);
 assert.equal(r.cells.find(c=>c.qualification==='all'&&c.metric==='cfRequestsJp').coverage,'partial');
});
test('unionDaily takes the later snapshot value for a shared date',()=>{
 const snapshots=[
  {file:'a',data:{daily:[{date:'2026-08-01',reach:1},{date:'2026-08-02',reach:2}]}},
  {file:'b',data:{daily:[{date:'2026-08-02',reach:20},{date:'2026-08-03',reach:3}]}},
 ];
 assert.deepEqual(unionDaily(snapshots),[{date:'2026-08-01',reach:1},{date:'2026-08-02',reach:20},{date:'2026-08-03',reach:3}]);
});
test('latestAll returns [] when the directory is absent',t=>{
 const root=fixture(t);
 assert.deepEqual(latestAll(root,'.claude/state/metrics/instagram','ig-insights-'),[]);
});
test('validateRecord accepts instagram/cloudflare channels and rejects unknown ones',t=>{
 const root=fixture(t), c=direction(root);
 const base={kind:'measurement',qualification:'all',period,subject:'aggregate',source:'Instagram Graph API',coverage:'complete'};
 assert.doesNotThrow(()=>validateRecord({...base,channel:'instagram',values:{igReach:100}},c,[],now));
 assert.doesNotThrow(()=>validateRecord({...base,channel:'cloudflare',values:{cfRequestsJp:100}},c,[],now));
 assert.throws(()=>validateRecord({...base,channel:'tiktok',values:{igReach:100}},c,[],now),/計測元/);
});
test('past reviews are validated against the strategy frozen in their snapshot, not the current one',()=>{
 const frozen={qualifications:[{id:'a'}],metrics:[{id:'m'}]};
 const rows=[{kind:'snapshot',file:'s1',strategy:frozen},{kind:'review',file:'r1',snapshot:'s1'},{kind:'measurement',file:'m1'}];
 const current={qualifications:[{id:'a'},{id:'b'}],metrics:[{id:'m'}]};
 assert.equal(strategyForRecord(rows[1],rows,current),frozen);
 assert.equal(strategyForRecord(rows[2],rows,current),current);
 assert.equal(strategyForRecord({kind:'review',file:'r2',snapshot:'missing'},rows,current),current);
});

// ── 手元の月次・30日窓・DM一覧の取り込み（週へ按分しない／欠測を0にしない） ──
const week = { startDate: '2026-09-14', endDate: '2026-09-20' };
test('note monthly facts keep the month period, and a mid-month fetch is cut at the fetch date as partial',()=>{
 const traffic=m=>({period:{from:`${m}-01`,to:`${m}-30`},summary:{pageViews:100,impressions:1000}});
 const full=noteMonthFacts({traffic:{...traffic('2026-09'),fetchedAt:'2026-10-01T00:00:00Z'},trafficPath:'t'});
 assert.deepEqual(full.find(f=>f.metric==='notePv'),{metric:'notePv',value:100,period:{startDate:'2026-09-01',endDate:'2026-09-30'},source:'t',qualification:'all',coverage:'complete',note:'noteアクセス状況の対象月全記事。自己閲覧を含む。'});
 // 2026-09-15T21:13Z = JST 09-16。月途中値を9月全体として月次セルへ入れない。
 const mid=noteMonthFacts({traffic:{...traffic('2026-09'),fetchedAt:'2026-09-15T21:13:53Z'},articles:{rows:[{title:'RCCM 問題III',pageViews:7,impressions:70}]},qualifications:['rccm','pe-construction'],trafficPath:'t',articlesPath:'a'});
 assert.deepEqual(mid.find(f=>f.metric==='notePv'&&f.qualification==='all').period,{startDate:'2026-09-01',endDate:'2026-09-16'});
 assert.ok(mid.every(f=>f.coverage==='partial'&&/月途中値/.test(f.note)));
 assert.equal(mid.find(f=>f.metric==='notePv'&&f.qualification==='rccm').value,7);
 assert.equal(mid.find(f=>f.metric==='notePv'&&f.qualification==='pe-construction').value,0);
 assert.deepEqual(noteMonthFacts({traffic:{summary:{pageViews:1}},trafficPath:'t'}),[]);
});
test('a weekly review does not apportion monthly note data and explains where the month value is',t=>{
 const root=fixture(t);
 writeFileSync(join(root,'.claude/state/metrics/note/referrers-2026-09.json'),JSON.stringify({fetchedAt:'2026-10-01T00:00:00Z',period:{from:'2026-09-01',to:'2026-09-30'},summary:{pageViews:100,impressions:1000}}));
 const r=buildReport(root,week,new Date('2026-10-02T00:00:00Z'));
 const cell=r.cells.find(c=>c.qualification==='all'&&c.metric==='notePv');
 assert.equal(cell.value,null);assert.equal(cell.coverage,'missing');assert.match(cell.note,/2026-09-01〜2026-09-30 の値は別期間/);
 assert.equal(r.sources.find(s=>s.metric==='notePv'&&s.qualification==='all').value,100);
 const month=buildReport(root,{startDate:'2026-09-01',endDate:'2026-09-30'},new Date('2026-10-02T00:00:00Z'));
 assert.equal(month.cells.find(c=>c.qualification==='all'&&c.metric==='notePv').value,100);
});
test('KDP completeness counts only books live by the end of the month',()=>{
 const entry={range:{start:'2026-08-01',end:'2026-08-31'},estimated:false,books:[{bookId:'A-01',royalty:700},{bookId:'h-02',royalty:50},{bookId:null,royalty:999}]};
 const catalogBooks=[{id:'A-01',status:'live',publishedDate:'2026-07-01'},{id:'h-02',status:'live',publishedDate:'2026-08-20'},{id:'h-01',status:'live',publishedDate:'2026-09-24'},{id:'x-01',status:'draft'}];
 const attribution=[{prefixes:['A-'],qualification:'civil-construction-1'},{prefixes:['h-'],qualification:'rccm'}];
 const facts=kdpMonthFacts({entry,catalogBooks,attribution,qualifications:['civil-construction-1','rccm','pe-construction'],path:'k'});
 const all=facts.find(f=>f.qualification==='all');
 assert.equal(all.value,750);assert.equal(all.coverage,'complete');assert.match(all.note,/2\/2 冊/);
 assert.equal(facts.find(f=>f.qualification==='rccm').value,50);
 assert.equal(facts.find(f=>f.qualification==='pe-construction').value,0);
 // 月内に LIVE だった本が欠ければ partial のまま。推計値も partial。
 assert.equal(kdpMonthFacts({entry:{...entry,books:[entry.books[0]]},catalogBooks,path:'k'})[0].coverage,'partial');
 assert.equal(kdpMonthFacts({entry:{...entry,estimated:true},catalogBooks,path:'k'})[0].coverage,'partial');
});
test('coconala DM dates resolve the year from the fetch date and refuse relative or time-only labels',()=>{
 assert.equal(coconalaDmDate('9月1日','2026-09-23'),'2026-09-01');
 assert.equal(coconalaDmDate('12月30日','2026-01-05'),'2025-12-30');
 assert.equal(coconalaDmDate('2025年3月2日','2026-09-23'),'2025-03-02');
 assert.equal(coconalaDmDate('12:30','2026-09-23'),null);
 assert.equal(coconalaDmDate('昨日','2026-09-23'),null);
 assert.equal(coconalaDmDate('2月30日','2026-09-23'),null);
});
test('coconala inquiries are 0 only when every customer thread went quiet before the period, otherwise null with a reason',()=>{
 const snap=(inquiries,over={})=>({status:'ok',fetchedAt:'2026-09-22T23:41:36Z',scan:{tabs:[{key:'inquiries',ok:true}]},inquiries,...over});
 const quiet=[{dateText:'9月1日'},{dateText:'9月18日',fromStaff:true,oneWay:true}];
 const zero=coconalaInquiryFacts({snapshot:snap(quiet),period:week,qualifications:['civil-construction-1','rccm'],path:'o'});
 assert.deepEqual(zero.map(f=>[f.qualification,f.value,f.coverage]),[['all',0,'complete'],['civil-construction-1',0,'complete'],['rccm',0,'complete']]);
 const cases=[
  [snap([{dateText:'9月15日'}]),/動きのあるDMスレッドが 1 件/],
  [snap([{dateText:'9月21日'}]),/動きのあるDMスレッドが 1 件/],
  [snap([{dateText:'10:15'}]),/日付を確定できない/],
  [snap(quiet,{fetchedAt:'2026-09-20T01:00:00Z'}),/期間終了前/],
  [snap(quiet,{scan:{tabs:[{key:'inquiries',ok:false}]}}),/全件取得できていない/],
  [snap(quiet,{status:'partial'}),/全件取得できていない/],
 ];
 for(const [snapshot,reason] of cases){const f=coconalaInquiryFacts({snapshot,period:week,qualifications:['rccm'],path:'o'});assert.ok(f.every(x=>x.value===null&&x.coverage==='missing'));assert.match(f[0].note,reason);}
});
test('coconala views stay in the 30-day window and attribute only single-qualification listings',()=>{
 const facts=coconalaViewFacts({path:'s',snapshot:{period:{services:{from:'2026-08-24',to:'2026-09-22'}},totals:{views:30},services:[
  {serviceId:'coconala-rccm-mondai3-pdf',views:5},{serviceId:'coconala-1kyu-moshi-pdf',views:7},{serviceId:'coconala-2kyu-moshi-pdf',views:9},{serviceId:'coconala-shindan',views:9}]}});
 assert.deepEqual(facts.map(f=>[f.qualification,f.value,f.coverage]),[['all',30,'partial'],['rccm',5,'partial'],['civil-construction-1',7,'partial']]);
 assert.ok(facts.every(f=>f.period.startDate==='2026-08-24'&&f.period.endDate==='2026-09-22'));
 const masked=coconalaViewFacts({path:'s',snapshot:{period:{services:{from:'2026-08-24',to:'2026-09-22'}},totals:{views:null},services:[{serviceId:'coconala-rccm-x',views:null}]}});
 assert.equal(masked.find(f=>f.qualification==='rccm').value,null);
});
