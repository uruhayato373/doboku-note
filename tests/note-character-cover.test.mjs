import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { coverCopy, headlineLayout, resolveCoverExam, renderNoteCharacterCover, coverPoseCandidates, assignCoverPoses, coverFitIssues } from '../scripts/lib/note-character-cover.mjs';
import { loadNoteCoverInventory } from '../scripts/lib/note-cover-inventory.mjs';
import { MAGAZINES } from '../scripts/generate-magazine-covers.mjs';

test('pose choices follow the topic and keep explicit editorial choices', () => {
  const input = title => ({ title });
  assert.deepEqual(coverPoseCandidates(input('AIで施工経験記述を書く')).poses, ['pc-work']);
  assert.deepEqual(coverPoseCandidates(input('合格体験記')).poses, ['congrats']);
  assert.ok(coverPoseCandidates(input('総監のもくじ')).poses.includes('wave'));
  assert.ok(coverPoseCandidates(input('テキスト精読')).poses.includes('reading'));
  assert.ok(coverPoseCandidates(input('令和8年 予想問題')).poses.includes('thinking'));
  assert.ok(!coverPoseCandidates(input('まるごと合格パック')).poses.includes('congrats'));
  assert.deepEqual(coverPoseCandidates({ title: 'AI学習法', cover: { character: 'thinking' } }).poses, ['thinking']);
});

test('a series has reproducible variation without changing its supplied copy', () => {
  const targets = Array.from({ length: 40 }, (_, i) => ({ key: `article-${i}`, kind: 'article',
    input: { title: `施工経験記述 完成答案 ${i}`, examKey: 'civil-1', cover: { headline: `工事${i}` } } }));
  const first = assignCoverPoses(targets), second = assignCoverPoses(targets);
  assert.deepEqual(first, second);
  assert.ok(new Set(first.map(t => t.input.poseSelection.pose)).size >= 3);
  first.forEach((t, i) => {
    assert.deepEqual(t.input.cover, targets[i].input.cover);
    if (i) assert.notEqual(t.input.poseSelection.pose, first[i - 1].input.poseSelection.pose);
  });
  assert.equal(targets[0].input.poseSelection, undefined);
});

