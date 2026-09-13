import {strict as assert} from 'node:assert';
import {getAllDocsMeta} from '../src/lib/docs';
import {DISCOVERY_CATEGORIES,discoveryGroups,sidebarProduct} from '../src/lib/sidebar-discovery';
import {getRelatedTools} from '../src/lib/tools';
const all=getAllDocsMeta();const docs=all.filter(d=>d.published!==false);let checked=0;
for(const d of docs.filter(d=>DISCOVERY_CATEGORIES.includes(d.category ?? ''))){
 const groups=discoveryGroups(d.category ?? '',d.slug,all.filter(a=>a.category===d.category));
 const links=groups.flatMap(g=>g.docs);assert(links.every(a=>a.slug!==d.slug&&a.published!==false&&!a.hideFromCategory));assert.equal(new Set(links.map(a=>a.slug)).size,links.length);assert(links.length<=9);checked++;
}
const primary=docs.filter(d=>/^pe-first-stage-[hr]\d{2}(?:-retry)?-(basic|aptitude|construction)$/.test(d.slug));assert.equal(primary.length,42);assert(primary.every(d=>getRelatedTools(d.category ?? '',d.slug).some(t=>t.href==='/tools/kakomon-quiz/pe-first-stage')));
for(const category of ['pe-first-stage','concrete-chief-engineer','concrete-diagnostician'])assert(sidebarProduct(category));
assert.equal(sidebarProduct('civil-practice'),null);assert.equal(sidebarProduct('pe-first-stage',docs.find(d=>d.slug==='pe-first-stage-guide-after-pass')),null);
assert.equal(getRelatedTools('concrete-diagnostician').length,0);
console.log(`PASS ${checked} article navs: no self/hidden/duplicate links, 42 quiz routes, published products and unrelated-product exclusion`);

const retryGroups = discoveryGroups('pe-first-stage','pe-first-stage-r01-retry-basic',docs.filter(d=>d.category==='pe-first-stage'));
assert(retryGroups.find(g=>g.title==='同じ分野・科目')?.docs.every(d=>d.slug.endsWith('-basic')));
assert.deepEqual(retryGroups.find(g=>g.title==='同じ年度・実施回の科目')?.docs.map(d=>d.slug).sort(),['pe-first-stage-r01-retry-aptitude','pe-first-stage-r01-retry-construction']);
