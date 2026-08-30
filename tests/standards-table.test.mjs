import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tryGfmTable, thresholds } from '../scripts/lib/standards-table.mjs';

// 固定レイアウト（pdftotext -layout）の表を GFM へ戻す関数の契約を固定する。
// 誤った GFM 化＝データ破壊なので、テストの主眼は「通ること」より「通さないこと」にある。

test('きれいな3列の表が GFM になる', () => {
  const result = tryGfmTable([
    'AAAA    BBBB    CCCC',
    'DDDD    EEEE    FFFF',
    'GGGG    HHHH    IIII',
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.columns, 3);
  assert.deepEqual(result.header, ['AAAA', 'BBBB', 'CCCC']);
  assert.deepEqual(result.rows, [
    ['DDDD', 'EEEE', 'FFFF'],
    ['GGGG', 'HHHH', 'IIII'],
  ]);
});

test('左端に共通インデントが残っていても列を取り違えない', () => {
  const result = tryGfmTable([
    '        AAAA    BBBB    CCCC',
    '        DDDD    EEEE    FFFF',
    '        GGGG    HHHH    IIII',
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.columns, 3);
  assert.deepEqual(result.header, ['AAAA', 'BBBB', 'CCCC']);
});

test('全角を含む表で列がずれない（全角=2桁で数えないと崩れる版面）', () => {
  // 「区分」は 4 桁、「ＲＣ－40」は 8 桁。全角を 1 文字 = 1 桁で数えると
  // 列境界が左へずれ、2 列目の末尾が 3 列目へこぼれる。
  const result = tryGfmTable([
    '区分        呼び名        備考',
    '砕石        ＲＣ－40      路盤',
    '砂利        ＲＣ－30      路床',
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.columns, 3);
  assert.deepEqual(result.header, ['区分', '呼び名', '備考']);
  assert.deepEqual(result.rows, [
    ['砕石', 'ＲＣ－40', '路盤'],
    ['砂利', 'ＲＣ－30', '路床'],
  ]);
});

test('中部 common p245 の実データが復元できる（回帰の固定）', () => {
  const result = tryGfmTable([
    '               浸漬温度            ９８±２℃',
    '               浸漬時間            １２０±１０min',
    '               浸漬水             蒸留水',
    '               試験体の数           ５個',
    '               乾燥温度            １０５℃',
    '               抽出条件(質量比)       網地：水＝１：５００',
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.columns, 2);
  assert.deepEqual(result.header, ['浸漬温度', '９８±２℃']);
  assert.deepEqual(result.rows.at(-1), ['抽出条件(質量比)', '網地：水＝１：５００']);
});

test('列数がバラつく表は ragged-rows', () => {
  const result = tryGfmTable([
    'AAAA    BBBB    CCCC',
    'DDDD    EEEE    FFFF',
    'GGGG    HHHH',
  ]);
  assert.deepEqual(result, { ok: false, reason: 'ragged-rows' });
});

test('セル内に3桁以上の空白がある行も ragged-rows（どのセルの文字か決められない）', () => {
  // 2 行目の 1 列目に 3 桁の空白がある。列境界（8-11 桁）は全行で空白なので検出でき、
  // 可逆性も通るが、行単体では 4 群に見えるため列との対応が取れない。
  const result = tryGfmTable([
    'AAAAAAAA    BBBB    CCCC',
    'DD   DDD    EEEE    FFFF',
    'GGGGGGGG    HHHH    IIII',
  ]);
  assert.deepEqual(result, { ok: false, reason: 'ragged-rows' });
});

test('文字が失われるケースは lossy', () => {
  // 12 行中 1 行（8.3%）だけが列境界をまたぐので、境界検出（90% 以上空白）は通る。
  // またいだ行は境界内から始まる文字を必ず持ち、可逆性検査だけがこれを捕まえる。
  // またいだ行の content 群は 3 つ（列数と一致）なので ragged-rows では落ちない。
  const lines = [];
  for (let i = 0; i < 11; i += 1) lines.push('AAAA    BBBB    CCCC');
  lines.push('XXXXXXXXXX      YY   Z');
  const result = tryGfmTable(lines);
  assert.deepEqual(result, { ok: false, reason: 'lossy' });
});

test('復元後に空セルが出る版面は empty-cell（p173 の実データ回帰）', () => {
  // 3 行目の `骨材の微粒分量   ％` が 1 列目へ同居し、2 列目が空になる。
  // 可逆性も行ごとの列数も通ってしまうため、空セルそのものを不採用の根拠にする。
  const result = tryGfmTable([
    '           旧アスファルトの含有量       ％                      3.8以上',
    '           旧アスファルトの針入度       (25℃)1/10mm            20以上',
    '           骨材の微粒分量   ％                              5以下',
  ]);
  assert.deepEqual(result, { ok: false, reason: 'empty-cell' });
});

test('セルに | を含むと pipe-in-cell', () => {
  const result = tryGfmTable([
    'A|A     BBB     CCC',
    'DDD     EEE     FFF',
    'GGG     HHH     III',
  ]);
  assert.deepEqual(result, { ok: false, reason: 'pipe-in-cell' });
});

test('7 列は columns-out-of-range', () => {
  const result = tryGfmTable([
    'A    B    C    D    E    F    G',
    'H    I    J    K    L    M    N',
    'O    P    Q    R    S    T    U',
  ]);
  assert.deepEqual(result, { ok: false, reason: 'columns-out-of-range' });
});

test('列境界の無い散文（1 列）も columns-out-of-range', () => {
  const result = tryGfmTable([
    '受注者は、工事の施工にあたり次の各号に掲げる事項を遵守しなければならない。',
    'なお、監督職員の指示があった場合はこの限りでない。',
    'また、必要に応じて協議するものとする。',
  ]);
  assert.deepEqual(result, { ok: false, reason: 'columns-out-of-range' });
});

test('データ行が 1 行しかない版面は too-few-rows', () => {
  const result = tryGfmTable([
    'AAAA    BBBB    CCCC',
    'DDDD    EEEE    FFFF',
  ]);
  assert.deepEqual(result, { ok: false, reason: 'too-few-rows' });
});

test('タブがある版面は桁揃えの前提が崩れるので tab-character', () => {
  const result = tryGfmTable([
    'AAAA\tBBBB    CCCC',
    'DDDD    EEEE    FFFF',
    'GGGG    HHHH    IIII',
  ]);
  assert.deepEqual(result, { ok: false, reason: 'tab-character' });
});

test('空行は行数にも列境界にも数えない（可逆性は保たれる）', () => {
  const result = tryGfmTable([
    'AAAA    BBBB    CCCC',
    '',
    'DDDD    EEEE    FFFF',
    '',
    'GGGG    HHHH    IIII',
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 2);
});

test('空配列は too-few-rows（例外を投げない）', () => {
  assert.deepEqual(tryGfmTable([]), { ok: false, reason: 'too-few-rows' });
});

test('ok:false は必ず機械可読な reason を持つ', () => {
  const known = new Set([
    'too-few-rows',
    'tab-character',
    'empty-layout',
    'columns-out-of-range',
    'lossy',
    'ragged-rows',
    'empty-cell',
    'pipe-in-cell',
  ]);
  const samples = [
    [],
    ['AAAA    BBBB'],
    ['A    B    C    D    E    F    G', 'H    I    J    K    L    M    N', 'O    P    Q    R    S    T    U'],
    ['AAAA    BBBB    CCCC', 'DDDD    EEEE    FFFF', 'GGGG    HHHH'],
  ];
  for (const sample of samples) {
    const result = tryGfmTable(sample);
    if (result.ok) continue;
    assert.equal(typeof result.reason, 'string');
    assert.ok(known.has(result.reason), `未知の reason: ${result.reason}`);
  }
});

test('閾値は保守側に固定されている', () => {
  assert.equal(thresholds.MIN_COLUMNS, 2);
  assert.equal(thresholds.MAX_COLUMNS, 6);
  assert.equal(thresholds.MIN_SEPARATOR_WIDTH, 3);
  assert.equal(thresholds.MIN_DATA_ROWS, 2);
  // 90% を下回ると列境界が広がりすぎて、実データで復元できる表が減る（実測: 0.8 で 5 件 → 3 件）
  assert.ok(thresholds.SEPARATOR_BLANK_RATIO >= 0.9);
});
