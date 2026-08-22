import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(ROOT + rel, 'utf8');

test('note CTA は表示インプレッションと配置を計測する', () => {
  const provider = read('src/components/providers/AnalyticsProvider.tsx');
  assert.match(provider, /note_cta_impression/);
  assert.match(provider, /\[data-cta="note"\], \[data-cta="affiliate"\]/);

  const hero = read('src/components/ui/MagazineHeroCta/MagazineHeroCta.tsx');
  const inline = read('src/components/ui/MagazineInlineCard/MagazineInlineCard.tsx');
  const top = read('src/components/ui/MagazineTopBanner/MagazineTopBanner.tsx');
  for (const [name, source] of [['hero', hero], ['inline', inline], ['top', top]]) {
    assert.match(source, /data-cta-placement=/, `${name}: data-cta-placement がない`);
  }
});

test('1級書き方ガイドの終盤CTAは一意ラベルの小型カード1件', () => {
  const article = read('content/site/civil-construction-1/secondary-experience-writing-guide/article.mdx');
  const cards = [...article.matchAll(/<MagazineCard[^>]+>/g)].map((m) => m[0]);
  assert.equal(cards.length, 1);
  assert.match(cards[0], /id="civil-1-combo-essay"/);
  assert.match(cards[0], /utmContent="secondary-experience-guide-combo"/);
  assert.match(cards[0], /variant="inline"/);
  assert.match(cards[0], /placement="article-end"/);
});
