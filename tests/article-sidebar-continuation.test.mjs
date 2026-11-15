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

test('残り2500pxごとに0〜6組。短文は0、H2の余白を加算し長文は上限6', () => {
  const values = evaluate(`import { articleSidebarGroupCount as count } from './src/lib/article-sidebar-plan.ts';
    process.stdout.write(JSON.stringify([[0,0],[2000,3],[3500,5],[4000,5],[6000,10],[100000,80]].map(([length,h2])=>count(length,h2))));`);
  assert.deepEqual(values,[0,0,0,1,2,6]);
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

test('代表5記事の描画で目次なしの右欄・設問ナビ維持・上の束を含む重複なし・密度検査', () => {
  const inputs = evaluate(`
    import {getDoc,getAllDocsMeta} from './src/lib/docs';
    import {planArticleCtas} from './src/lib/article-cta-plan';
    import {articleSidebarInput,articleSidebarPlan} from './src/lib/article-sidebar-plan';
    import {articleSidebarContinuation} from './src/lib/article-sidebar-continuation';
    const pool=getAllDocsMeta().filter(d=>d.published!==false&&!d.hideFromCategory&&!d.tags?.includes('模範論文'));
    (async()=>{const rows=[];
    for(const slug of ['civil-construction-1-guide-earthwork-key-points','civil-construction-1-textbook-concrete-materials','civil-construction-1-primary-r02-a','pe-comprehensive-management-360-degree-evaluation','civil-practice-embankment-quality-control']) {
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
      groups:row.groups.map(g=>({label:g.card?.label,links:g.card?.links.map(l=>l.href),banner:g.banner?.program})),
      html:render(<TwoColumnShell stretchAside aside={<ArticleSidebar cards={buildArticleSidebarCards(row.input)} groups={row.groups} placements={row.placements}/>}><article><div className="prose-blog"><h2>土木・技術士</h2></div></article></TwoColumnShell>)}));
    process.stdout.write(JSON.stringify(rows));`,true);
  assert.equal(rows.length,5);
  let total = 0;
  for(const row of rows) {
    assert.ok(row.upper.every(card=>card.kind!=='toc'));
    if(row.slug.endsWith('primary-r02-a')) assert.ok(row.upper.some(card=>card.kind==='questions'));
    const dom = parse(row.html);
    assert.ok(dom.querySelector('main').text.includes('土木・技術士'));
    assert.ok(dom.querySelector('aside').classList.contains('zenn-desktop:flex'));
    const hrefs=dom.querySelector('aside').querySelectorAll('a').map(a=>a.getAttribute('href')).filter(h=>/^\/(exam|practice|laws)\//.test(h));
    assert.equal(new Set(hrefs).size,hrefs.length,row.slug+' upper/lower duplicate');
    const labels=row.groups.map(group=>group.label).filter(Boolean);
    const order=['rail-related','rail-discovery','rail-topic','rail-popular','rail-tools','rail-related'];
    let cursor=0;
    for(const label of labels) {cursor=order.indexOf(label,cursor);assert.ok(cursor>=0,row.slug+' order');cursor++;}
    const programs=row.groups.map(group=>group.banner).filter(Boolean);
    assert.equal(new Set(programs).size,programs.length);
    for(const image of dom.querySelectorAll('a[data-thumb] img')) {
      assert.equal(image.getAttribute('loading'),'lazy');
      assert.ok(Number(image.getAttribute('width'))>0 && Number(image.getAttribute('height'))>0);
    }
    assert.deepEqual(inspectHtml(row.html, 'exam/civil-construction-1/guide/test').violations, [], row.slug);
    total += labels.length;
  }
  assert.ok(total>0,'追加カード0件の検査を許さない');
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
