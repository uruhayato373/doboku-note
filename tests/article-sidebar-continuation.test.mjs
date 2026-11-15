import process from 'node:process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { buildSync } from 'esbuild';
import { parse } from 'node-html-parser';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { inspectHtml } from '../scripts/check-cta-density.mjs';

function evaluate(source, render = false) {
  if (!render) return JSON.parse(execFileSync(process.execPath, ['--conditions','react-server','--import','tsx','--input-type=module','-e',source], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 10*1024*1024 }));
  const dir = mkdtempSync(join(REPO_ROOT, '.tmp/sidebar-render-'));
  try {
    const outfile = join(dir, 'test.cjs');
    buildSync({stdin:{contents:source,resolveDir:REPO_ROOT,loader:'tsx'},outfile,bundle:true,platform:'node',format:'cjs',packages:'external',logLevel:'silent'});
    return JSON.parse(execFileSync(process.execPath,[outfile],{encoding:'utf8', maxBuffer: 10*1024*1024}));
  } finally { rmSync(dir,{recursive:true,force:true}); }
}

test('空き約2000pxごとに1組。3000px未満は0組・長文は上限12（過去問は20）・係数は記事型ごと', () => {
  const values = evaluate(`import { articleSidebarGroupCount as count } from './src/lib/article-sidebar-plan.ts';
    process.stdout.write(JSON.stringify([
      count(0,0), count(2000,3), count(2600,0), count(2610,0),
      count(3112,6,'keyword'), count(15295,10,'guide'), count(16547,8,'textbook'),
      count(10000,0,'primary'), count(10000,0,'guide'), count(10000,0,'pastExam'),
      count(47947,61,'primary'), count(100000,80,'guide'),
    ]));`);
  assert.deepEqual(values,[0,0,0,1,0,9,10,3,5,3,19,12]);
});

test('PCの本文目次は開いたカード、モバイルは閉じたdetails、両方H2だけ', () => {
  const html = evaluate(`import React from 'react'; import {renderToStaticMarkup as render} from 'react-dom/server';
    import TableOfContents from './src/components/ui/TableOfContents';
    process.stdout.write(JSON.stringify(render(<TableOfContents variant="mobile" headings={[{id:'orphan',text:'孤立H3',level:3},{id:'h2',text:'土木の基本',level:2},{id:'h3',text:'詳細',level:3}]}/>)));`,true);
  const dom = parse(html);
  const surfaces = dom.querySelectorAll('[data-cta-label="article-toc"]');
  assert.equal(surfaces.length,2);
  const desktop = surfaces.find(node => node.tagName !== 'DETAILS');
  const mobile = surfaces.find(node => node.tagName === 'DETAILS');
  assert.ok(desktop.classList.contains('zenn-desktop:block'));
  assert.equal(desktop.querySelectorAll('details').length,0);
  assert.ok(mobile.classList.contains('zenn-desktop:hidden'));
  assert.equal(mobile.hasAttribute('open'),false);
  for (const surface of surfaces) assert.deepEqual(surface.querySelectorAll('a').map(a=>a.getAttribute('href')),['#h2']);
});

