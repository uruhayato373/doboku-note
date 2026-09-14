import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  EXCLUDED_DIRS,
  FAMILIES,
  POLICIES,
  collectPins,
  filterWeeklyIndex,
  isDated,
  isExcluded,
  plan,
  policiesFor,
  prefixOf,
  snapshotStamp,
} from '../scripts/lib/prune-state-snapshots.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(REPO, 'scripts', 'prune-state-snapshots.mjs');
const NOW = Date.parse('2026-09-14T00:00:00Z');
const day = (n) => new Date(NOW - n * 86400000).toISOString().slice(0, 19).replace(/:/g, '-');

const M = '.claude/state/metrics';
const W = '.claude/state/weekly-metrics';

test('snapshotStamp: 4 種の日付形式を読み、無日付は null', () => {
  assert.equal(snapshotStamp('psi-batch-2026-09-06T18-53-31.json').stamp, '2026-09-06T18-53-31');
  assert.equal(snapshotStamp('crosswalk-20260701_20260628.json').stamp, '2026-07-01T00-00-00');
  assert.equal(snapshotStamp('2026-W37.json').stamp, '2026-09-07T00-00-00'); // ISO 週の月曜
  assert.equal(snapshotStamp('opportunities-2026-09-08.json').stamp, '2026-09-08T00-00-00');
  assert.equal(snapshotStamp('latest-report.md'), null);
  assert.equal(snapshotStamp('history.json'), null);
  assert.equal(isDated(`${M}/psi/latest-report.md`), false);
});

test('prefixOf: 日付以降を落とし、series ごとの grouping key になる', () => {
  assert.equal(prefixOf('ga4-cta-clicks-by-label-2026-09-10T22-51-47.json'), 'ga4-cta-clicks-by-label');
  assert.equal(prefixOf('bot-audit-2026-09-10T22-51-47Z.json'), 'bot-audit');
  assert.equal(prefixOf('gsc-page-query-2026-09-10T22-51-42.json'), 'gsc-page-query');
});

test('POLICIES: family 名が既知で、同じ dir の match が互いに排他（1 ファイル 1 policy）', () => {
  const samples = [
    `${M}/psi/psi-batch-2026-09-06T18-53-31.json`,
    `${M}/psi/psi-single-2026-09-06T18-53-31.json`,
    `${M}/ga4/ga4-channel-2026-09-06T18-53-31.json`,
    `${M}/ga4/bot-audit-2026-09-06T18-53-31.json`,
    `${M}/gsc/gsc-page-query-2026-09-10T22-51-42.json`,
    `${M}/gsc/coverage-diagnosis-2026-04-27T11-50-08.md`,
    `${M}/url-inspection/inspection-batch-2026-09-01T02-00-00.json`,
    `${M}/monetization/coverage-2026-09-14T01-02-28.json`,
    `${M}/crosswalk/crosswalk-20260701_20260628.json`,
    `${W}/2026-W37.json`,
    `${M}/gsc-ui/ssot/diff/2026-08-22T07-46-59Z.json`,
  ];
  for (const s of samples) assert.equal(policiesFor(s).length, 1, s);
  assert.ok(FAMILIES.includes('psi') && FAMILIES.includes('weekly-metrics'));
  assert.equal(policiesFor(`${M}/psi/unknown-series-2026-09-06T18-53-31.json`).length, 0);
});

test('plan: keepNewest は新しい N 件だけ残し、除外 dir は決して delete にならない', () => {
  const files = [];
  for (let i = 0; i < 20; i++) files.push(`${M}/psi/psi-batch-${day(i)}.json`);
  files.push(`${M}/psi/latest-report.md`);
  files.push(`${M}/business/snapshot-2026-09-13T02-22-01-130Z-8275f38f-bcf9-499a-a79e-9753bc204570.json`);
  files.push(`${M}/gsc/rank-watch/watch-2026-08-01T00-00-00-000Z-abcdef12.json`);
  const r = plan({ files, now: NOW });
  const del = r.entries.filter((e) => e.decision === 'delete').map((e) => e.file);
  assert.equal(r.summary.delete, 6);
  assert.equal(r.summary.keep, 14);
  assert.equal(r.summary.excluded, 2);
  assert.ok(del.every((f) => !isExcluded(f)));
  assert.ok(del.includes(`${M}/psi/psi-batch-${day(19)}.json`));
  assert.ok(!del.includes(`${M}/psi/psi-batch-${day(13)}.json`));
  assert.ok(!r.entries.some((e) => e.file.endsWith('latest-report.md')), '無日付ファイルは対象にしない');
  for (const d of EXCLUDED_DIRS) assert.ok(r.entries.some((e) => e.file.startsWith(d) && e.decision === 'excluded'));
});

