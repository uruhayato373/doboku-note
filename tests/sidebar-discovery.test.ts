import {strict as assert} from 'node:assert';
import {getAllDocsMeta} from '../src/lib/docs';
import {DISCOVERY_CATEGORIES,discoveryGroups,sidebarProduct} from '../src/lib/sidebar-discovery';
import {getRelatedTools} from '../src/lib/tools';
const all=getAllDocsMeta();const docs=all.filter(d=>d.published!==false);let checked=0;
for(const d of docs.filter(d=>DISCOVERY_CATEGORIES.includes(d.category ?? ''))){
 const groups=discoveryGroups(d.category ?? '',d.slug,all.filter(a=>a.category===d.category));
 const links=groups.flatMap(g=>g.docs);assert(links.every(a=>a.slug!==d.slug&&a.published!==false&&!a.hideFromCategory));assert.equal(new Set(links.map(a=>a.slug)).size,links.length);assert(links.length<=9);checked++;
}
const primary=docs.filter(d=>/^pe-first-stage-[hr]\d{2}(?:-retry)?-(basic|aptitude|construction)$/.test(d.slug));assert(primary.length>0,'一次過去問の検査0件を許さない');assert(primary.every(d=>getRelatedTools(d.category ?? '',d.slug).some(t=>t.href==='/tools/kakomon-quiz/pe-first-stage')));
// 資格トップの商品は台帳（config/site-cta-surfaces.json・DN-1223）で lead: product の資格（と季節の商品）だけ。もくじへ寄せた資格は季節外なら null
for(const category of ['pe-first-stage','surveyor','pavement'])assert(sidebarProduct(category));
assert.equal(sidebarProduct('concrete-diagnostician'),null,'もくじへ寄せた資格の資格トップはもくじタイル');
assert.equal(sidebarProduct('civil-practice'),null);const afterPass=docs.find(d=>d.slug==='pe-first-stage-guide-after-pass');
assert.equal(sidebarProduct('pe-first-stage',afterPass)?.id,'pe-construction-required-magazine','合格後ガイドの候補は建設部門二次へつなぐ');
assert.equal(sidebarProduct('pe-first-stage',afterPass,'## 合格後の学習'),null,'本文冒頭と同じ商品をサイドバーで再掲しない');
assert.equal(getRelatedTools('concrete-diagnostician').length,0);
console.log(`PASS ${checked} article navs: no self/hidden/duplicate links, ${primary.length} quiz routes, published products and unrelated-product exclusion`);

const retryGroups = discoveryGroups('pe-first-stage','pe-first-stage-r01-retry-basic',docs.filter(d=>d.category==='pe-first-stage'));
assert(retryGroups.find(g=>g.title==='同じ分野・科目')?.docs.every(d=>d.slug.endsWith('-basic')));
const retrySameYear=retryGroups.find(g=>g.title==='同じ年度・実施回の科目')?.docs ?? [];
assert(retrySameYear.length>0);
assert(retrySameYear.every(d=>d.slug.startsWith('pe-first-stage-r01-retry-')&&!d.slug.endsWith('-basic')),'再試験と本試験を混ぜない');
for(const slug of ['pe-first-stage-r01-retry-aptitude','pe-first-stage-r01-retry-construction'])assert(retrySameYear.some(d=>d.slug===slug));

// career ガードの回帰（2026-09-22）。
// 旧実装は `classifyDoc(doc) === 'career'` だったが classifyDoc は 'career' を返さない
// （career 記事は group: guide のまま・doc-classifier.ts:11-14）ため常に false＝死んだガードだった。
// 単品へ案内する資格（台帳の lead: product）で career 記事に note 商品カードが出ないことを固定する（RCCM は 2026-11-16 にもくじへ寄せた）。
const careerDoc = {slug:'pe-first-stage-guide-career',category:'pe-first-stage',group:'guide',tags:['guide','career'],published:true} as unknown as Parameters<typeof sidebarProduct>[1];
assert.equal(sidebarProduct('pe-first-stage',careerDoc),null,'career タグの記事に note 商品カードを出さない');
const nonCareerDoc = {slug:'pe-first-stage-guide-overview',category:'pe-first-stage',group:'guide',tags:['guide'],published:true} as unknown as Parameters<typeof sidebarProduct>[1];
// doc あり経路は placement.top || inline[0] を返す（資格トップの商品は doc 無しのときだけ）。
assert(sidebarProduct('pe-first-stage',nonCareerDoc),'非 career は従来どおり商品カードを出す');
assert(sidebarProduct('pe-first-stage'),'doc 無し（カテゴリページ）は資格トップの商品を返す');
assert.equal(sidebarProduct('rccm',{slug:'rccm-guide-overview',category:'rccm',group:'guide',tags:['guide'],published:true} as unknown as Parameters<typeof sidebarProduct>[1]),null,'もくじへ寄せた資格の記事の横の欄は単品を出さない');
console.log('PASS career guard: career doc → null, non-career → product, category page unchanged');

// 追加回遊の候補も、上のナビと同じURLを再掲しない（総監・土木の旧ナビも共通計画から除く）。
import { articleSidebarContinuation } from '../src/lib/article-sidebar-continuation';
import { categoryNavLinkedSlugs } from '../src/lib/category-nav-plan';
import { getPublicDocPath } from '../src/lib/content-routes';
let continuations = 0;
for (const category of ['pe-first-stage','civil-practice','concrete-engineer']) {
 const current=docs.find(doc=>doc.category===category&&!doc.hideFromCategory)!;
 const categoryArticles=docs.filter(doc=>doc.category===category);
 const props={variant:'sidebar' as const,category,currentSlug:current.slug,docGroup:'guide' as const,categoryArticles};
 const upper=new Set(categoryNavLinkedSlugs(props).map(getPublicDocPath));
 const input={sidebarMokuji:null,headings:[{id:'section',text:'内容',level:2}],category,docGroup:'guide' as const,slugStr:current.slug,content:'',sectionStr:undefined,categoryArticles,hasCategoryNavCard:true,showPillarNav:false,showTableOfContents:true};
 const groups=articleSidebarContinuation(input,current,docs,20000,{});
 const links=groups.flatMap(group=>group.card?.links ?? []);
 assert(links.length>0,category+'の検査0件を許さない');
 assert(links.every(link=>!upper.has(link.href)&&link.href!==getPublicDocPath(current.slug)));
 assert.equal(new Set(links.map(link=>link.href)).size,links.length);
 assert(groups.every(group=>group.card&&!group.banner),'広告が尽きたときも回遊は残す');
 continuations+=groups.length;
}
console.log(`PASS ${continuations} continuation groups: upper/lower unique links, cards without ads`);
