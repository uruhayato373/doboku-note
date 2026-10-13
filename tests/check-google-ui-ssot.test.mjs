import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { resolveDataset } from '../scripts/lib/datasets.mjs';

const SCRIPT = resolve('scripts/check-google-ui-ssot.mjs');
const write = (root, rel, obj) => {
  const p = join(root, rel);
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, JSON.stringify(obj));
};

function fixtureRoot({ ga4Marker = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'google-ui-ssot-'));
  const run = '2026-10-11T03-29-41Z';
  write(root, 'gsc/ui-last-run.json', { schemaVersion: 3, lastAttempt: { runId: run, complete: true }, lastComplete: { runId: run, complete: true } });
  write(root, 'gsc/ui-history.json', { schemaVersion: 1, channel: 'gsc-ui', runs: [{ runId: run }] });
  write(root, 'gsc/ui-urls.json', {
    schemaVersion: 1, channel: 'gsc-ui',
    units: { 'redirect--allKnownPages': { runId: run, collectedAt: '2026-10-11T03:30:00Z', exportedRows: 1, rows: [{ url: 'https://example.test/a' }] } },
  });
  if (ga4Marker) write(root, 'ga4/ui-last-run.json', { schemaVersion: 3, lastAttempt: { runId: '2026-07-30T05-46-47Z', complete: false, status: 'error' }, lastComplete: null });
  return root;
}
const run = (root, args = []) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, GOOGLE_CONSOLE_SSOT_ROOT: root } });

test('GA4 UI の記録が台帳に宣言されている（DN-0669: 未宣言で mustGet が落ちた）', () => {
  for (const id of ['ga4.ui-urls', 'ga4.ui-history', 'ga4.ui-diff', 'gsc.ui-urls', 'gsc.ui-history', 'gsc.ui-diff']) {
    assert.ok(resolveDataset(id), `${id} が台帳に無い`);
  }
});

test('GA4 UI が未取得でも GSC 側の整合を実検査して exit 0 になり、GA4 は「未取得」と出る', () => {
  const root = fixtureRoot();
  try {
    const r = run(root, ['--json']);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.checkedUnits, 1);
    assert.deepEqual(out.errors, []);
    assert.ok(out.infos.some((m) => /GA4 UI.*未取得/.test(m)));
    const gsc = out.channels.find((c) => c.channel === 'gsc-ui');
    assert.equal(gsc.unitFiles, 1);
    assert.equal(gsc.historyRuns, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('GA4 のマーカーも無い場合も未取得と出して GSC を検査する', () => {
  const root = fixtureRoot({ ga4Marker: false });
  try {
    const r = run(root, ['--json']);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(JSON.parse(r.stdout).infos.some((m) => /GA4 UI.*未取得/.test(m)));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('GSC の marker と history の runId が食い違えば従来どおり exit 1（検査は GA4 の未取得に巻き込まれない）', () => {
  const root = fixtureRoot();
  try {
    write(root, 'gsc/ui-history.json', { schemaVersion: 1, channel: 'gsc-ui', runs: [{ runId: '2026-01-01T00-00-00Z' }] });
    const r = run(root, ['--json']);
    assert.equal(r.status, 1);
    assert.ok(JSON.parse(r.stdout).errors.some((m) => /不一致/.test(m)));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
