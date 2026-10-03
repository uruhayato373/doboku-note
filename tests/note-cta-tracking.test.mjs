import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(ROOT + rel, 'utf8');

test('単品の精読ガイド5枚も分類画像を使い、個別のURL・商品名・価格・計測を保つ', () => {
  const rows = JSON.parse(execFileSync(process.execPath, [ROOT + 'node_modules/tsx/dist/cli.mjs', '-e', `
    import React from 'react';
    import {renderToStaticMarkup} from 'react-dom/server';
    import {readFileSync} from 'node:fs';
    import NoteLink from './src/components/ui/NoteLink/NoteLink.tsx';
    globalThis.React=React;
    const names=['economic-management','human-resource-management','information-management','safety-management','social-environment-management'];
    const rows=names.map(name=>{
      const raw=readFileSync('content/site/pe-comprehensive-management/'+name+'-pillar/article.mdx','utf8');
      const block=raw.match(/<NoteLink\\b[\\s\\S]*?kind="product"[\\s\\S]*?\\/>/)?.[0];
      if(!block)throw Error(name+': product card missing');
      const props=Object.fromEntries([...block.matchAll(/([a-zA-Z]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
      return {...props,html:renderToStaticMarkup(React.createElement(NoteLink,props))};
    });process.stdout.write(JSON.stringify(rows));
  `], {cwd:ROOT,encoding:'utf8'}));
  assert.equal(rows.length, 5);
  for (const row of rows) {
    assert.equal(row.imageFamily, 'pe-comprehensive-management-reading');
    assert.match(row.html, /cta-reading-body-v1\.webp/);
    assert.ok(row.html.includes(row.url.split('?')[0]));
    assert.ok(row.html.includes(row.title));
    assert.ok(row.html.includes(row.price));
    assert.match(row.html, /data-cta="note"/);
    assert.match(row.html, /data-cta-placement="article-body"/);
  }
});

test('note CTA は表示インプレッションと配置を計測する', () => {
  const provider = read('src/components/providers/AnalyticsProvider.tsx');
  assert.match(provider, /note_cta_impression/);
  assert.match(provider, /\[data-cta="note"\], \[data-cta="affiliate"\]/);
  // ココナラ CTA も表示回数を送る（クリック率の分母）
  assert.match(provider, /coconala_cta_impression/);
  assert.match(provider, /\[data-cta="affiliate"\], \[data-cta="coconala"\]/);

  const html = JSON.parse(execFileSync(process.execPath, [ROOT + 'node_modules/tsx/dist/cli.mjs', '-e', `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import Hero from './src/components/ui/MagazineHeroCta/MagazineHeroCta.tsx';
    import Inline from './src/components/ui/MagazineInlineCard/MagazineInlineCard.tsx';
    import Top from './src/components/ui/MagazineTopBanner/MagazineTopBanner.tsx';
    globalThis.React = React;
    const cases = [
      [Hero, { id: 'pe1-takuitsu-pdf', utmContent: 'tracking-test', placement: 'article-mid' }],
      [Inline, { magazineId: 'pe1-takuitsu-pdf', url: 'https://note.com/example', title: 'PDF', description: '復習', badge: '教材', trackLabel: 'tracking-test', placement: 'article-end' }],
      [Top, { magazineId: 'pe1-takuitsu-pdf', url: 'https://note.com/example', title: 'PDF', badge: '教材', trackLabel: 'tracking-test' }],
    ];
    process.stdout.write(JSON.stringify(cases.map(([C, props]) => renderToStaticMarkup(React.createElement(C, props)))));
  `], { cwd: ROOT, encoding: 'utf8' }));
  assert.equal(html.length, 3);
  for (const [index, source] of html.entries()) {
    assert.match(source, /data-cta="note"/);
    assert.match(source, /data-cta-label="pe1-takuitsu-pdf:tracking-test"/);
    assert.ok(source.includes(`data-cta-placement="${['article-mid', 'article-end', 'article-top'][index]}"`));
    assert.match(source, /href="https:\/\/note.com\//);
    assert.match(source, /cta-pdf-body\.webp/);
    assert.match(source, /全560問/);
  }
});

test('一次PDFは本文2:1・サイドバー6:5の生成画像をR2から表示する', () => {
  const result = JSON.parse(execFileSync(process.execPath, [ROOT + 'node_modules/tsx/dist/cli.mjs', '-e', `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { getMagazine } from './src/lib/note-magazines.ts';
    import { noteCtaImage } from './src/lib/note-cta-images.ts';
    import Card from './src/components/ui/NoteProductCard.tsx';
    globalThis.React = React;
    const product = getMagazine('pe1-takuitsu-pdf');
    process.stdout.write(JSON.stringify({
      body: noteCtaImage(product.id), tile: noteCtaImage(product.id, 'tile'),
      unrelated: noteCtaImage('unknown-product') ?? null,
      html: renderToStaticMarkup(React.createElement(Card, {product, category:'pe-first-stage', placement:'article-sidebar'})),
    }));
  `], { cwd: ROOT, encoding: 'utf8' }));
  assert.equal(result.body.width / result.body.height, 2);
  assert.equal(result.tile.width / result.tile.height, 6/5);
  assert.match(result.body.src, /^https:\/\/storage\.doboku-note\.com\/posts\//);
  assert.match(result.tile.src, /cta-pdf-sidebar-v2\.webp\?v=[a-f0-9]+$/);
  assert.equal(result.unrelated, null);
  assert.match(result.html, /cta-pdf-sidebar-v2\.webp/);
  assert.match(result.html, /data-cta-label="pe1-takuitsu-pdf"/);
  assert.match(result.html, /data-cta-placement="article-sidebar"/);
  assert.match(result.html, /全560問/);
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
