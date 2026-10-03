import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DATASETS, datasetById, datasetsFor, inferShape, jsonSchemaOf, matchFiles, pathMatchesId, patternOf, schemaRows, validateFiles } from '../scripts/lib/datasets.mjs';
import { basenameIndex, findConfigPaths, findDatasetIds, findPathLiterals } from '../scripts/lib/path-literals.mjs';

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
      sales: [{ date: '2026-09-01', productId: 'article:x', title: 't', type: 'article', price: 500 }],
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

test('validateFiles: JSON Lines は行ごとに検査し、壊れた行は行番号つきで返す', () => {
  const dir = mkdtempSync(join(tmpdir(), 'datasets-'));
  try {
    const row = { key: 'k1', videoId: 'v1', publishAt: '2026-06-09T07:30:00+09:00', title: 't', uploadedAt: '2026-06-05T23:13:02.281Z' };
    const lines = (rows) => `${rows.map((r) => (typeof r === 'string' ? r : JSON.stringify(r))).join('\n')}\n`;
    writeFileSync(join(dir, 'ok.jsonl'), lines([row, { ...row, key: 'k2', videoId: 'v2' }]));
    writeFileSync(join(dir, 'broken-json.jsonl'), lines([row, '{"key": "k2", ']));
    writeFileSync(join(dir, 'broken-row.jsonl'), lines([row, { ...row, key: 'k2', videoId: 'v2', publishAt: '2026-06-09T07:30:00' }]));
    const ds = datasetById('youtube.posted');
    const r = validateFiles(dir, ds, ['ok.jsonl', 'broken-json.jsonl', 'broken-row.jsonl']);
    assert.equal(r.checked, 3);
    assert.ok(r.errors.every((e) => e.file !== 'ok.jsonl'));
    assert.ok(r.errors.some((e) => e.file === 'broken-json.jsonl' && e.message.startsWith('読めない: 2 行目')), '壊れた JSON は行番号つき');
    assert.ok(r.errors.some((e) => e.file === 'broken-row.jsonl' && e.message.startsWith('1.publishAt')), '型に合わない行は配列の添字つき');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('schemaRows: 判別共用体は各形の欄を 1 つの表に集め、全部の形にある欄だけを必須にする', () => {
  const rows = schemaRows(jsonSchemaOf(datasetById('gsc.rank-watch')));
  const row = (p) => rows.find((r) => r.path === p);
  assert.equal(row('[].recordId').type, 'string');
  assert.match(row('[].type').type, /"measurement".*"decision"/, 'type は形ごとの値を並べる');
  assert.ok(row('[].scopeKey?'), '計測にだけある欄は無いことがある');
  assert.ok(row('[].selectionOrder?'), '判断にだけある欄は無いことがある');
  assert.ok(row('[].version'), '全部の形にある必須の欄は必須のまま');
  const orders = schemaRows(jsonSchemaOf(datasetById('coconala.orders')));
  assert.ok(orders.some((r) => r.path === 'orders[].talkroomId'), '版つきの型（oneOf）の欄も出る');
  assert.match(orders.find((r) => r.path === 'orders[].replyDueAt').description, /返信期限/, 'null を許す欄は元の型の説明を出す');
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

test('findPathLiterals: join の引数の置き場は次が変数でも行をまたいでも拾い、ファイル名だけの直書きも名前の索引で拾う', () => {
  const lines = (src, opts) => findPathLiterals(src, opts).map((h) => h.line);
  assert.deepEqual(lines("const p = join(ROOT, 'config', name);"), [1], '次の引数が変数');
  assert.deepEqual(lines("const p = join(\n  ROOT,\n  'data',\n  sub,\n);"), [3], '行をまたぐ呼び出し');
  assert.deepEqual(lines("repoPath('data', 'experiments.json')"), [1]);
  assert.deepEqual(lines("join(ROOT, 'src', 'config', name)\nrun('npm', ['config', 'get'])\njoin(HERE, '..', 'config', x)"), [3], "'src' の後は別の置き場・'..' の後は置き場");
  const basenames = new Map([['exam-stats.json', 'config.exam-stats']]);
  assert.deepEqual(lines("const s = readConfig('exam-stats.json');", { basenames }), [1]);
  assert.deepEqual(lines("const s = readConfig('status.json');", { basenames }), [], '索引に無い汎用名は拾わない');
  assert.deepEqual(lines("const s = readConfig('exam-stats.json'); // path-literal-ok: 理由", { basenames }), []);
});

test('basenameIndex: 台帳の中で一意で、config/・data/ の外に同名の無いファイル名だけを索引にする', () => {
  const idx = basenameIndex(['config/exam-stats.json', 'content/sns/x/status.json', 'data/note/status.json']);
  assert.equal(idx.get('exam-stats.json'), 'config.exam-stats');
  assert.equal(idx.has('status.json'), false, 'content/ にも同名がある');
});

test('findDatasetIds: コードの datasetPath 系と YAML の ci-data の id を拾い、コメントの例と GA4・GSC のレポートの種類の関数は数えない', () => {
  const ids = (src) => findDatasetIds(src).map((r) => `${r.id}@${r.via}`);
  assert.deepEqual(ids("datasetPath('note.sales'); latestFile(ROOT, 'gsc.reports'); listReports('gsc.page');"), ['note.sales@datasetPath', 'gsc.reports@latestFile']);
  assert.deepEqual(ids('run: node scripts/ci-data.mjs latest gsc.page\n  npm run ci-data -- add --datasets note.sales,kdp.royalties'), ['gsc.page@ci-data latest', 'note.sales@ci-data --datasets', 'kdp.royalties@ci-data --datasets']);
  assert.deepEqual(ids(' *   add [--paths a,b] [--datasets id,id]\n# ci-data put foo.bar'), [], 'コメントの使い方の例');
});

test('findConfigPaths: ワークフロー・package.json の config/・data/ のパスを拾い、組み立て途中とコメントは除く', () => {
  const paths = (src) => findConfigPaths(src).map((p) => p.path);
  assert.deepEqual(paths('  default: config/r2-delete-list.txt\n  file: "data/${{ inputs.x }}/a.json"\n# config/old.json'), ['config/r2-delete-list.txt']);
  assert.deepEqual(paths('"psi": "node x.mjs --file config/psi-urls.txt"'), ['config/psi-urls.txt']);
});

