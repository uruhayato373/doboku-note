/**
 * scripts/lib/json-io.mjs・dataset-io.mjs — 設定・記録を読む共通部品（依存ゼロ）。
 * `JSON.parse(readFileSync(join(root, datasetPath(id)), 'utf8'))` を各スクリプトが書き、壊れたときに場所が出なかったものを寄せた。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { readDataset, readDatasetIf, readLatest } from '../scripts/lib/dataset-io.mjs';
import { formatJson, formatJsonlRow, parseJson, readJson, readJsonIf, writeJson } from '../scripts/lib/json-io.mjs';
import { findDatasetIds } from '../scripts/lib/path-literals.mjs';
import { REPO_ROOT as REPO } from '../scripts/lib/repository-paths.mjs';

/** 一時のルートを作って fn に渡す（終わったら消す） */
function withRoot(fn) {
  const root = mkdtempSync(join(tmpdir(), 'dataset-io-'));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const put = (root, file, text) => {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), text);
};

test('parseJson・readJson: 先頭の BOM は無視し、壊れていたら場所つきで投げる', () => {
  assert.deepEqual(parseJson('\uFEFF{"a":1}'), { a: 1 });
  assert.throws(() => parseJson('{"a":', 'data/x.json'), /data\/x\.json: JSON を読めない/);
  withRoot((root) => {
    put(root, 'a/ok.json', '{"n":1}\n');
    put(root, 'a/bad.json', '{"n":');
    assert.deepEqual(readJson(root, 'a/ok.json'), { n: 1 });
    assert.throws(() => readJson(root, 'a/bad.json'), /a\/bad\.json: JSON を読めない/);
    assert.throws(() => readJson(root, 'a/missing.json'), /ENOENT/);
  });
});

test('readJsonIf: 無いときだけ null。壊れているときは投げる（「無い」と「壊れた」を混ぜない）', () => {
  withRoot((root) => {
    put(root, 'a/bad.json', '{"n":');
    put(root, 'a/ok.json', '[1,2]');
    assert.equal(readJsonIf(root, 'a/none.json'), null);
    assert.deepEqual(readJsonIf(root, 'a/ok.json'), [1, 2]);
    assert.throws(() => readJsonIf(root, 'a/bad.json'), /JSON を読めない/);
  });
});

test('writeJson・formatJson: 字下げ 2・LF・末尾改行で書き、中身が同じなら書かない。JSON にできない値は投げる', () => {
  assert.equal(formatJson({ a: [1, { b: 2 }] }), '{\n  "a": [\n    1,\n    {\n      "b": 2\n    }\n  ]\n}\n');
  assert.equal(formatJsonlRow({ a: 1, b: [2] }), '{"a":1,"b":[2]}\n');
  assert.throws(() => formatJson(undefined), TypeError);
  assert.throws(() => formatJsonlRow(() => 1), TypeError);
  withRoot((root) => {
    assert.deepEqual(writeJson(root, 'x/y/z.json', { k: 'v' }), { changed: true }, '親ディレクトリは作る');
    assert.equal(readFileSync(join(root, 'x/y/z.json'), 'utf8'), '{\n  "k": "v"\n}\n');
    assert.deepEqual(writeJson(root, 'x/y/z.json', { k: 'v' }), { changed: false });
    assert.deepEqual(writeJson(root, 'x/y/z.json', { k: 'w' }), { changed: true });
    // 古い CRLF のファイルは同じ中身でも LF に直す
    put(root, 'crlf.json', '{\r\n  "k": 1\r\n}\r\n');
    assert.deepEqual(writeJson(root, 'crlf.json', { k: 1 }), { changed: true });
    assert.equal(readFileSync(join(root, 'crlf.json'), 'utf8'), '{\n  "k": 1\n}\n');
  });
});

test('readDataset: id から置き場を引き、拡張子で json・jsonl（行の配列）・テキストを読み分ける', () => {
  withRoot((root) => {
    put(root, 'config/exam-calendar.json', '{"exams":{}}\n');
    put(root, 'data/youtube/posted.jsonl', '{"key":"a"}\n\n{"key":"b"}\n');
    put(root, 'config/psi-urls.txt', 'https://example.com/\n');
    assert.deepEqual(readDataset(root, 'config.exam-calendar'), { exams: {} });
    assert.deepEqual(readDataset(root, 'youtube.posted'), [{ key: 'a' }, { key: 'b' }], '空行は飛ばす');
    assert.equal(readDataset(root, 'config.psi-urls'), 'https://example.com/\n');
  });
});

