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
      groups:row.groups.filter(g=>!g.lower).map(g=>({label:g.card?.label,links:g.card?.links.map(l=>l.href),banner:g.banner?.program,fill:g.fill,adsense:g.adsense,slot:g.slot})),
      lower:row.groups.filter(g=>g.lower).length,
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
    // 上詰め: カードの無い組（バナーだけ）は作らず、2 組目（1 組だけなら後ろ）に AdSense を 1 枠
    assert.ok(row.groups.every(group=>!group.fill),row.slug+' 埋める組は作らない');
    assert.ok(row.groups.every(group=>group.label||group.adsense),row.slug+' カードの無い組は AdSense だけ');
    assert.equal(row.groups.filter(group=>group.adsense).length,row.groups.length?1:0,row.slug+' AdSense は 1 枠');
    assert.ok(row.lower<=3,row.slug+' 空きの AdSense は最大 3 枠');
    assert.equal(dom.querySelectorAll('[data-article-sidebar-lower-ads] [data-adsense="rail"]').length,row.lower);
    assert.equal(dom.querySelectorAll('[data-article-sidebar-continuation] [data-adsense="rail"]').length,(row.groups.length?1:0)+row.lower);
    assert.equal(dom.querySelectorAll('[data-article-sidebar-group]').filter(el=>/justify-around/.test(el.parentNode.getAttribute('class'))).length,0,'組は上詰め（均等に散らすのは空きの AdSense だけ）');
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

test('回遊候補が尽きれば組を作らない（上詰めでバナーだけの組が続かない）。広告枠が無くてもカードの組は出す', () => {
  const result=evaluate(`
    import {articleSidebarContinuation} from './src/lib/article-sidebar-continuation.ts';
    const current={slug:'civil-practice-example',category:'civil-practice',title:'確認',published:true};
    const input={sidebarMokuji:null,headings:[],category:current.category,docGroup:'guide',slugStr:current.slug,content:'',sectionStr:undefined,categoryArticles:[current],hasCategoryNavCard:false,showPillarNav:false,showTableOfContents:true};
    const placements={'article-rail':{slot:'article-rail',program:'buildjob'},'article-rail-2':{slot:'article-rail-2',program:'buildjob'},'article-rail-3':{slot:'article-rail-3',program:'rsg-kensetsu'}};
    const packed=gs=>gs.filter(g=>!g.lower);
    const a=articleSidebarContinuation(input,current,[],20000,placements), b=articleSidebarContinuation(input,current,[],20000,{});
    process.stdout.write(JSON.stringify({groups:packed(a),empty:packed(b),lower:a.filter(g=>g.lower).length}));`);
  assert.deepEqual(result.groups,[]);
  assert.deepEqual(result.empty,[]);
  assert.equal(result.lower,3,'空きの AdSense は候補 3 枠（出すかは描画した空きの高さで決める）');
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
    process.stdout.write(JSON.stringify(groups.filter(g=>!g.lower).map(g=>({label:g.card?.label,links:g.card?.links.map(l=>l.href)}))));`);
  const years=result.find(group=>group.label==='rail-exam-years');
  assert.ok(years,'年度の組');
  assert.deepEqual(years.links.slice(0,3).map(href=>href.split('/').pop()),['r04-basic','r06-basic','r05-aptitude']);
  const hrefs=result.flatMap(group=>group.links);
  assert.equal(new Set(hrefs).size,hrefs.length,'同じ記事を2回出さない');
  assert.ok(result.length>=4);
  result.forEach((group,i)=>{assert.notEqual(group.label,result[i-1]?.label);assert.ok(group.links.length===3||i===result.length-1&&group.links.length>=2);});
  assert.equal(result[0].label,'rail-exam-years','関連が無ければ種類の違う組から始まる');
});

test('上詰め: 過去問も含めバナーだけの組を作らず、2 組目の転職バナーを AdSense に替え、その面のピクセルは出さない', () => {
  const result = evaluate(`
    import {articleSidebarContinuation} from './src/lib/article-sidebar-continuation.ts';
    import {articleImagePlacements,articlePixelCandidates} from './src/lib/article-affiliate-plan.ts';
    const mk=(slug,extra={})=>({slug,category:'pe-first-stage',title:slug,published:true,group:'primary',tags:[],...extra});
    const years=['r01','r02','r03','r04','r05','r06','r07'];
    const pool=[...years.map(y=>mk('pe-first-stage-'+y+'-basic')),
      ...Array.from({length:5},(_,i)=>mk('pe-first-stage-guide-extra'+i,{group:'guide',publishedAt:'2026-01-'+String(i+10)}))];
    const current=pool.find(doc=>doc.slug==='pe-first-stage-r05-basic');
    const input={sidebarMokuji:null,headings:[],category:'pe-first-stage',docGroup:'primary',slugStr:current.slug,content:'',sectionStr:undefined,categoryArticles:pool,hasCategoryNavCard:false,showPillarNav:false,showTableOfContents:true,questionSeries:true};
    const p=(slot,program)=>[slot,{slot,program}];
    const placements=Object.fromEntries([p('article-rail','buildjob'),p('article-rail-2','rsg-kensetsu'),p('article-rail-3','dainishinsotsu-agent-neo'),p('article-rail-4','kensetsu-jobs')]);
    const all=articleSidebarContinuation(input,current,pool,50000,placements);
    const groups=all.filter(g=>!g.lower);
    const images=articleImagePlacements(placements,[],1,all.filter(g=>g.banner).map(g=>g.slot));
    process.stdout.write(JSON.stringify({lower:all.filter(g=>g.lower).length,groups:groups.map(g=>({fill:Boolean(g.fill),card:Boolean(g.card),adsense:Boolean(g.adsense),slot:g.slot,program:g.banner?.program})),pixelSlots:articlePixelCandidates(placements,[],images).map(c=>c.slot)}));`);
  assert.ok(result.groups.length>=2);
  assert.ok(result.groups.every(group=>group.card&&!group.fill),'カードの無い組・埋める組は作らない');
  assert.deepEqual(result.groups.map(group=>group.adsense),result.groups.map((_,i)=>i===1),'2 組目だけ AdSense');
  assert.equal(result.groups[1].program,undefined,'AdSense の組に転職バナーは無い');
  assert.ok(result.groups[0].program,'1 組目は転職バナーつき（案件の数を超えた組はカードだけ）');
  assert.ok(!result.pixelSlots.includes(result.groups[1].slot),'AdSense に替えた面のピクセルは出さない');
  assert.ok(result.lower>=1&&result.lower<=3,'長い本文は上詰めの組の下の空きに AdSense（最大 3 枠）');
});
