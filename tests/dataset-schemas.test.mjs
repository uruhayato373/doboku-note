import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import * as SCHEMAS from '../scripts/lib/dataset-schemas.mjs';
import { DATASETS, listAreaFiles, matchFiles } from '../scripts/lib/datasets.mjs';

const { isMonday, sumEquals, uniqueBy, versioned } = SCHEMAS;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 台帳の行の型。行は型を名前の文字列かオブジェクトで持つ */
const schemaFor = (d) => (typeof d.schema === 'string' ? SCHEMAS[d.schema] : d.schema);
const typed = DATASETS.filter((d) => d.schema);

/** 違反を「場所: 内容」の行にする（通れば空） */
const issues = (schema, value) => {
  const r = schema.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.') || '(全体)'}: ${i.message}`);
};
const assertOk = (schema, value) => assert.deepEqual(issues(schema, value), []);
/** 指定の場所・内容の違反が出ること（pattern は「場所: 内容」の行に当てる） */
const assertFails = (schema, value, pattern) => {
  const found = issues(schema, value);
  assert.ok(found.some((l) => pattern.test(l)), `${pattern} が出ない: ${JSON.stringify(found.slice(0, 5))}`);
};

// ---- 実データ ----------------------------------------------------------------------------

const files = ['config', 'data'].flatMap((area) => listAreaFiles(ROOT, area, { tracked: true }));
const { byId: filesById } = matchFiles(files);
const readValue = (file) => {
  const text = readFileSync(join(ROOT, file), 'utf8').replace(/^﻿/, '');
  return file.endsWith('.jsonl') ? text.split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l)) : JSON.parse(text);
};
/** データセットの最新ファイルの中身（無ければ null） */
const latest = (id) => {
  const file = (filesById.get(id) ?? [])[0];
  return file ? { file, value: readValue(file) } : null;
};

// ---- 共通の検査 --------------------------------------------------------------------------

test('型のある全データセット: 型が JSON Schema になる（管理画面が z.toJSONSchema で型を表に出す）', () => {
  assert.ok(typed.length >= 30, `型ありが ${typed.length} 件しかない（型を外していないか）`);
  for (const d of typed) {
    assert.ok(schemaFor(d) instanceof z.ZodType, `${d.id}: schema が zod の型でない（dataset-schemas.mjs に同名の export があるか）`);
    assert.doesNotThrow(() => z.toJSONSchema(schemaFor(d)), `${d.id}: JSON Schema にできない`);
  }
});

/** 型の JSON Schema から、値に当たる object の形（oneOf の判別共用体は const が一致する形）を取る */
function objectNodeFor(js, value) {
  if (js.properties) return js;
  for (const variant of js.oneOf ?? js.anyOf ?? []) {
    const consts = Object.entries(variant.properties ?? {}).filter(([, v]) => v.const !== undefined);
    if (variant.properties && consts.every(([k, v]) => value?.[k] === v.const)) return variant;
  }
  return null;
}

test('型のある全データセット: 実データの最新ファイルから必須キーを 1 つ消すと落ちる（常に通る型を作らない）', () => {
  let checkedDatasets = 0;
  let checkedKeys = 0;
  for (const d of typed) {
    const hit = latest(d.id);
    if (!hit) continue; // 未着手（planned）や手元だけ
    const schema = schemaFor(d);
    assert.deepEqual(issues(schema, hit.value), [], `${d.id}: 実データ ${hit.file} が型を通らない`);
    const js = z.toJSONSchema(schema);
    const target = js.type === 'array' ? hit.value.at(-1) : hit.value;
    const node = objectNodeFor(js.type === 'array' ? js.items : js, target);
    assert.ok(node?.required?.length, `${d.id}: 必須の欄が 1 つも無い型は何でも通す`);
    for (const key of node.required) {
      if (!(key in target)) continue;
      const broken = structuredClone(hit.value);
      delete (Array.isArray(broken) ? broken.at(-1) : broken)[key];
      assert.ok(issues(schema, broken).length > 0, `${d.id}: 必須の ${key} を消しても通る（${hit.file}）`);
      checkedKeys++;
    }
    checkedDatasets++;
  }
  assert.ok(checkedDatasets >= 30 && checkedKeys >= 100, `検査が少なすぎる（${checkedDatasets} データセット・${checkedKeys} キー）`);
});

// ---- 版の欄（ラチェット）-------------------------------------------------------------------

// 規約は schemaVersion 1 本。今の型のうち、別の名前の版の欄を持つものと、版の欄が無いものを数える。
// この一覧は減らすだけ（schemaVersion へ揃えたら消す）。新しい型は schemaVersion を持つこと。増やすときは上限も上げることになり、レビューで目に付く
const LEGACY_VERSION_FIELD = {
  'config.domains': 'version',
  'note.sales': 'version',
  'kdp.royalties': 'version',
  'coconala.orders': 'version',
  'coconala.orders-snapshot': 'version',
  'coconala.kpi': 'version',
  'coconala.analytics': 'version',
  'gsc.rank-watch': 'version',
  'business.experiments': 'version',
  'gsc.index-coverage-history': 'schema_version',
};
const NO_VERSION_FIELD = [
  'config.qualification-registry',
  'config.product-lineup',
  'config.note-funnel',
  'config.coconala-listings',
  'note.magazines',
  'note.sync-log',
  'coconala.thumb-approved',
  'coconala.resolved-inquiries',
  'x.reposted',
  'youtube.posted',
  'business.checks-monthly',
  'business.checks-weekly',
  'business.weekly',
];
const MAX_LEGACY_VERSION_FIELD = 10;
const MAX_NO_VERSION_FIELD = 13;
const VERSION_FIELDS = ['schemaVersion', 'version', 'schema_version'];

/** 型の版の欄の名前（ファイルの先頭か、JSON Lines なら行）。無ければ null */
function versionFieldOf(schema) {
  const js = z.toJSONSchema(schema);
  const propsOf = (s) => (s?.properties ? s.properties : Object.assign({}, ...(s?.oneOf ?? s?.anyOf ?? []).map(propsOf)));
  const props = propsOf(js.type === 'array' ? js.items : js);
  return VERSION_FIELDS.find((f) => f in props) ?? null;
}

