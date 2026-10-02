import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DATASETS, datasetPath, patternOf } from '../scripts/lib/datasets.mjs';
import {
  FAMILIES,
  POLICIES,
  collectPins,
  filterWeeklyIndex,
  isDated,
  isExcluded,
  plan,
  policiesFor,
  snapshotStamp,
} from '../scripts/lib/prune-state-snapshots.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(REPO, 'scripts', 'prune-state-snapshots.mjs');
const NOW = Date.parse('2026-09-14T00:00:00Z');
const day = (n) => new Date(NOW - n * 86400000).toISOString().slice(0, 19).replace(/:/g, '-');

const psi = (ts) => datasetPath('psi.batch', { ts });
/** 日ごとのレポート（GA4・GSC の週次取得）。n 日前の日付のファイル */
const dayReport = (source, n) => datasetPath(`${source}.reports`, { date: day(n).slice(0, 10) });
const week = (w) => datasetPath('business.weekly', { week: `2026-W${String(w).padStart(2, '0')}` });
const WEEK_INDEX = datasetPath('business.weekly-index');
const BUSINESS = datasetPath('business.snapshot', { ts: '2026-09-13T02-22-01-130Z', uuid: '8275f38f-bcf9-499a-a79e-9753bc204570' });
const RANK = datasetPath('gsc.rank-watch', { month: '2026-08' });

test('snapshotStamp: 4 種の日付形式を読み、無日付は null', () => {
  assert.equal(snapshotStamp('2026-09-06T18-53-31.json').stamp, '2026-09-06T18-53-31');
  assert.equal(snapshotStamp('crosswalk-20260701_20260628.json').stamp, '2026-07-01T00-00-00');
  assert.equal(snapshotStamp('2026-W37.json').stamp, '2026-09-07T00-00-00'); // ISO 週の月曜
  assert.equal(snapshotStamp('2026-09-08.json').stamp, '2026-09-08T00-00-00');
  assert.equal(snapshotStamp('psi-report.md'), null);
  assert.equal(snapshotStamp('history.json'), null);
  assert.equal(isDated(datasetPath('analysis.psi-report')), false);
});

test('寿命の宣言は台帳の retain から作り、family は既知・規則は 1 種類だけ', () => {
  assert.ok(POLICIES.length > 0);
  for (const p of POLICIES) {
    const rules = ['keepNewest', 'maxAgeDays', 'keepAll'].filter((k) => p.rule[k]);
    assert.equal(rules.length, 1, `${p.dataset} の retain は keepNewest / maxAgeDays / keepAll のどれか 1 つ`);
    assert.ok(typeof p.family === 'string' && p.family, `${p.dataset} に family が無い`);
    const x = DATASETS.find((d) => d.id === p.dataset);
    assert.ok(!x.immutable && !x.local, `${p.dataset}: 中身を変えない台帳・手元だけのデータに寿命は書かない`);
    if (p.rule.index) assert.ok(DATASETS.some((d) => d.id === p.rule.index), `${p.dataset} の index ${p.rule.index} が台帳に無い`);
  }
  // ワークフロー（main の YAML）が --family で渡す名前は残す
  for (const f of ['psi', 'ga4', 'gsc', 'monetization', 'crosswalk', 'weekly-metrics', 'growth', 'bing', 'url-inspection', 'cloudflare', 'instagram']) assert.ok(FAMILIES.includes(f), f);
  assert.equal(policiesFor(psi('2026-09-06T18-53-31')).length, 1);
  assert.equal(policiesFor('data/psi/batch/unknown-2026-09-06T18-53-31.json').length, 0);
});

test('plan: keepNewest は新しい N 件だけ残し、中身を変えない台帳は決して delete にならない', () => {
  const files = [];
  for (let i = 0; i < 20; i++) files.push(psi(day(i)));
  files.push(datasetPath('analysis.psi-report'));
  files.push(BUSINESS, RANK);
  const r = plan({ files, now: NOW });
  const del = r.entries.filter((e) => e.decision === 'delete').map((e) => e.file);
  assert.equal(r.summary.delete, 6);
  assert.equal(r.summary.keep, 14);
  assert.equal(r.summary.excluded, 2);
  assert.ok(del.every((f) => !isExcluded(f)));
  assert.ok(del.includes(psi(day(19))));
  assert.ok(!del.includes(psi(day(13))));
  assert.ok(!r.entries.some((e) => e.file.endsWith('.md')), '無日付ファイルは対象にしない');
  assert.ok(isExcluded(BUSINESS) && isExcluded(RANK));
});

