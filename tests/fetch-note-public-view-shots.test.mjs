// 週次レビューが見る note の公開画面の画像は、土曜の収集が撮った手元の置き場から写す（DN-0852・旧 CI の成果物の取り寄せ）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MAX_SHOT_AGE_DAYS, shotAgeDays } from '../scripts/fetch-note-public-view-shots.mjs';
import { jstDayOf } from '../scripts/lib/jst-date.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const SCRIPT = join(REPO_ROOT, 'scripts', 'fetch-note-public-view-shots.mjs');

function fixture(generatedAt, { shot = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'npv-'));
  mkdirSync(join(dir, 'review'), { recursive: true });
  writeFileSync(join(dir, 'report.json'), JSON.stringify({ generatedAt, bad: [], warn: [] }));
  writeFileSync(join(dir, 'review', 'index.json'), JSON.stringify({
    service: 'note',
    viewports: [{ name: 'sp', width: 360 }],
    pages: [{ noteId: 'n1', shots: [{ viewport: 'sp', width: 360, file: 'n1-360.png' }] }],
  }));
  if (shot) writeFileSync(join(dir, 'review', 'n1-360.png'), 'png');
  return dir;
}

function run(dir) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [SCRIPT, '--json', '--from', dir], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { code: e.status, out: String(e.stdout ?? ''), err: String(e.stderr ?? '') };
  }
}

test('撮影の古さは日数で返し、読めなければ null', () => {
  const now = Date.parse('2026-10-31T06:00:00Z');
  assert.equal(shotAgeDays('2026-10-30T06:00:00Z', now), 1);
  assert.equal(shotAgeDays(null, now), null);
  assert.equal(MAX_SHOT_AGE_DAYS, 8);
});

test('今週の撮影はレビューの作業ツリーへ写し、全画面がそろえば exit 0', () => {
  const generatedAt = new Date().toISOString();
  const src = fixture(generatedAt);
  const dest = join(REPO_ROOT, '.tmp/note-public-view-review', jstDayOf(generatedAt));
  try {
    const r = run(src);
    assert.equal(r.code, 0, r.err);
    const j = JSON.parse(r.out);
    assert.equal(j.capturedAt, generatedAt);
    assert.equal(j.services[0].coverage.complete, true);
    assert.ok(existsSync(join(dest, 'review', 'n1-360.png')));
  } finally {
    rmSync(src, { recursive: true, force: true });
    rmSync(dest, { recursive: true, force: true });
  }
});

test('古い撮影・置き場が無い・撮影の欠けは exit 2（未確認。0 枚を異常なしと呼ばない）', () => {
  const old = fixture(new Date(Date.now() - (MAX_SHOT_AGE_DAYS + 2) * 86_400_000).toISOString());
  const gap = fixture(new Date().toISOString(), { shot: false });
  const dest = join(REPO_ROOT, '.tmp/note-public-view-review', jstDayOf(Date.now()));
  try {
    assert.equal(run(old).code, 2);
    assert.equal(run(join(tmpdir(), 'npv-does-not-exist')).code, 2);
    assert.equal(run(gap).code, 2);
  } finally {
    for (const d of [old, gap, dest]) rmSync(d, { recursive: true, force: true });
  }
});
