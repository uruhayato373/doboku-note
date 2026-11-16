import process from 'node:process';
import { URL } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { buildSync } from 'esbuild';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { parse } from 'node-html-parser';
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
 'civil-construction-1':[[B,C,R],[B,R,N,K],N], 'civil-construction-2':[[B,N,C],[K,B,N,R],R],
 'civil-practice':[[B,C,R],[B,R,N,K],N],laws:[[B,C,R],[B,R,N,K],N],
 'building-construction':[[A,B,A],[A,B,R],R],'pipe-work':[[B,C,R],[B,R,N,K],N],
 'concrete-engineer':[[B,C,R],[B,R,N,K],N],'concrete-chief-engineer':[[B,C,R],[B,R],B],'concrete-diagnostician':[[B,C,R],[B,R],B],
 pavement:[[B,C,R],[B,R,N,K],N],surveyor:[[B,R,B],[B,R,N,K],C],
 'pe-construction':[[B,R,B],[B,R],C],'pe-first-stage':[[B,N,R],[B,R,N,K],C],
 'pe-comprehensive-management':[[D,'myvision-agent','newma'],[D,'myvision-agent','newma','samurai-job'],'samurai-job'],rccm:[[D,'myvision-agent','newma'],[D,'myvision-agent','newma','samurai-job'],'samurai-job'],'pe-water-supply':[[B,R,B],[B,R],C],'pe-fisheries':[[],[],null],
};
test('17カテゴリ × 全group × career の面→案件と承認画像（総監・RCCM の横長0・水産は配置なし）',()=>{
 for(const [category,[body,rail,end]] of Object.entries(expected)) for(const group of ['guide','primary','secondary','textbook','keyword','pillar','pastExam']) for(const career of [false,true]) {
  const p=resolveSlots(rules,{pageKind:'doc',category,isCareerDoc:career,group},now);
  const right=category==='civil-construction-2'&&career?[B,R,N,K]:rail;
  for(let i=0;i<3;i++) assert.equal(p[i?`article-banner-${i+1}`:'article-banner']?.program,body[i]);
  for(let i=0;i<6;i++) assert.equal(p[i?`article-rail-${i+1}`:'article-rail']?.program,right[i]);
  assert.equal(p['article-banner-end']?.program ?? null,category==='civil-construction-2'&&career?R:end);
  for(const [slot,r] of Object.entries(p).filter(([s])=>/^article-(banner|rail)/.test(s))) {
   const c=pickSlotCreatives(catalog[r.program].creatives.filter(c=>catalog[r.program].asps[c.asp]?.status==='approved'),vocab[slot].sizes);
   const mobileOnly = ['pe-comprehensive-management','rccm'].includes(category) && !slot.includes('rail');
   assert.equal(Boolean(c.pc),!mobileOnly,`${category} ${slot} PC`);if(!slot.includes('rail'))assert.ok(c.mobile);
   if (mobileOnly) assert.deepEqual([c.mobile.width,c.mobile.height],[300,250]);
   else if (/^article-banner(?:-[23])?$/.test(slot)) assert.ok(['320x100','320x50'].includes(`${c.mobile.width}x${c.mobile.height}`),`${category} ${slot} mobile`);
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
 import { articleSidebarContinuation } from './src/lib/article-sidebar-continuation.ts';
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
 const input=articleSidebarInput(doc.meta,p,all.filter(m=>m.category===doc.meta.category));
 const cards=articleSidebarPlan(input);
 const groups=articleSidebarContinuation(input,doc.meta,all,p.body.length,p.careerPlacements);
 const images=articleImagePlacements(p.careerPlacements,p.inline.map(s=>s.slot),cards.length,groups.map(g=>g.slot));
 const compiled=String(await compile(p.body,{remarkPlugins:[remarkGfm,remarkMath,[remarkArticleBanners,{insertAt:p.inline}]]}));
 rows.push({slug,category:doc.meta.category,slots:images.map(i=>i.placement.slot),cards:cards.length+groups.length,compiled:compiled.includes('ArticleInlineBanner'),inline:p.inline.length,mid:p.effectiveMidPositions});
 }
 const longBody=Array.from({length:12},(_,i)=>'## 節'+i+'\\n\\n'+'技術と施工管理の説明。'.repeat(170)+'\\n\\n').join('');
 for(const category of ['pe-comprehensive-management','rccm']) {
  const p=planArticleCtas({meta:{slug:category+'-example',category,title:'確認',published:true},content:longBody},[],${now});
  if(JSON.stringify(p.inline.map(s=>p.careerPlacements[s.slot].program))!==JSON.stringify(['dx-consulting','myvision-agent','newma']))throw new Error(category+'の本文3面が不足');
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
  assert.ok(!p.slots.includes('article-mid') && !p.slots.includes('article-inline'));
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
   assert.equal(images.find(i=>i.placement.slot==='article-banner-end')?.placement.program ?? null,category==='civil-construction-2'&&isCareerDoc?R:end);
  }
  if(['pe-comprehensive-management','rccm'].includes(category)){
   assert.equal(placements['article-mid'],undefined);
   assert.equal(placements['article-banner-end'].program,'samurai-job');
  }
 }
});


