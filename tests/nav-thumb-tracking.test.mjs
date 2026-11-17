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
// 画像つきの部品は ArticleCard（上に画像）と ArticleThumbRow（左に画像）の 2 実装だけ（2026-11-17 にトップの新着・検索結果も寄せた）
const CARDS = [
  'src/components/ui/ArticleCard/ArticleCard.tsx',
  'src/components/ui/RelatedArticles/ArticleThumbRow.tsx',
];

test('サムネイルを出す面は data-cta="nav" とラベルを持つ', () => {
  for (const { file, label } of SURFACES) assert.ok(read(file).includes(label), `${file} に ${label} が無い`);
});

test('サムネイルのカードは写真か OGP かを data-thumb で持つ', () => {
  for (const file of CARDS) assert.match(read(file), /data-thumb/, `${file} に data-thumb が無い`);
});

test('資格トップ・右の欄のサムネイルの行は ArticleThumbRow を使う（data-thumb を自前で書かない）', () => {
  assert.match(read('src/components/category/CategorySections.tsx'), /<ArticleThumbRow[\s\S]*variant="feed"/);
  assert.match(read('src/components/ui/RelatedArticles/RailArticleList.tsx'), /<ArticleThumbRow variant="rail"/);
  for (const file of ['src/components/home/LatestArticles.tsx', 'src/components/search/SearchResults.tsx']) {
    assert.match(read(file), /<ArticleThumbRow[\s\S]*variant="feed"[\s\S]*framed/, `${file} が ArticleThumbRow の feed 型を使っていない`);
  }
});

test('AnalyticsProvider はカードの表示と、クリックの thumb の placement を送る', () => {
  const src = read('src/components/providers/AnalyticsProvider.tsx');
  assert.ok(src.includes('"internal_nav_impression"'), '表示のイベントが無い');
  assert.ok(src.includes(`'[data-cta="nav"] a[data-thumb]'`), 'カードの監視が無い');
  assert.ok(src.includes('thumb-${anchor.dataset.thumb}'), 'クリックの placement が無い');
});

test('文字の面は50%で1回、サムネイル面はカードだけを数え、遅延追加でも面を重ねない', async () => {
  const { transformSync } = await import('esbuild');
  const { runInNewContext } = await import('node:vm');
  const src = read('src/components/providers/AnalyticsProvider.tsx');
  const block = src.slice(src.indexOf('    const navSent ='), src.indexOf('    const mutationObserver ='));
  const observers = [];
  const events = [];
  class Observer {
    targets = [];
    constructor(callback, options) { this.callback=callback; assert.equal(options.threshold,0.5); observers.push(this); }
    observe(target) { this.targets.push(target); }
    unobserve(target) { this.targets=this.targets.filter(t=>t!==target); }
  }
  const surface = label => ({dataset:{ctaLabel:label},thumb:null,matches:()=>true,querySelector(){return this.thumb;},closest(){return this;}});
  const text = surface('category-nav');
  const thumbs = surface('rail-related');
  const delayed = surface('article-toc');
  const card = {dataset:{thumb:'photo'},matches:()=>false,closest:()=>thumbs};
  thumbs.thumb=card;
  const document = {querySelectorAll:selector=>selector.includes('a[data-thumb]')?[card]:[text,thumbs,delayed]};
  runInNewContext(transformSync(block,{loader:'ts'}).code,{IntersectionObserver:Observer,WeakSet,document,observed:new WeakSet(),observeRevenueCtas:()=>{},gtag:{event:event=>events.push(event)}});
  const observer=observers[0];
  assert.deepEqual(observer.targets,[card,text,delayed]);
  const intersect=(target,ratio)=>observer.callback([{target,isIntersecting:true,intersectionRatio:ratio}]);
  intersect(text,0.49); assert.equal(events.length,0);
  intersect(text,0.5); intersect(text,0.8);
  intersect(card,0.5); intersect(card,0.9);
  delayed.thumb=card;
  intersect(delayed,0.5);
  assert.deepEqual(events.map(e=>[e.action,e.label,e.params.cta_placement]),[
    ['internal_nav_impression','category-nav','text'],
    ['internal_nav_impression','rail-related','thumb-photo'],
  ]);
  assert.ok(!observer.targets.includes(text) && !observer.targets.includes(card));
});
