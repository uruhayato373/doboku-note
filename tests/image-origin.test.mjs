// 記事の画像の出所と写真（AI 生成画像）の状態（DN-0574・DN-0578）を固定する。
// 2026-10-07: 公開記事のラスター画像 497 枚のうち 56 枚は出所の記録が無く、23 枚は CC の実写を AI で描き直した画像だった
// （描き直したセオドライトは実在しない形）。試験ページの解説欄には市販書籍の図が 12 枚あり、ページ単位の免除で素通りしていた。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { figureSourceFindings, figuresInExplanation, sourceCandidatesFor } from '../scripts/lib/figure-source-wiring.mjs';
import {
  aiPhotoStatus, aspectOk, captionFor, commentKind, originFindings, originOf, promptSha, sourceCommentFor, validateAiVerdict, mediaIdOfKey,
} from '../scripts/lib/image-origin.mjs';
import { fitPhoto } from '../scripts/gen-article-photo.mjs';

const cfg = {
  classes: { 'commercial-book': { figureReuse: false }, 'exam-official': { figureReuse: true } },
  sources: [
    { id: 'workbook', class: 'commercial-book', origin: { kind: 'drive', vaultDir: '原資料PDF/書籍/workbook__問題解説集' } },
    { id: 'cecc-past-exams', class: 'exam-official', origin: { kind: 'external', url: 'https://www.jctc.jp/' } },
  ],
};
const aiPhoto = { aspect: [4, 3], tolerance: 0.01, width: 960 };

test('解答・解説（<details>）の中の画像だけを解説の図とみなす', () => {
  const raw = [
    '<img src="/posts/c/a/img/q-fig.webp" />',
    '<details><summary>解答・解説</summary>',
    '<img src="/posts/c/a/img/boiling.webp" />',
    '</details>',
    '<ArticleImage src="/posts/c/a/img/next-q.png" />',
  ].join('\n');
  assert.deepEqual([...figuresInExplanation(raw)], ['boiling']);
});

test('試験ページの免除は設問側の図だけ。解説欄の書籍の図は流用不可で止める', () => {
  const provenance = {
    'civil-construction-1/secondary-earthwork-past-problems/img/q-fig': { pdf: 'vault:原資料PDF/書籍/workbook__問題解説集/source/001.pdf', page: 84 },
    'civil-construction-1/secondary-earthwork-past-problems/img/boiling': { pdf: 'vault:原資料PDF/書籍/workbook__問題解説集/source/001.pdf', page: 90 },
  };
  const articleSources = new Map([['civil-construction-1/secondary-earthwork-past-problems', ['cecc-past-exams']]]);
  const explanationFigs = new Set(['civil-construction-1/secondary-earthwork-past-problems/img/boiling']);
  const { findings } = figureSourceFindings({ provenance, cfg, articleSources, explanationFigs });
  assert.deepEqual(findings.map((f) => [f.kind, f.figKey.split('/').pop()]).sort(), [
    ['figure-reuse-forbidden', 'boiling'], ['figure-source-undeclared', 'boiling'],
  ]);
});

test('出所: 台帳の kind・試験ページの設問の図・解説の図', () => {
  const articleSources = new Map([['civil-construction-1/primary-h29-a', ['cecc-past-exams']]]);
  assert.deepEqual(originOf({ figKey: 'x/y/img/a', provenance: { 'x/y/img/a': { pdf: 'https://e.example/a.pdf' } }, articleSources, cfg }).kind, 'pdf-crop');
  assert.equal(originOf({ figKey: 'civil-construction-1/primary-h29-a/img/f1', provenance: {}, articleSources, cfg }).kind, 'exam-official');
  assert.equal(originOf({ figKey: 'civil-construction-1/primary-h29-a/img/f1', provenance: {}, articleSources, cfg, inExplanation: true }), null);
  assert.equal(originOf({ figKey: 'civil-construction-1/textbook-crane/img/crane', provenance: {}, articleSources, cfg }), null);
});

test('出典コメントは画像の直前のものだけを読む（前の画像のコメントから読み始めない）', () => {
  const content = [
    '{/* source: doboku-note 自作 SVG */}',
    '<ArticleImage src="/posts/c/a/img/figure-x.svg" alt="x" />',
    '',
    '{/* source: Wikimedia Commons, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:A.jpg */}',
    '<ArticleImage',
    '  src="/posts/c/a/img/roller.webp"',
    '  caption="Wikimedia Commons, CC BY-SA 4.0"',
    '/>',
    '<ArticleImage src="/posts/c/a/img/plain.webp" />',
  ].join('\n');
  assert.match(sourceCommentFor(content, 'roller'), /^Wikimedia Commons/);
  assert.equal(sourceCommentFor(content, 'plain'), null);
  assert.equal(captionFor(content, 'roller'), 'Wikimedia Commons, CC BY-SA 4.0');
  assert.equal(commentKind('AI 生成画像（Codex）'), 'ai');
  assert.equal(commentKind('Wikimedia Commons, CC0'), 'cc-photo');
});

