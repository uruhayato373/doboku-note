import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { coverCopy, headlineLayout, resolveCoverExam, renderNoteCharacterCover } from '../scripts/lib/note-character-cover.mjs';

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