test('plan: maxAgeDays はデータセットごとに最新 1 件を残し、pin と月次の by-label を持つ日も残す', () => {
  const monthly = dayReport('ga4', 200);
  const files = [
    monthly, // 月次の by-label を持つ → 古くても残る
    dayReport('ga4', 120), // 古い → 消える
    dayReport('ga4', 10),
    dayReport('gsc', 100), // pin → 残る
    dayReport('gsc', 95), // 古い → 消える
    dayReport('gsc', 1),
  ];
  const readJson = (f) => (f === monthly ? { reports: { 'cta-clicks-by-label:month': { meta: { windowKind: 'month' } } } } : { reports: {} });
  const pins = new Set([dayReport('gsc', 100)]);
  const r = plan({ files, now: NOW, pins, readJson });
  const by = Object.fromEntries(r.entries.map((e) => [e.file, e]));
  assert.equal(by[monthly].decision, 'keep');
  assert.match(by[monthly].reason, /windowKind=month/);
  assert.equal(by[dayReport('ga4', 120)].decision, 'delete');
  assert.equal(by[dayReport('ga4', 10)].decision, 'keep');
  assert.equal(by[dayReport('gsc', 100)].reason, 'pinned by name');
  assert.equal(by[dayReport('gsc', 95)].decision, 'delete');
  assert.equal(by[dayReport('gsc', 1)].decision, 'keep');
});

test('plan: 日ごとのレポートは、各種類の最新を含む日を古くても残す（一度しか取っていない種類を消さない）', () => {
  const onlySource = dayReport('ga4', 300);
  const files = [onlySource, dayReport('ga4', 200), dayReport('ga4', 1)];
  const readJson = (f) => ({ reports: f === onlySource ? { source: {}, page: {} } : { page: {} } });
  const r = plan({ files, now: NOW, readJson });
  const by = Object.fromEntries(r.entries.map((e) => [e.file, e]));
  assert.equal(by[onlySource].decision, 'keep');
  assert.match(by[onlySource].reason, /newest of source/);
  assert.equal(by[dayReport('ga4', 200)].decision, 'delete');
});

test('plan: 寿命の無い日付付きファイルは undeclared として数え、消さない。--family は他 family を skipped にする', () => {
  const mystery = `data/psi/batch/mystery-${day(1)}.json`;
  const files = [mystery, psi(day(1)), dayReport('ga4', 1)];
  const r = plan({ files, now: NOW, families: ['psi'] });
  assert.deepEqual(r.summary.undeclared, [mystery]);
  assert.equal(r.summary.skipped, 1);
  assert.equal(r.summary.delete, 0);
});

test('plan: 週次は 26 週を残し索引の書き直し指示を返す。filterWeeklyIndex が weeks を落とす', () => {
  const files = [];
  for (let w = 1; w <= 30; w++) files.push(week(w));
  files.push(WEEK_INDEX);
  const r = plan({ files, now: NOW });
  assert.equal(r.summary.delete, 4);
  assert.equal(r.indexRewrites.length, 1);
  assert.equal(r.indexRewrites[0].index, WEEK_INDEX);
  const idx = { version: 1, weeks: files.filter((f) => f !== WEEK_INDEX).map((p) => ({ week_id: p.slice(-12, -5), path: p })) };
  const next = filterWeeklyIndex(idx, r.indexRewrites[0].removed);
  assert.equal(next.weeks.length, 26);
  assert.ok(!next.weeks.some((w) => w.path.endsWith('2026-W01.json')));
});

test('collectPins: seo-watchwords の gsc evidence と business 台帳が指すパスを拾い、移す前の名前は今の置き場へ読み替える', () => {
  const legacy = 'data/metrics/gsc/gsc-page-query-2026-09-10T22-51-42.json';
  const pins = collectPins({
    watchwords: { watchwords: [{ evidence: { kind: 'gsc', source: legacy } }, { evidence: { kind: 'hypothesis', source: '仮説' } }] },
    businessDocs: [`{"sources":[{"file":"${BUSINESS}"},{"file":"data/sales/sales-log.json"}]}`],
  });
  assert.deepEqual([...pins].sort(), [BUSINESS, 'data/gsc/reports/2026-09-11.json', 'data/note/sales.json'].sort(), '取得時刻の JST の日のファイル');
});

