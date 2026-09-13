import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildAliasMap, normalizeTags, isStructuralTag, checkGroupAllowed, checkStructuralTags,
  evaluateSetRatchet, evaluateCountRatchet, countTopicDirections, rewriteFrontmatterTags, groupToDocGroupKey,
} from '../scripts/lib/content-taxonomy.mjs';
import { loadTsModule } from './lib/load-ts.mjs';

const TAXONOMY = JSON.parse(readFileSync('src/config/content-taxonomy.json', 'utf8'));
const CATEGORIES = JSON.parse(readFileSync('src/config/categories.json', 'utf8'));
const TAGS = JSON.parse(readFileSync('src/config/tags.json', 'utf8'));
const TOPICS = JSON.parse(readFileSync('src/config/topics.json', 'utf8'));
const catMap = new Map(CATEGORIES.map((c) => [c.slug, c]));

const FIX = [
  { name: '安全管理', slug: 'safety-management', class: 'qualification' },
  { name: '試験ガイド', slug: 'guide', class: 'structural', canonical: 'guide' },
  { name: 'キャリア・転職', slug: 'career', class: 'flag', canonical: 'career' },
  { name: '技術士（第二次試験）', slug: 'pe-second-stage', class: 'qualification', aliases: ['技術士第二次試験'] },
];

test('buildAliasMap: name/slug/aliases → canonical、既定 canonical は name', () => {
  const m = buildAliasMap(FIX);
  assert.equal(m.toCanonical.get('safety-management'), '安全管理');
  assert.equal(m.toCanonical.get('安全管理'), '安全管理');
  assert.equal(m.toCanonical.get('試験ガイド'), 'guide');
  assert.equal(m.toCanonical.get('技術士第二次試験'), '技術士（第二次試験）');
  assert.equal(m.classOf.get('guide'), 'structural');
});

test('buildAliasMap: 同じ綴りが 2 canonical を指すと throw', () => {
  assert.throws(() => buildAliasMap([...FIX, { name: '基礎工', slug: 'safety-management', class: 'topical' }]), /safety-management/);
});

test('normalizeTags: 別名→正規・重複除去・順序保持・未登録は passthrough', () => {
  const m = buildAliasMap(FIX);
  const r = normalizeTags(['safety-management', '安全管理', 'guide', '未登録X'], m);
  assert.deepEqual(r.tags, ['安全管理', 'guide', '未登録X']);
  assert.deepEqual(r.aliased, [{ from: 'safety-management', to: '安全管理' }]);
  assert.deepEqual(r.unknown, ['未登録X']);
  assert.equal(isStructuralTag('試験ガイド', m), true);
  assert.equal(isStructuralTag('安全管理', m), false);
});

test('checkGroupAllowed: 許可外 group・group 欠落・未知 category', () => {
  const g = TAXONOMY.groups;
  assert.equal(checkGroupAllowed({ category: 'civil-practice', group: 'textbook' }, catMap, g)[0].rule, 'doc-group-not-allowed');
  assert.equal(checkGroupAllowed({ category: 'civil-practice' }, catMap, g)[0].rule, 'doc-group-missing');
  assert.equal(checkGroupAllowed({ category: 'nope', group: 'guide' }, catMap, g)[0].rule, 'doc-category-unknown');
  assert.deepEqual(checkGroupAllowed({ category: 'civil-construction-1', group: 'textbook' }, catMap, g), []);
});

test('checkStructuralTags: guide に textbook は不整合、primary に past-questions は可、career は guide 限定', () => {
  const m = buildAliasMap(TAGS);
  const g = TAXONOMY.groups; const f = TAXONOMY.flags;
  assert.deepEqual(checkStructuralTags({ group: 'guide', tags: ['guide', 'textbook', '土工'] }, m, g, f), ['textbook']);
  assert.deepEqual(checkStructuralTags({ group: 'primary', tags: ['past-questions', 'primary'] }, m, g, f), []);
  assert.deepEqual(checkStructuralTags({ group: 'textbook', tags: ['career'] }, m, g, f), ['career']);
  assert.deepEqual(checkStructuralTags({ group: 'guide', tags: ['career'] }, m, g, f), []);
});

test('ratchets: 集合と件数', () => {
  assert.deepEqual(evaluateSetRatchet(['a', 'c'], ['a', 'b']), { increased: ['c'], repaid: ['b'] });
  const r = evaluateCountRatchet({ x: 18, y: 3, z: 0 }, { x: 17, y: 17 });
  assert.deepEqual(r.increased, [{ key: 'x', from: 17, to: 18 }]);
  assert.deepEqual(r.repaid, [{ key: 'y', from: 17, to: 3 }]);
});