test('readDataset: 可変部分は values で埋める。壊れていたら場所（JSON Lines は行番号）つきで投げ、無い id・値の欠けは投げる', () => {
  withRoot((root) => {
    put(root, 'data/ga4/reports/2026-10-02.json', '{"reports":{}}');
    put(root, 'data/youtube/posted.jsonl', '{"key":"a"}\n{"key":\n');
    put(root, 'config/exam-calendar.json', '{');
    assert.deepEqual(readDataset(root, 'ga4.reports', { values: { date: '2026-10-02' } }), { reports: {} });
    assert.throws(() => readDataset(root, 'ga4.reports'), /\{date\} の値が要る/);
    assert.throws(() => readDataset(root, 'youtube.posted'), /data\/youtube\/posted\.jsonl: 2 行目を読めない/);
    assert.throws(() => readDataset(root, 'config.exam-calendar'), /config\/exam-calendar\.json: JSON を読めない/);
    assert.throws(() => readDataset(root, 'no.such-dataset'), /台帳に無いデータセット/);
    assert.throws(() => readDataset(root, 'config.exam-stats'), /ENOENT/, 'ファイルが無ければ投げる');
  });
});

test('readDatasetIf: ファイルが無いときだけ null（壊れていれば投げる）', () => {
  withRoot((root) => {
    put(root, 'config/exam-calendar.json', '{"v":1}');
    put(root, 'config/exam-formats.json', '{');
    assert.deepEqual(readDatasetIf(root, 'config.exam-calendar'), { v: 1 });
    assert.equal(readDatasetIf(root, 'config.exam-stats'), null);
    assert.throws(() => readDatasetIf(root, 'config.exam-formats'), /JSON を読めない/);
  });
});

test('readLatest: 時系列の最新（名前の降順の先頭）を { file, data } で返し、1 件も無ければ null', () => {
  withRoot((root) => {
    assert.equal(readLatest(root, 'bing.snapshots'), null);
    put(root, 'data/bing/snapshots/2026-09-25.json', '{"d":"old"}');
    put(root, 'data/bing/snapshots/2026-10-02.json', '{"d":"new"}');
    put(root, 'data/bing/snapshots/2026-10-01.json', '{"d":"mid"}');
    assert.deepEqual(readLatest(root, 'bing.snapshots'), { file: 'data/bing/snapshots/2026-10-02.json', data: { d: 'new' } });
  });
});

test('実物: 台帳の置き場から本物の設定を読め、壊れ方の検査は場所つき（リポジトリ自身のルートで）', () => {
  const calendar = readDataset(REPO, 'config.exam-calendar');
  assert.equal(typeof calendar, 'object');
  assert.ok(Object.keys(calendar).length > 0);
  assert.ok(readLatest(REPO, 'psi.batch')?.file.startsWith('data/psi/batch/'));
});

test('findDatasetIds: 読み・書き・鮮度の関数に渡した id も台帳にあるか検査の対象になる（綴り違いを実行時でなく検査で止める）', () => {
  const ids = (src) => findDatasetIds(src).map((r) => `${r.id}@${r.via}`);
  assert.deepEqual(
    ids("readDataset(root, 'note.sales'); readDatasetIf(REPO_ROOT, 'config.exam-calendar'); readLatest(root, 'gsc.reports'); writeDataset(root, 'note.sales', x); appendDataset(root, 'gsc.rank-watch', r, { values: {} }); freshnessOf('note.sales'); freshnessDays('note.sales', 'failDays');"),
    ['note.sales@readDataset', 'config.exam-calendar@readDatasetIf', 'gsc.reports@readLatest', 'note.sales@writeDataset', 'gsc.rank-watch@appendDataset', 'note.sales@freshnessOf', 'note.sales@freshnessDays'],
  );
  assert.deepEqual(ids("// readDataset(root, 'note.sales') の例"), [], 'コメントの例は数えない');
});
