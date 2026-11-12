// 回遊カードの計測（DN-1040）: サムネイルのあるカードが写真か OGP かを data-thumb で持ち、面が data-cta="nav" を持つ。
// AnalyticsProvider がカード単位の表示（internal_nav_impression）と、クリックの placement（thumb-photo / thumb-ogp）を送る。
// 面を足したのにどちらかを付け忘れると、写真と OGP のクリック率を比べられなくなるので、ソースで止める。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const read = (rel) => readFileSync(join(REPO_ROOT, rel), 'utf8');

const SURFACES = [
  { file: 'src/components/ui/RelatedArticles/RelatedArticles.tsx', label: 'trackNav="related-articles"' },
  { file: 'src/components/ui/MidArticleCta/MidArticleCta.tsx', label: 'data-cta-label="article-mid-related"' },
  { file: 'src/components/category/CategorySections.tsx', label: 'data-cta-label="category-rows"' },
  { file: 'src/components/category/CurriculumSections.tsx', label: 'data-cta-label="curriculum-thumbs"' },
  { file: 'src/components/home/LatestArticles.tsx', label: 'data-cta-label="home-latest"' },
  { file: 'src/components/search/SearchResults.tsx', label: 'data-cta-label="search-results"' },
];
const CARDS = [
  'src/components/ui/RelatedArticles/RelatedArticleCard.tsx',
  'src/components/category/CategorySections.tsx',
  'src/components/home/LatestArticles.tsx',
  'src/components/search/SearchResults.tsx',
];

test('サムネイルを出す面は data-cta="nav" とラベルを持つ', () => {
  for (const { file, label } of SURFACES) assert.ok(read(file).includes(label), `${file} に ${label} が無い`);
});

test('サムネイルのカードは写真か OGP かを data-thumb で持つ', () => {
  for (const file of CARDS) assert.match(read(file), /data-thumb=\{/, `${file} に data-thumb が無い`);
});

test('AnalyticsProvider はカードの表示と、クリックの thumb の placement を送る', () => {
  const src = read('src/components/providers/AnalyticsProvider.tsx');
  assert.ok(src.includes('"internal_nav_impression"'), '表示のイベントが無い');
  assert.ok(src.includes(`'[data-cta="nav"] a[data-thumb]'`), 'カードの監視が無い');
  assert.ok(src.includes('thumb-${anchor.dataset.thumb}'), 'クリックの placement が無い');
});