test('代表7記事の描画で目次なしの右欄・設問ナビ維持・上の束を含む重複なし・密度検査', () => {
  const inputs = evaluate(`
    import {getDoc,getAllDocsMeta} from './src/lib/docs';
    import {planArticleCtas} from './src/lib/article-cta-plan';
    import {articleSidebarInput,articleSidebarPlan} from './src/lib/article-sidebar-plan';
    import {articleSidebarContinuation} from './src/lib/article-sidebar-continuation';
    const pool=getAllDocsMeta().filter(d=>d.published!==false&&!d.hideFromCategory&&!d.tags?.includes('模範論文'));
    (async()=>{const rows=[];
    for(const slug of ['civil-construction-1-guide-earthwork-key-points','civil-construction-1-textbook-concrete-materials','civil-construction-1-primary-r02-a','pe-comprehensive-management-360-degree-evaluation','civil-practice-embankment-quality-control','pe-comprehensive-management-keyword-2026','pe-first-stage-h23-basic']) {
      const doc=await getDoc(slug); if(!doc) throw new Error(slug);
      const p=planArticleCtas(doc,pool,Date.parse('2026-11-16T00:00:00+09:00'));
      const input=articleSidebarInput(doc.meta,p,pool.filter(d=>d.category===doc.meta.category));
      const groups=articleSidebarContinuation(input,doc.meta,pool,p.body.length,p.careerPlacements);
      const upper=articleSidebarPlan(input);
      rows.push({slug,upper,input,groups,placements:p.careerPlacements});
    }process.stdout.write(JSON.stringify(rows));})();`);
  const rows = evaluate(`
    import React from 'react'; import {renderToStaticMarkup as render} from 'react-dom/server';
    import ArticleSidebar,{buildArticleSidebarCards} from './src/components/ui/ArticleSidebar/ArticleSidebar';
    import TwoColumnShell from './src/components/layout/TwoColumnShell';
    const rows = ${JSON.stringify(inputs)}.map(row=>({...row,
      groups:row.groups.map(g=>({label:g.card?.label,links:g.card?.links.map(l=>l.href),banner:g.banner?.program,fill:g.fill,slot:g.slot})),
      html:render(<TwoColumnShell stretchAside aside={<ArticleSidebar cards={buildArticleSidebarCards(row.input)} groups={row.groups} placements={row.placements} questionSeries={row.input.questionSeries}/>}><article><div className="prose-blog"><h2>土木・技術士</h2></div></article></TwoColumnShell>)}));
    process.stdout.write(JSON.stringify(rows));`,true);
  assert.equal(rows.length,7);
  let total = 0;
  const kinds = [];
  for(const row of rows) {
    assert.ok(row.upper.every(card=>card.kind!=='toc'));
    if(row.slug.endsWith('primary-r02-a')) assert.ok(row.upper.some(card=>card.kind==='questions'));
    const dom = parse(row.html);
    assert.ok(dom.querySelector('main').text.includes('土木・技術士'));
    assert.ok(dom.querySelector('aside').classList.contains('zenn-desktop:flex'));
    const hrefs=dom.querySelector('aside').querySelectorAll('a').map(a=>a.getAttribute('href')).filter(h=>/^\/(exam|practice|laws)\//.test(h));
    assert.equal(new Set(hrefs).size,hrefs.length,row.slug+' upper/lower duplicate');
    const labels=row.groups.map(group=>group.label).filter(Boolean);
    labels.forEach((label,i)=>assert.notEqual(label,labels[i-1],row.slug+' 同じ種類が続く'));
    const sizes=row.groups.filter(group=>group.links).map(group=>group.links.length);
    sizes.forEach((size,i)=>assert.ok(i===sizes.length-1?size>=2&&size<=3:size===3,row.slug+' 1組は3件・最後だけ2件以上'));
    kinds.push(...labels);
    const programs=row.groups.filter(group=>!group.fill).map(group=>group.banner).filter(Boolean);
    assert.equal(new Set(programs).size,programs.length);
    // 埋める組は過去問だけ。バナーだけで、案件の繰り返しを許し、面は article-rail-fill に統一する
    const fills=row.groups.filter(group=>group.fill);
    assert.equal(fills.length>0,Boolean(row.input.questionSeries&&/primary-r02-a|pe-first-stage-h23-basic/.test(row.slug)),row.slug+' 埋める組は過去問だけ');
    for(const group of fills) { assert.equal(group.slot,'article-rail-fill'); assert.ok(group.banner&&!group.label); }
    assert.equal(dom.querySelectorAll('[data-article-sidebar-fill]').length,fills.length);
    assert.equal(dom.querySelectorAll('a[data-cta-placement="article-rail-fill"]').length,fills.length);
    assert.equal(dom.querySelectorAll('[data-article-question-series]').length,row.input.questionSeries?1:0);
    for(const image of dom.querySelectorAll('a[data-thumb] img')) {
      assert.equal(image.getAttribute('loading'),'lazy');
      assert.ok(Number(image.getAttribute('width'))>0 && Number(image.getAttribute('height'))>0);
    }
    assert.deepEqual(inspectHtml(row.html, 'exam/civil-construction-1/guide/test').violations, [], row.slug);
    total += labels.length;
  }
  assert.ok(total>0,'追加カード0件の検査を許さない');
  assert.ok(kinds.includes('rail-textbooks'),'1級土木の過去問に教科書の組');
  assert.ok(kinds.includes('rail-exam-years'),'技術士一次の過去問に年度の組');
  assert.equal(rows.find(row=>row.slug.endsWith('360-degree-evaluation')).groups.length,0,'短い総監キーワードは0組');
  assert.ok(rows.find(row=>row.slug.endsWith('earthwork-key-points')).groups.length>=6,'長い記事は6組以上');
});

test('回遊候補が尽きれば広告だけ、両方尽きれば組なし。広告枠が途中で欠けても位置を保つ', () => {
  const result=evaluate(`
    import {articleSidebarContinuation} from './src/lib/article-sidebar-continuation.ts';
    import {articleImagePlacements} from './src/lib/article-affiliate-plan.ts';
    const current={slug:'civil-practice-example',category:'civil-practice',title:'確認',published:true};
    const input={sidebarMokuji:null,headings:[],category:current.category,docGroup:'guide',slugStr:current.slug,content:'',sectionStr:undefined,categoryArticles:[current],hasCategoryNavCard:false,showPillarNav:false,showTableOfContents:true};
    const placements={'article-rail':{slot:'article-rail',program:'buildjob'},'article-rail-2':{slot:'article-rail-2',program:'buildjob'},'article-rail-3':{slot:'article-rail-3',program:'rsg-kensetsu'}};
    const groups=articleSidebarContinuation(input,current,[],20000,placements);
    process.stdout.write(JSON.stringify({groups,empty:articleSidebarContinuation(input,current,[],20000,{}),images:articleImagePlacements(placements,[],1,groups.map(g=>g.slot)).map(i=>i.placement.slot)}));`);
  assert.equal(result.groups.length,1);
  assert.equal(result.groups[0].card,null);
  assert.equal(result.groups[0].slot,'article-rail-3');
  assert.deepEqual(result.images,['article-rail','article-rail-3']);
  assert.deepEqual(result.empty,[]);
});

test('過去問は前後の年度→同じ年度の別区分の順。1組3件・種類が続かず・同じ記事を2回出さない', () => {
  const result=evaluate(`
    import {articleSidebarContinuation} from './src/lib/article-sidebar-continuation.ts';
    const mk=(slug,extra={})=>({slug,category:'pe-first-stage',title:slug,published:true,group:'primary',tags:[],...extra});
    const years=['r01','r02','r03','r04','r05','r06','r07'];
    const pool=[...years.map(y=>mk('pe-first-stage-'+y+'-basic')),mk('pe-first-stage-r05-aptitude'),mk('pe-first-stage-r05-construction'),
      ...Array.from({length:14},(_,i)=>mk('pe-first-stage-guide-extra'+i,{group:'guide',publishedAt:'2026-01-'+String(i+10)}))];
    const current=pool.find(doc=>doc.slug==='pe-first-stage-r05-basic');
    const input={sidebarMokuji:null,headings:[],category:'pe-first-stage',docGroup:'primary',slugStr:current.slug,content:'',sectionStr:undefined,categoryArticles:pool,hasCategoryNavCard:false,showPillarNav:false,showTableOfContents:true};
    const groups=articleSidebarContinuation(input,current,pool,50000,{});
    process.stdout.write(JSON.stringify(groups.map(g=>({label:g.card?.label,links:g.card?.links.map(l=>l.href)}))));`);
  const years=result.find(group=>group.label==='rail-exam-years');
  assert.ok(years,'年度の組');
  assert.deepEqual(years.links.slice(0,3).map(href=>href.split('/').pop()),['r04-basic','r06-basic','r05-aptitude']);
  const hrefs=result.flatMap(group=>group.links);
  assert.equal(new Set(hrefs).size,hrefs.length,'同じ記事を2回出さない');
  assert.ok(result.length>=4);
  result.forEach((group,i)=>{assert.notEqual(group.label,result[i-1]?.label);assert.ok(group.links.length===3||i===result.length-1&&group.links.length>=2);});
  assert.equal(result[0].label,'rail-exam-years','関連が無ければ種類の違う組から始まる');
});

test('過去問だけ、見積もりに足りない組をバナーだけの組で埋め、回遊の組の間へ均等に散らす。同じ案件を続けない', () => {
  const run = (questionSeries) => evaluate(`
    import {articleSidebarContinuation} from './src/lib/article-sidebar-continuation.ts';
    import {articleSidebarGroupCount} from './src/lib/article-sidebar-plan.ts';
    const mk=(slug,extra={})=>({slug,category:'pe-first-stage',title:slug,published:true,group:'primary',tags:[],...extra});
    const years=['r01','r02','r03','r04','r05','r06','r07'];
    const pool=[...years.map(y=>mk('pe-first-stage-'+y+'-basic')),
      ...Array.from({length:5},(_,i)=>mk('pe-first-stage-guide-extra'+i,{group:'guide',publishedAt:'2026-01-'+String(i+10)}))];
    const current=pool.find(doc=>doc.slug==='pe-first-stage-r05-basic');
    const input={sidebarMokuji:null,headings:[],category:'pe-first-stage',docGroup:'primary',slugStr:current.slug,content:'',sectionStr:undefined,categoryArticles:pool,hasCategoryNavCard:false,showPillarNav:false,showTableOfContents:true,questionSeries:${questionSeries}};
    const p=(slot,program)=>[slot,{slot,program}];
    const placements=Object.fromEntries([p('article-rail','buildjob'),p('article-rail-2','rsg-kensetsu'),p('article-rail-3','dainishinsotsu-agent-neo'),p('article-rail-4','kensetsu-jobs')]);
    const groups=articleSidebarContinuation(input,current,pool,50000,placements);
    process.stdout.write(JSON.stringify({estimate:articleSidebarGroupCount(50000,0,'primary'),groups:groups.map(g=>({fill:Boolean(g.fill),card:Boolean(g.card),slot:g.slot,program:g.banner?.program}))}));`);
  const plain = run(false);
  const exam = run(true);
  assert.ok(plain.groups.every(group=>!group.fill),'過去問でない記事に埋める組は出ない');
  assert.ok(plain.groups.length<plain.estimate,'回遊の候補が尽きて見積もりに足りない前提');
  assert.equal(exam.groups.length,exam.estimate,'組の間が約2000pxおきになる数まで埋める');
  const cards = exam.groups.filter(group=>!group.fill);
  assert.deepEqual(cards.map(group=>group.slot),plain.groups.map(group=>group.slot),'回遊の組の中身と並びは変えない');
  const fills = exam.groups.filter(group=>group.fill);
  assert.equal(fills.length,exam.estimate-plain.groups.length);
  assert.ok(fills.every(group=>group.slot==='article-rail-fill'&&!group.card&&group.program));
  assert.ok(new Set(fills.map(group=>group.program)).size>1,'案件の列を順に繰り返す');
  // 均等: 埋める組の間に挟まる回遊の組の数は、どこも 1 つ以内の差
  const runs = []; let run0 = 0;
  for(const group of exam.groups) { if(group.fill) { runs.push(run0); run0 = 0; } else run0++; }
  runs.push(run0);
  assert.ok(Math.max(...runs)-Math.min(...runs)<=1,'均等に散らす '+runs);
  // 直前（と直後）の組と同じ案件を続けない
  exam.groups.forEach((group,i)=>{ if(group.fill) { assert.notEqual(group.program,exam.groups[i-1]?.program); assert.notEqual(group.program,exam.groups[i+1]?.program); } });
});

test('埋める組は右の欄に出ている案件だけを使い、右の欄に画像が無ければ足さない', () => {
  const result = evaluate(`
    import {articleSidebarContinuation} from './src/lib/article-sidebar-continuation.ts';
    import {articleRailFillColumn,articleImagePlacements,articlePixelCandidates} from './src/lib/article-affiliate-plan.ts';
    const current={slug:'pe-first-stage-r05-basic',category:'pe-first-stage',title:'確認',published:true,group:'primary'};
    const input={sidebarMokuji:null,headings:[],category:current.category,docGroup:'primary',slugStr:current.slug,content:'',sectionStr:undefined,categoryArticles:[current],hasCategoryNavCard:false,showPillarNav:false,showTableOfContents:true,questionSeries:true};
    const placements={'article-rail':{slot:'article-rail',program:'buildjob'},'article-rail-2':{slot:'article-rail-2',program:'buildjob'},'article-rail-3':{slot:'article-rail-3',program:'rsg-kensetsu'}};
    const groups=articleSidebarContinuation(input,current,[],50000,placements);
    const images=articleImagePlacements(placements,[],1,groups.map(g=>g.slot));
    process.stdout.write(JSON.stringify({
      programs:groups.filter(g=>g.fill).map(g=>g.banner.program),
      noRail:articleSidebarContinuation(input,current,[],50000,{}).length,
      column:articleRailFillColumn(images).map(p=>[p.slot,p.program]),
      pixelSlots:articlePixelCandidates(placements,[],images).map(c=>c.slot),
    }));`);
  assert.ok(result.programs.length>0&&result.programs.every(program=>['buildjob','rsg-kensetsu'].includes(program)));
  assert.equal(result.noRail,0,'右の欄の案件が無ければ埋める組も出ない');
  assert.deepEqual(result.column,[['article-rail-fill','buildjob'],['article-rail-fill','rsg-kensetsu']],'案件は 1 回ずつ並べ直す');
  assert.ok(!result.pixelSlots.includes('article-rail-fill'),'埋める組にピクセルは付けない');
});
