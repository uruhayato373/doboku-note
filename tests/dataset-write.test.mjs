/**
 * scripts/lib/dataset-write.mjs — 台帳の id で設定・記録を書く。型の検査・immutable・書式・「同じなら書かない」を 1 か所で守らせる。
 * （型の検査に zod を使うので、npm ci をしないワークフローが読むファイルからは import しない。
 *  tests/workflow-zero-dependency.test.mjs が止める。そうした経路の書き込みは json-io.mjs の writeJson）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendDataset, writeDataset } from '../scripts/lib/dataset-write.mjs';
import { readDataset } from '../scripts/lib/dataset-io.mjs';
import { datasetFiles } from '../scripts/lib/datasets.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

function withRoot(fn) {
  const root = mkdtempSync(join(tmpdir(), 'dataset-write-'));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('writeDataset: 型のあるデータセットは検査してから書き、合わなければ 1 バイトも書かない', () => {
  withRoot((root) => {
    assert.throws(() => writeDataset(root, 'note.sales', { version: 1 }), /note\.sales: 書く中身が型（NoteSalesLog）に合わないので書かない — .*:/);
    assert.equal(existsSync(join(root, 'data')), false, '検査に落ちたら親ディレクトリも作らない');
    // 型が空の値を通さない（型が変わっても、空のオブジェクトは通らない）
    assert.throws(() => writeDataset(root, 'note.sales', {}), /型（NoteSalesLog）に合わない/);
  });
});

test('writeDataset: リポジトリの本物の記録（CI が型で検査済み）は通り、バイトは JSON.stringify(値, null, 2) + LF', () => {
  withRoot((root) => {
    const real = readDataset(REPO, 'note.sales');
    const r = writeDataset(root, 'note.sales', real);
    assert.deepEqual(r, { file: 'data/note/sales.json', changed: true });
    assert.equal(readFileSync(join(root, r.file), 'utf8'), `${JSON.stringify(real, null, 2)}\n`);
    // 同じ値をもう一度書いても何もしない
    const before = statSync(join(root, r.file)).mtimeMs;
    assert.deepEqual(writeDataset(root, 'note.sales', real), { file: 'data/note/sales.json', changed: false });
    assert.equal(statSync(join(root, r.file)).mtimeMs, before);
  });
});

test('writeDataset: 型の検査はファイルに入る中身で行う（undefined の欄は落ちる）', () => {
  withRoot((root) => {
    const real = readDataset(REPO, 'note.sales');
    assert.equal(writeDataset(root, 'note.sales', { ...real, someUndefined: undefined }).changed, true);
  });
});

test('writeDataset: immutable（中身を変えない台帳）の既存ファイルは上書きしない。同じ中身なら何もしない', () => {
  // 不変の台帳はどれも型があるので、型に通る本物の記録（2026-08 の突合）を元にする
  const real = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data/business/records/site-to-sales-2026-08.json'), 'utf8'));
  const edited = { ...real, limitations: [...real.limitations, '訂正の試し'] };
  withRoot((root) => {
    const values = { month: '2026-08', rev: '' };
    const first = writeDataset(root, 'business.site-to-sales', real, { values });
    assert.deepEqual(first, { file: 'data/business/records/site-to-sales-2026-08.json', changed: true });
    assert.deepEqual(writeDataset(root, 'business.site-to-sales', real, { values }), { file: first.file, changed: false });
    assert.throws(() => writeDataset(root, 'business.site-to-sales', edited, { values }), /中身を変えない記録（immutable）/);
    assert.equal(readFileSync(join(root, first.file), 'utf8'), `${JSON.stringify(real, null, 2)}\n`, '上書きされていない');
    // 訂正は別の版（-r2）として新しく作る
    assert.equal(writeDataset(root, 'business.site-to-sales', edited, { values: { month: '2026-08', rev: '-r2' } }).changed, true);
  });
});

test('writeDataset: 同じ中身のファイルが CRLF で残っていても書き直す。可変部分の欠け・台帳に無い id・値の型違いは投げる', () => {
  withRoot((root) => {
    mkdirSync(join(root, 'config'), { recursive: true });
    writeFileSync(join(root, 'config/exam-stats.json'), '{\r\n  "a": 1\r\n}\r\n');
    assert.equal(writeDataset(root, 'config.exam-stats', { a: 1 }).changed, true, '型の無いデータセット（config.exam-stats）で書式だけを見る');
    assert.equal(readFileSync(join(root, 'config/exam-stats.json'), 'utf8'), '{\n  "a": 1\n}\n');
    assert.throws(() => writeDataset(root, 'bing.snapshots', {}), /\{date\} の値が要る/);
    assert.throws(() => writeDataset(root, 'no.such-dataset', {}), /台帳に無いデータセット/);
    assert.throws(() => writeDataset(root, 'youtube.posted', { not: 'an array' }), /行の配列で渡す/);
    assert.throws(() => writeDataset(root, 'config.psi-urls', { not: 'a string' }), /文字列で渡す/);
    assert.deepEqual(writeDataset(root, 'config.psi-urls', 'https://example.com/\n'), { file: 'config/psi-urls.txt', changed: true });
  });
});

test('writeDataset: JSON Lines は行の配列を 1 行 1 件で書く（型の検査つき）', () => {
  withRoot((root) => {
    const real = readDataset(REPO, 'youtube.posted');
    assert.ok(real.length > 0, '本物の記録（検査ゼロを PASS にしない）');
    const r = writeDataset(root, 'youtube.posted', real);
    assert.equal(readFileSync(join(root, r.file), 'utf8'), real.map((row) => `${JSON.stringify(row)}\n`).join(''));
    assert.throws(() => writeDataset(root, 'youtube.posted', [{ key: 'only-a-key' }]), /型（YoutubePosted）に合わない/);
  });
});

test('appendDataset: 型を検査して 1 行追記し、前の行は変えない。最後が改行で終わらないファイルは行を繋げない', () => {
  withRoot((root) => {
    const rows = datasetFiles(REPO, 'gsc.rank-watch');
    assert.ok(rows.length > 0, '本物の追記台帳（検査ゼロを PASS にしない）');
    const real = readFileSync(join(REPO, rows[0]), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const month = rows[0].match(/(\d{4}-\d{2})\.jsonl$/)[1];
    const [a, b] = real;
    assert.deepEqual(appendDataset(root, 'gsc.rank-watch', a, { values: { month } }), { file: `data/gsc/rank-watch/${month}.jsonl` });
    appendDataset(root, 'gsc.rank-watch', b, { values: { month } });
    const file = join(root, `data/gsc/rank-watch/${month}.jsonl`);
    assert.equal(readFileSync(file, 'utf8'), `${JSON.stringify(a)}\n${JSON.stringify(b)}\n`);
    // 末尾の改行が欠けたファイルへ足しても 1 行に繋がらない
    writeFileSync(file, JSON.stringify(a));
    appendDataset(root, 'gsc.rank-watch', b, { values: { month } });
    assert.equal(readFileSync(file, 'utf8'), `${JSON.stringify(a)}\n${JSON.stringify(b)}\n`);
    // 型に合わない行は書かない
    const size = statSync(file).size;
    assert.throws(() => appendDataset(root, 'gsc.rank-watch', { recordId: 'x' }, { values: { month } }), /追記する 1 行が型（RankWatch）に合わない/);
    assert.equal(statSync(file).size, size);
  });
});

test('appendDataset: JSON Lines 以外・可変部分の欠けは投げ、何も作らない', () => {
  withRoot((root) => {
    assert.throws(() => appendDataset(root, 'note.sales', {}), /JSON Lines（\.jsonl）だけ/);
    assert.throws(() => appendDataset(root, 'gsc.rank-watch', {}), /\{month\} の値が要る/);
    assert.deepEqual(readdirSync(root), []);
  });
});
