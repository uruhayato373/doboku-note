// DN-0241: JSON-LD の @type 別 必須/推奨キー検査（scripts/lib/jsonld-required-props.mjs）と、
// それを組み込んだ check-seo-build の終了コード。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { validateJsonLd, collectJsonLdNodes } from '../scripts/lib/jsonld-required-props.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const article = () => ({
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'テスト記事',
  datePublished: '2026-09-01',
  dateModified: '2026-09-10',
  author: { '@type': 'Person', name: '運営者' },
  image: 'https://doboku-note.com/og.png',
});
const breadcrumb = () => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://doboku-note.com' },
    { '@type': 'ListItem', position: 2, name: '1級土木', item: 'https://doboku-note.com/exam/civil-construction-1' },
    // 最後の要素は item 省略可（Google: 無ければ当該ページの URL）
    { '@type': 'ListItem', position: 3, name: 'テスト記事' },
  ],
});
const faq = () => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Q1', acceptedAnswer: { '@type': 'Answer', text: 'A1' } },
    { '@type': 'Question', name: 'Q2', acceptedAnswer: { '@type': 'Answer', text: 'A2' } },
  ],
});
const website = () => ({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'doboku-note', url: 'https://doboku-note.com' });

test('正常な Article/BreadcrumbList/FAQPage/WebSite は error も warn も出さない', () => {
  for (const obj of [article(), breadcrumb(), faq(), website()]) {
    const r = validateJsonLd(obj);
    assert.equal(r.validated, 1, JSON.stringify(obj['@type']));
    assert.deepEqual(r.errors, [], JSON.stringify(r.errors));
    assert.deepEqual(r.warnings, [], JSON.stringify(r.warnings));
  }
});

test('headline を消した Article は推奨キー欠落 warn（Google は Article に必須欄を定めていない）', () => {
  const a = article();
  delete a.headline;
  const r = validateJsonLd(a);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, [{ type: 'TechArticle', missing: ['headline'] }]);
});

test('空文字の headline も欠落扱い', () => {
  const r = validateJsonLd({ ...article(), headline: '  ' });
  assert.deepEqual(r.warnings, [{ type: 'TechArticle', missing: ['headline'] }]);
});

test('FAQPage: Question.name / acceptedAnswer.text / mainEntity の欠落は error', () => {
  const noName = faq();
  delete noName.mainEntity[1].name;
  assert.deepEqual(validateJsonLd(noName).errors, [{ type: 'FAQPage', missing: ['mainEntity[1].name'] }]);

  const noText = faq();
  noText.mainEntity[0].acceptedAnswer.text = '';
  assert.deepEqual(validateJsonLd(noText).errors, [{ type: 'FAQPage', missing: ['mainEntity[0].acceptedAnswer.text'] }]);

  const noAnswer = faq();
  delete noAnswer.mainEntity[0].acceptedAnswer;
  assert.deepEqual(validateJsonLd(noAnswer).errors, [{ type: 'FAQPage', missing: ['mainEntity[0].acceptedAnswer'] }]);

  const empty = { '@type': 'FAQPage', mainEntity: [] };
  assert.deepEqual(validateJsonLd(empty).errors, [{ type: 'FAQPage', missing: ['mainEntity'] }]);
});

test('BreadcrumbList: 途中要素の item・各要素の position/name 欠落は error、最後の item 省略は可', () => {
  const midNoItem = breadcrumb();
  delete midNoItem.itemListElement[1].item;
  assert.deepEqual(validateJsonLd(midNoItem).errors, [{ type: 'BreadcrumbList', missing: ['itemListElement[1].item'] }]);

  const noPos = breadcrumb();
  delete noPos.itemListElement[0].position;
  delete noPos.itemListElement[2].name;
  assert.deepEqual(validateJsonLd(noPos).errors, [
    { type: 'BreadcrumbList', missing: ['itemListElement[0].position', 'itemListElement[2].name'] },
  ]);

  const single = { '@type': 'BreadcrumbList', itemListElement: [{ position: 1, name: 'ホーム' }] };
  assert.equal(validateJsonLd(single).errors.length, 1);
  assert.match(validateJsonLd(single).errors[0].missing[0], /2 件未満/);
});