test('countTopicDirections: exam/practice/standards・明示とタグ由来', () => {
  const topic = { slug: 't', tags: ['コンクリート'], standardKeywords: ['共通仕様書'], featuredStandardRefs: ['kinki/hikkei'] };
  const docs = [
    { slug: 'a', category: 'civil-construction-1', tags: ['コンクリート'], published: true },
    { slug: 'b', category: 'concrete-engineer', tags: [], topics: ['t'], published: true },
    { slug: 'c', category: 'civil-practice', tags: ['コンクリート'], published: true },
    { slug: 'd', category: 'civil-practice', tags: ['コンクリート'], published: false },
  ];
  const stds = [
    { agencyId: 'kinki', documentId: 'common', title: '土木工事共通仕様書' },
    { agencyId: 'kinki', documentId: 'hikkei', title: '必携' },
    { agencyId: 'tohoku', documentId: 'x', title: '設計便覧' },
  ];
  assert.deepEqual(countTopicDirections(topic, docs, catMap, stds), { exam: 2, practice: 1, standards: 2, explicit: 1, byTag: 2 });
});

test('rewriteFrontmatterTags: block list・引用符保持・削除・重複除去・CRLF 保持・本文不変', () => {
  const raw = '---\r\ntitle: x\r\ntags:\r\n  - "safety-management"\r\n  - 安全管理\r\n  - 2026年版\r\n  - guide\r\ngroup: "primary"\r\n---\r\n\r\n本文 tags:\r\n  - safety-management\r\n';
  const map = (t) => (t === 'safety-management' ? '安全管理' : t === '2026年版' ? null : t);
  const r = rewriteFrontmatterTags(raw, map);
  assert.equal(r.changed, true);
  assert.equal(r.text, '---\r\ntitle: x\r\ntags:\r\n  - "安全管理"\r\n  - guide\r\ngroup: "primary"\r\n---\r\n\r\n本文 tags:\r\n  - safety-management\r\n');
  assert.deepEqual(r.changes, [{ from: 'safety-management', to: '安全管理' }, { from: '2026年版', to: null }]);
  const same = rewriteFrontmatterTags('---\ntitle: x\ntags:\n  - guide\n---\nbody\n', (t) => t);
  assert.equal(same.changed, false);
});

test('rewriteFrontmatterTags: flow list', () => {
  const r = rewriteFrontmatterTags("---\ntags: [safety-management, 'guide', 安全管理]\n---\n", (t) => (t === 'safety-management' ? '安全管理' : t));
  assert.equal(r.text, "---\ntags: [安全管理, 'guide']\n---\n");
});

test('設定の整合: categories の area/groups、topics のタグ解決、GROUP_FIELD_MAP/GROUP_SEGMENT との一致', async () => {
  const m = buildAliasMap(TAGS);
  for (const c of CATEGORIES) {
    assert.ok(['exam', 'practice', 'standards'].includes(c.area), `${c.slug}: area`);
    for (const g of c.groups) assert.ok(TAXONOMY.groups[g], `${c.slug}: group ${g}`);
  }
  for (const t of TOPICS) for (const tag of t.tags) assert.ok(m.toCanonical.has(tag), `topics.json ${t.slug}: タグ「${tag}」が tags.json に無い`);
  const tax = await loadTsModule('src/lib/content-taxonomy.ts');
  assert.equal(tax.getCategoryArea('civil-practice'), 'practice');
  assert.equal(tax.getCategoryArea('pe-construction'), 'exam');
  assert.equal(tax.canonicalTag('safety-management'), '安全管理');
  assert.equal(tax.isStructuralTag('guide'), true);
  const routes = readFileSync('src/lib/content-routes.ts', 'utf8');
  const classifier = readFileSync('src/lib/doc-classifier.ts', 'utf8');
  for (const [id, def] of Object.entries(TAXONOMY.groups)) {
    const keyMap = groupToDocGroupKey(TAXONOMY.groups);
    assert.equal(keyMap[id], def.docGroupKey);
    assert.ok(new RegExp(`'${id}':\\s*'${def.docGroupKey}'`).test(classifier), `GROUP_FIELD_MAP に ${id}→${def.docGroupKey} が無い`);
    assert.ok(new RegExp(`${def.docGroupKey}:\\s*'${def.routeSegment}'`).test(routes), `GROUP_SEGMENT に ${def.docGroupKey}→${def.routeSegment} が無い`);
  }
});

test('rewriteFrontmatterTags: block list 途中の空行を跨いで書き換え、空行は詰める', () => {
  const raw = '---\ntags:\n  - secondary\n\n  - experience-writing\npublished: true\n---\n';
  const r = rewriteFrontmatterTags(raw, (t) => (t === 'experience-writing' ? '経験記述' : t));
  assert.equal(r.text, '---\ntags:\n  - secondary\n  - 経験記述\npublished: true\n---\n');
});
