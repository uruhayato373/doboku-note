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
for(const category of ['pe-first-stage','concrete-chief-engineer','concrete-diagnostician'])assert(sidebarProduct(category));
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
// rccm は products を持ち非 HUB なので、career 記事を足すと note 商品カードが出てしまう
// （「career 記事に note CTA を置かない」方針違反）。isCareerDoc で塞いだことを固定する。
const careerDoc = {slug:'rccm-guide-what-is-rccm',category:'rccm',group:'guide',tags:['guide','career'],published:true} as unknown as Parameters<typeof sidebarProduct>[1];
assert.equal(sidebarProduct('rccm',careerDoc),null,'career タグの rccm 記事に note 商品カードを出さない');
const nonCareerDoc = {slug:'rccm-guide-overview',category:'rccm',group:'guide',tags:['guide'],published:true} as unknown as Parameters<typeof sidebarProduct>[1];
// doc あり経路は products[category] ではなく placement.top || inline[0] を返す（固定商品は doc 無しのときだけ）。
assert(sidebarProduct('rccm',nonCareerDoc),'非 career は従来どおり商品カードを出す');
assert(sidebarProduct('rccm'),'doc 無し（カテゴリページ）は固定商品を返す');
console.log('PASS career guard: career doc → null, non-career → product, category page unchanged');