test('Dataset: name/description 必須・description は 50〜5000 字・distribution.contentUrl 必須', () => {
  const ok = {
    '@type': ['DigitalDocument', 'Dataset'],
    name: 'データ',
    description: 'あ'.repeat(50),
    creator: { '@id': 'x' },
    license: 'https://example.com/l',
    url: 'https://doboku-note.com/standards/data',
    distribution: [{ '@type': 'DataDownload', contentUrl: 'https://doboku-note.com/a.json' }],
  };
  const r = validateJsonLd(ok);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.validatedTypes, ['Dataset']);

  const short = { ...ok, description: 'あ'.repeat(49), distribution: { '@type': 'DataDownload' } };
  const missing = validateJsonLd(short).errors[0].missing;
  assert.equal(missing.length, 2);
  assert.match(missing[0], /^description（49 字/);
  assert.equal(missing[1], 'distribution[0].contentUrl');
});

test('@graph と配列を平坦化し、表に無い @type は対象外として数えるだけ', () => {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: 'doboku-note' },
      { '@type': 'WebPage', name: 'p' },
      breadcrumb(),
      { ...article(), headline: undefined },
    ],
  };
  assert.equal(collectJsonLdNodes(graph).length, 4);
  const r = validateJsonLd(graph);
  assert.equal(r.nodes, 4);
  assert.equal(r.validated, 2);
  assert.deepEqual(r.outOfScopeTypes, ['Organization', 'WebPage']);
  assert.deepEqual(r.errors, []);
  assert.equal(r.warnings.length, 1);

  const arr = validateJsonLd([website(), { '@type': 'Quiz', name: 'q' }, { name: 'no type' }]);
  assert.equal(arr.validated, 1);
  assert.deepEqual(arr.outOfScopeTypes, ['Quiz', '(none)']);
});

// ---- check-seo-build の終了コード（build 済み out/ を模した最小ディレクトリ） ----

function pageHtml(jsonLdObjects) {
  const ld = jsonLdObjects
    .map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`)
    .join('\n');
  return `<!doctype html><html lang="ja"><head>
<title>テスト｜doboku-note</title>
<meta name="description" content="check-seo-build の JSON-LD 必須キー検査を確かめるためのテスト用ページの説明文です。">
<link rel="canonical" href="https://doboku-note.com"/>
<meta property="og:url" content="https://doboku-note.com"/>
${ld}
</head><body><main><h1>テスト記事</h1>
<p>${'土木施工管理技士と技術士の試験対策に関する本文。'.repeat(12)}</p>
</main></body></html>`;
}

function runScanner(jsonLdObjects) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-build-jsonld-'));
  try {
    fs.writeFileSync(path.join(dir, 'index.html'), pageHtml(jsonLdObjects));
    fs.writeFileSync(
      path.join(dir, 'sitemap.xml'),
      '<?xml version="1.0"?><urlset><url><loc>https://doboku-note.com/</loc></url></urlset>',
    );
    const res = spawnSync(process.execPath, ['scripts/check-seo-build.mjs', '--ci', '--out', dir], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    return { status: res.status, out: `${res.stdout}\n${res.stderr}` };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('check-seo-build: 必須キーが揃ったページは exit 0 で判定件数を出す', () => {
  const r = runScanner([website(), article(), breadcrumb(), faq()]);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /\[JSON-LD 必須キー\] 1 ページ・4 ブロック.*判定 4 ノード.*必須欠落 0 件/);
});

test('check-seo-build: headline を消した Article は warn のみで exit 0（Google 上は推奨欄）', () => {
  const a = article();
  delete a.headline;
  const r = runScanner([website(), a]);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /jsonld_recommended_missing: 1/);
});

test('check-seo-build: FAQPage の acceptedAnswer.text 欠落は exit 1（赤）', () => {
  const f = faq();
  delete f.mainEntity[0].acceptedAnswer.text;
  const r = runScanner([website(), article(), f]);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /\[jsonld_required_missing\] \/ — FAQPage: 必須キー欠落 mainEntity\[0\]\.acceptedAnswer\.text/);
});

test('check-seo-build: BreadcrumbList 途中要素の item 欠落は exit 1（赤）', () => {
  const b = breadcrumb();
  delete b.itemListElement[0].item;
  const r = runScanner([website(), b]);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /BreadcrumbList: 必須キー欠落 itemListElement\[0\]\.item/);
});

test('check-seo-build: 判定対象 @type が 1 ノードも無ければ検査不成立として exit 1', () => {
  const r = runScanner([{ '@context': 'https://schema.org', '@type': 'Organization', name: 'doboku-note' }]);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /jsonld_required_not_inspected/);
});