test('CLI: 実 repo で --check-coverage が未宣言 0 で exit 0（数を出力）', () => {
  const out = execFileSync(process.execPath, [CLI, '--check-coverage'], { cwd: REPO, encoding: 'utf8' });
  assert.match(out, /日付付き \d+ 件を実検査/);
  assert.match(out, /未宣言 0/);
  assert.match(out, /寿命が宣言されている/);
});

test('CLI: 一時 repo で --commit が計画どおり unlink し、中身を変えない台帳と索引を正しく扱う', () => {
  const root = mkdtempSync(join(tmpdir(), 'prune-state-'));
  try {
    execFileSync('git', ['init', '-q', root]);
    const put = (rel, body = '{}') => {
      mkdirSync(join(root, dirname(rel)), { recursive: true });
      writeFileSync(join(root, rel), body);
    };
    for (let i = 0; i < 16; i++) put(psi(day(i)));
    put(BUSINESS, '{"sources":[]}');
    put(RANK);
    for (let w = 1; w <= 28; w++) put(week(w));
    put(WEEK_INDEX, JSON.stringify({ version: 1, weeks: Array.from({ length: 28 }, (_, i) => ({ week_id: `2026-W${String(i + 1).padStart(2, '0')}`, path: week(i + 1) })) }));
    execFileSync('git', ['-C', root, 'add', '-A']);
    execFileSync('git', ['-C', root, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'seed']);
    // psi の最新 1 件は untracked（workflow の書き戻し直後と同じ状態）。本文を変え rename 検出を避ける
    const newest = psi('2026-09-14T12-00-00');
    put(newest, '{"generated_at":"2026-09-14T12:00:00Z"}');

    const j = JSON.parse(execFileSync(process.execPath, [CLI, '--root', root, '--json', '--now', '2026-09-14T13:00:00Z'], { encoding: 'utf8' }));
    assert.equal(j.summary.delete, 3 + 2); // psi 17 → 14, 週次 28 → 26
    assert.equal(j.summary.excluded, 2);

    const out = execFileSync(process.execPath, [CLI, '--root', root, '--commit', '--now', '2026-09-14T13:00:00Z'], { encoding: 'utf8' });
    assert.match(out, /✓ 5 件を削除/);
    assert.ok(existsSync(join(root, newest)), 'untracked の最新は残る');
    assert.ok(!existsSync(join(root, psi(day(15)))));
    assert.ok(!existsSync(join(root, psi(day(14)))));
    assert.ok(existsSync(join(root, psi(day(12)))));
    assert.ok(existsSync(join(root, BUSINESS)) && existsSync(join(root, RANK)));
    const idx = JSON.parse(readFileSync(join(root, WEEK_INDEX), 'utf8'));
    assert.equal(idx.weeks.length, 26);
    assert.ok(!existsSync(join(root, week(1))));
    // add -A が削除も stage する（workflow の前提）
    execFileSync('git', ['-C', root, 'add', '-A', '--', 'data']);
    const staged = execFileSync('git', ['-C', root, '-c', 'core.quotepath=false', 'diff', '--cached', '--name-status', '--no-renames'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    assert.match(staged, new RegExp(`^D\\t${psi(day(15)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm'));
    assert.match(staged, new RegExp(`^A\\t${newest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm'));
    assert.ok(!staged.includes(BUSINESS) && !staged.includes(RANK), '中身を変えない台帳に差分が無い');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('寿命のあるデータセットのパスは日付の型を持つ（日付の無いファイルに寿命を書いても効かない）', () => {
  for (const p of POLICIES) {
    const { path } = DATASETS.find((d) => d.id === p.dataset);
    assert.ok(/\{(ts|date|week|range)\}/.test(path), `${p.dataset}（${path}）に日付の型が無い`);
    assert.ok(patternOf(path).test(path.replace('{ts}', '2026-01-01T00-00-00').replace('{date}', '2026-01-01').replace('{week}', '2026-W01').replace('{range}', '20260101_20260131').replace('{name}', 'x').replace('{**}', 'x')));
  }
});
