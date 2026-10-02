import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DATASETS, datasetById, datasetsFor, findPathLiterals, inferShape, jsonSchemaOf, matchFiles, pathMatchesId, patternOf, schemaRows, validateFiles } from '../scripts/lib/datasets.mjs';

const idsFor = (file) => datasetsFor(file).map((x) => x.id);

test('patternOf: 日時・UUID・ハッシュの型で当て、名前の前方が同じ別の系列は取り違えない', () => {
  assert.deepEqual(idsFor('data/gsc/reports/2026-10-02.json'), ['gsc.reports']);
  assert.deepEqual(idsFor('data/ga4/reports/2026-10-02.json'), ['ga4.reports']);
  assert.deepEqual(idsFor('data/gsc/url-inspection/2026-10-02T00-21-12.json'), ['gsc.url-inspection']);
  assert.deepEqual(idsFor('data/gsc/url-inspection-single/2026-10-02T00-21-12.json'), ['gsc.url-inspection-single']);
  assert.deepEqual(
    idsFor('data/business/records/measurement-2026-09-13T02-19-08-867Z-0b3048b5-56ce-4bb9-8bb9-38866952d7b5.json'),
    ['business.measurement'],
  );
  assert.deepEqual(idsFor('data/business/records/checks-monthly-2026-08-2026-10-01T06-52-13-780Z.json'), ['business.checks-monthly']);
  assert.deepEqual(idsFor('data/business/records/site-to-sales-2026-08-r2.json'), ['business.site-to-sales']);
  assert.deepEqual(idsFor('data/gsc/ui/2026-07-30T05-41-28Z/normalized/notFound--allKnownPages.json'), ['gsc.ui-raw']);
  assert.ok(patternOf('data/a.json').test('data/a.json'));
  assert.ok(!patternOf('data/a.json').test('data/aXjson'), '. は文字どおり');
});

test('matchFiles: 未宣言を返し、データセットごとに新しい順に並べる', () => {
  const m = matchFiles(['data/psi/batch/2026-09-25T20-17-52.json', 'data/psi/batch/2026-10-01T21-36-01.json', 'data/unknown.json']);
  assert.deepEqual(m.unmatched, ['data/unknown.json']);
  assert.deepEqual(m.byId.get('psi.batch'), ['data/psi/batch/2026-10-01T21-36-01.json', 'data/psi/batch/2026-09-25T20-17-52.json']);
  assert.equal(m.ambiguous.length, 0);
});

test('台帳: id は重複せず「取得元.データセット」の形', () => {
  const ids = DATASETS.map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(\.[a-z0-9-]+)+$/);
});

test('pathMatchesId: 置き場は id の取得元に合う（config.* は config/、他は data/<取得元>/）', () => {
  assert.ok(pathMatchesId({ id: 'gsc.reports', path: 'data/gsc/reports/{date}.json' }));
  assert.ok(pathMatchesId({ id: 'config.competitors', path: 'config/competitors.json' }));
  assert.ok(!pathMatchesId({ id: 'gsc.reports', path: 'data/ga4/reports/{date}.json' }));
  assert.ok(!pathMatchesId({ id: 'gsc.reports', path: 'data/gscx/reports.json' }), '取得元の名前の前方一致で通さない');
  assert.ok(!pathMatchesId({ id: 'config.x', path: 'data/config/x.json' }));
  for (const x of DATASETS) assert.ok(pathMatchesId(x), `${x.id}: ${x.path}`);
});

