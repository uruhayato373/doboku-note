import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

function check(packs) {
  const root = mkdtempSync(join(tmpdir(), 'shorts-gate-'));
  const write = (path, value) => writeFileSync(join(root, path), value);
  try {
    mkdirSync(join(root, 'scripts/lib'), { recursive: true });
    cpSync(join(REPO_ROOT, 'scripts/check-youtube-video-pack-shorts.mjs'), join(root, 'scripts/check-youtube-video-pack-shorts.mjs'));
    cpSync(join(REPO_ROOT, 'scripts/lib/repository-paths.mjs'), join(root, 'scripts/lib/repository-paths.mjs'));
    write('scripts/lib/utm-contract.mjs', 'export const utmChannel = () => ({});');
    write('scripts/lib/registry-video-state.mjs', `export const loadVideoState = () => (${JSON.stringify({ packs: Object.fromEntries(packs.map((p) => [p.id, { derivatives: { longform: p.row } }])) })});`);
    for (const exam of ['civil-construction-1', 'civil-construction-2', 'concrete-engineer', 'concrete-chief-engineer']) mkdirSync(join(root, 'content/sns/video-packs', exam), { recursive: true });
    for (const p of packs) {
      const dir = `content/sns/video-packs/civil-construction-2/${p.id}`;
      mkdirSync(join(root, dir));
      write(`${dir}/video-pack.json`, JSON.stringify({ outputs: { longform: true, shorts: p.shorts ?? 0 } }));
      write(`${dir}/storyboard.json`, JSON.stringify({ scenes: [] }));
      if (!p.missing) write(`${dir}/youtube.json`, JSON.stringify({ longform: { publishAt: p.plan }, shorts: [] }));
    }
    const r = spawnSync(process.execPath, [join(root, 'scripts/check-youtube-video-pack-shorts.mjs')], { encoding: 'utf8' });
    return { status: r.status, text: r.stdout + r.stderr };
  } finally { rmSync(root, { recursive: true, force: true }); }
}
const slot = '2026-10-19T20:00:00+09:00';
const scheduled = { status: 'scheduled', publishAt: slot };

test('通常動画のみのパックを制作契約どおり検査し、停止済みの旧予定を数えない', () => {
  const r = check([{ id: 'new', row: scheduled, plan: slot }, { id: 'old', row: { status: 'stopped' }, plan: slot }]);
  assert.equal(r.status, 0, r.text);
  assert.match(r.text, /packs=2, shorts=0, titles=0, slots=1/);
});
test('実予約日時は旧メタデータの日時より優先する', () => {
  const r = check([{ id: 'a', row: scheduled, plan: slot }, { id: 'b', row: { ...scheduled, publishAt: '2026-10-20T20:00:00+09:00' }, plan: slot }]);
  assert.equal(r.status, 0, r.text);
});
test('台帳の実予約が衝突していれば引き続き失敗する', () => {
  const r = check([{ id: 'a', row: scheduled }, { id: 'b', row: scheduled }]);
  assert.equal(r.status, 1);
  assert.match(r.text, /公開枠重複/);
});
test('1日4本の実予約は上限違反になる', () => {
  const r = check([10, 12, 18, 20].map((h) => ({ id: `p${h}`, row: { status: 'scheduled', publishAt: `2026-10-19T${h}:00:00+09:00` } })));
  assert.equal(r.status, 1);
  assert.match(r.text, /1日上限3本/);
});
test('Shortsを作る契約なのに無い場合は失敗する', () => {
  const r = check([{ id: 'a', shorts: 2, row: scheduled }]);
  assert.equal(r.status, 1);
  assert.match(r.text, /shorts=0 \(期待値2\)/);
});
test('予約済みパックのメタデータ欠落と予約日時欠落は失敗する', () => {
  for (const p of [{ id: 'a', row: scheduled, missing: true }, { id: 'a', row: { status: 'scheduled' }, plan: slot }]) assert.equal(check([p]).status, 1);
});
test('未承認の重複枠は警告として残す', () => {
  const r = check([{ id: 'a', row: scheduled }, { id: 'b', row: { status: 'draft' }, plan: slot }]);
  assert.equal(r.status, 0, r.text);
  assert.match(r.text, /WARN: 承認前の予定枠が重複/);
});
test('対象ゼロを合格にしない', () => {
  const r = check([]);
  assert.equal(r.status, 1);
  assert.match(r.text, /1件も検査していません/);
});
