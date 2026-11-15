import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { chooseArticlePixels } from '../src/lib/article-affiliate-pixels.mjs';
import { resolveSlots } from '../src/lib/affiliate-placement-core.mjs';
import { pickSlotCreatives } from '../src/lib/affiliate-creative-pick.mjs';
import { expectedSlots } from '../scripts/lib/affiliate-layout-judge.mjs';
const rules=JSON.parse(readFileSync(new URL('../config/affiliate-placements.json',import.meta.url))).rules;
const vocab=JSON.parse(readFileSync(new URL('../config/cta-placements.json',import.meta.url))).affiliate;
const catalog=JSON.parse(readFileSync(new URL('../data/affiliate/catalog.json',import.meta.url))).programs;
const now=Date.parse('2026-11-16T00:00:00+09:00');
import { loadTsModule } from './lib/load-ts.mjs';
const B='buildjob',C='constwork',R='rsg-kensetsu',N='dainishinsotsu-agent-neo',K='kensetsu-jobs',A='kenchiku-tenshoku',D='dx-consulting';
const expected={
 'civil-construction-1':[[B,C,R],[B,R,N,K],B], 'civil-construction-2':[[B,N,C],[K,B,N,R],K],
 'civil-practice':[[B,C,R],[B,R,N,K],K],laws:[[B,C,R],[B,R,N,K],B],
 'building-construction':[[A,B,A],[A,B,R],A],'pipe-work':[[B,C,R],[B,R,N,K],B],
 'concrete-engineer':[[B,C,R],[B,R,N,K],B],'concrete-chief-engineer':[[B,C,R],[B,R],B],'concrete-diagnostician':[[B,C,R],[B,R],B],
 pavement:[[B,C,R],[B,R,N,K],B],surveyor:[[B,R,B],[B,R,N,K],B],
 'pe-construction':[[B,R,B],[B,R],B],'pe-first-stage':[[B,N,R],[B,R,N,K],B],
 'pe-comprehensive-management':[[],[D,'myvision-agent','newma','samurai-job'],'myvision-agent'],rccm:[[],[D,'myvision-agent','newma','samurai-job'],'myvision-agent'],'pe-water-supply':[[B,R,B],[B,R],B],'pe-fisheries':[[],[],null],
};
test('17カテゴリ × 全group × career の面→案件と承認画像（総監・RCCM の横長0・水産は配置なし）',()=>{
 for(const [category,[body,rail,end]] of Object.entries(expected)) for(const group of ['guide','primary','secondary','textbook','keyword','pillar','pastExam']) for(const career of [false,true]) {
  const p=resolveSlots(rules,{pageKind:'doc',category,isCareerDoc:career,group},now);
  const right=category==='civil-construction-2'&&career?[B,R,N,K]:rail;
  for(let i=0;i<3;i++) assert.equal(p[i?`article-banner-${i+1}`:'article-banner']?.program,body[i]);
  for(let i=0;i<6;i++) assert.equal(p[i?`article-rail-${i+1}`:'article-rail']?.program,right[i]);
  assert.equal(p['article-banner-end']?.program ?? null,category==='civil-construction-2'&&career?B:end);
  for(const [slot,r] of Object.entries(p).filter(([s])=>/^article-(banner|rail)/.test(s))) {
   const c=pickSlotCreatives(catalog[r.program].creatives.filter(c=>catalog[r.program].asps[c.asp]?.status==='approved'),vocab[slot].sizes);
   assert.ok(c.pc,`${category} ${slot}`);if(!slot.includes('rail'))assert.ok(c.mobile);
   for(const x of [c.pc,c.mobile].filter(Boolean)){assert.ok(!x.avoid);assert.equal(catalog[r.program].asps[x.asp].status,'approved');}
  }
 }
 const before=resolveSlots(rules,{pageKind:'doc',category:'civil-construction-1'},Date.parse('2026-11-14T23:59:59+09:00'));
 assert.equal(before['article-banner'],undefined);
});

test('B/B2 × 375/768/993/1024/1440: 二社目が未表示なら別画像面が所有し、各案件は1発',()=>{
 const candidates=[
  {program:B,slot:'article-mid',src:'b-text'}, {program:C,slot:'article-mid',src:'c-text',secondary:true},
  {program:B,slot:'article-banner',src:'b-wide',viewport:'pc'}, {program:B,slot:'article-banner',src:'b-small',viewport:'mobile'},
  {program:C,slot:'article-banner-2',src:'c-wide',viewport:'pc'}, {program:C,slot:'article-banner-2',src:'c-small',viewport:'mobile'},
  {program:R,slot:'article-rail',src:'r-rail',viewport:'pc'}, {program:B,slot:'article-banner-end',src:'b-end'},
 ];
 for(const variant of ['B','B2']) for(const width of [375,768,993,1024,1440]) {
  const p=chooseArticlePixels(candidates,vocab,{desktop:width>=993,wide:width>=1024,variant});
  assert.equal(new Set(p.map(p=>p.program)).size,p.length);
  assert.equal(p.find(p=>p.program===B).src,'b-text');
  assert.equal(p.find(p=>p.program===C).src,variant==='B2'&&width>=1024?'c-text':width>=993?'c-wide':'c-small');
  assert.equal(p.some(p=>p.program===R),width>=993);
 }
});