test('現行の画像面だけで各幅・案のピクセルを1案件1発にし、スマホ専用面をPCの撮影期待から除く', async () => {
 const { resolvePlacements } = await loadTsModule('src/lib/affiliate-placement.ts');
 const { articleImagePlacements, articlePixelCandidates } = await loadTsModule('src/lib/article-affiliate-plan.ts');
 for (const category of Object.keys(expected)) {
  const p = resolvePlacements({pageKind:'doc',category},now);
  assert.equal(p['article-mid'],undefined); assert.equal(p['article-inline'],undefined);
  const images = articleImagePlacements(p,['article-banner','article-banner-2','article-banner-3'],6);
  const candidates = articlePixelCandidates(p,['article-mid','article-inline'],images);
  assert.ok(candidates.every(c => !['article-mid','article-inline'].includes(c.slot)));
  for (const width of [375,768,993,1024,1440]) for (const variant of ['B','B2']) {
   const owners = chooseArticlePixels(candidates,vocab,{desktop:width>=993,wide:width>=1024,variant});
   const visible = images.filter(i=>i.creatives[width>=993?'pc':'mobile']);
   assert.deepEqual(new Set(owners.map(p=>p.program)),new Set(visible.map(i=>i.placement.program)));
   assert.equal(owners.length,new Set(owners.map(p=>p.program)).size);
   const slots = expectedSlots(rules,{pageKind:'doc',category,articleSlots:images.map(i=>i.placement.slot),viewportWidth:width},now);
   assert.deepEqual(Object.keys(slots).sort(),visible.map(i=>i.placement.slot).sort());
  }
 }
});


test('旧手書きカードは空HTML。末尾と本文は共通外枠、横長なしの面は余白ごとスマホ専用', () => {
 const dir = mkdtempSync(join(REPO_ROOT,'.tmp/article-banner-render-'));
 try {
  const file = join(dir,'render.cjs');
  buildSync({stdin:{contents:`
   import React from 'react';
   import {renderToStaticMarkup as render} from 'react-dom/server';
   import CareerAffiliate from './src/components/ui/CareerAffiliate/CareerAffiliate';
   import {ArticleBanner} from './src/components/docs/ArticleAffiliateBanners';
   import {resolvePlacements} from './src/lib/affiliate-placement';
   const p=resolvePlacements({pageKind:'doc',category:'civil-practice'},${now});
   const senior=resolvePlacements({pageKind:'doc',category:'pe-comprehensive-management'},${now});
   const card={service:'旧カード',category:'施工管理',program:'career',inlineCard:p['article-inline']};
   const banner=(placement,kind)=>render(React.createElement(ArticleBanner,{placement,kind}));
   process.stdout.write(JSON.stringify({empty:render(React.createElement(CareerAffiliate,card)),
    inline:banner(p['article-banner'],'inline'),end:banner(p['article-banner-end'],'end'),
    seniorInline:banner(senior['article-banner'],'inline'),seniorEnd:banner(senior['article-banner-end'],'end'),
    preset:render(React.createElement(CareerAffiliate,{preset:'buildjob',placement:'career-multi-register',noExperiment:true})),
    stopped:render(React.createElement(CareerAffiliate,{preset:'buildjob',placement:'tool-inline'}))}));
  `,resolveDir:REPO_ROOT,loader:'tsx'},outfile:file,bundle:true,platform:'node',format:'cjs',packages:'external',logLevel:'silent'});
  const html=JSON.parse(execFileSync(process.execPath,[file],{encoding:'utf8',env:{...process.env,AFFILIATE_SLOT_PREVIEW:'',NODE_ENV:'production'}}));
  assert.equal(html.empty,'');
  assert.equal(parse(html.inline).querySelector('[data-article-affiliate]').classNames,parse(html.end).querySelector('[data-article-affiliate]').classNames);
  for(const name of ['inline','end']) {
   assert.match(html[name],/PR/); assert.doesNotMatch(html[name],/career-experiment-card/);
   const pc=parse(html[name]).querySelector('.zenn-desktop\\:block img');
   assert.ok(['728','468'].includes(pc.getAttribute('width')));
  }
  for(const name of ['seniorInline','seniorEnd']) {
   assert.ok(parse(html[name]).querySelector('[data-article-affiliate]').classList.contains('zenn-desktop:hidden'));
   assert.equal(parse(html[name]).querySelector('img').getAttribute('width'),'300');
  }
  assert.match(html.preset,/career-multi-register/);
  assert.doesNotMatch(html.stopped,/data-cta-experiment|data-cta-variant/);
 } finally {rmSync(dir,{recursive:true,force:true});}
});
