import test from 'node:test';
import assert from 'node:assert/strict';
import { docSlugCandidates, expectedSlots, judgeShot, MIN_DOC_BYTES, pickMedianDoc, ruleFor, selectTargets } from '../scripts/lib/affiliate-layout-judge.mjs';

const NOW = Date.parse('2026-10-31T00:00:00+09:00');
const rule = (id, slot, program, target, until = null) => ({ id, slot, program, target, period: { from: '2026-09-01T00:00:00+09:00', until } });
const RULES = [
  rule('PL-1', 'category-sidebar', 'buildjob', { pageKind: 'category', categories: ['civil-construction-1'] }),
  rule('PL-2', 'article-mid', 'buildjob', { pageKind: 'doc', categories: ['civil-construction-1'], careerDoc: 'exclude' }),
  rule('PL-3', 'article-mid', 'buildjob', { pageKind: 'doc', categories: ['civil-construction-2'], careerDoc: 'only' }),
  rule('PL-4', 'article-end', 'buildjob', { pageKind: 'doc', categories: ['civil-construction-1'] }, '2026-10-01T00:00:00+09:00'),
  rule('PL-5', 'home-section', 'buildjob', { pageKind: 'home' }),
];
const PAGE = { pageKind: 'category', category: 'civil-construction-1' };
const ad = (o = {}) => ({ placement: 'category-sidebar', program: 'buildjob', variant: 'B', label: 'x', rect: { top: 2000, left: 20, right: 340, bottom: 2200 }, imgs: [], ...o });
const shot = (ads, o = {}) => judgeShot({ viewport: { width: 375, height: 812 }, scrollWidth: 375, html: '', ads, ...o }, { rules: RULES, page: PAGE, nowMs: NOW, forcedVariant: 'B' });

test('問題の無い配置は OK でルールが引ける', () => {
  const r = shot([ad()]);
  assert.equal(r.ok, true);
  assert.equal(r.ads[0].ruleId, 'PL-1');
});

test('1 画面目に入る広告も NG にしない（2026-10-31 に「1 画面目に置かない」を廃止）', () => {
  const r = shot([ad({ rect: { top: 120, left: 20, right: 340, bottom: 400 } })]);
  assert.equal('firstView' in r.checks, false);
  assert.equal(r.ok, true);
});

test('(b) 同じ素材のピクセルが 2 回なら NG（A8 ともしも）', () => {
  const a8 = '<img src="https://www16.a8.net/0.gif?a8mat=AAAA1+BBBB2+CCC3+DDDD4" width="1" height="1">';
  assert.equal(shot([ad()], { html: a8 }).checks.pixels.ok, true);
  assert.equal(shot([ad()], { html: a8 + a8 }).checks.pixels.ok, false);
  const mo = '<img src="https://i.moshimo.com/af/i/impression?a_id=1&amp;p_id=2&amp;pl_id=3&amp;pc_id=4&amp;pl_id=3">';
  assert.equal(shot([ad()], { html: mo + mo }).checks.pixels.ok, false);
});

test('(c) 素材より大きく表示したバナーは NG・同じ大きさ以下は OK', () => {
  const img = (w, nat) => ({ src: 'b.png', w, h: 100, naturalWidth: nat });
  assert.equal(shot([ad({ imgs: [img(300, 300)] })]).checks.stretch.ok, true);
  assert.equal(shot([ad({ imgs: [img(300, 250)] })]).checks.stretch.ok, false);
  // 読み込めていない（naturalWidth 0）画像は引き伸ばしと判定しない
  assert.equal(shot([ad({ imgs: [img(300, 0)] })]).checks.stretch.ok, true);
});

test('(d) 広告が画面外・ページが横スクロールなら NG', () => {
  assert.equal(shot([ad({ rect: { top: 2000, left: 20, right: 420, bottom: 2200 } })]).checks.overflow.ok, false);
  assert.equal(shot([ad()], { scrollWidth: 500 }).checks.overflow.ok, false);
});

test('(e) ルールが無い広告は NG・期間外だけなら注意', () => {
  assert.equal(shot([ad({ placement: 'article-mid' })]).checks.rule.ok, false);
  const expired = judgeShot({ viewport: { width: 375, height: 812 }, scrollWidth: 375, html: '', ads: [ad({ placement: 'article-end' })] }, { rules: RULES, page: { pageKind: 'doc', category: 'civil-construction-1' }, nowMs: NOW });
  assert.equal(expired.checks.rule.ok, true);
  assert.equal(expired.warnings.length, 1);
});

test('ルールが面を当てているのに広告が 0 件なら注意（NG にはしない）', () => {
  const r = judgeShot({ viewport: { width: 375, height: 812 }, scrollWidth: 375, html: '', ads: [] }, { rules: RULES, page: PAGE, nowMs: NOW, expectedCount: 1 });
  assert.equal(r.ok, true);
  assert.equal(r.warnings.length, 1);
  assert.equal(judgeShot({ viewport: { width: 375, height: 812 }, scrollWidth: 375, html: '', ads: [] }, { rules: RULES, page: PAGE, nowMs: NOW, expectedCount: 0 }).warnings.length, 0);
});

test('固定した案と違う案が出たら NG', () => {
  assert.equal(shot([ad({ variant: 'C' })]).checks.variant.ok, false);
  assert.equal(shot([ad({ variant: null })]).checks.variant.ok, true);
});