test('版の欄: schemaVersion 以外の名前・欄なしの型は許可リストにある分だけ（増やせない）', () => {
  assert.ok(Object.keys(LEGACY_VERSION_FIELD).length <= MAX_LEGACY_VERSION_FIELD, '別名の版の欄の許可リストを増やした（schemaVersion を使う）');
  assert.ok(NO_VERSION_FIELD.length <= MAX_NO_VERSION_FIELD, '版の欄なしの許可リストを増やした（schemaVersion を持たせる）');
  assert.equal(new Set(NO_VERSION_FIELD).size, NO_VERSION_FIELD.length);
  for (const id of NO_VERSION_FIELD) assert.ok(!(id in LEGACY_VERSION_FIELD), `${id} が両方の許可リストにある`);
  const typedIds = new Set(typed.map((d) => d.id));
  let checked = 0;
  for (const d of typed) {
    const found = versionFieldOf(schemaFor(d));
    const legacy = LEGACY_VERSION_FIELD[d.id];
    if (legacy) assert.equal(found, legacy, `${d.id}: 版の欄が ${found} になった。schemaVersion へ揃えたなら LEGACY_VERSION_FIELD から消す`);
    else if (NO_VERSION_FIELD.includes(d.id)) assert.equal(found, null, `${d.id}: 版の欄 ${found} を持った。NO_VERSION_FIELD から消す`);
    else assert.equal(found, 'schemaVersion', `${d.id}: 新しい型は schemaVersion を持つ（版の欄 ${found}）。許可リストに足さない`);
    checked++;
  }
  assert.equal(checked, typed.length);
  // 型を外した・id を変えたデータセットが許可リストに残っていないこと（残すとラチェットの数が嘘になる）
  for (const id of [...Object.keys(LEGACY_VERSION_FIELD), ...NO_VERSION_FIELD]) {
    if (!typedIds.has(id)) assert.fail(`${id} は型の無いデータセットになった。許可リストから消す`);
  }
});

test('versioned: 旧版の過去のファイルが落ちず、版が無い・知らない版は落ちる', () => {
  const V = versioned('schemaVersion', {
    1: z.object({ name: z.string() }).strict(),
    2: z.object({ name: z.string(), tags: z.array(z.string()) }).strict(),
  });
  assertOk(V, { schemaVersion: 1, name: 'a' });
  assertOk(V, { schemaVersion: 2, name: 'a', tags: [] });
  assertFails(V, { schemaVersion: 1, name: 'a', tags: [] }, /tags/);
  assertFails(V, { schemaVersion: 2, name: 'a' }, /tags/);
  assert.ok(issues(V, { schemaVersion: 3, name: 'a' }).length > 0);
  assert.ok(issues(V, { name: 'a' }).length > 0);
  assert.equal(z.toJSONSchema(V).oneOf.length, 2);
});

// ---- 部品 ------------------------------------------------------------------------------

test('uniqueBy: 2 行目以降の重複を、その行を指して報告する', () => {
  const schema = z.array(z.object({ id: z.string().nullable() })).superRefine(uniqueBy('id', 'id'));
  assertOk(schema, [{ id: 'a' }, { id: 'b' }, { id: null }, { id: null }]);
  assert.deepEqual(issues(schema, [{ id: 'a' }, { id: 'b' }, { id: 'a' }]), ['2: id「a」が重複（1 行目と同じ）']);
  const byFn = z.array(z.object({ a: z.number(), b: z.number() })).superRefine(uniqueBy((r) => `${r.a}|${r.b}`, '(a, b)'));
  assertOk(byFn, [{ a: 1, b: 1 }, { a: 1, b: 2 }]);
  assert.equal(issues(byFn, [{ a: 1, b: 1 }, { a: 1, b: 1 }]).length, 1);
});

test('sumEquals・isMonday', () => {
  assert.ok(sumEquals([1, 2, 3], 6));
  assert.ok(!sumEquals([1, 2, 3], 7));
  assert.ok(sumEquals([1, 2, 3], 7, 1), '丸めの許容幅');
  assert.ok(!sumEquals([1, 2, 3], 8, 1));
  assert.ok(isMonday('2026-08-10'));
  assert.ok(!isMonday('2026-08-11'));
  assert.ok(!isMonday('2026-08-09'), '日曜は月曜でない');
});

// ---- 日時・日付 --------------------------------------------------------------------------

const youtubeRow = (o = {}) => ({ key: 'k1', videoId: 'v1', publishAt: '2026-06-09T07:30:00+09:00', title: 't', uploadedAt: '2026-06-05T23:13:02.281Z', ...o });

test('日時: 実在しない日時と、時差つきの記録時刻を止める（予定の時刻だけ +09:00 を許す）', () => {
  const Y = SCHEMAS.YoutubePosted;
  assertOk(Y, [youtubeRow(), youtubeRow({ key: 'k2', videoId: 'v2', publishAt: '2026-06-09T12:30:00.000Z' })]);
  assertFails(Y, [youtubeRow({ publishAt: '2026-02-30T00:00:00+09:00' })], /^0\.publishAt/);
  assertFails(Y, [youtubeRow({ publishAt: '2026-99-99T99:99:00+09:00' })], /^0\.publishAt/);
  assertFails(Y, [youtubeRow({ publishAt: '2026-06-09T07:30:00' })], /^0\.publishAt/);
  assertFails(Y, [youtubeRow({ uploadedAt: '2026-06-05T23:13:02+09:00' })], /^0\.uploadedAt/);
  assertFails(Y, [youtubeRow({ uploadedAt: '2026-13-05T23:13:02Z' })], /^0\.uploadedAt/);
});

test('日時: 人が手で書く台帳は分までを許すが、時差は必須で（読み手の実行環境で 9 時間ずれる）、存在しない日時は止める', () => {
  const O = SCHEMAS.CoconalaOrders;
  const log = (o) => ordersLog([order(o)]);
  assertOk(O, log({ replyDueAt: '2026-08-27T21:00+09:00', deliveredAt: '2026-08-26T12:02+09:00' }));
  assertOk(O, log({ replyDueAt: '2026-08-27T12:00:00Z' }));
  assertFails(O, log({ replyDueAt: '2026-08-27T21:00' }), /replyDueAt: 時差（\+09:00 か Z）が要る/);
  assertFails(O, log({ replyDueAt: '2026-99-99T99:99+09:00' }), /replyDueAt/);
  assertFails(O, log({ replyDueAt: '2026-02-30T10:00+09:00' }), /replyDueAt: 存在しない日付/);
  assertFails(O, log({ replyDueAt: '2026-08-27T24:00+09:00' }), /replyDueAt/);
  assertFails(O, log({ deliveredAt: '2026-08-05' }), /deliveredAt/);
  assertFails(O, log({ date: '2026-02-30' }), /^orders\.0\.date/);
});

test('日時: ココナラの返信期限は JST の時差付き（時差なしは UTC で動く CI が 9 時間ずれて読むので止める）', () => {
  const S = SCHEMAS.CoconalaOrdersSnapshot;
  const withDue = (replyDueAt) => mutateLatest('coconala.orders-snapshot', (r) => { r.orders[0].replyDueAt = replyDueAt; });
  assertFails(S, withDue('2026-08-27T21:00'), /^orders\.0\.replyDueAt/);
  assertOk(S, withDue('2026-08-27T21:00+09:00'));
  assertFails(S, withDue('2026-08-27T21:00:00+9:00'), /^orders\.0\.replyDueAt/);
  assertFails(S, withDue('2026-99-99T99:99'), /^orders\.0\.replyDueAt/);
});

test('月: 2026-13 のような存在しない月を止める', () => {
  const log = salesLog();
  log.months['2026-13'] = { fetchedAt: '2026-10-03T00:00:00.000Z', count: 0, total: 0, finalized: false };
  assert.ok(issues(SCHEMAS.NoteSalesLog, log).length > 0);
});

// ---- note の販売履歴 ----------------------------------------------------------------------

