import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCharacterCatalog } from '../scripts/lib/character-catalog.mjs';

const original = JSON.parse(readFileSync(new URL('../.claude/config/character-poses.json', import.meta.url), 'utf8'));
function fixture(t, change = () => {}) {
  const root = mkdtempSync(join(tmpdir(), 'character-catalog-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.claude/config'), { recursive: true });
  const m = structuredClone(original);
  change(m);
  writeFileSync(join(root, '.claude/config/character-poses.json'), JSON.stringify(m));
  return root;
}

test('素材がない別PCでも登録一覧と品質状態を保持し、画像URLを作らない', t => {
  const c = readCharacterCatalog(fixture(t));
  assert.equal(c.poses.length, original.poses.length);
  assert.ok(c.poses.every(p => !p.available && p.url === null));
  assert.deepEqual(c.poses.map(p => p.verified), original.poses.map(p => p.verified));
  assert.equal(c.poses.find(p => p.slug === 'surprised').quality.status, 'needs-fix');
});

test('追加ポーズは列挙コードの変更なしで現れ、構図未登録でも隠さない', t => {
  const root = fixture(t, m => m.poses.push({ slug: 'new-pose', file: 'new-pose.png', label: '新ポーズ', verified: false, beats: ['point'], category: 'gesture' }));
  const folder = join(root, original.assetsDir);
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'new-pose.png'), 'fixture');
  const pose = readCharacterCatalog(root).poses.at(-1);
  assert.equal(pose.slug, 'new-pose');
  assert.equal(pose.available, true);
  assert.equal(pose.composition, undefined);
  assert.equal(pose.url, '/media/sns/_assets/character/new-pose.png');
});

test('重複ID・範囲外パス・未知の分類を検出する', t => {
  for (const change of [
    m => m.poses.push(m.poses[0]),
    m => { m.poses[0].file = '../outside.png'; },
    m => { m.poses[0].composition.placements = ['unknown']; },
  ]) assert.throws(() => readCharacterCatalog(fixture(t, change)), /不正/);
});
