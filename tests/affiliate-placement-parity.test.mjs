// 一時テスト: 新しい配置ルール（config/affiliate-placements.json）が、旧来の日付・カテゴリ分岐（affiliate-creatives.ts の resolver）と
// 2026-09-08 以降で同じ結果を返すことを確かめる。呼び出し側を新しい解決へ切り替えるコミットで、旧 resolver と一緒に消す。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './lib/load-ts.mjs';

const CATEGORIES = [
  'civil-construction-1', 'civil-construction-2', 'pe-comprehensive-management', 'pe-first-stage', 'pe-construction',
  'concrete-engineer', 'concrete-chief-engineer', 'concrete-diagnostician', 'rccm', 'surveyor', 'pavement',
  'building-construction', 'civil-practice', 'reference-materials',
];
const SLUGS = ['civil-construction-1-guide-strategy', 'civil-construction-1-guide-buildjob-review', 'civil-construction-2-guide-buildjob-review', 'pe-construction-guide-career', 'x'];
const TIMES = ['2026-09-08T00:00:00+09:00', '2026-09-30T12:00:00+09:00', '2026-10-07T12:00:00+09:00', '2027-01-01T00:00:00+09:00'];
const PROGRAM_OF = { 'BuildJob-sidebar': 'buildjob', 'DXConsulting-sidebar': 'dx-consulting' };
const MID_CATEGORIES = new Set(['civil-construction-1', 'civil-construction-2', 'pe-construction', 'concrete-chief-engineer', 'concrete-diagnostician', 'pe-first-stage']);
const END_CATEGORIES = new Set([...MID_CATEGORIES, 'concrete-engineer', 'pe-comprehensive-management', 'rccm']);
const INLINE_CATEGORIES = ['civil-construction-1', 'civil-construction-2', 'pe-construction', 'rccm']; // MDX に <CareerAffiliate> がある

function at(iso, fn) {
  const real = Date.now;
  Date.now = () => Date.parse(iso);
  try {
    return fn(Date.parse(iso));
  } finally {
    Date.now = real;
  }
}

test('記事: 本文中間・記事末・手書き・ピクセルが旧 resolver と一致する', async () => {
  const old = await loadTsModule('src/config/affiliate-creatives.ts');
  const neu = await loadTsModule('src/lib/affiliate-placement.ts');
  for (const when of TIMES) at(when, (now) => {
    for (const category of CATEGORIES) for (const isCareerDoc of [false, true]) for (const slug of SLUGS) {
      const r = neu.resolvePlacements({ pageKind: 'doc', category, isCareerDoc }, now);
      const tag = `${when} ${category} career=${isCareerDoc} ${slug}`;
      // 本文中間（DocPage の careerCategory / 総監）
      const oldMid = MID_CATEGORIES.has(category) ? old.resolveCareerArticleEndCard(slug) : category === 'pe-comprehensive-management' ? old.resolvePeConsultingArticleEndCard() : null;
      const newMid = r['article-mid']?.card(slug) ?? null;
      assert.deepEqual(newMid, oldMid, `mid ${tag}`);
      // 記事末（ArticleFooter: 非キャリア × 対象カテゴリ）
      const oldEnd = !isCareerDoc && END_CATEGORIES.has(category) ? old.resolveDocsCareerSidebarAd(category, slug) : null;
      assert.equal(r['article-end']?.program ?? null, oldEnd ? PROGRAM_OF[oldEnd.trackLabel] : null, `end ${tag}`);
      if (oldEnd) {
        assert.deepEqual(r['article-end'].banner, oldEnd.creative, `end banner ${tag}`);
        assert.equal(r['article-end'].trackLabel, oldEnd.trackLabel.replace(/-sidebar$/, '-endbanner'), `end label ${tag}`);
      }
      // ピクセル（旧: 本文に転職広告があれば本文、無ければ記事末。案件は resolveDocsCareerSidebarAd）
      const oldPixel = old.resolveDocsCareerSidebarAd(category, slug).creative.pixelSrc;
      const rendered = ['article-mid', 'article-end'].filter((s) => r[s]);
      if (rendered.length) assert.equal(neu.pixelFor(r, rendered).pixelSrc, oldPixel, `pixel ${tag}`);
    }
    // 手書きの <CareerAffiliate program="gks">（旧: カテゴリに関係なく resolveCareerArticleEndCard）
    for (const category of INLINE_CATEGORIES) for (const slug of SLUGS) {
      const r = neu.resolvePlacements({ pageKind: 'doc', category }, now);
      assert.deepEqual(r['article-inline']?.card(slug), old.resolveCareerArticleEndCard(slug), `inline ${when} ${category} ${slug}`);
    }
  });
});

test('資格トップ: サイドバー・モバイルの案件とバナーが旧 resolveCategoryCareerAds と一致する', async () => {
  const old = await loadTsModule('src/config/affiliate-creatives.ts');
  const neu = await loadTsModule('src/lib/affiliate-placement.ts');
  for (const when of TIMES) at(when, (now) => {
    for (const category of CATEGORIES) {
      const oldAds = old.resolveCategoryCareerAds(category);
      const r = neu.resolvePlacements({ pageKind: 'category', category }, now);
      assert.ok(oldAds.length <= 1, `${category}: 9/8 以降の hub は 1 枠`);
      for (const slot of ['category-sidebar', 'category-mobile']) {
        assert.equal(r[slot]?.trackLabel ?? null, oldAds[0]?.trackLabel ?? null, `${when} ${category} ${slot}`);
        if (oldAds[0]) assert.deepEqual(r[slot].banner, oldAds[0].creative, `${when} ${category} ${slot} banner`);
      }
    }
  });
});