const salesLog = () => ({
  version: 1,
  updatedAt: '2026-10-01',
  currency: 'JPY',
  source: 's',
  privacyNote: 'p',
  howToUpdate: 'h',
  sales: [
    { date: '2026-09-01', productId: 'article:x', title: 't', type: 'article', price: 980 },
    { date: '2026-09-02', productId: 'civil-1-pack', title: 'm', type: 'magazine', price: 1500 },
    { date: '2026-09-02', productId: 'civil-1-pack', title: 'm', type: 'magazine', price: 1500 },
    { date: '2026-09-05', productId: 'membership:civil-lab-annual', title: 'p', type: 'membership', price: 1480 },
  ],
  months: { '2026-09': { fetchedAt: '2026-10-03T00:00:00.000Z', count: 4, total: 5460, finalized: true } },
});

test('note.sales: 正しい記録は通り、同じ日に同じ商品が 2 件売れた丸ごと重複の行も通る', () => {
  assertOk(SCHEMAS.NoteSalesLog, salesLog());
});

test('note.sales: 桁違いの価格・0 円・未来の日付・type と productId の接頭辞の矛盾を止める', () => {
  const S = SCHEMAS.NoteSalesLog;
  const withRow = (row) => {
    const log = salesLog();
    log.sales[0] = { ...log.sales[0], ...row };
    return log;
  };
  assertFails(S, withRow({ price: 7_980_000 }), /^sales\.0\.price/);
  assertFails(S, withRow({ price: 0 }), /^sales\.0\.price/);
  assertFails(S, withRow({ date: '2999-01-01' }), /^sales\.0\.date: 販売日 2999-01-01 が今日/);
  assertFails(S, withRow({ type: 'magazine' }), /^sales\.0\.type: .*接頭辞が合わない/);
  assertFails(S, withRow({ productId: 'civil-1-pack' }), /^sales\.0\.type/);
  const membership = salesLog();
  membership.sales[3].type = 'article';
  assertFails(S, membership, /^sales\.3\.type/);
});

test('note.sales: 月の件数・総額が明細と合わないとき止める（記録のある月だけ）', () => {
  const S = SCHEMAS.NoteSalesLog;
  const count = salesLog();
  count.months['2026-09'].count = 3;
  assertFails(S, count, /^months\.2026-09\.count/);
  const total = salesLog();
  total.months['2026-09'].total = 5000;
  assertFails(S, total, /^months\.2026-09\.total/);
  const other = salesLog();
  other.sales.push({ date: '2026-08-31', productId: 'article:y', title: 't', type: 'article', price: 500 });
  assertOk(S, other); // 8 月は months に記録が無いので突合しない
});

// ---- KDP ------------------------------------------------------------------------------

const kdpMonth = (o = {}) => ({
  fetchedAt: '2026-09-20T00:00:00.000Z',
  range: { start: '2026-08-01', end: '2026-08-31' },
  estimated: false,
  total: { bookCount: 2, ebook: 100, print: 0, kenp: 50, royalty: 150 },
  kenpPagesRead: 500,
  marketplaces: [{ marketplace: 'Amazon.co.jp', currency: 'JPY', ebook: 100, paperback: 0, hardcover: 0, kenpPages: 500 }],
  books: [
    { bookId: 'a-01', title: 'A', ebook: 100, print: 0, kenp: 0, royalty: 100 },
    { bookId: null, title: 'B', ebook: 0, print: 0, kenp: 50, royalty: 50 },
  ],
  ...o,
});
const kdpLog = (month) => ({ version: 1, updatedAt: '2026-09-20', currency: 'JPY', source: 's', caveat: 'c', months: { '2026-08': month } });

test('kdp.royalties: 正しい月は通り、返品で負になる金額・マーケットプレイスを読めなかった月（null）も通る', () => {
  const K = SCHEMAS.KdpRoyalties;
  assertOk(K, kdpLog(kdpMonth()));
  assertOk(K, kdpLog(kdpMonth({ marketplaces: null, kenpPagesRead: null })));
  const refund = kdpMonth({
    total: { bookCount: 2, ebook: 70, print: 0, kenp: 50, royalty: 120 },
    books: [
      { bookId: 'a-01', title: 'A', ebook: 100, print: 0, kenp: 0, royalty: 100 },
      { bookId: null, title: 'B', ebook: -30, print: 0, kenp: 50, royalty: 20 },
    ],
    marketplaces: [{ marketplace: 'Amazon.co.jp', currency: 'JPY', ebook: 70, paperback: 0, hardcover: 0, kenpPages: 500 }],
  });
  assertOk(K, kdpLog(refund));
});

test('kdp.royalties: royalty と 3 項目・本の合計と全体・期間・KENP 既読・範囲の件数の食い違いを止める（1 円の丸めは許す）', () => {
  const K = SCHEMAS.KdpRoyalties;
  assertOk(K, kdpLog(kdpMonth({ total: { bookCount: 2, ebook: 100, print: 0, kenp: 50, royalty: 151 } })));
  assertFails(K, kdpLog(kdpMonth({ total: { bookCount: 2, ebook: 100, print: 0, kenp: 50, royalty: 160 } })), /total\.royalty/);
  const book = kdpMonth();
  book.books[0].royalty = 130;
  assertFails(K, kdpLog(book), /books\.0\.royalty/);
  const dropped = kdpMonth();
  dropped.books.pop();
  assertFails(K, kdpLog(dropped), /^months\.2026-08\.books: .*取りこぼしか誤記/);
  assertFails(K, kdpLog(kdpMonth({ range: { start: '2026-08-01', end: '2026-08-30' } })), /range/);
  assertFails(K, kdpLog(kdpMonth({ range: { start: '2026-07-01', end: '2026-07-31' } })), /range/);
  assertFails(K, kdpLog(kdpMonth({ kenpPagesRead: 400 })), /kenpPagesRead/);
  const scope = { accountBookCount: 2, accountRows: 2, externalRows: 1, expectedDobokuBooks: 1, matchedDobokuBooks: 1, missingDobokuBookIds: [], dobokuRoyalty: 100 };
  assertOk(K, kdpLog(kdpMonth({ scope })));
  assertFails(K, kdpLog(kdpMonth({ scope: { ...scope, accountBookCount: 3 } })), /scope\.accountBookCount/);
  assertFails(K, kdpLog(kdpMonth({ scope: { ...scope, accountRows: 5 } })), /scope\.accountRows/);
  assertFails(K, kdpLog(kdpMonth({ scope: { ...scope, externalRows: 0 } })), /scope\.externalRows/);
});

// ---- ココナラの受注 ------------------------------------------------------------------------

const order = (o = {}) => ({
  date: '2026-08-04',
  serviceId: 'coconala-x',
  talkroomId: '18082691',
  priceYen: 2500,
  grade: 1,
  status: 'closed',
  replyDueAt: null,
  deliveredAt: '2026-08-05T11:59+09:00',
  artifacts: [],
  ...o,
});
const ordersLog = (orders) => ({ version: 2, updatedAt: '2026-09-26T22:45+09:00', currency: 'JPY', source: 's', privacyNote: 'p', howToUpdate: 'h', schema: {}, orders });
const rating = (o = {}) => ({
  providerRatedAt: '2026-08-11T20:30+09:00',
  stars: { overall: 5, demand: 5, communication: 5, schedule: 5 },
  commentChars: 3,
  comment: 'あいう',
  dueAt: '2026-08-20',
  verified: false,
  ...o,
});

