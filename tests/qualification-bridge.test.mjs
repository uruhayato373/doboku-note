import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 実務記事・共通仕様書の章末「業務経験 → 資格」カード（EXP-012）の計測配線を固定する。
// どれか 1 つでも欠けると、表示されているのにクリック／表示回数が週次の取得に乗らない。
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(ROOT + rel, 'utf8');

test('AnalyticsProvider がクリックと表示回数を送る', () => {
  const provider = read('src/components/providers/AnalyticsProvider.tsx');
  assert.match(provider, /"qualification-bridge": "qualification_bridge_click"/);
  assert.match(provider, /qualification_bridge_impression/);
  assert.match(provider, /\[data-cta="qualification-bridge"\]/);
  // root に面ラベル（card）、リンクに立場ラベルを持つため、リンク側の label を優先する。
  assert.match(provider, /label: anchor\.dataset\.ctaLabel \|\| el\.dataset\.ctaLabel/);
});

test('カードは root に data-cta・各リンクに立場ラベルを持つ', () => {
  const card = read('src/components/ui/QualificationBridge/QualificationBridge.tsx');
  assert.match(card, /data-cta="qualification-bridge"/);
  assert.match(card, /data-cta-placement=\{placement\}/);
  assert.match(card, /data-cta-label=\{option\.key\}/);
});

test('立場 key は GA4 ラベルとして固定（変えると過去データと連続しない）', () => {
  const config = read('src/config/qualification-bridge.ts');
  const keys = [...config.matchAll(/key: '([a-z-]+)'/g)].map((m) => m[1]);
  assert.deepEqual(keys, ['orderer', 'contractor', 'qualification-map']);
  for (const slug of [
    'civil-construction-1-public-servant-merit',
    'civil-construction-1-guide-exam-overview',
    'pe-comprehensive-management-public-engineer-qualification-map',
  ]) {
    assert.ok(config.includes(`slug: '${slug}'`), `${slug} が遷移先にない`);
    const [category, ...rest] = slug.startsWith('pe-comprehensive-management-')
      ? ['pe-comprehensive-management', slug.slice('pe-comprehensive-management-'.length)]
      : ['civil-construction-1', slug.slice('civil-construction-1-'.length)];
    const fm = read(`content/site/${category}/${rest.join('-')}/article.mdx`);
    assert.match(fm, /^published: true$/m, `${slug} が非公開`);
  }
});

test('実務記事の記事末と共通仕様書の章末に置かれている', () => {
  const footer = read('src/components/ui/ArticleFooter/ArticleFooter.tsx');
  assert.match(footer, /shouldShowQualificationBridge\(category, slugStr\)/);
  assert.match(footer, /placement="practice-footer"/);
  const chapter = read('src/app/standards/[agency]/[document]/chapters/[chapter]/page.tsx');
  assert.match(chapter, /placement="standards-chapter-footer"/);
});

test('週次の GA4 取得（growth-pack・CTA クリック）にイベントが登録されている', () => {
  const growth = JSON.parse(read('.claude/config/growth-cycle.json'));
  assert.ok(growth.events.includes('qualification_bridge_click'));
  assert.ok(growth.events.includes('qualification_bridge_impression'));
  const fetcher = read('.claude/scripts/fetch-ga4-cta-clicks.mjs');
  assert.match(fetcher, /"qualification_bridge_click"/);
  assert.match(fetcher, /"qualification_bridge_impression"/);
});
