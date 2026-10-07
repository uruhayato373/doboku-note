// 転職アフィリエイトの配置ルール（config/affiliate-placements.json）の解決を、固定の時刻で確かめる。
// ルールを変えたら、ここの期待値も意図して変える（配置の変更がテストの差分として見える）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTsModule } from './lib/load-ts.mjs';
import { findOverlaps, choosePixelCarrier } from '../src/lib/affiliate-placement-core.mjs';

const load = () => loadTsModule('src/lib/affiliate-placement.ts');
const NOW = Date.parse('2026-10-08T12:00:00+09:00');
// 2026-10-07 17:00 に 2級を建設JOBs へ替え、実務・公的基準・トップ・ツールへ広げた（EXP-017）。その前の時刻
const BEFORE_EXP017 = Date.parse('2026-10-07T12:00:00+09:00');
const SIDEBAR_ERA = Date.parse('2026-09-20T12:00:00+09:00');
const AFTER_SIDEBAR = Date.parse('2026-09-27T12:00:00+09:00');

// ビルドジョブの施工管理系（2級は建設JOBs）
const CIVIL = ['civil-construction-1', 'pe-construction', 'concrete-chief-engineer', 'concrete-diagnostician', 'pe-first-stage'];
const CIVIL2 = 'civil-construction-2';
const NO_AD = ['reference-materials', 'surveyor', 'pavement', 'building-construction', null];

const programs = (r) => Object.fromEntries(Object.entries(r).map(([slot, v]) => [slot, v.program]));

test('非キャリアの施工管理系の記事: 本文中間カードと記事末バナーが BuildJob、記事サイドバーは無い', async () => {
  const { resolvePlacements } = await load();
  for (const category of CIVIL) {
    const r = resolvePlacements({ pageKind: 'doc', category, isCareerDoc: false }, NOW);
    assert.equal(r['article-mid']?.program, 'buildjob', category);
    assert.equal(r['article-end']?.program, 'buildjob', category);
    assert.equal(r['article-end']?.trackLabel, 'BuildJob-endbanner', category);
    assert.equal(r.sidebar, undefined, `${category}: 記事サイドバーは 2026-09-26 に撤去`);
  }
});

test('キャリア記事の記事末には広告を置かない（本文中間は出す）', async () => {
  const { resolvePlacements } = await load();
  const r = resolvePlacements({ pageKind: 'doc', category: 'civil-construction-1', isCareerDoc: true }, NOW);
  assert.equal(r['article-end'], undefined);
  assert.equal(r['article-mid']?.program, 'buildjob');
});

test('総監は全部の面でハイクラス DX・コンサル（施工管理系を出さない）', async () => {
  const { resolvePlacements } = await load();
  for (const pageKind of ['doc', 'category']) {
    const r = resolvePlacements({ pageKind, category: 'pe-comprehensive-management', isCareerDoc: false }, NOW);
    assert.ok(Object.keys(r).length > 0, pageKind);
    for (const v of Object.values(r)) assert.equal(v.program, 'dx-consulting', `${pageKind} ${v.slot}`);
  }
});

test('測量・舗装・建築・参考資料、カテゴリの無い記事には何も出さない', async () => {
  const { resolvePlacements } = await load();
  for (const category of NO_AD) {
    assert.deepEqual(programs(resolvePlacements({ pageKind: 'doc', category, isCareerDoc: false }, NOW)), {}, String(category));
    assert.deepEqual(programs(resolvePlacements({ pageKind: 'category', category }, NOW)), {}, String(category));
  }
});

test('本文の手書き転職カード（article-inline）は MDX にある 4 カテゴリだけ（2級の学習ページは建設JOBs）。技士・RCCM は本文中間と記事末が BuildJob', async () => {
  const { resolvePlacements } = await load();
  for (const category of ['civil-construction-1', 'pe-construction', 'rccm']) {
    assert.equal(resolvePlacements({ pageKind: 'doc', category }, NOW)['article-inline']?.program, 'buildjob', category);
  }
  assert.equal(resolvePlacements({ pageKind: 'doc', category: CIVIL2, isCareerDoc: false }, NOW)['article-inline']?.program, 'kensetsu-jobs');
  for (const category of ['concrete-engineer', 'rccm']) {
    const r = resolvePlacements({ pageKind: 'doc', category, isCareerDoc: false }, NOW);
    assert.equal(r['article-end']?.program, 'buildjob', category);
    assert.equal(r['article-mid']?.program, 'buildjob', `${category}: 本文中間（2026-10-07 に埋めた枠）`);
  }
});

test('2級: 学習ページと資格トップは建設JOBs、キャリア記事（指名・比較記事を含む）はビルドジョブのまま', async () => {
  const { resolvePlacements } = await load();
  const learn = resolvePlacements({ pageKind: 'doc', category: CIVIL2, isCareerDoc: false }, NOW);
  assert.deepEqual(programs(learn), { 'article-mid': 'kensetsu-jobs', 'article-inline': 'kensetsu-jobs', 'article-end': 'kensetsu-jobs' });
  assert.equal(learn['article-end'].trackLabel, 'KensetsuJobs-endbanner');
  assert.equal(learn['article-mid'].card().service, '建設JOBs');
  assert.match(learn['article-mid'].card().category, /20〜30代/, 'カードに対象を出す（対象外の登録は否認される）');
  const career = resolvePlacements({ pageKind: 'doc', category: CIVIL2, isCareerDoc: true }, NOW);
  assert.deepEqual(programs(career), { 'article-mid': 'buildjob', 'article-inline': 'buildjob' });
  const hub = resolvePlacements({ pageKind: 'category', category: CIVIL2 }, NOW);
  assert.deepEqual(programs(hub), { 'category-sidebar': 'kensetsu-jobs', 'category-mobile': 'kensetsu-jobs' });
  assert.equal(hub['category-sidebar'].trackLabel, 'KensetsuJobs-sidebar');
  // 替える前は 2級もビルドジョブ（閉じたルールの履歴）
  assert.equal(resolvePlacements({ pageKind: 'doc', category: CIVIL2, isCareerDoc: false }, BEFORE_EXP017)['article-mid']?.program, 'buildjob');
});

