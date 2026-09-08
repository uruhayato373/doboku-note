import {strict as assert} from 'node:assert';
import {getAllDocsMeta} from '../src/lib/docs';
import {DISCOVERY_CATEGORIES,discoveryGroups,sidebarProduct} from '../src/lib/sidebar-discovery';
import {getRelatedTools} from '../src/lib/tools';
const all=getAllDocsMeta();const docs=all.filter(d=>d.published!==false);let checked=0;
for(const d of docs.filter(d=>DISCOVERY_CATEGORIES.includes(d.category ?? ''))){
 const groups=discoveryGroups(d.category ?? '',d.slug,all.filter(a=>a.category===d.category));
 const links=groups.flatMap(g=>g.docs);assert(links.every(a=>a.slug!==d.slug&&a.published!==false&&!a.hideFromCategory));assert.equal(new Set(links.map(a=>a.slug)).size,links.length);assert(links.length<=9);checked++;
}
const primary=docs.filter(d=>/^pe-first-stage-[hr]\d{2}-(basic|aptitude|construction)$/.test(d.slug));assert.equal(primary.length,39);assert(primary.every(d=>getRelatedTools(d.category ?? '',d.slug).some(t=>t.href==='/tools/kakomon-quiz/pe-first-stage')));
for(const category of ['pe-first-stage','concrete-chief-engineer','concrete-diagnostician'])assert(sidebarProduct(category));
assert.equal(sidebarProduct('civil-practice'),null);assert.equal(sidebarProduct('pe-first-stage',docs.find(d=>d.slug==='pe-first-stage-guide-after-pass')),null);
assert.equal(getRelatedTools('concrete-diagnostician').length,0);
console.log(`PASS ${checked} article navs: no self/hidden/duplicate links, 39 quiz routes, published products and unrelated-product exclusion`);