test('plan: maxAgeDays は prefix ごとに最新 1 件を残し、pin と monthly by-label も残す', () => {
  const files = [
    `${M}/ga4/ga4-channel-${day(200)}.json`, // 唯一の ga4-channel → 古くても残る
    `${M}/ga4/ga4-page-${day(200)}.json`, // 古い方 → 消える
    `${M}/ga4/ga4-page-${day(10)}.json`,
    `${M}/ga4/ga4-cta-clicks-by-label-${day(150)}.json`, // monthly → 残る
    `${M}/ga4/ga4-cta-clicks-by-label-${day(120)}.json`, // days & 古い → 消える
    `${M}/ga4/ga4-cta-clicks-by-label-${day(5)}.json`,
    `${M}/gsc/gsc-page-query-${day(100)}.json`, // pinned → 残る
    `${M}/gsc/gsc-page-query-${day(95)}.json`, // 古い → 消える
    `${M}/gsc/gsc-page-query-${day(1)}.json`,
  ];
  const monthly = `${M}/ga4/ga4-cta-clicks-by-label-${day(150)}.json`;
  const readJson = (f) => ({ meta: { windowKind: f === monthly ? 'month' : 'days' } });
  const pins = new Set([`${M}/gsc/gsc-page-query-${day(100)}.json`]);
  const r = plan({ files, now: NOW, pins, readJson });
  const by = Object.fromEntries(r.entries.map((e) => [e.file, e]));
  assert.equal(by[`${M}/ga4/ga4-channel-${day(200)}.json`].decision, 'keep');
  assert.equal(by[`${M}/ga4/ga4-page-${day(200)}.json`].decision, 'delete');
  assert.equal(by[monthly].decision, 'keep');
  assert.match(by[monthly].reason, /windowKind=month/);
  assert.equal(by[`${M}/ga4/ga4-cta-clicks-by-label-${day(120)}.json`].decision, 'delete');
  assert.equal(by[`${M}/gsc/gsc-page-query-${day(100)}.json`].decision, 'keep');
  assert.equal(by[`${M}/gsc/gsc-page-query-${day(100)}.json`].reason, 'pinned by name');
  assert.equal(by[`${M}/gsc/gsc-page-query-${day(95)}.json`].decision, 'delete');
});

test('plan: 未宣言の日付付きファイルは undeclared として数え、消さない。--family は他 family を skipped にする', () => {
  const files = [`${M}/psi/mystery-${day(1)}.json`, `${M}/psi/psi-batch-${day(1)}.json`, `${M}/ga4/ga4-date-${day(1)}.json`];
  const r = plan({ files, now: NOW, families: ['psi'] });
  assert.deepEqual(r.summary.undeclared, [`${M}/psi/mystery-${day(1)}.json`]);
  assert.equal(r.summary.skipped, 1);
  assert.equal(r.summary.delete, 0);
});

test('plan: weekly-metrics は 26 週を残し index.json の書き直し指示を返す。filterWeeklyIndex が weeks を落とす', () => {
  const files = [];
  for (let w = 1; w <= 30; w++) files.push(`${W}/2026-W${String(w).padStart(2, '0')}.json`);
  files.push(`${W}/index.json`);
  const r = plan({ files, now: NOW });
  assert.equal(r.summary.delete, 4);
  assert.equal(r.indexRewrites.length, 1);
  assert.equal(r.indexRewrites[0].index, `${W}/index.json`);
  const idx = { version: 1, weeks: files.filter((f) => f !== `${W}/index.json`).map((p) => ({ week_id: p.slice(-12, -5), path: p })) };
  const next = filterWeeklyIndex(idx, r.indexRewrites[0].removed);
  assert.equal(next.weeks.length, 26);
  assert.ok(!next.weeks.some((w) => w.path.endsWith('2026-W01.json')));
});

test('collectPins: seo-watchwords の gsc evidence と business 台帳の metrics パスを拾う', () => {
  const pins = collectPins({
    watchwords: { watchwords: [{ evidence: { kind: 'gsc', source: `${M}/gsc/gsc-page-query-2026-09-10T22-51-42.json` } }, { evidence: { kind: 'hypothesis', source: '仮説' } }] },
    businessDocs: [`{"sources":[{"file":"${M}/business/measurement-x.json"},{"file":".claude/state/sales/sales-log.json"}]}`],
  });
  assert.deepEqual([...pins].sort(), [`${M}/business/measurement-x.json`, `${M}/gsc/gsc-page-query-2026-09-10T22-51-42.json`]);
});