test('output roots cannot overlap the source checkout or its content tree', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'note-cover-output-'));
  const script = fileURLToPath(new URL('../scripts/generate-note-character-covers.mjs', import.meta.url));
  try {
    for (const output of [root, resolve(root, 'content'), resolve(root, 'content/note')]) {
      const result = spawnSync(process.execPath, [script, '--source-root', root, '--output-root', output], { encoding: 'utf8' });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /生成先を原稿ツリーに重ねられません/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('typed article and legacy magazine copy retain the supplied topic and details', () => {
  assert.deepEqual(coverCopy({ cover: { headline: '工程管理', hi: '予想', hiSuffix: 'テーマ', benefit: '工程表を書く' }, category: '1級土木' }),
    { headline: '工程管理', lead: '1級土木', proof: '予想 テーマ', benefit: '工程表を書く' });
  assert.deepEqual(coverCopy({ magazine: true, lines: ['RCCM', 'まるごとパック', '問題I〜IV 全対応'] }),
    { headline: 'まるごとパック', lead: 'RCCM', proof: '問題I〜IV 全対応', benefit: '' });
});

test('long headlines fail instead of silently losing text', () => {
  const measure = (text, size) => Array.from(text).length * size;
  const input = 'コンクリート品質管理';
  const plan = headlineLayout(input, measure);
  assert.equal(plan.lines.join(''), input);
  assert.ok(plan.lines.length <= 3);
  assert.ok(plan.widths.every(width => width <= plan.box.width));
  assert.throws(() => headlineLayout('長い主見出し'.repeat(20), measure), /省略せず要編集/);
});

test('combined civil directory does not accidentally select the second-grade color', () => {
  const tokens = { exams: { 'civil-2': { dir: '2級土木' }, 'civil-1-2': { dir: '1級・2級土木' } } };
  assert.equal(resolveCoverExam('content/note/1級・2級土木/学科記述予想', tokens), 'civil-1-2');
  assert.throws(() => resolveCoverExam('unknown', tokens), /解決できません/);
});

test('actual article and magazine renders preserve the main text in both center crops', async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  for (const input of [
    { cover: { headline: '工程管理', leadIn: '1級土木', hi: '予想', hiSuffix: 'テーマ' }, examKey: 'civil-1', palette: { band: '#1E73C8' } },
    { magazine: true, lines: ['総監 記述式', '完全攻略パック', '過去問と予想問題'], examKey: 'pe-comprehensive', palette: { band: '#16365C' } },
  ]) {
    const result = await renderNoteCharacterCover(root, input);
    const metadata = await sharp(result.buffer).metadata();
    assert.equal(metadata.width, 1280); assert.equal(metadata.height, 670);
    assert.ok(result.measuredHeadlineNodes.length > 0);
    for (const node of result.measuredHeadlineNodes) {
      assert.ok(node.left >= 325 && node.left + node.width <= 955);
      assert.ok(node.top >= 227 && node.top + node.height <= 443);
    }
    assert.match(result.sourceSha256, /^[a-f0-9]{64}$/);
  }
});

test('all nine usable waist poses keep hands and props clear of text and the benefit band', async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  for (const pose of ['pointing', 'good-sign', 'explaining', 'wave', 'thinking', 'congrats', 'smile', 'pc-work', 'reading']) {
    const result = await renderNoteCharacterCover(root, {
      cover: { headline: '工程管理', character: pose, benefit: '工程表を書く' },
      examKey: 'civil-1', palette: { band: '#1E73C8' },
    });
    assert.equal(result.pose, pose);
    const box = result.characterBox;
    assert.ok(box.left >= 750 && box.left + box.width <= 1030, pose);
    assert.ok(box.top + box.height <= 502, pose);
    assert.ok(result.measuredHeadlineNodes.every(n => n.left + n.width < box.left), pose);
  }
  await assert.rejects(renderNoteCharacterCover(root, { cover: { headline: '注意点', character: 'surprised' },
    examKey: 'civil-1', palette: { band: '#1E73C8' } }), /要修正・未確認/);
});

test('fit gate uses the real font and rejects copy the renderer would refuse', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  assert.deepEqual(coverFitIssues(root, { cover: { headline: '工程管理', leadIn: '1級土木', hi: '予想', hiSuffix: 'テーマ', benefit: '工程表を書く' } }), []);
  const long = coverFitIssues(root, { cover: { headline: '長い主見出し'.repeat(20), benefit: '長い訴求'.repeat(30) } });
  assert.equal(long.length, 2);
  assert.match(long[0], /省略せず要編集/);
  assert.match(long[1], /^benefit: /);
  assert.match(coverFitIssues(root, { cover: {} })[0], /主見出しがありません/);
});

test('article, magazine and batch generators share one inventory so a single rerender keeps its pose', async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const inventory = await loadNoteCoverInventory(root, { magazines: MAGAZINES });
  const articles = inventory.targets.filter(t => t.kind === 'article');
  const magazines = inventory.targets.filter(t => t.kind === 'magazine');
  assert.ok(articles.length > 500 && magazines.length > 40, `検査不成立: 記事${articles.length}・マガジン${magazines.length}`);
  assert.ok(inventory.targets.every(t => t.input.poseSelection?.pose && t.imagePath.endsWith('.png')));
  assert.ok(inventory.targets.every(t => t.input.cover?.character ? t.input.poseSelection.pose === t.input.cover.character : true));
  assert.equal(inventory.errors.length, 0);
  assert.ok(inventory.retired.some(r => r.id === 'whitepaper-r7-strategy'));
  // 通常生成器は旧 G2/V4 テンプレを import しない（1 件再生成で旧デザインへ戻る回帰の静的ゲート）
  for (const file of ['scripts/generate-note-covers.mjs', 'scripts/generate-magazine-covers.mjs', 'scripts/check-note-cover-fit.mjs']) {
    const source = readFileSync(resolve(root, file), 'utf8');
    assert.doesNotMatch(source, /ogp-templates\.mjs|renderTemplate\(|v4FitIssues/, file);
    assert.match(source, /note-cover-inventory\.mjs/, file);
  }
});