test('coconala.orders: 正しい受注は通り、talkroomId の重複・納品なしの納品済み・納品が販売日より前・星の範囲外・字数の食い違いを止める', () => {
  const O = SCHEMAS.CoconalaOrders;
  assertOk(O, ordersLog([order(), order({ talkroomId: '2', status: 'received', deliveredAt: null, replyDueAt: '2026-08-27T21:00+09:00' })]));
  assertFails(O, ordersLog([order(), order()]), /^orders\.1: talkroomId「18082691」が重複/);
  assertFails(O, ordersLog([order({ deliveredAt: null })]), /^orders\.0\.deliveredAt: status が closed なのに納品日時が無い/);
  assertFails(O, ordersLog([order({ status: 'delivered', deliveredAt: null })]), /deliveredAt/);
  assertFails(O, ordersLog([order({ deliveredAt: '2026-08-03T10:00+09:00' })]), /^orders\.0\.deliveredAt: .*販売日 2026-08-04 より前/);
  assertOk(O, ordersLog([order({ date: '2026-08-06', deliveredAt: '2026-08-06T01:00+09:00' })])); // UTC では 8/5 でも JST の日付で比べる
  assertOk(O, ordersLog([order({ rating: rating() })]));
  assertFails(O, ordersLog([order({ rating: rating({ stars: { overall: 6, demand: 5, communication: 5, schedule: 5 } }) })]), /stars\.overall/);
  assertFails(O, ordersLog([order({ rating: rating({ stars: { overall: 0, demand: 5, communication: 5, schedule: 5 } }) })]), /stars\.overall/);
  assertFails(O, ordersLog([order({ rating: rating({ commentChars: 5 }) })]), /rating\.commentChars/);
  const quote = { amountYen: 7500, basis: 'b', proposedAt: '2026-08-05T14:47+09:00', purchasedAt: '2026-08-05T20:02+09:00' };
  assertOk(O, ordersLog([order({ quote })]));
  assertFails(O, ordersLog([order({ quote: { ...quote, proposedAt: '2026-08-05T21:00+09:00' } })]), /quote\.proposedAt/);
});

test('coconala.orders: 版の欄は今も version（2）で、別の版・版なしは通らない', () => {
  const O = SCHEMAS.CoconalaOrders;
  assert.ok(issues(O, { ...ordersLog([order()]), version: 1 }).length > 0);
  const { version: _v, ...noVersion } = ordersLog([order()]);
  assert.ok(issues(O, noVersion).length > 0);
  assertFails(O, { ...ordersLog([order()]), extra: 1 }, /Unrecognized key/);
});

// ---- ココナラの KPI ------------------------------------------------------------------------

const kpiRow = (o = {}) => ({
  weekOf: '2026-08-10',
  serviceId: 's1',
  views: 21,
  favorites: 0,
  orders: 0,
  period: { from: '2026-07-18', to: '2026-08-16' },
  windowDays: 30,
  cumulative: true,
  source: 'analytics-auto',
  ...o,
});
const blogRow = (o = {}) => ({
  weekOf: '2026-08-10',
  slug: 'a',
  blogId: '791954',
  title: 't',
  views: 12,
  postedOn: '2026-08-13',
  period: { from: '2026-07-19', to: '2026-08-17' },
  windowDays: 30,
  cumulative: true,
  source: 'analytics-auto',
  ...o,
});
const kpi = (weekly = [kpiRow()], blogsWeekly = [blogRow()]) => ({
  version: 1,
  updatedAt: '2026-09-23',
  source: 's',
  howToUpdate: 'h',
  weekly,
  milestones: [],
  sellerRank: { value: 'レギュラー', since: '2026-08-09', source: 's' },
  notificationMailbox: { address: 'a@example.com', note: 'n', verifiedAt: '2026-08-11' },
  blogsWeekly,
});

test('coconala.kpi: 月曜でない週・週と出品の重複・30 日でない窓・期間と日数の食い違いを止める（ブログ台帳に無い記事は null で通る）', () => {
  const K = SCHEMAS.CoconalaKpi;
  assertOk(K, kpi());
  assertOk(K, kpi([kpiRow()], [blogRow({ slug: null, blogId: null })]));
  assertFails(K, kpi([kpiRow({ weekOf: '2026-08-11' })]), /^weekly\.0\.weekOf: 月曜日/);
  assertFails(K, kpi([kpiRow(), kpiRow()]), /^weekly\.1: \(週, 出品\)「2026-08-10\|s1」が重複/);
  assertOk(K, kpi([kpiRow(), kpiRow({ serviceId: 's2' })]));
  assertFails(K, kpi([kpiRow({ windowDays: 7 })]), /^weekly\.0\.windowDays/);
  assertFails(K, kpi([kpiRow({ cumulative: false })]), /^weekly\.0\.cumulative/);
  assertFails(K, kpi([kpiRow({ period: { from: '2026-07-18', to: '2026-08-10' } })]), /^weekly\.0\.period: .*30/);
  assertFails(K, kpi([kpiRow()], [blogRow({ weekOf: '2026-08-12' })]), /^blogsWeekly\.0\.weekOf/);
  assertFails(K, kpi([kpiRow()], [blogRow(), blogRow()]), /^blogsWeekly\.1: \(週, 記事\)/);
  assertFails(K, kpi([kpiRow()], [blogRow({ slug: null, blogId: null, title: 'x' }), blogRow({ slug: null, blogId: null, title: 'x' })]), /^blogsWeekly\.1/);
});

// ---- 実験の台帳 ----------------------------------------------------------------------------

const exp = (o = {}) => ({
  id: 'EXP-100',
  title: 't',
  hypothesis: 'h',
  target_metric: 'm',
  target_delta: 'd',
  status: 'running',
  started_at: '2026-10-01T00:00:00.000Z',
  next_check_date: '2026-10-20',
  ...o,
});
const ledger = (experiments) => ({ version: 1, updated_at: '2026-10-02T13:02:16.547Z', experiments });
const auto = (o = {}) => ({
  source: 'auto',
  measuredAt: '2026-10-02T00:22:10.998Z',
  specHash: '5ad8dbe14f9d',
  metric: 'sales.revenue',
  pre: { startDate: '2026-08-19', endDate: '2026-09-15', value: 0, volume: 0 },
  post: { startDate: '2026-09-16', endDate: '2026-09-28', value: 0, volume: 0 },
  complete: false,
  salesLedgerThrough: '2026-09-27',
  deltaPct: null,
  verdictHint: 'in-progress',
  ...o,
});
const measure = (o = {}) => ({ specVersion: 1, metric: 'sales.revenue', scope: { productPrefix: 'rccm-' }, anchor: '2026-09-16', preDays: 28, postDays: 46, lagDays: 0, direction: 'increase', target: 30000, minVolume: 1, note: 'n', ...o });

