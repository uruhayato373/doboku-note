import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jsonMatches, writeJsonIfChanged } from '../scripts/lib/write-generated.mjs';

test('生成時刻だけが違う再生成は書かず、中身が変われば書く', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'dn-gen-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const p = join(dir, 'x.json');
  writeFileSync(p, JSON.stringify({ generated_at: 'old', items: [1] }, null, 2) + '\n');
  assert.equal(writeJsonIfChanged(p, { generated_at: 'new', items: [1] }), false);
  assert.match(readFileSync(p, 'utf8'), /"old"/);
  assert.equal(writeJsonIfChanged(p, { generated_at: 'new', items: [1, 2] }), true);
  assert.match(readFileSync(p, 'utf8'), /"new"/);
});

test('jsonMatches: 生成時刻を除いて既存ファイルと同じかを見る（無い・壊れているときは false）', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'dn-gen-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const p = join(dir, 'x.json');
  assert.equal(jsonMatches(p, { items: [1] }), false);
  writeFileSync(p, JSON.stringify({ updatedAt: 'old', items: [1] }, null, 2) + '\n');
  assert.equal(jsonMatches(p, { updatedAt: 'new', items: [1] }, { volatileKeys: ['updatedAt'] }), true);
  assert.equal(jsonMatches(p, { updatedAt: 'new', items: [1, 2] }, { volatileKeys: ['updatedAt'] }), false);
  writeFileSync(p, '{ broken');
  assert.equal(jsonMatches(p, { items: [1] }), false);
});