test('validateFiles: 型に合わない記録を場所つきで返す', () => {
  const dir = mkdtempSync(join(tmpdir(), 'datasets-'));
  try {
    const good = {
      version: 1, updatedAt: '2026-10-01', currency: 'JPY', source: 's', privacyNote: 'p', howToUpdate: 'h',
      sales: [{ date: '2026-09-01', productId: 'x', title: 't', type: 'article', price: 500 }],
      months: { '2026-09': { fetchedAt: '2026-10-01T00:00:00.000Z', count: 1, total: 500, finalized: true } },
    };
    writeFileSync(join(dir, 'good.json'), JSON.stringify(good));
    writeFileSync(join(dir, 'bad.json'), JSON.stringify({ ...good, sales: [{ ...good.sales[0], price: -1, extra: 1 }] }));
    const ds = datasetById('note.sales');
    const r = validateFiles(dir, ds, ['good.json', 'bad.json']);
    assert.equal(r.checked, 2);
    assert.ok(r.errors.every((e) => e.file === 'bad.json'));
    assert.ok(r.errors.some((e) => e.message.startsWith('sales.0.price')));
    assert.ok(r.errors.some((e) => e.message.startsWith('sales.0:')), '知らない欄は止める（strict）');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('schemaRows: 型の JSON Schema から場所・型・説明の行を作る', () => {
  const rows = schemaRows(jsonSchemaOf(datasetById('note.sales')));
  const row = (p) => rows.find((r) => r.path === p);
  assert.equal(row('sales[].price').type, 'integer');
  assert.equal(row('sales[].price').description, '販売価格（円）');
  assert.equal(row('months.{id}.finalized').type, 'boolean');
  assert.match(row('sales[].type').type, /"membership"/);
  const kdp = schemaRows(jsonSchemaOf(datasetById('kdp.royalties')));
  assert.ok(kdp.some((r) => r.path === 'months.{id}.scope?'), '無いことがある欄は ? を付ける');
  assert.match(kdp.find((r) => r.path === 'months.{id}.books[].bookId').type, /null/);
});

test('inferShape: 型の無いデータセットは実物から対応表・配列の要素・無いことがある項目を読む', () => {
  const dir = mkdtempSync(join(tmpdir(), 'datasets-'));
  try {
    writeFileSync(join(dir, 'a.json'), JSON.stringify({
      _doc: '説明',
      items: [{ id: 'a', n: 1 }, { id: 'b', n: 2, opt: true }],
      byId: { 'x-1': { label: 'X' }, 'y-2': { label: 'Y' } },
    }));
    const s = inferShape(dir, 'a.json');
    assert.equal(s.doc, '説明');
    const row = (p) => s.rows.find((r) => r.path === p)?.type;
    assert.equal(row('items'), 'array（2 件）');
    assert.equal(row('items[].opt?'), 'boolean');
    assert.equal(row('byId'), '対応表（2 件）');
    assert.equal(row('byId.{id}.label'), 'string');
    writeFileSync(join(dir, 'b.csv'), 'a,b,c\n1,2,3\n');
    assert.equal(inferShape(dir, 'b.csv').summary, '1 行 × 3 列');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('findPathLiterals: 文字列・テンプレート・正規表現・join の分割形を拾い、public/data・URL・コメント・許可印は拾わない', () => {
  const lines = (src) => findPathLiterals(src).map((h) => h.line);
  assert.deepEqual(lines("const a = 'data/note/sales.json';"), [1]);
  assert.deepEqual(lines('const a = `${ROOT}/data/note/sales.json`;'), [1]);
  assert.deepEqual(lines('const re = /^data\\/metrics\\/x/;'), [1]);
  assert.deepEqual(lines("readFileSync(repoPath('data', 'experiments.json'))"), [1], '分割形（2026-10-02 に管理画面が旧パスを黙って読んでいた形）');
  assert.deepEqual(lines("const a = join(ROOT, 'public/data/x.csv');\nconst u = '/data/x.csv';"), []);
  assert.deepEqual(lines("// data/note/sales.json を読む\n * data/note/sales.json\nf(); // data/note/sales.json"), []);
  assert.deepEqual(lines("const old = 'data/metrics/x.json'; // path-literal-ok: 旧パスの読み替え"), []);
});

test('findPathLiterals: config/ も拾い、src/config・コマンド引数・gtag の config は拾わない', () => {
  const lines = (src) => findPathLiterals(src).map((h) => h.line);
  assert.deepEqual(lines("const a = 'config/exam-calendar.json';"), [1]);
  assert.deepEqual(lines("join(ROOT, 'config', 'figure-canvas.json')"), [1]);
  assert.deepEqual(lines("join(HERE, '..', '..', 'config', 'utm-templates.json')"), [1], '.. の後の分割形');
  assert.deepEqual(lines("join(root, 'config', `${ch}-competitors.json`)"), [1]);
  assert.deepEqual(lines("join(ROOT, 'src', 'config', 'categories.json')\nconst a = '.claude/config/x.json';\nimport c from '../tsconfig.json';"), []);
  assert.deepEqual(lines("git(['config', '--get', 'remote.origin.promisor'])\nrun('npm', ['config', 'get', 'cache'])\ngtag('config', '${gaId}', {"), []);
  assert.deepEqual(lines("const roots = ['docs', '.claude', 'src', 'config', 'data'];"), []);
});