test('business.experiments: コードとスキルが使う状態（measuring・abandoned）を通し、旧名（completed・cancelled）と知らない状態を止める', () => {
  const E = SCHEMAS.Experiments;
  for (const status of ['proposed', 'running', 'measuring', 'done', 'abandoned']) assertOk(E, ledger([exp({ status })]));
  for (const status of ['completed', 'cancelled', 'paused', 'closed']) assertFails(E, ledger([exp({ status })]), /^experiments\.0\.status/);
});

test('business.experiments: id の重複・仮説なし・日付の誤りを止める。seo-rank-watch の実験は仮説なしで通る', () => {
  const E = SCHEMAS.Experiments;
  assertOk(E, ledger([exp(), exp({ id: 'EXP-101' })]));
  assertFails(E, ledger([exp(), exp()]), /^experiments\.1: 実験の id「EXP-100」が重複/);
  const { hypothesis: _h, ...noHypothesis } = exp();
  assertFails(E, ledger([noHypothesis]), /^experiments\.0\.hypothesis: hypothesis が要る/);
  const { target_delta: _d, ...noDelta } = exp();
  assertFails(E, ledger([noDelta]), /target_delta/);
  assertFails(E, ledger([exp({ next_check_date: '2026-02-30' })]), /next_check_date/);
  assertFails(E, ledger([exp({ started_at: '2026-10-01T09:00:00+09:00' })]), /started_at/);
  assertOk(E, ledger([exp({ started_at: '2026-04-25', closed_at: null })]), '日付だけの古い行も通す');
  const seo = { id: 'SEO-scraper', kind: 'seo-rank-watch', watchId: 'scraper-definition', title: 't', status: 'proposed', created_at: '2026-10-01T05:50:34.963Z', actions: [], history: [{ date: '2026-10-01', event: 'record', actionIndex: 0 }], next_check_date: null };
  assertOk(E, ledger([seo]));
  const { watchId: _w, ...noWatch } = seo;
  assertFails(E, ledger([noWatch]), /watchId/);
  const { actions: _a, ...noActions } = seo;
  assertFails(E, ledger([noActions]), /actions/);
});

test('business.experiments: measure 仕様は任意で、付けたら型を持つ。running でも付けなくてよい', () => {
  const E = SCHEMAS.Experiments;
  assertOk(E, ledger([exp({ measure: measure() })]));
  assertOk(E, ledger([exp()]), 'measure の無い running（EXP-008・010）');
  assertFails(E, ledger([exp({ measure: measure({ specVersion: 2 }) })]), /measure\.specVersion/);
  assertFails(E, ledger([exp({ measure: measure({ preDays: '28' }) })]), /measure\.preDays/);
  assertFails(E, ledger([exp({ measure: measure({ direction: 'up' }) })]), /measure\.direction/);
  assertFails(E, ledger([exp({ measure: measure({ anchor: '2026-9-16' }) })]), /measure\.anchor/);
  const { scope: _s, ...noScope } = measure();
  assertFails(E, ledger([exp({ measure: noScope })]), /measure\.scope/);
});

test('business.experiments: 自動計測（source: auto）の行は型を持ち、手で書いた計測は自由', () => {
  const E = SCHEMAS.Experiments;
  assertOk(E, ledger([exp({ measurements: [auto()] })]));
  assertOk(E, ledger([exp({ measurements: [auto({ pre: { startDate: '2026-08-19', endDate: '2026-09-15', value: null, volume: 0 } })] })]));
  assertOk(E, ledger([exp({ measurements: [{ measured_at: '2026-09-14T09:04:58+09:00', source: 'data/x/history.json', anything: { goes: 1 } }] })]), '手で書いた計測');
  assertFails(E, ledger([exp({ measurements: [auto({ complete: 'yes' })] })]), /^experiments\.0\.measurements\.0\.complete/);
  assertFails(E, ledger([exp({ measurements: [auto({ measuredAt: '2026-10-02T09:22:10+09:00' })] })]), /measurements\.0\.measuredAt/);
  assertFails(E, ledger([exp({ measurements: [auto({ specHash: 'xyz' })] })]), /measurements\.0\.specHash/);
  assertFails(E, ledger([exp({ measurements: [auto({ extra: 1 })] })]), /measurements\.0/);
  const { verdictHint: _v, ...noHint } = auto();
  assertFails(E, ledger([exp({ measurements: [noHint] })]), /measurements\.0\.verdictHint/);
});

test('business.experiments: 履歴の行は date か at のどちらかに日時を持つ', () => {
  const E = SCHEMAS.Experiments;
  assertOk(E, ledger([exp({ history: [{ date: '2026-06-26T22:57:03.390Z', action: 'closed', summary: 's' }, { at: '2026-09-16T00:30:00.000Z', event: 'proposed', note: 'n' }] })]));
  assertFails(E, ledger([exp({ history: [{ action: 'x' }] })]), /^experiments\.0\.history\.0: date か at/);
  assertFails(E, ledger([exp({ history: [{ date: 'yesterday' }] })]), /history\.0\.date/);
});

// ---- 順位の見張り・YouTube（JSON Lines）-----------------------------------------------------

const rankRows = () => {
  const hit = latest('gsc.rank-watch');
  assert.ok(hit, 'gsc.rank-watch の実データが無い');
  const pick = (type) => hit.value.findLast((r) => r.type === type);
  return { measurement: pick('measurement'), decision: pick('decision'), policyReview: pick('policy-review') };
};

test('gsc.rank-watch: 行は type で形が決まり、recordId の接頭辞と対応し、版は 1、追記の行の欄は固定', () => {
  const R = SCHEMAS.RankWatch;
  const { measurement, decision } = rankRows();
  assertOk(R, [measurement, decision]);
  assertFails(R, [{ ...measurement, type: 'decision' }], /^0/);
  assertFails(R, [{ ...measurement, recordId: decision.recordId }], /^0\.recordId/);
  assertFails(R, [{ ...decision, recordId: measurement.recordId }], /^0\.recordId/);
  assertFails(R, [{ ...measurement, version: 2 }], /^0\.version/);
  assertFails(R, [{ ...decision, version: 2 }], /^0\.version/);
  assertFails(R, [{ ...measurement, type: 'unknown' }], /^0/);
  assertFails(R, [{ ...measurement, surprise: 1 }], /^0: .*Unrecognized key/);
  assertFails(R, [{ ...decision, result: 'maybe' }], /^0\.result/);
  assertFails(R, [{ ...measurement, scopeKey: 'abc' }], /^0\.scopeKey/);
  assertFails(R, [{ ...measurement, fetchedAt: '2026-10-01T14:50:34+09:00' }], /^0\.fetchedAt/);
  assertFails(R, [measurement, measurement], /^1: recordId「.*」が重複/);
  const review = { ...measurement, type: 'review', actionIndex: 0, days: 7, deployedAt: '2026-09-20T01:00:00Z' };
  assertOk(R, [review]);
  assertFails(R, [{ ...review, recordId: decision.recordId }], /^0\.recordId/);
  const { days: _d, ...noDays } = review;
  assertFails(R, [noDays], /^0\.days/);
});

