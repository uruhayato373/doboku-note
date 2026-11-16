// 記事末の回遊（次のステップ・この記事のテーマ・前後の記事）にサムネイルを付ける（DN-1218 段 2）。
// 各リンクが data-thumb を持ち、面の data-cta="nav"・data-cta-label は変わらず、画像は lazy・幅高さつき。
import process from 'node:process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { buildSync } from 'esbuild';
import { parse } from 'node-html-parser';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

function render(source) {
  mkdirSync(join(REPO_ROOT, '.tmp'), { recursive: true });
  const dir = mkdtempSync(join(REPO_ROOT, '.tmp/end-thumb-'));
  try {
    const outfile = join(dir, 'test.cjs');
    buildSync({ stdin: { contents: source, resolveDir: REPO_ROOT, loader: 'tsx' }, outfile, bundle: true, platform: 'node', format: 'cjs', packages: 'external', logLevel: 'silent' });
    return execFileSync(process.execPath, [outfile], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const HEAD = `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server';`;
const doc = (slug, category, group) => `{slug:'${slug}',category:'${category}',group:'${group}',title:'題 ${slug}',published:true}`;

function checkImages(root) {
  const images = root.querySelectorAll('a[data-thumb] img');
  assert.ok(images.length > 0, '画像が 0 枚');
  for (const image of images) {
    assert.equal(image.getAttribute('loading'), 'lazy');
    assert.ok(Number(image.getAttribute('width')) > 0 && Number(image.getAttribute('height')) > 0);
  }
}

test('次のステップ: 代表の記事がある行はサムネイルつき・無い行は文字のまま・面のラベルは next-step', () => {
  const html = render(`${HEAD} import NextStepNav from './src/components/ui/NextStepNav/NextStepNav';
    const docs=[${doc('civil-construction-1-primary-r05-a', 'civil-construction-1', 'primary')},${doc('civil-construction-1-textbook-soil', 'civil-construction-1', 'textbook')}];
    process.stdout.write(renderToStaticMarkup(<NextStepNav category="civil-construction-1" docs={docs} currentSlug="civil-construction-1-guide-x"/>));`);
  const dom = parse(html);
  const surface = dom.querySelector('[data-cta="nav"]');
  assert.equal(surface.getAttribute('data-cta-label'), 'next-step');
  const links = surface.querySelectorAll('a');
  assert.equal(links.length, 3);
  assert.deepEqual(links.map(a => a.hasAttribute('data-thumb')), [true, true, false]);
  assert.ok(links.every(a => a.getAttribute('href').includes('#sec-')));
  checkImages(surface);
});

test('次のステップ: 現在の記事は代表にならず、記事が無ければ全行文字のまま', () => {
  const html = render(`${HEAD} import NextStepNav from './src/components/ui/NextStepNav/NextStepNav';
    const docs=[${doc('civil-construction-1-primary-r05-a', 'civil-construction-1', 'primary')}];
    process.stdout.write(renderToStaticMarkup(<NextStepNav category="civil-construction-1" docs={docs} currentSlug="civil-construction-1-primary-r05-a"/>)+'|||'+renderToStaticMarkup(<NextStepNav category="civil-construction-1"/>));`);
  for (const part of html.split('|||')) {
    const dom = parse(part);
    assert.equal(dom.querySelectorAll('a[data-thumb]').length, 0);
    assert.equal(dom.querySelectorAll('a').length, 3);
  }
});

test('次のステップ: 過去問の代表は一覧の並びでなく最新の年度', () => {
  const html = render(`${HEAD} import NextStepNav from './src/components/ui/NextStepNav/NextStepNav';
    const docs=[${doc('civil-construction-1-primary-h18-a', 'civil-construction-1', 'primary')},${doc('civil-construction-1-primary-r08-a', 'civil-construction-1', 'primary')},${doc('civil-construction-1-primary-r05-a', 'civil-construction-1', 'primary')}];
    process.stdout.write(renderToStaticMarkup(<NextStepNav category="civil-construction-1" docs={docs} currentSlug="civil-construction-1-guide-x"/>));`);
  const first = parse(html).querySelector('a[data-thumb] img');
  assert.match(first.getAttribute('src'), /primary-r08-a/);
});

test('この記事のテーマ: テーマへのリンクは文字・記事のリンクはサムネイルつきで、リンクのラベルを保つ', () => {
  const html = render(`${HEAD} import TopicHubLinks from './src/components/ui/TopicHubLinks/TopicHubLinks';
    const pick=(slug,category)=>({slug,category,href:'/practice/'+slug+'/',title:'題 '+slug,categoryLabel:'土木実務'});
    const links=[{topic:{slug:'earthwork',label:'土工'},total:5,picks:[pick('civil-practice-a','civil-practice'),pick('civil-construction-1-b','civil-construction-1')]}];
    process.stdout.write(renderToStaticMarkup(<TopicHubLinks links={links}/>));`);
  const dom = parse(html);
  const surface = dom.querySelector('[data-cta="nav"]');
  assert.equal(surface.getAttribute('data-cta-label'), 'topic-hub');
  const hub = surface.querySelectorAll('a[data-cta-label="topic-hub:hub"]');
  assert.equal(hub.length, 1);
  assert.equal(hub[0].hasAttribute('data-thumb'), false);
  const articles = surface.querySelectorAll('a[data-cta-label="topic-hub:article"]');
  assert.equal(articles.length, 2);
  assert.ok(articles.every(a => ['photo', 'ogp'].includes(a.getAttribute('data-thumb'))));
  checkImages(surface);
});

test('前後ナビ: image を渡すと左右 2 枚のサムネイルカード・渡さなければ文字のまま（教科書の章・過去問の年度）', () => {
  const html = render(`${HEAD} import PrevNextNav from './src/components/ui/TextbookNav/PrevNextNav';
    const image={src:'https://storage.doboku-note.com/posts/x/ogp.png',band:null};
    const props={heading:'見出し',track:'series-nav',prevLabel:'前の記事',nextLabel:'次に読む'};
    process.stdout.write(renderToStaticMarkup(<PrevNextNav {...props} prev={{slug:'a',title:'前',image}} next={{slug:'b',title:'次',image}}/>)+'|||'+renderToStaticMarkup(<PrevNextNav {...props} track="textbook-nav" prev={{slug:'a',title:'前'}} next={null}/>));`);
  const [withThumb, textOnly] = html.split('|||').map(parse);
  const surface = withThumb.querySelector('[data-cta="nav"]');
  assert.equal(surface.getAttribute('data-cta-label'), 'series-nav');
  assert.equal(surface.querySelectorAll('a[data-thumb="ogp"]').length, 2);
  assert.ok(surface.text.includes('← 前の記事') && surface.text.includes('次に読む →'));
  checkImages(surface);
  assert.equal(textOnly.querySelectorAll('a').length, 1);
  assert.equal(textOnly.querySelectorAll('[data-thumb]').length, 0);
  assert.equal(textOnly.querySelector('[data-cta="nav"]').getAttribute('data-cta-label'), 'textbook-nav');
});

test('関連テキスト: 順位づけは lib（relatedTextbooks）と同じ並びで描画する', () => {
  const out = JSON.parse(render(`${HEAD} import RelatedTextbooks from './src/components/ui/RelatedTextbooks/RelatedTextbooks';
    import { relatedTextbooks, relatedTextbookSlugs } from './src/lib/related-textbooks';
    import index from './src/config/civil-exam-textbook-index.json';
    const short=Object.keys((index as any).questionToTextbooks)[0]!;
    const current:any={slug:'civil-construction-1-'+short,category:'civil-construction-1',title:'現在',published:true};
    const rows=relatedTextbooks(current,[]);
    const html=renderToStaticMarkup(<RelatedTextbooks currentMeta={current} categoryArticles={[]}/>);
    process.stdout.write(JSON.stringify({rows,slugs:relatedTextbookSlugs(current,[]),html}));`));
  assert.ok(out.rows.length > 0 && out.rows.length <= 6, '教材インデックスの経路が 0 件');
  assert.deepEqual(out.slugs, out.rows.map(row => row.slug));
  const links = parse(out.html).querySelectorAll('a');
  assert.equal(links.length, out.rows.length);
  assert.deepEqual(links.map(a => a.querySelector('span.font-semibold').text.trim()), out.rows.map(row => row.title));
});

test('続きの記事: 前後の記事（category-curriculum の並び）が左右 2 枚のサムネイルカードになる', () => {
  const html = render(`${HEAD} import NextInSeries from './src/components/ui/NextInSeries/NextInSeries';
    import curriculum from './src/config/category-curriculum.json';
    const slugs=(curriculum as any)['civil-practice'].fields.blocks.flatMap((b:any)=>b.slugs.map((s:string)=>'civil-practice-'+s)).slice(0,3);
    const docs=slugs.map((slug:string)=>({slug,category:'civil-practice',group:'guide',title:'題 '+slug,published:true}));
    process.stdout.write(renderToStaticMarkup(<NextInSeries category="civil-practice" currentSlug={slugs[1]} categoryArticles={docs}/>));`);
  const surface = parse(html).querySelector('[data-cta="nav"]');
  assert.equal(surface.getAttribute('data-cta-label'), 'series-nav');
  assert.equal(surface.querySelectorAll('a[data-thumb]').length, 2);
  checkImages(surface);
});