test('CLI: 実 repo で --check-coverage が未宣言 0 で exit 0（除外 dir は保持・数を出力）', () => {
  const out = execFileSync(process.execPath, [CLI, '--check-coverage'], { cwd: REPO, encoding: 'utf8' });
  assert.match(out, /日付付き \d+ 件を実検査/);
  assert.match(out, /未宣言 0/);
  assert.match(out, /寿命が宣言されている/);
});

test('CLI: 一時 repo で --commit が計画どおり unlink し、除外 dir と index.json を正しく扱う', () => {
  const root = mkdtempSync(join(tmpdir(), 'prune-state-'));
  try {
    execFileSync('git', ['init', '-q', root]);
    const put = (rel, body = '{}') => {
      mkdirSync(join(root, dirname(rel)), { recursive: true });
      writeFileSync(join(root, rel), body);
    };
    for (let i = 0; i < 16; i++) put(`${M}/psi/psi-batch-${day(i)}.json`);
    put(`${M}/business/snapshot-2026-09-13T02-22-01-130Z-8275f38f-bcf9-499a-a79e-9753bc204570.json`, '{"sources":[]}');
    put(`${M}/gsc/rank-watch/watch-2026-08-01T00-00-00-000Z-abcdef12.json`);
    for (let w = 1; w <= 28; w++) put(`${W}/2026-W${String(w).padStart(2, '0')}.json`);
    put(`${W}/index.json`, JSON.stringify({ version: 1, weeks: Array.from({ length: 28 }, (_, i) => ({ week_id: `2026-W${String(i + 1).padStart(2, '0')}`, path: `${W}/2026-W${String(i + 1).padStart(2, '0')}.json` })) }));
    // psi-batch の最新 1 件は untracked（workflow の copy-back 直後と同じ状態）
    execFileSync('git', ['-C', root, 'add', '-A']);
    execFileSync('git', ['-C', root, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'seed']);
    put(`${M}/psi/psi-batch-2026-09-14T12-00-00.json`, '{"generated_at":"2026-09-14T12:00:00Z"}'); // 本文を変え rename 検出を避ける

    const dry = execFileSync(process.execPath, [CLI, '--root', root, '--json', '--now', '2026-09-14T13:00:00Z'], { encoding: 'utf8' });
    const j = JSON.parse(dry);
    assert.equal(j.summary.delete, 3 + 2); // psi 17 → 14, weekly 28 → 26
    assert.equal(j.summary.excluded, 2);

    const out = execFileSync(process.execPath, [CLI, '--root', root, '--commit', '--now', '2026-09-14T13:00:00Z'], { encoding: 'utf8' });
    assert.match(out, /✓ 5 件を削除/);
    assert.ok(existsSync(join(root, `${M}/psi/psi-batch-2026-09-14T12-00-00.json`)), 'untracked の最新は残る');
    assert.ok(!existsSync(join(root, `${M}/psi/psi-batch-${day(15)}.json`)));
    assert.ok(!existsSync(join(root, `${M}/psi/psi-batch-${day(14)}.json`)));
    assert.ok(existsSync(join(root, `${M}/psi/psi-batch-${day(12)}.json`)));
    assert.ok(existsSync(join(root, `${M}/business/snapshot-2026-09-13T02-22-01-130Z-8275f38f-bcf9-499a-a79e-9753bc204570.json`)));
    assert.ok(existsSync(join(root, `${M}/gsc/rank-watch/watch-2026-08-01T00-00-00-000Z-abcdef12.json`)));
    const idx = JSON.parse(readFileSync(join(root, `${W}/index.json`), 'utf8'));
    assert.equal(idx.weeks.length, 26);
    assert.ok(!existsSync(join(root, `${W}/2026-W01.json`)));
    // git add <dir> が削除を stage する（workflow の前提）
    execFileSync('git', ['-C', root, 'add', `${M}/psi`, W]);
    const staged = execFileSync('git', ['-C', root, 'diff', '--cached', '--name-status', '--no-renames'], { encoding: 'utf8' });
    assert.match(staged, /^D\t.*psi-batch-/m);
    assert.match(staged, /^A\t.*psi-batch-2026-09-14T12-00-00\.json/m);
    // 除外 dir に差分が無い
    const status = execFileSync('git', ['-C', root, 'status', '--porcelain', '--', `${M}/business`, `${M}/gsc/rank-watch`], { encoding: 'utf8' });
    assert.equal(status.trim(), '');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('POLICIES の dir はすべて SCAN_ROOTS 配下で、除外 dir と重ならない', () => {
  for (const p of POLICIES) {
    assert.ok(p.dir.startsWith(M) || p.dir.startsWith(W), p.dir);
    assert.ok(!isExcluded(p.dir + '/x.json'), `${p.dir} は除外 dir と重複`);
  }
});