test('gsc.rank-watch・youtube.posted: JSON Lines の壊れた行は行番号（0 始まり）つきで止まる', () => {
  const { measurement, decision } = rankRows();
  const { watchId: _w, ...broken } = measurement;
  assertFails(SCHEMAS.RankWatch, [measurement, decision, broken], /^2\.watchId/);
  assertFails(SCHEMAS.YoutubePosted, [youtubeRow(), youtubeRow({ key: 'k2', videoId: 'v2', publishAt: '' })], /^1\.publishAt/);
  assertFails(SCHEMAS.YoutubePosted, [youtubeRow(), youtubeRow()], /^1: videoId「v1」が重複/);
  assertFails(SCHEMAS.YoutubePosted, [youtubeRow(), youtubeRow({ videoId: 'v2' })], /^1: key「k1」が重複/);
  assertFails(SCHEMAS.YoutubePosted, [{ ...youtubeRow(), extra: 1 }], /Unrecognized key/);
});

// ---- 不変の証拠 --------------------------------------------------------------------------

const realSiteToSales = () => {
  const hit = latest('business.site-to-sales');
  assert.ok(hit, 'business.site-to-sales の実データが無い');
  return hit.value;
};

test('business.site-to-sales: 突合の数が合わない記録・期間が月と違う記録・書き手が知らない欄を止める', () => {
  const S = SCHEMAS.BusinessSiteToSales;
  const base = realSiteToSales();
  assertOk(S, base);
  const mutate = (fn) => {
    const r = structuredClone(base);
    fn(r);
    return r;
  };
  assertFails(S, mutate((r) => { r.summary.products += 1; }), /^summary\.products/);
  assertFails(S, mutate((r) => { r.summary.productsWithSales += 1; }), /^summary\.productsWithSales/);
  assertFails(S, mutate((r) => { r.summary.productsWithClicks += 1; }), /^summary\.productsWithClicks/);
  assertFails(S, mutate((r) => { r.clicks.total += 1; }), /^clicks\.total/);
  assertFails(S, mutate((r) => { r.sales.count += 1; }), /^sales\.count/);
  assertFails(S, mutate((r) => { r.sales.reconciliation.logYen += 1; }), /^sales\.reconciliation\.logYen/);
  assertFails(S, mutate((r) => { r.period.endDate = '2026-08-30'; r.month = '2026-08'; }), /^period/);
  assertFails(S, mutate((r) => { r.products.push(structuredClone(r.products[0])); r.summary.products += 1; }), /^products\.\d+: productId「.*」が重複/);
  assertFails(S, mutate((r) => { r.noteReferral.status = 'maybe'; }), /^noteReferral\.status/);
  assertFails(S, mutate((r) => { r.surprise = 1; }), /Unrecognized key/);
  assertFails(S, mutate((r) => { r.products[0].kind = 'other'; }), /^products\.0\.kind/);
});

test('business.site-to-sales: GA4 が月と重ならない月は null で通る（欠測を 0 にしない）', () => {
  const S = SCHEMAS.BusinessSiteToSales;
  const r = structuredClone(realSiteToSales());
  r.clicks = { status: 'missing', file: null, window: null, overlapDays: 0, outsideDays: 0, labelRows: 0, total: null, resolved: null, unresolved: [] };
  r.products = r.products.map((p) => ({ ...p, clicks: null, impressions: null, topPlacements: [], status: { ...p.status, clicks: 'missing' } }));
  r.summary = { ...r.summary, productsWithClicks: 0, productsWithClicksAndSales: 0 };
  r.noteReferral = { status: 'missing', file: null, fetchedAt: null, siteReferredViews: null, totalViews: null, noReferrerViews: null, dashboardSales: null, perProduct: 'unresolvable', perProductReason: 'x' };
  assertOk(S, r);
});

const checks = (o = {}) => ({
  cadence: 'monthly',
  runKey: '2026-08',
  ranAt: '2026-10-01T06:52:13.780Z',
  checks: [
    { command: 'check-backlog-health', label: 'バックログの健全性', exitCode: 0, state: 'ok', summary: 's', seconds: 6 },
    { command: 'check-workflow-health', label: '重要 workflow の健全性', exitCode: 1, state: 'fail', summary: 's', seconds: 31 },
    { command: 'node:check-x', label: 'x', exitCode: null, state: 'broken', summary: '180 秒で打ち切り', seconds: 180 },
  ],
  issues: [{ number: 478, title: '[auto] x', createdAt: '2026-08-31T08:38:00Z', labels: ['automation-failure'] }],
  alerts: [{ number: 29, severity: 'medium', package: 'uuid', summary: 's', createdAt: '2026-08-12T11:56:48Z' }],
  ...o,
});

test('business.checks-monthly・checks-weekly: 点検の状態は終了コードと対応し、週と月の取り違えを止める', () => {
  const M = SCHEMAS.BusinessChecksMonthly;
  const W = SCHEMAS.BusinessChecksWeekly;
  assertOk(M, checks());
  assertOk(M, checks({ alerts: undefined, issuesError: 'gh が失敗' }));
  assertOk(W, checks({ cadence: 'weekly', runKey: '2026-W40' }));
  assertFails(M, checks({ checks: [{ ...checks().checks[0], state: 'fail' }] }), /^checks\.0\.state: exitCode 0 なら state は ok/);
  assertFails(M, checks({ checks: [{ ...checks().checks[1], state: 'broken' }] }), /^checks\.0\.state/);
  assertFails(M, checks({ checks: [{ ...checks().checks[2], state: 'ok' }] }), /^checks\.0\.state/);
  assertFails(M, checks({ runKey: '2026-W40' }), /^runKey/);
  assertFails(M, checks({ cadence: 'weekly' }), /^cadence/);
  assertFails(W, checks({ cadence: 'weekly', runKey: '2026-08' }), /^runKey/);
  assertFails(M, checks({ ranAt: '2026-10-01T15:52:13+09:00' }), /^ranAt/);
  assertFails(M, checks({ surprise: 1 }), /Unrecognized key/);
});

// ---- 画面から取る記録（Playwright）---------------------------------------------------------

/** 実データの最新ファイルを複製して書き換える */
const mutateLatest = (id, fn) => {
  const hit = latest(id);
  assert.ok(hit, `${id} の実データが無い`);
  const value = structuredClone(hit.value);
  fn(value);
  return value;
};

test('note.referrers: 月の合計が流入元の合計と合わない・ページビューが読めない・売上が整数でない記録を止める', () => {
  const R = SCHEMAS.NoteReferrers;
  assertOk(R, latest('note.referrers').value);
  assertFails(R, mutateLatest('note.referrers', (r) => { r.monthly[0].total += 1; }), /^monthly\.0\.total/);
  assertFails(R, mutateLatest('note.referrers', (r) => { r.targetMonth.total += 1; }), /^targetMonth\.total/);
  assertFails(R, mutateLatest('note.referrers', (r) => { r.summary.pageViews = null; }), /^summary\.pageViews/);
  assertFails(R, mutateLatest('note.referrers', (r) => { r.summary.salesYen = 71640.5; }), /^summary\.salesYen/);
  assertFails(R, mutateLatest('note.referrers', (r) => { r.period = null; }), /^period/);
  assertFails(R, mutateLatest('note.referrers', (r) => { r.monthly = []; }), /^monthly/);
  assertFails(R, mutateLatest('note.referrers', (r) => { r.pie = []; }), /^pie/);
  assertOk(R, mutateLatest('note.referrers', (r) => { r.summary.salesYen = null; r.summary.comments = null; r.targetMonth = null; }));
  assertFails(R, mutateLatest('note.referrers', (r) => { r.fetchedAt = '2026-10-02T19:55:59+09:00'; }), /^fetchedAt/);
});

