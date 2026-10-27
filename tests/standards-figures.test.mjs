import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderChapter } from '../scripts/build-standard-articles.mjs';
import {
  figureImageSrc,
  figureKey,
  figureLedgerPath,
  figureRefsOf,
  loadFigureLedger,
  renderFigureImage,
  validateFigureEntry,
} from '../scripts/lib/standards-figures.mjs';

const entry = {
  chapterId: '1-3',
  sourceRef: '54',
  caption: '図3-3',
  imagePage: 54,
  bbox: [474, 640, 1880, 1676],
  file: 'fig-p0054-1.webp',
  width: 1200,
  height: 883,
  review: { status: 'approved', by: 'scanned-figure-crop-auditor' },
};

const chapterWithCaption = (caption, pages = [54]) => ({
  chapterId: '1-3',
  bookNumber: 1,
  chapterNumber: 3,
  nodes: [{ type: 'caption', lines: [{ text: caption }], pages }],
});

test('生成器はキャプションと SourceRef の間に、台帳の図を <ArticleImage>（alt はキャプション）で差し込む', () => {
  const figureOf = (chapterId, sourceRef, caption) =>
    figureKey(chapterId, sourceRef, caption) === figureKey(entry.chapterId, entry.sourceRef, entry.caption)
      ? renderFigureImage('chubu/special', entry)
      : null;
  const markdown = renderChapter(chapterWithCaption('図3-3'), [], new Map(), [], null, null, figureOf);
  const blocks = markdown.split('\n').filter((line) => line.trim() && !line.startsWith('{/*') && !line.startsWith('    '));
  assert.deepEqual(blocks, [
    '**図3-3**',
    '<ArticleImage src="/posts/standards-articles/chubu/special/img/fig-p0054-1.webp" alt="図3-3" width="1200" height="883" size="medium" />',
    '<SourceRef pages="54" kind="figure" />',
  ]);
  const [ref] = figureRefsOf(markdown);
  assert.deepEqual(ref.file, 'fig-p0054-1.webp');
  assert.equal(ref.caption, '図3-3');
  assert.equal(ref.sourceRef, '54');
});

test('台帳に無い図は今までどおりキャプションと SourceRef だけで、検査は「画像が無い」と数える', () => {
  const markdown = renderChapter(chapterWithCaption('図9-9 別の図'), [], new Map(), [], null, null, () => null);
  assert.ok(!markdown.includes('<ArticleImage'));
  const [ref] = figureRefsOf(markdown);
  assert.equal(ref.file, null);
  assert.equal(ref.caption, '図9-9 別の図');
});

test('キャプションの照合は空白（全角を含む）の違いを無視し、ページ・章が違えば別の図', () => {
  assert.equal(figureKey('40-1', '777', '表6－1　地山条件'), figureKey('40-1', '777', '表6－1地山条件'));
  assert.notEqual(figureKey('1-3', '54', '図3-3'), figureKey('1-3', '55', '図3-3'));
  assert.notEqual(figureKey('1-3', '54', '図3-3'), figureKey('1-2', '54', '図3-3'));
});

test('台帳の 1 件の形: 承認されていない・bbox が逆・webp でない は拾う', () => {
  assert.deepEqual(validateFigureEntry(entry), []);
  assert.match(validateFigureEntry({ ...entry, review: { status: 'draft' } }).join(), /承認されていない/);
  assert.match(validateFigureEntry({ ...entry, bbox: [10, 10, 5, 20] }).join(), /bbox/);
  assert.match(validateFigureEntry({ ...entry, file: 'fig.png' }).join(), /webp/);
});

test('キャプションの記号は alt で逃がし、src は R2 のキーと同じ /posts/standards-articles/ の形', () => {
  assert.equal(figureImageSrc('kinki/common', 'a.webp'), '/posts/standards-articles/kinki/common/img/a.webp');
  assert.match(renderFigureImage('kinki/common', { ...entry, caption: '図 "A"' }), /alt="図 &quot;A&quot;"/);
});

test('実データ: 中部の特記仕様書 1-3 の図3-3（p.54）が台帳にあり、章記事に画像が入っている', () => {
  const ledger = loadFigureLedger('chubu/special');
  assert.ok(ledger, figureLedgerPath('chubu/special'));
  const figure = ledger.figures.find((f) => f.chapterId === '1-3' && f.caption === '図3-3');
  assert.equal(figure?.sourceRef, '54');
  const chapter = readFileSync(new URL('../content/site/standards-articles/chubu/special/chapters/1-3.md', import.meta.url), 'utf8');
  const ref = figureRefsOf(chapter).find((r) => r.caption === '図3-3');
  assert.equal(ref?.file, figure.file);
});