test('写真の状態は仕様（prompt）と実績（sha・promptSha・verdict）から導く', () => {
  const entry = { kind: 'ai-generated', tool: 'Codex', prompt: 'A crawler crane' };
  const gen = { sha: 's1', promptSha: promptSha('A crawler crane') };
  assert.equal(aiPhotoStatus({ entry, rec: null, sha: 's1' }), 'not-generated');
  assert.equal(aiPhotoStatus({ entry, rec: gen, sha: 's2' }), 'not-generated', '手で差し替えた画像は未生成に戻る');
  assert.equal(aiPhotoStatus({ entry: { ...entry, prompt: 'A crawler crane with lattice boom' }, rec: gen, sha: 's1' }), 'not-generated', '指示を変えたら作り直し');
  assert.equal(aiPhotoStatus({ entry, rec: gen, sha: 's1' }), 'unreviewed');
  assert.equal(aiPhotoStatus({ entry, rec: { ...gen, verdict: 'fail' }, sha: 's1' }), 'failed');
  assert.equal(aiPhotoStatus({ entry, rec: { ...gen, verdict: 'ok' }, sha: 's1' }), 'ok');
  assert.equal(aiPhotoStatus({ entry: { kind: 'ai-generated', tool: 'ChatGPT' }, rec: { sha: 's1', verdict: 'ok' }, sha: 's1' }), 'ok', '指示の無い古い写真は判定だけを見る');
});

test('違反: 実写・比率・公的資料の出典表示・未生成', () => {
  const kinds = (args) => originFindings({ figKey: 'c/a/img/p', sha: 's1', ledger: { figures: {} }, aiPhoto, ...args }).map((f) => f.kind);
  assert.deepEqual(kinds({ origin: null }), ['missing-origin']);
  assert.ok(kinds({ origin: { kind: 'pdf-crop', entry: {} }, comment: 'Wikimedia Commons, CC BY-SA 4.0' }).includes('photo-not-ai'));
  assert.deepEqual(kinds({ origin: { kind: 'public-data', entry: { credit: '気象庁' } }, caption: null }), ['attribution-missing']);
  assert.deepEqual(kinds({ origin: { kind: 'public-data', entry: { credit: '気象庁' } }, caption: '出典：気象庁' }), []);
  const ai = { kind: 'ai-generated', entry: { tool: 'Codex', prompt: 'p' } };
  assert.deepEqual(kinds({ origin: ai, size: [896, 1280] }), ['ai-aspect', 'ai-not-generated']);
  assert.ok(aspectOk(960, 720, aiPhoto) && aspectOk(1448, 1086, aiPhoto) && !aspectOk(1024, 1024, aiPhoto));
});

test('fitPhoto は中央で 4:3 に切り、配信幅に縮める', async () => {
  const wide = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: '#888' } }).png().toBuffer();
  const tall = await sharp({ create: { width: 1024, height: 1536, channels: 3, background: '#888' } }).png().toBuffer();
  for (const input of [wide, tall]) {
    const { buf, width, height } = await fitPhoto(input, aiPhoto);
    const m = await sharp(buf).metadata();
    assert.deepEqual([m.width, m.height, width, height, m.format], [960, 720, 960, 720, 'webp']);
  }
  const noisy = await sharp(Buffer.from(Array.from({ length: 1536 * 1152 * 3 }, () => Math.floor(Math.random() * 256))), { raw: { width: 1536, height: 1152, channels: 3 } }).png().toBuffer();
  const { buf } = await fitPhoto(noisy, aiPhoto, 400 * 1024);
  assert.ok(buf.length <= 400 * 1024, '上限を超えたら画質を下げて収める');
  await assert.rejects(fitPhoto(noisy, aiPhoto, 1024), /上限/);
});

test('切り出し直しの原典候補: 試験ページの解説欄の図は流用不可の書籍を候補にしない', () => {
  const base = { articleDir: 'civil-construction-1/secondary-earthwork-past-problems', sourceIds: ['cecc-past-exams'], cfg, vaultRoot: null, scanRefIds: ['workbook'] };
  assert.deepEqual(sourceCandidatesFor(base).forbidden, []);
  assert.ok(sourceCandidatesFor(base).candidates.some((c) => c.id === 'workbook'), '設問側の図は問題解説集を媒体として使える');
  const exp = sourceCandidatesFor({ ...base, inExplanation: true });
  assert.equal(exp.exam, false);
  assert.ok(!exp.candidates.some((c) => c.id === 'workbook'), '解説欄の図は問題解説集から切り出さない');
});

test('判定の鍵: 記事の画像に加えて media:<素材 ID> を受ける（実在・AI 生成・sha 一致を見る）', () => {
  const sha256 = 'ab'.repeat(32);
  const mediaById = new Map([
    ['x/y/work/thumb', { id: 'x/y/work/thumb', sha256, provenance: { kind: 'ai-generated' } }],
    ['x/y/work/tpl', { id: 'x/y/work/tpl', sha256, provenance: { kind: 'template' } }],
  ]);
  const base = { verdict: 'ok', reason: '文字も部位も実物どおり' };
  assert.equal(mediaIdOfKey('media:x/y/work/thumb'), 'x/y/work/thumb');
  assert.equal(mediaIdOfKey('a/b/img/c'), null);
  assert.deepEqual(validateAiVerdict({ ...base, figKey: 'media:x/y/work/thumb' }, mediaById), []);
  assert.deepEqual(validateAiVerdict({ ...base, figKey: 'media:x/y/work/thumb', sha: sha256.slice(0, 16) }, mediaById), []);
  assert.equal(validateAiVerdict({ ...base, figKey: 'media:x/y/work/thumb', sha: '0'.repeat(16) }, mediaById).length, 1);
  assert.equal(validateAiVerdict({ ...base, figKey: 'media:nope' }, mediaById).length, 1);
  assert.equal(validateAiVerdict({ ...base, figKey: 'media:x/y/work/tpl' }, mediaById).length, 1);
  assert.equal(validateAiVerdict({ ...base, figKey: 'media:x/y/work/thumb' }).length, 1, '素材の一覧が無ければ弾く');
  assert.deepEqual(validateAiVerdict({ ...base, figKey: 'a/b/img/c' }), []);
  assert.equal(validateAiVerdict({ ...base, figKey: 'a/b/c' }).length, 1);
});