test('note.articles-pv: 件数と行数の食い違い・記事の欠けを止める', () => {
  const A = SCHEMAS.NoteArticlesPv;
  assertOk(A, latest('note.articles-pv').value);
  assertFails(A, mutateLatest('note.articles-pv', (r) => { r.count += 1; }), /^count/);
  assertFails(A, mutateLatest('note.articles-pv', (r) => { r.rows = []; r.count = 0; }), /^rows/);
  assertFails(A, mutateLatest('note.articles-pv', (r) => { delete r.rows[0].title; }), /^rows\.0\.title/);
  assertFails(A, mutateLatest('note.articles-pv', (r) => { r.rows[0].publishedAt = '2026-9-1'; }), /^rows\.0\.publishedAt/);
  assertOk(A, mutateLatest('note.articles-pv', (r) => { r.rows[0].comments = null; r.rows[0].salesYen = null; }));
});

test('note.magazines: --contents 無しの取得（notes なし）・件数の食い違い・キーの重複を止める', () => {
  const M = SCHEMAS.NoteMagazines;
  assertOk(M, latest('note.magazines').value);
  assertFails(M, mutateLatest('note.magazines', (r) => { delete r.magazines[0].notes; }), /^magazines\.0\.notes/);
  assertFails(M, mutateLatest('note.magazines', (r) => { r.magazineCount += 1; }), /^magazineCount/);
  assertFails(M, mutateLatest('note.magazines', (r) => { r.magazines[1].key = r.magazines[0].key; }), /^magazines\.1: マガジンの key/);
  assertFails(M, mutateLatest('note.magazines', (r) => { r.magazines[0].price = 'free'; }), /^magazines\.0\.price/);
});

test('coconala.orders-snapshot: タブの数・状態の食い違い、取引の重複、販売日の誤りを止める（見積りなど販売前の行は null で通る）', () => {
  const S = SCHEMAS.CoconalaOrdersSnapshot;
  assertOk(S, latest('coconala.orders-snapshot').value);
  assertFails(S, mutateLatest('coconala.orders-snapshot', (r) => { r.scan.tabsOk -= 1; }), /^scan\.tabsOk/);
  assertFails(S, mutateLatest('coconala.orders-snapshot', (r) => { r.scan.tabsTotal += 1; }), /^scan\.tabsTotal/);
  assertFails(S, mutateLatest('coconala.orders-snapshot', (r) => { r.status = 'partial'; }), /^status/);
  assertOk(S, mutateLatest('coconala.orders-snapshot', (r) => { r.status = 'partial'; r.scan.tabs[0].ok = false; r.scan.tabsOk = r.scan.tabsTotal - 1; }));
  assertFails(S, mutateLatest('coconala.orders-snapshot', (r) => { r.orders.push(structuredClone(r.orders[0])); }), /^orders\.\d+: talkroomId/);
  assertFails(S, mutateLatest('coconala.orders-snapshot', (r) => { r.orders[0].soldOn = '2026/08/04'; }), /^orders\.0\.soldOn/);
  assertOk(S, mutateLatest('coconala.orders-snapshot', (r) => { r.orders[0].soldOn = null; r.orders[0].priceYen = null; r.orders[0].replyDueAt = '2026-08-27T21:00+09:00'; }));
  assertFails(S, mutateLatest('coconala.orders-snapshot', (r) => { r.orders[0].replyDueAt = '2026-99-99T99:99'; }), /^orders\.0\.replyDueAt/);
  assertFails(S, mutateLatest('coconala.orders-snapshot', (r) => { delete r.orders[0].talkroomId; }), /^orders\.0\.talkroomId/);
});

test('coconala.analytics: 取得の段・状態・取得日の食い違い、期間を読めない記録を止める（マスクされた指標は null で通る）', () => {
  const A = SCHEMAS.CoconalaAnalytics;
  assertOk(A, latest('coconala.analytics').value);
  assertFails(A, mutateLatest('coconala.analytics', (r) => { r.scan.ok -= 1; }), /^scan\.ok/);
  assertFails(A, mutateLatest('coconala.analytics', (r) => { r.scan.total += 1; }), /^scan\.total/);
  assertFails(A, mutateLatest('coconala.analytics', (r) => { r.status = 'partial'; }), /^status/);
  assertFails(A, mutateLatest('coconala.analytics', (r) => { r.fetchedOnJst = '2026-09-22'; }), /^fetchedOnJst/);
  assertFails(A, mutateLatest('coconala.analytics', (r) => { r.period.services.from = null; }), /^period\.services\.from/);
  assertFails(A, mutateLatest('coconala.analytics', (r) => { r.services.push(structuredClone(r.services[0])); }), /^services\.\d+: serviceId/);
  assertFails(A, mutateLatest('coconala.analytics', (r) => { r.totals.views = '324'; }), /^totals\.views/);
  assertOk(A, mutateLatest('coconala.analytics', (r) => { r.period.blogs = null; r.totals = null; r.status = 'partial'; r.scan.ok -= 1; r.scan.steps[0].ok = false; }));
  assertOk(A, mutateLatest('coconala.analytics', (r) => { r.services[0] = { serviceId: r.services[0].serviceId, numericId: r.services[0].numericId, catalogStatus: 'listed', ok: false, views: null, orders: null, favorites: null, impressions: null, reason: 'ページ取得に失敗' }; }));
});

test('affiliate.catalog: 時刻・状態・配置の語彙の誤りを止める。案件ごとの記録欄は自由', () => {
  const C = SCHEMAS.AffiliateCatalog;
  assertOk(C, latest('affiliate.catalog').value);
  assertFails(C, mutateLatest('affiliate.catalog', (r) => { r.updatedAt = '2026-09-07T21:26:44.604637+00:00'; }), /^updatedAt/);
  assertFails(C, mutateLatest('affiliate.catalog', (r) => { r.programs.buildjob.asps.a8.status = 'approve'; }), /^programs\.buildjob\.asps\.a8\.status/);
  assertFails(C, mutateLatest('affiliate.catalog', (r) => { r.programs.buildjob.placement = 'maybe'; }), /^programs\.buildjob\.placement/);
  assertFails(C, mutateLatest('affiliate.catalog', (r) => { r.programs.buildjob.asps.felmat = { status: 'none' }; }), /^programs\.buildjob\.asps/);
  assertFails(C, mutateLatest('affiliate.catalog', (r) => { delete r.programs.buildjob.label; }), /^programs\.buildjob\.label/);
  assertOk(C, mutateLatest('affiliate.catalog', (r) => { r.programs.buildjob.newField = { anything: 1 }; }));
});

// ---- 設定（config/）----------------------------------------------------------------------

