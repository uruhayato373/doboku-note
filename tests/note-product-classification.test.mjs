import { test } from 'node:test';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import process from 'node:process';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const inspect = code => JSON.parse(execFileSync(process.execPath,
  [join(ROOT, 'node_modules/tsx/dist/cli.mjs'), '-e', code], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8_000_000 }));

test('採用画像の実体・公開URL・目視記録が一致する', t => {
  const shared = JSON.parse(readFileSync(join(ROOT, 'content/site/_shared/pop-image.json'), 'utf8'));
  const pe1 = JSON.parse(readFileSync(join(ROOT, 'content/site/pe-first-stage/_shared/pop-image.json'), 'utf8'));
  const variants = [...Object.values(shared.families).flatMap(f => [f.body, f.tile].filter(Boolean)),
    ...Object.values(shared.tiles), pe1.variants.body, pe1.variants.tile];
  assert.ok(variants.length > 0, '採用画像の検査対象が空');
  for (const variant of variants) {
    const bytes = readFileSync(join(ROOT, variant.output.path));
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

test('一次PDFの自動配線は収録年度・科目を守り、収録外は要点整理へ案内する', t => {
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
  for (const p of result.outside) {
    assert.equal(p.id, null, p.s);
    assert.equal(p.top, p.s.includes('r08') ? null : 'pe1-anki-note', p.s);
  }
  assert.deepEqual(result.career, { inline: [] });
  assert.equal(result.guide, 'pe1-anki-note');
});

test('一次過去問21記事の中間・末尾カードは解説折りたたみの外に各1枚', t => {
  let checked=0;
  for (let year=1;year<=7;year++) for (const subject of ['basic','aptitude','construction']) {
    const path=`content/site/pe-first-stage/r0${year}-${subject}/article.mdx`;
    const raw=readFileSync(join(ROOT, path),'utf8');
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


test('土木一次34ページは収録年度に合うPDFを優先し、範囲外にPDFを売らない', t => {
  const result = inspect(`
    import {resolvePlacement} from './src/lib/magazine-placement.ts';
    const one=['h26','h27','h28','h29','h30','r01','r02','r03','r04','r05','r06','r07'].flatMap(y=>['a','b'].map(p=>'civil-construction-1-primary-'+y+'-'+p));
    const two=['r03','r04','r05','r06','r07'].flatMap(y=>['zenki','kouki'].map(p=>'civil-construction-2-primary-'+y+'-'+p));
    process.stdout.write(JSON.stringify({one:one.map(s=>resolvePlacement(s,'primary').top?.magazineId),two:two.map(s=>resolvePlacement(s,'primary').top?.magazineId),outside:resolvePlacement('civil-construction-1-primary-h25-a','primary').top?.magazineId}));
  `);
  assert.equal(result.one.length, 24); assert.equal(result.two.length, 10);
  assert.ok(result.one.every(id => id === 'civil-1-takuitsu-pdf'));
  assert.ok(result.two.every(id => id === 'civil-2-takuitsu-pdf'));
  assert.notEqual(result.outside, 'civil-1-takuitsu-pdf');
  t.diagnostic('収録34ページと範囲外1ページを検査');
});

test('参考資料内だけのカードは到達面に数えず、次のH2以降は本文として数える', () => {
  const result = inspect(`
    import {renderedMagazineCardIds,resolveEndNoteSlot,resolvePlacement} from './src/lib/magazine-placement.ts';
    const card='<MagazineCard id="cd-essay-magazine" />';
    const removed='本文\\n\\n## 参考資料\\n- 出典\\n'+card;
    const restored=removed+'\\n\\n## 学習教材\\n'+card;
    process.stdout.write(JSON.stringify({removed:renderedMagazineCardIds(removed),restored:renderedMagazineCardIds(restored)}));
  `);
  assert.deepEqual(result.removed, []);
  assert.deepEqual(result.restored, ['cd-essay-magazine']);
});

test('上下水道17ページは共通科目の対象範囲を示し、専門科目PDFを案内しない', t => {
  const result = inspect(`
    import {resolvePlacement} from './src/lib/magazine-placement.ts';
    const years=['h23','h24','h25','h26','h27','h28','h29','h30','r01-retry','r01','r02','r03','r04','r05','r06','r07'];
    const slugs=[...years.map(y=>'pe-first-stage-'+y+'-water-supply'),'pe-first-stage-guide-water-supply-subject'];
    process.stdout.write(JSON.stringify(slugs.map(s=>resolvePlacement(s,s.includes('guide')?'guide':'primary'))));
  `);
  assert.equal(result.length, 17);
  for (const p of result) { assert.equal(p.top.magazineId, 'pe1-anki-note'); assert.match(p.scopeNotice,/基礎・適性科目/); assert.match(p.scopeNotice,/上下水道の専門科目は含みません/); }
  t.diagnostic('上下水道17ページで対象範囲を検査');
});

test('中間と末尾は実描画条件を共有し、手書きカードを重ねない', () => {
  const result = inspect(`
    import {resolvePlacement,resolveArticleMidNoteSlot,resolveEndNoteSlot} from './src/lib/magazine-placement.ts';
    const p=resolvePlacement('civil-construction-2-primary-r07-kouki','primary');
    const body=['## 問1','## 問2','## 問3'].join('\\n'+ '説明'.repeat(800)+'\\n');
    const explicit=body+'\\n<MagazineCard id="civil-2-takuitsu-pdf" placement="article-mid" />';
    process.stdout.write(JSON.stringify({mid:resolveArticleMidNoteSlot(p,'primary',body),end:resolveEndNoteSlot(p,body),manualMid:resolveArticleMidNoteSlot(p,'primary',explicit),manualEnd:resolveEndNoteSlot(p,explicit),short:resolveArticleMidNoteSlot(p,'primary','## 問1')}));
  `);
  assert.equal(result.mid.magazineId, 'civil-2-takuitsu-pdf'); assert.equal(result.end.magazineId, 'civil-2-takuitsu-pdf');
  assert.equal(result.manualMid, null); assert.equal(result.manualEnd, null); assert.equal(result.short, null);
});

test('主任技士は受付中の同資格ココナラへ接続し、追加3ページも対象を守る', () => {
  const result = inspect(`
    import {pickCoconalaFor} from './src/lib/exam-key-bridge.ts';
    import {resolveOffsiteCta} from './src/lib/offsite-cta.ts';
    process.stdout.write(JSON.stringify({chief:pickCoconalaFor('concrete-chief'),empty:pickCoconalaFor('pe-first-stage'),
      grading:resolveOffsiteCta('civil-construction-2-secondary-grading-and-partial-credit'),
      overview:resolveOffsiteCta('concrete-chief-engineer-guide-overview'),trends:resolveOffsiteCta('concrete-chief-engineer-guide-trends')}));
  `);
  assert.equal(result.chief.id, 'coconala-cce-essay-tensaku'); assert.equal(result.chief.status, 'listed'); assert.equal(result.empty, null);
  assert.deepEqual(result.grading.map(i=>i.trackLabel), ['offsite-coconala-2kyu-tensaku-3theme']);
  assert.deepEqual(result.overview.map(i=>i.trackLabel), ['offsite-coconala-cce-essay-tensaku']);
  assert.deepEqual(result.trends.map(i=>i.trackLabel), ['offsite-coconala-cce-essay-tensaku']);
});
