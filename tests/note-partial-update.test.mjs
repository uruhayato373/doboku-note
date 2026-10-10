import { test } from 'node:test';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  validatePartialSpec,
  normalizeAttachmentSnapshot,
  sameAttachmentSnapshot,
  headingIntegrity,
  buildTopCtaHtml,
} from '../scripts/lib/note-partial-update.mjs';
import { headingsFromHtml } from '../scripts/lib/note-live-check.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';


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
    operations: [{ type: 'insertBeforeBlockHtml', beforeNeedle: '最初の段落', html: '<p><strong>この記事でわかること</strong></p><ul><li>項目</li></ul>', probe: 'この記事でわかること' }],
  }));
  assert.throws(() => validatePartialSpec({
    article: 'content/note/x/article.md',
    operations: [{ type: 'insertBeforeBlockHtml', beforeNeedle: '最初の段落', html: '<p onclick="x">a</p>', probe: 'a' }],
  }), /許可されない/);
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
  const source = readFileSync(join(ROOT, 'scripts/note-update-partial.mjs'), 'utf8');
  assert.doesNotMatch(source, /Meta\+a|Control\+a|keyboard\.press\([^)]*[Aa]/);
  assert.doesNotMatch(source, /ClipboardEvent|selectNodeContents\(ed\)/);
  assert.match(source, /keyboard\.insertText\(op\.new\)/);
  assert.match(source, /sameAttachmentSnapshot/);
  assert.match(source, /DRY-READONLY/);
});

test('冒頭 CTA 後の見出し検査: 2026-09-23 の割れ方（CTA が h2・直後の見出しが割れる）を止める', () => {
  const before = { h2: ['R8 で何が出るのか', '出題傾向'], h3: [] };
  const cta = '総監の択一式を17年分さかのぼって、出題の型と頻出論点を整理したマガジンで全体像をつかめます。まずは無料の分析記事から読み進めてください。';
  const broken = { h2: [cta, '8 で何が出るのか', '出題傾向'], h3: [] };
  const result = headingIntegrity(before, broken);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((f) => f.startsWith('h2-changed:R8')));
  assert.ok(result.failures.some((f) => f.startsWith('long-heading:0→1')));
});

test('冒頭 CTA 後の見出し検査: 見出しが同じなら通す（重複見出しは個数まで一致）', () => {
  const before = { h2: ['はじめに', '解答例', '解答例'], h3: ['補足'] };
  assert.deepEqual(headingIntegrity(before, { h2: ['はじめに', '解答例', '解答例'], h3: ['補足'] }), { ok: true, failures: [] });
  assert.equal(headingIntegrity(before, { h2: ['はじめに', '解答例'], h3: ['補足'] }).ok, false);
});

const CTA = '総監の択一式を17年分さかのぼって、出題の型と頻出論点を整理したマガジンで全体像をつかめます。まずは無料の分析記事から読み進めてください。';
const BEFORE_HTML = '<p>リード</p><p>旧CTA</p><h2>R8 で何が出るのか</h2><p>本文</p><h2>出題傾向</h2>';

test('保存前検証（HTML 入力）: 2026-09-23 の崩れ（CTA が h2・対象見出しが「R」＋カード＋段落に割れる）を止める', () => {
  const broken = `<p>リード</p><h2>${CTA}</h2><p>R</p><figure embedded-service="external-article"></figure><p>8 で何が出るのか</p><p>本文</p><h2>出題傾向</h2>`;
  const result = headingIntegrity(headingsFromHtml(BEFORE_HTML), headingsFromHtml(broken), { targetHeading: 'R8 で何が出るのか' });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((f) => f.startsWith('target-h2:R8')));
  assert.ok(result.failures.some((f) => f.startsWith('long-heading:0→1')));
});

test('保存前検証（HTML 入力）: CTA が段落＋カードで入り、見出しが残っていれば通す', () => {
  const ok = `<p>リード</p><p>${CTA}</p><figure embedded-service="external-article"></figure><h2>R8 で何が出るのか</h2><p>本文</p><h2>出題傾向</h2>`;
  assert.deepEqual(headingIntegrity(headingsFromHtml(BEFORE_HTML), headingsFromHtml(ok), { targetHeading: 'R8 で何が出るのか' }), { ok: true, failures: [] });
});

test('保存前検証: 対象見出しが 2 つに増えた（重複）ときも止める', () => {
  const dup = '<h2>R8 で何が出るのか</h2><h2>R8 で何が出るのか</h2><h2>出題傾向</h2>';
  const result = headingIntegrity(headingsFromHtml(BEFORE_HTML), headingsFromHtml(dup), { targetHeading: 'R8 で何が出るのか' });
  assert.ok(result.failures.includes('target-h2:R8 で何が出るのか=2'));
});

test('冒頭 CTA の差し込み HTML: 文 1 段落＋URL を 1 本ずつ単独段落にし、文字はエスケープする', () => {
  assert.equal(
    buildTopCtaHtml({ newText: 'A<b>&', newUrls: ['https://note.com/dobokunote/m/m1', 'https://note.com/dobokunote/n/n2'] }),
    '<p>A&lt;b&gt;&amp;</p><p>https://note.com/dobokunote/m/m1</p><p>https://note.com/dobokunote/n/n2</p>',
  );
  assert.equal(buildTopCtaHtml({ newText: '', newUrls: [] }), '');
  assert.throws(() => buildTopCtaHtml({ newText: 'x', newUrls: ['javascript:alert(1)'] }), /URL が不正/);
});

test('冒頭 CTA はキーボード入力の経路を持たない（HTML 差し込み＋cardify）', () => {
  const source = readFileSync(join(ROOT, 'scripts/note-update-partial.mjs'), 'utf8');
  assert.doesNotMatch(source, /typeTopCta|caretInNewParagraphBefore/);
  const fn = source.slice(source.indexOf('async function insertTopCtaHtml'), source.indexOf('async function applyOperation'));
  assert.match(fn, /insertAdjacentHTML\('beforebegin'/);
  assert.match(fn, /cardifyBareUrls/);
  assert.doesNotMatch(fn, /keyboard/);
});