test('config.qualification-registry: 欄の誤記・資格 id の重複・展開状態なしを止める（id の照合は check-exam-calendar）', () => {
  const Q = SCHEMAS.QualificationRegistry;
  assertOk(Q, latest('config.qualification-registry').value);
  assertFails(Q, mutateLatest('config.qualification-registry', (r) => { r.qualifications[1].id = r.qualifications[0].id; }), /^qualifications\.1: 資格の id/);
  assertFails(Q, mutateLatest('config.qualification-registry', (r) => { r.qualifications[0].lable = 'x'; }), /^qualifications\.0: .*Unrecognized key/);
  assertFails(Q, mutateLatest('config.qualification-registry', (r) => { delete r.qualifications[0].portfolio; }), /^qualifications\.0\.portfolio/);
  assertFails(Q, mutateLatest('config.qualification-registry', (r) => { r.qualifications[0].id = 'Civil_1'; }), /^qualifications\.0\.id/);
  assertFails(Q, mutateLatest('config.qualification-registry', (r) => { r.groups['civil-construction-1-2'].members = ['civil-construction-1']; }), /groups\.civil-construction-1-2\.members/);
  assertFails(Q, mutateLatest('config.qualification-registry', (r) => { r.qualifications = []; }), /^qualifications/);
});

test('config.domains: サイドバーの画面の欄・リンクの形・領域 id の重複を止める（kind の照合は check-domains）', () => {
  const D = SCHEMAS.DomainsConfig;
  assertOk(D, latest('config.domains').value);
  assertFails(D, mutateLatest('config.domains', (r) => { r.domains[1].id = r.domains[0].id; }), /^domains\.1: 領域の id/);
  assertFails(D, mutateLatest('config.domains', (r) => { r.domains[0].nav[0].href = 'metrics/business'; }), /^domains\.0\.nav\.0\.href/);
  assertFails(D, mutateLatest('config.domains', (r) => { delete r.domains[0].nav[0].kind; }), /^domains\.0\.nav\.0\.kind/);
  assertFails(D, mutateLatest('config.domains', (r) => { r.domains[0].nav = []; }), /^domains\.0\.nav/);
  assertFails(D, mutateLatest('config.domains', (r) => { r.domains[0].extra = 1; }), /^domains\.0: .*Unrecognized key/);
  assertFails(D, mutateLatest('config.domains', (r) => { r.documents['docs/x.md'] = 3; }), /^documents\.docs\/x\.md/);
});

test('config.product-lineup: マスの書式・ルールの欠けを止める（マスの実在・正規表現の妥当性は validateLineupConfig）', () => {
  const P = SCHEMAS.ProductLineup;
  assertOk(P, latest('config.product-lineup').value);
  assertFails(P, mutateLatest('config.product-lineup', (r) => { r.rules.note[0].cells = ['civil-construction-1']; }), /^rules\.note\.0\.cells\.0/);
  assertFails(P, mutateLatest('config.product-lineup', (r) => { r.rules.note[0].cells = []; }), /^rules\.note\.0\.cells/);
  assertFails(P, mutateLatest('config.product-lineup', (r) => { delete r.rules.note[0].match; }), /^rules\.note\.0\.match/);
  assertFails(P, mutateLatest('config.product-lineup', (r) => { r.apps[1].id = r.apps[0].id; }), /^apps\.1: アプリの id/);
  assertFails(P, mutateLatest('config.product-lineup', (r) => { r.apps[0].url = 'not a url'; }), /^apps\.0\.url/);
  assertFails(P, mutateLatest('config.product-lineup', (r) => { r.channels[1].id = r.channels[0].id; }), /^channels\.1: チャネルの id/);
});

test('config.coconala-listings: 出品の投入に要る欄の欠け・数値でないカテゴリ・納期 0 を止める', () => {
  const L = SCHEMAS.CoconalaListings;
  assertOk(L, latest('config.coconala-listings').value);
  const first = (r) => Object.values(r.listings)[0];
  assertFails(L, mutateLatest('config.coconala-listings', (r) => { delete first(r).body; }), /^listings\..*\.body/);
  assertFails(L, mutateLatest('config.coconala-listings', (r) => { first(r).category.master = 'x'; }), /category\.master/);
  assertFails(L, mutateLatest('config.coconala-listings', (r) => { first(r).deliveryDays = 0; }), /deliveryDays/);
  assertFails(L, mutateLatest('config.coconala-listings', (r) => { first(r).faq.push({ q: 'q' }); }), /faq\.\d+\.a/);
  assertFails(L, mutateLatest('config.coconala-listings', (r) => { first(r).priceYen = 2500; }), /Unrecognized key/);
});

test('config.exam-calendar: 実在しない日付・照合記録の欠け・種類の誤記を止める（資格 id・日程の規則は check-exam-calendar）', () => {
  const C = SCHEMAS.ExamCalendar;
  assertOk(C, latest('config.exam-calendar').value);
  const firstEvent = (r) => Object.values(Object.values(r.exams).find((e) => Object.keys(e.events).length).events)[0];
  assertFails(C, mutateLatest('config.exam-calendar', (r) => { firstEvent(r).date = '2026-02-30'; }), /^exams\..*\.date/);
  assertFails(C, mutateLatest('config.exam-calendar', (r) => { delete firstEvent(r).kind; }), /^exams\..*\.kind/);
  assertFails(C, mutateLatest('config.exam-calendar', (r) => { delete Object.values(r.exams)[0].verification; }), /verification/);
  assertFails(C, mutateLatest('config.exam-calendar', (r) => { Object.values(r.exams)[0].verification.checkedBy = 'someone'; }), /checkedBy/);
  assertFails(C, mutateLatest('config.exam-calendar', (r) => { Object.values(r.exams)[0].source = 'jctc.jp'; }), /source/);
  assertFails(C, mutateLatest('config.exam-calendar', (r) => { r.timezone = 'UTC'; }), /^timezone/);
});

test('config.note-funnel: 導線の印と本文の食い違い・もくじ記事の欠けを止める（導線を置かない資格は印・本文とも空で通る）', () => {
  const N = SCHEMAS.NoteFunnel;
  const real = latest('config.note-funnel').value;
  assertOk(N, real);
  assert.ok(Object.values(real.exams).some((e) => e.topCta.marker === ''), '導線を置かない資格（marker・text とも空）の実例が無い');
  const first = (r) => Object.values(r.exams).find((e) => e.topCta.marker);
  assertFails(N, mutateLatest('config.note-funnel', (r) => { first(r).topCta.marker = 'pack-top'; }), /topCta\.marker/);
  assertFails(N, mutateLatest('config.note-funnel', (r) => { first(r).topCta.text = 'no marker comment'; }), /topCta\.text/);
  assertFails(N, mutateLatest('config.note-funnel', (r) => { first(r).bottomCta.marker = ''; }), /bottomCta\.marker/);
  assertFails(N, mutateLatest('config.note-funnel', (r) => { delete first(r).L2; }), /\.L2/);
  assertFails(N, mutateLatest('config.note-funnel', (r) => { r.L1.noteUrl = 'x'; }), /^L1\.noteUrl/);
});
