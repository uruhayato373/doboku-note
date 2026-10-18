import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { narrationOverlap, findDuplicateLongforms } from '../scripts/lib/video-duplicate-check.mjs';
import { checkRegistry } from '../scripts/lib/content-registry-check.mjs';
import { loadRegistryConfig } from '../scripts/lib/content-registry.mjs';
import { finalApprovalGate } from '../scripts/lib/media-preview.mjs';

const lines = Array.from({ length: 10 }, (_, i) => `場面${i}では現場の条件を記録し、安全管理の課題を抽出して具体的な対応処置とその結果を説明する。`);
const pub = (work, over = {}) => ({ id: `e/${work}/youtube.longform`, exam: 'e', work, channel: 'youtube', format: 'longform', account: 'youtube:main', status: 'published', ...over });

test('別IDの改訂版に9/11場面が残る重複を検出する', () => {
  const changed = [...lines.slice(0, 9), '追加の著者紹介', '新しい締め'];
  assert.deepEqual(narrationOverlap(lines, changed), { duplicate: true, matched: 9, total: 11, characters: lines.slice(0, 9).join('').length });
  assert.equal(narrationOverlap(lines, lines.map((s) => ` ${s}\n`)).duplicate, true);
});

test('短い共通挨拶・1場面の反復・大半が異なる動画・長い総集編は止めない', () => {
  assert.equal(narrationOverlap(['こんにちは'], ['こんにちは']).duplicate, false);
  assert.equal(narrationOverlap(lines, [lines[0], ...Array(9).fill('別の話')]).duplicate, false);
  assert.equal(narrationOverlap(lines, [...lines, ...Array(10).fill('別の学習事項')]).duplicate, false);
  assert.equal(narrationOverlap(Array(10).fill(lines[0]), [lines[0]]).duplicate, false);
});

test('同じ資格・アカウントの通常動画を実比較し、停止済み・下書き・他資格・他形式は除く', () => {
  const a = pub('old'), b = pub('new');
  const narrations = new Map([[a.id, lines], [b.id, lines]]);
  const check = (other, candidateId) => findDuplicateLongforms('.', { publications: [a, { ...b, ...other }] }, { narrations, candidateId });
  assert.equal(check({}).pairs.length, 1);
  for (const over of [{ status: 'stopped' }, { status: 'draft' }, { exam: 'other' }, { account: 'other' }, { format: 'short' }]) assert.equal(check(over).pairs.length, 0);
  assert.equal(check({ status: 'qa_passed' }, b.id).pairs.length, 1);
  assert.equal(check({ status: 'stopped' }, b.id).pairs.length, 0);
});

test('CIのR11とstage/API投入の共通関門が実ファイルの重複を止める。旧版停止後は改訂版を通す', async () => {
  const root = mkdtempSync(join(tmpdir(), 'video-dupe-'));
  try {
    const works = ['old', 'new'].map((id) => ({ id, exam: 'e', kind: 'video-pack', definition: `packs/${id}` }));
    for (const w of works) {
      mkdirSync(join(root, w.definition), { recursive: true });
      writeFileSync(join(root, w.definition, 'storyboard.json'), JSON.stringify({ scenes: lines.map((narration) => ({ narration })) }));
    }
    const old = pub('old'), revised = pub('new', { status: 'qa_passed' });
    const reg = { works, publications: [old, revised], media: [] };
    assert.equal((await finalApprovalGate(root, 'e', 'new', { reg })).ok, false);
    revised.status = 'approved';
    const cfg = loadRegistryConfig(process.cwd());
    const check = () => checkRegistry(root, { reg, cfg, packs: new Map(), driveManifest: null, aiLedger: null });
    assert.equal(check().counts.checkedLongformPairs, 1);
    assert.equal(check().issues.filter((i) => i.code === 'R11').length, 1);
    old.status = 'stopped'; old.stopReason = 'superseded';
    assert.equal(check().issues.filter((i) => i.code === 'R11').length, 0);
    assert.equal((await finalApprovalGate(root, 'e', 'new', { reg })).ok, true);
    assert.equal((await finalApprovalGate(root, 'e', 'old', { reg })).ok, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
