import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const inspect = code => JSON.parse(execFileSync(process.execPath,
  [ROOT + 'node_modules/tsx/dist/cli.mjs', '-e', code], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8_000_000 }));

test('採用画像の実体・公開URL・目視記録が一致する', t => {
  const shared = JSON.parse(readFileSync(ROOT + 'content/site/_shared/pop-image.json', 'utf8'));
  const pe1 = JSON.parse(readFileSync(ROOT + 'content/site/pe-first-stage/_shared/pop-image.json', 'utf8'));
  const variants = [...Object.values(shared.families).flatMap(f => [f.body, f.tile].filter(Boolean)),
    ...Object.values(shared.tiles), pe1.variants.body, pe1.variants.tile];
  assert.ok(variants.length > 0, '採用画像の検査対象が空');
  for (const variant of variants) {
    const bytes = readFileSync(ROOT + variant.output.path);
    const sha = createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha, variant.output.sha256, variant.output.path);
    assert.equal(bytes.length, variant.output.bytes);
    assert.ok(bytes.length <= 150 * 1024, `${variant.output.path}: 150KiB超過`);
    assert.equal(new URL(variant.output.url).searchParams.get('v'), sha.slice(0, 12));
    assert.ok(variant.review?.date && variant.review?.result, `${variant.output.path}: 目視記録欠落`);
  }
  t.diagnostic(`採用画像 ${variants.length}枚の実体SHA・容量・URL・目視記録を検査`);
});

test('公開商品を資格・試験区分・形式で分類し、全商品に配置別の完成画像がある', t => {
  const results = inspect(`
    import {NOTE_MAGAZINES} from './src/lib/note-magazines.ts';
    import {classifyNoteProduct} from './src/lib/note-product-classification.ts';
    import {noteCtaImage} from './src/lib/note-cta-images.ts';
    const products=Object.values(NOTE_MAGAZINES).filter(p=>p.published&&p.noteUrl);
    process.stdout.write(JSON.stringify(products.map(p=>({id:p.id,title:p.title,
      classification:classifyNoteProduct(p.id),body:noteCtaImage(p.id),tile:noteCtaImage(p.id,'tile')}))));
  `);
  assert.ok(results.length > 0, '公開商品の検査対象が空');
  t.diagnostic(`公開商品 ${results.length}件 / 本文・タイル ${results.length * 2}配置を検査`);
  for (const r of results) {
    assert.ok(r.classification?.cells.length, `${r.id}: 未分類`);
    for (const format of ['body', 'tile']) {
      const image = r[format];
      assert.ok(image, `${r.id}/${format}: 画像欠落`);
      assert.ok(Math.abs(image.width/image.height - (format==='body'?2:6/5)) < 0.001, `${r.id}: 比率`);
      assert.match(image.src, /^https:\/\/storage\.doboku-note\.com\/posts\/.+\?v=[a-f0-9]+$/);
      assert.equal(image.caption.title, r.title, `${r.id}: 共用画像でも個別商品名のメタデータを保持`);
    }
  }
});

test('一次PDFの自動配線は収録年度・科目を守り、careerと季節の個別配線を優先する', t => {
  const result = inspect(`
    import {matchNoteProductPage} from './src/lib/note-product-classification.ts';
    import {resolvePlacement} from './src/lib/magazine-placement.ts';
    const covered=Array.from({length:7},(_,i)=>['basic','aptitude','construction'].map(s=>'pe-first-stage-r0'+(i+1)+'-'+s)).flat();
    const outside=['pe-first-stage-r08-basic','pe-first-stage-r01-retry-basic','pe-first-stage-h30-basic','pe-first-stage-r07-water-supply'];
    process.stdout.write(JSON.stringify({covered:covered.map(s=>({s,id:matchNoteProductPage(s),top:resolvePlacement(s,'primary').top?.magazineId})),
      outside:outside.map(s=>({s,id:matchNoteProductPage(s),top:resolvePlacement(s,'primary').top?.magazineId??null})),
      career:resolvePlacement(covered[0],'primary',true), guide:resolvePlacement('pe-first-stage-guide-basic-subject','guide').top?.magazineId}));
  `);
  assert.equal(result.covered.length, 21);
  t.diagnostic(`収録21ページ・範囲外4ページ・career/科目ガイド2条件を検査`);
  for (const p of result.covered) { assert.equal(p.id, 'pe1-takuitsu-pdf'); assert.equal(p.top, p.id); }
  for (const p of result.outside) { assert.equal(p.id, null, p.s); assert.equal(p.top, null, p.s); }
  assert.deepEqual(result.career, { inline: [] });
  assert.equal(result.guide, 'pe1-anki-note');
});

test('一次過去問21記事の中間・末尾カードは解説折りたたみの外に各1枚', t => {
  let checked=0;
  for (let year=1;year<=7;year++) for (const subject of ['basic','aptitude','construction']) {
    const path=`content/site/pe-first-stage/r0${year}-${subject}/article.mdx`;
    const raw=readFileSync(ROOT+path,'utf8');
    for (const placement of ['article-mid','article-end']) {
      const cards=[...raw.matchAll(new RegExp('<MagazineCard[^>]*placement="'+placement+'"[^>]*>','g'))];
      assert.equal(cards.length,1,`${path}/${placement}`);
      const before=raw.slice(0,cards[0].index);
      assert.equal((before.match(/<details[\s>]/g)??[]).length,(before.match(/<\/details>/g)??[]).length,`${path}: details内にCTA`);
    }
    checked++;
  }
  t.diagnostic(`21記事 / 42枚の中間・末尾カードを検査（折りたたみ外）`);
  assert.equal(checked,21);
});
