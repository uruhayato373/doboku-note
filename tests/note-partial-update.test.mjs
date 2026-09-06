import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  validatePartialSpec,
  normalizeAttachmentSnapshot,
  sameAttachmentSnapshot,
} from '../scripts/lib/note-partial-update.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('部分更新 spec は article と限定 operation を必須にする', () => {
  assert.throws(() => validatePartialSpec({ operations: [] }), /article/);
  assert.throws(() => validatePartialSpec({ article: 'x', operations: [{ type: 'replaceText', old: 'a' }] }), /old\/new/);
  assert.doesNotThrow(() => validatePartialSpec({
    article: 'content/note/x/article.md',
    verifyLiveApi: true,
    operations: [{ type: 'replaceText', old: '旧', new: '新', expected: 1 }],
  }));
  assert.doesNotThrow(() => validatePartialSpec({
    article: 'content/note/x/article.md',
    operations: [{ type: 'replaceSectionHtml', startHeading: '旧節', endHeading: '次節', html: '<h2>新節</h2><p>新本文</p>', probe: '新本文' }],
  }));
  assert.doesNotThrow(() => validatePartialSpec({
    article: 'content/note/x/article.md',
    operations: [{ type: 'replaceElementHtml', selector: 'li', oldProbe: '旧項目', html: '<strong>新項目</strong> — 説明', probe: '新項目' }],
  }));
  assert.doesNotThrow(() => validatePartialSpec({
    article: 'content/note/x/article.md',
    operations: [{ type: 'moveBlockGroupBefore', fromNeedle: '入口商品', beforeNeedle: '上位商品', blocks: 2 }],
  }));
  assert.doesNotThrow(() => validatePartialSpec({
    article: 'content/note/x/article.md',
    operations: [{ type: 'insertBeforeHeadingHtml', beforeHeading: '次の節', html: '<h2>追加節</h2><p>本文</p>', probe: '追加節' }],
  }));
  assert.doesNotThrow(() => validatePartialSpec({
    article: 'content/note/x/article.md',
    operations: [{ type: 'replaceImage', imageIndex: 0, expectedImages: 1, oldSrcKey: 'old.png', file: 'content/note/x/img/new.png', followingProbe: '図の見方' }],
  }));
  assert.throws(() => validatePartialSpec({
    article: 'content/note/x/article.md',
    operations: [{ type: 'replaceSectionHtml', startHeading: '旧節', endHeading: '次節', html: '<script>alert(1)</script>', probe: 'x' }],
  }), /許可されない/);
  assert.doesNotThrow(() => validatePartialSpec({
    article: 'content/note/x/article.md',
    operations: [{ type: 'insertTopCta', newText: '新CTA', newUrls: [], probe: '新CTA' }],
  }));
  assert.doesNotThrow(() => validatePartialSpec({
    article: 'content/note/x/article.md',
    operations: [{ type: 'replaceTopCta', oldStart: '旧CTA', newText: '新CTA', newUrls: ['https://note.com/dobokunote/m/m1'], probe: '新CTA' }],
  }));
});

test('PDF 添付 snapshot は query/hash と順序を無視し、欠落は検出する', () => {
  const before = { hrefs: ['https://note.com/api/v2/attachments/download/b.pdf?x=1', 'https://note.com/api/v2/attachments/download/a.pdf'], names: ['b.pdf', 'a.pdf'] };
  const same = { hrefs: ['https://note.com/api/v2/attachments/download/a.pdf#x', 'https://note.com/api/v2/attachments/download/b.pdf'], names: ['a.pdf', 'b.pdf'] };
  const missing = { hrefs: ['https://note.com/api/v2/attachments/download/a.pdf'], names: ['a.pdf'] };
  assert.deepEqual(normalizeAttachmentSnapshot(before), normalizeAttachmentSnapshot(same));
  assert.equal(sameAttachmentSnapshot(before, same), true);
  assert.equal(sameAttachmentSnapshot(before, missing), false);
});

test('部分更新 CLI は select-all と全文 paste を使わない', () => {
  const source = readFileSync(ROOT + 'scripts/note-update-partial.mjs', 'utf8');
  assert.doesNotMatch(source, /Meta\+a|Control\+a|keyboard\.press\([^)]*[Aa]/);
  assert.doesNotMatch(source, /ClipboardEvent|selectNodeContents\(ed\)/);
  assert.match(source, /keyboard\.insertText\(op\.new\)/);
  assert.match(source, /sameAttachmentSnapshot/);
  assert.match(source, /DRY-READONLY/);
});