test('ruleFor / expectedSlots は careerDoc と期間を見る', () => {
  assert.equal(ruleFor(RULES, { pageKind: 'doc', category: 'civil-construction-2', isCareerDoc: false }, 'article-mid', 'buildjob', NOW).status, 'none');
  assert.equal(ruleFor(RULES, { pageKind: 'doc', category: 'civil-construction-2', isCareerDoc: true }, 'article-mid', 'buildjob', NOW).ruleId, 'PL-3');
  assert.deepEqual(Object.keys(expectedSlots(RULES, { pageKind: 'doc', category: 'civil-construction-1' }, NOW)), ['article-mid']);
});

test('代表の記事は本文が下限以上の中央の大きさ・無ければ最大', () => {
  const items = [1000, 9000, 10000, 20000, 90000].map((bytes) => ({ path: `/p${bytes}`, bytes }));
  assert.equal(pickMedianDoc(items).bytes, 10000);
  assert.equal(pickMedianDoc([{ path: '/a', bytes: 100 }, { path: '/b', bytes: 200 }]).bytes, 200);
  assert.equal(pickMedianDoc([]), null);
  assert.ok(MIN_DOC_BYTES > 0);
});

test('docSlugCandidates は exam・practice・laws を逆引きする', () => {
  assert.deepEqual(docSlugCandidates('/exam/civil-construction-1/guide/career', 'civil-practice').category, 'civil-construction-1');
  assert.equal(docSlugCandidates('/practice/foo', 'civil-practice').slugs[0], 'civil-practice-foo');
  assert.equal(docSlugCandidates('/laws/x', 'civil-practice').category, 'laws');
  assert.equal(docSlugCandidates('/exam/civil-construction-1', 'civil-practice'), null);
});

test('selectTargets は種類ごとに代表を 1 つ選び、ルールに無い種類は選ばない', () => {
  const big = { bytes: MIN_DOC_BYTES + 1, career: false };
  const docsBySlug = new Map([
    ['civil-construction-1-a', big],
    ['civil-construction-1-guide-b', { bytes: MIN_DOC_BYTES + 5, career: false }],
    ['civil-construction-2-c', { bytes: MIN_DOC_BYTES + 1, career: true }],
    ['civil-construction-2-d', big],
  ]);
  const t = selectTargets({
    rules: RULES,
    sitemapPaths: ['/', '/exam/civil-construction-1', '/exam/civil-construction-1/guide/a', '/exam/civil-construction-1/guide/b', '/exam/civil-construction-2/guide/c', '/exam/civil-construction-2/guide/d', '/tools/x', '/laws'],
    categories: [{ slug: 'civil-construction-1', area: 'exam' }, { slug: 'civil-construction-2', area: 'exam' }],
    docsBySlug,
  });
  const ids = t.map((x) => x.id);
  assert.deepEqual(ids, ['home', 'category-civil-construction-1', 'doc-civil-construction-1', 'doc-civil-construction-2', 'doc-career-civil-construction-2']);
  assert.equal(t.find((x) => x.id === 'doc-career-civil-construction-2').isCareerDoc, true);
  assert.equal(t.some((x) => x.kind === 'tool' || x.kind === 'laws-list'), false);
});

test('2 枚並べの 2 枚目は pairs で当たるルールとして扱い、1 枚目のルールが無い面では NG のまま', () => {
  const pairs = [{ id: 'PP-1', primary: 'buildjob', secondary: 'constwork', slots: ['article-mid'], target: { pageKind: 'doc', categories: ['civil-construction-1'] }, period: { from: '2026-10-31T00:00:00+09:00', until: null } }];
  const doc = { pageKind: 'doc', category: 'civil-construction-1', isCareerDoc: false };
  assert.deepEqual(ruleFor(RULES, doc, 'article-mid', 'constwork', NOW + 1, pairs), { ruleId: 'PP-1', status: 'active' });
  assert.equal(ruleFor(RULES, doc, 'article-mid', 'constwork', NOW + 1, []).status, 'none', 'pairs を渡さなければ従来どおり');
  assert.equal(ruleFor(RULES, { ...doc, category: 'rccm' }, 'article-mid', 'constwork', NOW + 1, pairs).status, 'none');
});

test('代表の記事は転職広告が出る記事から選び、ツールは診断の後にだけ広告が出るページを避ける', async () => {
  const { docShowsCareerAd, pickMedianDoc } = await import('../scripts/lib/affiliate-layout-judge.mjs');
  const long = '本文'.repeat(1300);
  assert.equal(docShowsCareerAd(`## a\n${long}\n## b\n## c\n`), true);
  assert.equal(docShowsCareerAd(`## a\n${long}\n## b\n`), false, 'h2 が 2 本だと本文中間カードは出ない');
  assert.equal(docShowsCareerAd('短い\n<CareerAffiliate program="gks" />'), true, '手書きの本文カード');
  const pick = pickMedianDoc([
    { path: '/a', bytes: 9000, adEligible: false },
    { path: '/b', bytes: 20000, adEligible: true },
    { path: '/c', bytes: 30000, adEligible: false },
  ]);
  assert.equal(pick.path, '/b');
  const tool = selectTargets({ rules: [rule('PL-9', 'tool-end', 'buildjob', { pageKind: 'tool' })], sitemapPaths: ['/tools/career-check', '/tools/concrete-maturity'], categories: [], docsBySlug: new Map() });
  assert.equal(tool[0].path, '/tools/concrete-maturity');
  const withIndex = selectTargets({ rules: [rule('PL-9', 'tool-end', 'buildjob', { pageKind: 'tool' })], sitemapPaths: ['/tools', '/tools/career-check'], categories: [], docsBySlug: new Map() });
  assert.equal(withIndex[0].path, '/tools');
});