test('代表14ページは同じ計画関数で0〜3本文・実カード分の右欄・末尾1。MDX加工後の注入も成立',()=>{
 const code=`
 import { getDoc, getAllDocsMeta } from './src/lib/docs.ts';
 import { planArticleCtas } from './src/lib/article-cta-plan.ts';
 import { articleSidebarPlan, articleSidebarInput } from './src/lib/article-sidebar-plan.ts';
 import { articleImagePlacements } from './src/lib/article-affiliate-plan.ts';
 import { compile } from '@mdx-js/mdx';
 import { remarkArticleBanners } from './src/lib/article-inline-slots.mjs';
 import remarkGfm from 'remark-gfm'; import remarkMath from 'remark-math';
 const all=getAllDocsMeta().filter(d=>d.published!==false&&!d.hideFromCategory&&!d.tags?.includes('模範論文'));
 const samples=${JSON.stringify(['civil-construction-2-guide-exam-overview','pe-comprehensive-management-keyword-2026','pe-comprehensive-management-activity-abc','pe-construction-datsutanso-kankyo-ronbun-keyword','pe-construction-r08-steel-concrete-ii-1-1','pe-comprehensive-management-r02-primary','pe-comprehensive-management-information-management-pillar','pe-comprehensive-management-safety-management-pillar','civil-construction-2-primary-h26','concrete-chief-engineer-primary-construction','civil-construction-1-secondary-r07','civil-construction-1-secondary-earthwork-basics','civil-construction-1-textbook-tunnel-natm','concrete-diagnostician-textbook-investigation'])};
 const rows=[];
 for(const slug of samples){
 const doc=await getDoc(slug); if(!doc)throw new Error(slug);
 const p=planArticleCtas(doc,all,${now});
 const cards=articleSidebarPlan(articleSidebarInput(doc.meta,p,all.filter(m=>m.category===doc.meta.category)));
 const images=articleImagePlacements(p.careerPlacements,p.inline.map(s=>s.slot),cards.length);
 const compiled=String(await compile(p.body,{remarkPlugins:[remarkGfm,remarkMath,[remarkArticleBanners,{insertAt:p.inline}]]}));
 rows.push({slug,category:doc.meta.category,slots:images.map(i=>i.placement.slot),cards:cards.length,compiled:compiled.includes('ArticleInlineBanner'),inline:p.inline.length,mid:p.effectiveMidPositions});
 }
 const manual=await getDoc('civil-construction-1-guide-market-value-check');
 const presetPlan=planArticleCtas(manual,all,${now});
 if(presetPlan.renderedCareerSlots.includes('article-inline'))throw new Error('preset only page claimed an experiment pixel');
 process.stdout.write(JSON.stringify(rows));`;
 const rows=JSON.parse(execFileSync(process.execPath,['--conditions','react-server','--import','tsx','--input-type=module','-e',code],{encoding:'utf8',maxBuffer:5*1024*1024}));
 assert.equal(rows.length,14);
 for(const p of rows){
  assert.ok(p.inline<=3);
  assert.equal(p.slots.filter(s=>s.startsWith('article-rail')).length,Math.min(p.cards,expected[p.category][1].length,6));
  assert.equal(p.slots.filter(s=>s==='article-banner-end').length,1);
  assert.equal(p.compiled,p.inline>0);
  if(p.category==='pe-comprehensive-management')assert.equal(p.inline,0);
  const page={pageKind:'doc',category:p.category,articleSlots:p.slots};
  assert.deepEqual(Object.keys(expectedSlots(rules,page,now)).sort(),[...p.slots].sort());
 }
});

test('右欄は案件を再使用せず、重複したカード間は空ける。本文・末尾は別計数', async () => {
 const { articleImagePlacements } = await loadTsModule('src/lib/article-affiliate-plan.ts');
 const ids = ['article-rail','article-rail-2','article-rail-3','article-rail-4','article-rail-5','article-rail-6'];
 const placements = Object.fromEntries([
  ['article-banner',B], ...ids.map((s,i)=>[s,[B,R,B,N,R,K][i]]), ['article-banner-end',B],
 ].map(([slot,program])=>[slot,{slot,program}]));
 for(const cards of [0,1,2,3,4,5,6,8]){
  const images=articleImagePlacements(placements,['article-banner'],cards);
  const rail=images.filter(i=>i.placement.slot.startsWith('article-rail'));
  assert.deepEqual(rail.map(i=>i.placement.slot),[0,1,3,5].filter(i=>i<cards).map(i=>ids[i]));
  assert.equal(new Set(rail.map(i=>i.placement.program)).size,rail.length);
  assert.deepEqual(images.filter(i=>!i.placement.slot.startsWith('article-rail')).map(i=>i.placement.slot),['article-banner','article-banner-end']);
 }
});

test('17カテゴリの実配置は案件列が尽きたら右欄を終了し、総監・RCCMの末尾は中間と分ける', async () => {
 const { articleImagePlacements } = await loadTsModule('src/lib/article-affiliate-plan.ts');
 const { resolvePlacements } = await loadTsModule('src/lib/affiliate-placement.ts');
 for(const [category,[,rail,end]] of Object.entries(expected))for(const isCareerDoc of [false,true]){
  const placements=resolvePlacements({pageKind:'doc',category,isCareerDoc},now);
  const right=category==='civil-construction-2'&&isCareerDoc?[B,R,N,K]:rail;
  for(const cards of [0,1,2,3,4,5,6,8]){
   const images=articleImagePlacements(placements,[],cards);
   assert.deepEqual(images.filter(i=>i.placement.slot.startsWith('article-rail')).map(i=>i.placement.program),right.slice(0,Math.min(cards,6)));
   assert.equal(images.find(i=>i.placement.slot==='article-banner-end')?.placement.program ?? null,category==='civil-construction-2'&&isCareerDoc?B:end);
  }
  if(['pe-comprehensive-management','rccm'].includes(category)){
   assert.equal(placements['article-mid'].program,D);
   assert.equal(placements['article-banner-end'].program,'myvision-agent');
  }
 }
});