test('実務（civil-practice）: 記事は本文中間と記事末（キャリア記事は記事末なし）、実務トップはサイドバーとモバイル。手書きカードの面は無い', async () => {
  const { resolvePlacements } = await load();
  assert.deepEqual(programs(resolvePlacements({ pageKind: 'doc', category: 'civil-practice', isCareerDoc: false }, NOW)), { 'article-mid': 'buildjob', 'article-end': 'buildjob' });
  assert.deepEqual(programs(resolvePlacements({ pageKind: 'doc', category: 'civil-practice', isCareerDoc: true }, NOW)), { 'article-mid': 'buildjob' });
  assert.deepEqual(programs(resolvePlacements({ pageKind: 'category', category: 'civil-practice' }, NOW)), { 'category-sidebar': 'buildjob', 'category-mobile': 'buildjob' });
  assert.deepEqual(programs(resolvePlacements({ pageKind: 'doc', category: 'civil-practice' }, BEFORE_EXP017)), {}, '広げる前は何も出ていない');
});

test('公的基準の章末・トップ・ツールは 1 枠ずつで、その枠がピクセルの発火源', async () => {
  const { resolvePlacements, pixelFor } = await load();
  for (const [pageKind, slot] of [['standards', 'standards-end'], ['home', 'home-section'], ['tool', 'tool-inline']]) {
    const r = resolvePlacements({ pageKind }, NOW);
    assert.equal(r[slot]?.program, 'buildjob', `${pageKind} ${slot}`);
    assert.equal(pixelFor(r, [slot])?.slot, slot, `${pageKind}: 1 枠なのでこの枠が発火源`);
    assert.deepEqual(programs(resolvePlacements({ pageKind }, BEFORE_EXP017)), pageKind === 'tool' ? { 'career-tool': 'buildjob' } : {}, `${pageKind}: 広げる前`);
  }
});

test('資格トップ: サイドバーとモバイルに 1 枠ずつ、同じ案件', async () => {
  const { resolvePlacements } = await load();
  for (const category of [...CIVIL, 'concrete-engineer', 'rccm', 'civil-practice']) {
    const r = resolvePlacements({ pageKind: 'category', category }, NOW);
    assert.equal(r['category-sidebar']?.program, 'buildjob', category);
    assert.equal(r['category-mobile']?.program, 'buildjob', category);
    assert.equal(r['category-sidebar']?.trackLabel, 'BuildJob-sidebar');
  }
  assert.equal(resolvePlacements({ pageKind: 'tool' }, NOW)['career-tool']?.program, 'buildjob');
});

test('閉じたルールは期間の中だけ有効（記事サイドバー: 9/20 はあり、9/27 は無い）', async () => {
  const { resolvePlacements } = await load();
  assert.equal(resolvePlacements({ pageKind: 'doc', category: 'civil-construction-1' }, SIDEBAR_ERA).sidebar?.program, 'buildjob');
  assert.equal(resolvePlacements({ pageKind: 'doc', category: 'pe-comprehensive-management' }, SIDEBAR_ERA).sidebar?.program, 'dx-consulting');
  assert.equal(resolvePlacements({ pageKind: 'doc', category: 'civil-construction-1' }, AFTER_SIDEBAR).sidebar, undefined);
});

test('1 ページ 1 ピクセル: 本文（手書き > 中間）を記事末より優先し、モバイルの資格トップは発火源にならない', async () => {
  const { resolvePlacements, pixelFor } = await load();
  const doc = resolvePlacements({ pageKind: 'doc', category: 'civil-construction-1', isCareerDoc: false }, NOW);
  assert.equal(pixelFor(doc, ['article-inline', 'article-mid', 'article-end'])?.slot, 'article-inline');
  assert.equal(pixelFor(doc, ['article-mid', 'article-end'])?.slot, 'article-mid');
  assert.equal(pixelFor(doc, ['article-end'])?.slot, 'article-end');
  assert.equal(pixelFor(doc, []), null);
  assert.match(pixelFor(doc, ['article-end']).pixelSrc, /^https:\/\/www\d+\.a8\.net\/0\.gif\?a8mat=/);
  const hub = resolvePlacements({ pageKind: 'category', category: 'civil-construction-1' }, NOW);
  assert.equal(pixelFor(hub, ['category-sidebar', 'category-mobile'])?.slot, 'category-sidebar');
  assert.equal(pixelFor(hub, ['category-mobile']), null);
});

test('今のルールは同じ面・重なる期間・交わる対象の組を持たない', () => {
  const { rules } = JSON.parse(readFileSync('config/affiliate-placements.json', 'utf8'));
  assert.deepEqual(findOverlaps(rules), []);
  const overlapping = [...rules, { ...rules[0], id: 'PL-9999' }];
  assert.deepEqual(findOverlaps(overlapping), [[rules[0].id, 'PL-9999']], '同じ面に 2 ルールなら検出する');
  assert.equal(choosePixelCarrier({ a: { pixelPriority: 2 }, b: { pixelPriority: 1 }, c: { pixelPriority: null } }, ['a', 'b', 'c']), 'b');
});
