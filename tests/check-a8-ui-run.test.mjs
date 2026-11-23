import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { auditA8 } from '../scripts/checks/check-a8-ui-run.mjs';
import { exitCodeOf } from '../scripts/lib/run-audit.mjs';

function put(root, rel, data) {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data));
}

const cfg = { a8: { targetSite: 'doboku-note', mediaId: 'a1', csvEncoding: 'shift_jis' } };
const good = {
  siteSummary: [{ site: 'doboku-note', period: '202611', clicks: 10 }],
  monthly: [{ month: '2026-11', accountWide: true }],
  daily: [{ date: '2026-11-01', accountWide: true }],
  programPeriod: [{ programId: 'p1', period: '202611' }],
  crossCheck: { comparable: true, exceeded: false, hasShortfall: false, deltas: { clicks: { site: 10, delta: 0 } } },
  missingProgramCandidates: [],
};

function root(log) {
  const r = mkdtempSync(join(tmpdir(), 'a8-run-'));
  put(r, 'config/a8-report-automation.json', cfg);
  if (log) put(r, 'data/a8/report-log.json', log);
  return r;
}

test('台帳が正常なら FAIL 0・実検査数が出て exit 0（run が無くても台帳層だけで判定）', () => {
  const r = auditA8({ root: root(good) });
  assert.deepEqual(r.fail, []);
  assert.ok(r.checked >= 6);
  assert.equal(exitCodeOf(r), 0);
});

test('自サイト行なし・重複キー・accountWide 消失・想定外の超過は FAIL（exit 1）', () => {
  const bad = {
    ...good,
    siteSummary: [{ site: 'stats47', period: '202611' }],
    monthly: [{ month: '2026-11' }, { month: '2026-11', accountWide: true }],
    crossCheck: { comparable: true, exceeded: true, hasShortfall: false, deltas: { clicks: { site: 10, delta: 9 } } },
  };
  const r = auditA8({ root: root(bad) });
  assert.ok(r.fail.some((m) => m.includes('doboku-note の行が無い')));
  assert.ok(r.fail.some((m) => m.includes('重複キー')));
  assert.ok(r.fail.some((m) => m.includes('accountWide')));
  assert.ok(r.fail.some((m) => m.includes('超過が想定外')));
  assert.equal(exitCodeOf(r), 1);
});

test('run の mediaId 不一致と site-summary の取得失敗は FAIL（台帳の lastRun の run を見る）', () => {
  const r0 = root({ ...good, lastRun: '2026-11-01T00-00-00Z' });
  put(r0, 'data/a8/ui/2026-11-01T00-00-00Z/manifest.json', { mediaId: 'other', status: 'ok', units: [{ reportKey: 'site-summary', status: 'download-failed' }] });
  const r = auditA8({ root: r0 });
  assert.ok(r.fail.some((m) => m.includes('mediaId')));
  assert.ok(r.fail.some((m) => m.startsWith('site-summary: status=download-failed')));
  assert.ok(r.warn.some((m) => m.includes('program-detail が manifest に無い')));
  rmSync(r0, { recursive: true });
});

test('台帳も run も無い（対象 0 件）は検査不成立 exit 2', () => {
  const r = auditA8({ root: root(null) });
  assert.equal(r.checked, 0);
  assert.equal(exitCodeOf(r), 2);
});

test('台帳の lastRun でない古い run は既定では見ない（古い失敗で毎週赤くしない）・--run なら見る', () => {
  const r0 = root({ ...good, lastRun: '2026-11-14T00-00-00Z' });
  put(r0, 'data/a8/ui/2026-09-07T00-00-00Z/manifest.json', { mediaId: 'a1', status: 'error', units: [] });
  const r = auditA8({ root: r0 });
  assert.equal(r.runId, null);
  assert.deepEqual(r.fail, []);
  assert.ok(r.info.some((m) => m.includes('手元に無い')));
  assert.ok(auditA8({ root: r0, runId: '2026-09-07T00-00-00Z' }).fail.some((m) => m.includes('status=error')));
  rmSync(r0, { recursive: true });
});

test('成果 0 件の期間（noData・0 行・emptyOk のレポート）は raw なしでも FAIL にしない・emptyOk でないレポートの raw なしは FAIL（DN-1266）', () => {
  const r0 = mkdtempSync(join(tmpdir(), 'a8-run-'));
  put(r0, 'config/a8-report-automation.json', { a8: { ...cfg.a8, reports: { 'result-detail': { emptyOk: true }, 'site-summary': {} } } });
  put(r0, 'data/a8/report-log.json', { ...good, lastRun: '2026-11-21T00-00-00Z' });
  const dir = 'data/a8/ui/2026-11-21T00-00-00Z';
  put(r0, `${dir}/manifest.json`, { mediaId: 'a1', status: 'ok', units: [
    { reportKey: 'result-detail', status: 'downloaded', csvRows: 0, rawFile: null, sha256: null, noData: true, period: { raw: '20261101-20261121' } },
    { reportKey: 'site-summary', status: 'downloaded', csvRows: 0, rawFile: null, sha256: null, noData: true, period: { raw: '202611' } },
  ] });
  put(r0, `${dir}/normalized/result-detail.json`, { rows: [] });
  put(r0, `${dir}/normalized/site-summary.json`, { rows: [] });
  const r = auditA8({ root: r0 });
  assert.ok(!r.fail.some((m) => m.startsWith('result-detail:')));
  assert.ok(r.info.some((m) => m.startsWith('result-detail: 成果 0 件')));
  assert.ok(r.fail.some((m) => m.startsWith('site-summary: rawFile が実在しない')));
  rmSync(r0, { recursive: true });
});
