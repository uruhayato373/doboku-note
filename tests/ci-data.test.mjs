import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { add, changedFiles, restore, save, validateSaved, validateStaged } from '../scripts/ci-data.mjs';
import { datasetDir, datasetPath, latestFile, resolveDataset } from '../scripts/lib/datasets.mjs';
import { REPORT_KINDS } from '../scripts/lib/metric-reports.mjs';

const git = (root, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'core.autocrlf=false', ...args], { cwd: root, encoding: 'utf8' });
const put = (root, rel, body) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), body);
};

const OLD_PSI = 'data/psi/batch/2026-09-01T00-00-00.json';
const NEW_PSI = 'data/psi/batch/2026-10-01T00-00-00.json';
const EXPERIMENTS = 'data/business/experiments.json';
const NOTE_HISTORY = 'data/note/competitors/2026-10-01.json';

/** CI の流れ（書く → 退避 → develop の先頭へ戻す → 書き戻す）を一時リポジトリで再現する */
function repo() {
  const root = mkdtempSync(join(tmpdir(), 'ci-data-'));
  git(root, 'init', '-q');
  put(root, OLD_PSI, '{"v":1}\n');
  put(root, EXPERIMENTS, '{"v":1}\n');
  put(root, 'data/note/status.json', '{"v":1}\n');
  put(root, 'content/a.txt', 'a\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'init');
  // ジョブが書いたもの: 新しい batch・既存の書き換え・古い batch の削除・別チャネルの履歴
  put(root, NEW_PSI, '{"v":2}\n');
  put(root, EXPERIMENTS, '{"v":2}\n');
  rmSync(join(root, OLD_PSI));
  put(root, NOTE_HISTORY, '{"n":1}\n');
  put(root, 'content/a.txt', 'changed\n');
  return root;
}

test('changedFiles: 追加・変更・削除・未追跡を拾い、根の外は拾わない', () => {
  const root = repo();
  try {
    const got = Object.fromEntries(changedFiles(root, ['data']).map((e) => [e.path, e.deleted]));
    assert.deepEqual(got, { [NEW_PSI]: false, [EXPERIMENTS]: false, [OLD_PSI]: true, [NOTE_HISTORY]: false });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('save → 先頭へ戻す → restore: 書いたものと削除が戻り、除外したデータセットは戻さない', () => {
  const root = repo();
  const dir = mkdtempSync(join(tmpdir(), 'ci-data-out-'));
  try {
    const s = save(root, dir, { paths: ['data'] });
    assert.deepEqual(s, { files: 3, deleted: 1 });
    git(root, 'checkout', '-q', '-f', 'HEAD');
    git(root, 'clean', '-q', '-fd');
    assert.ok(existsSync(join(root, OLD_PSI)) && !existsSync(join(root, NEW_PSI)));

    const r = restore(root, dir, { excludeDatasets: ['business.experiments'] });
    assert.equal(r.files, 2);
    assert.equal(r.deleted, 1);
    assert.equal(r.skipped, 1);
    assert.equal(readFileSync(join(root, NEW_PSI), 'utf8'), '{"v":2}\n');
    assert.ok(!existsSync(join(root, OLD_PSI)), '削除が反映される');
    assert.equal(readFileSync(join(root, EXPERIMENTS), 'utf8'), '{"v":1}\n', '除外したものは develop の版のまま');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test('save: datasets を指定すると、そのデータセットの変更だけを退避する（同じ dir に複数回保存できる）', () => {
  const root = repo();
  const dir = mkdtempSync(join(tmpdir(), 'ci-data-out-'));
  try {
    assert.deepEqual(save(root, dir, { datasets: ['note.competitors'], name: 'note' }), { files: 1, deleted: 0 });
    assert.deepEqual(save(root, dir, { datasets: ['psi.batch'], name: 'psi' }), { files: 1, deleted: 1 });
    git(root, 'checkout', '-q', '-f', 'HEAD');
    git(root, 'clean', '-q', '-fd');
    const r = restore(root, dir);
    assert.equal(r.manifests, 2);
    assert.ok(existsSync(join(root, NOTE_HISTORY)) && existsSync(join(root, NEW_PSI)) && !existsSync(join(root, OLD_PSI)));
    assert.equal(readFileSync(join(root, EXPERIMENTS), 'utf8'), '{"v":1}\n', '指定外は退避しない');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test('add: 無いパスは飛ばし（失敗しない）、削除も stage する。datasets は当たる変更だけ', () => {
  const root = repo();
  try {
    const r = add(root, { paths: ['data/psi', '.claude/state/x-repost'] });
    assert.deepEqual(r.skipped, ['.claude/state/x-repost']);
    const staged = git(root, 'diff', '--cached', '--name-status').trim().split('\n').sort();
    assert.deepEqual(staged, [`A\t${NEW_PSI}`, `D\t${OLD_PSI}`].sort());

    git(root, 'reset', '-q');
    add(root, { datasets: ['note.competitors'] });
    assert.deepEqual(git(root, 'diff', '--cached', '--name-only').trim().split('\n'), [NOTE_HISTORY]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('ワークフローが ci-data に渡す台帳の id は、すべて解決できる（消した id は RETIRED_IDS で後継へ）', () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '.github', 'workflows');
  const ids = new Set();
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.yml'))) {
    const text = readFileSync(join(dir, f), 'utf8');
    for (const m of text.matchAll(/ci-data\.mjs[^\n]*?--(?:exclude-)?datasets\s+([A-Za-z0-9.,-]+)/g)) for (const id of m[1].split(',')) ids.add(id);
    for (const m of text.matchAll(/ci-data\.mjs\s+(?:latest|path|put)\s+([A-Za-z0-9.-]+)/g)) ids.add(m[1]);
  }
  assert.ok(ids.size >= 10, `ワークフローから id を拾えていない（${ids.size} 件）`);
  for (const id of ids) assert.ok(resolveDataset(id) || id in REPORT_KINDS, `ワークフローの id ${id} が台帳に無い（消すなら RETIRED_IDS に後継を書く）`);
});

test('latestFile・datasetDir・datasetPath: 台帳からパスを引く', () => {
  const root = repo();
  try {
    assert.equal(latestFile(root, 'psi.batch'), NEW_PSI);
    assert.equal(latestFile(root, 'gsc.reports'), null);
    assert.equal(datasetDir('psi.batch'), 'data/psi/batch');
    assert.equal(datasetDir('psi.report'), 'data/analysis/psi-report.md', '消した id は後継へ読み替える');
    assert.equal(datasetPath('psi.batch', { ts: '2026-10-01T00-00-00' }), NEW_PSI);
    assert.throws(() => datasetPath('psi.batch', { ts: 'yesterday' }), /型/);
    assert.throws(() => datasetPath('psi.batch'), /値が要る/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('validateStaged: 型のあるデータセットの stage 済みファイルを型で検査し、違反を push の前に返す', () => {
  const root = mkdtempSync(join(tmpdir(), 'ci-data-validate-'));
  try {
    git(root, 'init', '-q');
    const sales = datasetPath('note.sales');
    const real = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', sales), 'utf8');
    put(root, sales, real);
    put(root, 'content/a.txt', 'a\n');
    git(root, 'add', '-A');
    let r = validateStaged(root);
    assert.equal(r.checked, 1, '型のある note.sales だけを検査する（content は対象外）');
    assert.deepEqual(r.errors, []);
    put(root, sales, '{"sales":"壊れた"}\n');
    git(root, 'add', '-A');
    r = validateStaged(root);
    assert.equal(r.checked, 1);
    assert.ok(r.errors.length > 0 && r.errors.every((e) => e.includes('note.sales')), '型に合わない記録を返す');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('validateSaved: 退避した記録を型で検査し、collect の時点で違反を返す（publish で初めて落ちない・DN-0566）', () => {
  const root = mkdtempSync(join(tmpdir(), 'ci-data-saved-'));
  const dir = mkdtempSync(join(tmpdir(), 'ci-data-saved-out-'));
  try {
    git(root, 'init', '-q');
    put(root, 'content/a.txt', 'a\n');
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'init');
    const log = datasetPath('a8.report-log');
    const real = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', log), 'utf8'));
    put(root, log, `${JSON.stringify(real, null, 2)}\n`);
    put(root, 'data/a8/ui/2026-10-07T00-00-00Z/manifest.json', '{"v":1}\n'); // a8.ui-raw（型なし）
    save(root, dir, { paths: ['data'], name: 'a8' });
    let r = validateSaved(dir);
    assert.equal(r.files, 2, '退避したファイルを数える');
    assert.equal(r.checked, 1, '型のある a8.report-log だけを検査する');
    assert.deepEqual(r.errors, []);

    // 型が知らないサイト名の行（2026-10-04〜06 に実際に落ちた形）
    const broken = structuredClone(real);
    broken.siteSummary.push({ ...broken.siteSummary[0], site: '統計で見る都道府県' });
    put(root, log, `${JSON.stringify(broken, null, 2)}\n`);
    rmSync(dir, { recursive: true, force: true });
    save(root, dir, { paths: ['data'], name: 'a8' });
    r = validateSaved(dir);
    assert.equal(r.checked, 1);
    assert.ok(r.errors.length > 0 && r.errors.every((e) => e.includes('a8.report-log')), '型に合わない記録を返す');

    assert.deepEqual(validateSaved(join(dir, 'no-such')), { files: 0, checked: 0, errors: [] }, '退避が無ければ検査 0 件と返す');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});
