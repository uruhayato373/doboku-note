import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyTableOverride, tableKey, tryGfmTable, tryStandardsList, thresholds } from '../scripts/lib/standards-table.mjs';

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

// ---- 基準類の一覧（tryStandardsList） ------------------------------------
// 「適用すべき諸基準」の一覧は列に分けず 1 項目 1 行にする。ここでも主眼は「文字を変えない」こと。

test('基準類の一覧: 折り返した名称と年月だけの行を 1 項目にまとめる', () => {
  const result = tryStandardsList([
    ' 土木学会      コンクリート標準示方書（施工編）［2023年制定］            （2023年9月）',
    ' 国土交通省      「アルカリ骨材反応抑制対策について」の運用について',
    '                                             （平成14年7月31日）',
    ' 流動性を高めたコンクリートの活用検討委員会             流動性を高めた現場打ちコンクリート',
    ' の活用に関するガイドライン                                 （平成29年3月）',
  ]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.items, [
    '土木学会 コンクリート標準示方書（施工編）［2023年制定］ （2023年9月）',
    '国土交通省 「アルカリ骨材反応抑制対策について」の運用について （平成14年7月31日）',
    '流動性を高めたコンクリートの活用検討委員会 流動性を高めた現場打ちコンクリートの活用に関するガイドライン （平成29年3月）',
  ]);
});

test('基準類の一覧: 名称の中の年を含まない括弧で行が終わっても項目を切らない', () => {
  const result = tryStandardsList([
    ' 日本道路協会        道路橋示方書・同解説（Ⅲコンクリート部材・コンクリート上部構造編）',
    '                                             （令和7年10月）',
  ]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.items, ['日本道路協会 道路橋示方書・同解説（Ⅲコンクリート部材・コンクリート上部構造編） （令和7年10月）']);
});

test('基準類の一覧: 年月で終わらない行が残る一覧は採用しない（版面のまま残す）', () => {
  const result = tryStandardsList([
    ' 日本道路協会        道路維持修繕要綱               （昭和53年7月）',
    ' 日本みち研究所        補訂版 道路のデザイン-道路デザイン指針（案）とその解説-',
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'list-unterminated');
});

// ---- 原本と照合して組み直した表（applyTableOverride） ------------------------
// 組み直しは承認済みで、版面の文字と多重集合で一致するものだけを採用する（並べ替えは許し、過不足は許さない）。

const LAYOUT = ['           早強      普通', '15℃以上     3日       5日', '10℃以上     4日       7日'];
const approved = (extra) => ({ key: tableKey(LAYOUT), layout: LAYOUT, review: { status: 'approved' }, ...extra });

test('組み直し: 承認済みで文字が一致すれば表の部品になり、結合セルの繰り返しは元の文字を写す', () => {
  const result = applyTableOverride(LAYOUT, approved({
    kind: 'table',
    header: [['日平均気温', '早強', '普通']],
    rows: [['15℃以上', '3日', '5日'], ['10℃以上', '4日', '7日']],
  }));
  // 「日平均気温」は版面に無いので足すと照合に落ちる
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'override-lossy');

  const ok = applyTableOverride(LAYOUT, approved({
    kind: 'table',
    header: [['', '早強', '普通']],
    rows: [['15℃以上', '3日', '5日'], ['10℃以上', '4日', '7日'], [{ same: 'above' }, '', '']],
  }));
  assert.equal(ok.ok, true);
  assert.equal(ok.kind, 'parts');
  assert.deepEqual(ok.parts[0].rows[2], ['10℃以上', '', '']);
});

test('組み直し: 下書き（未承認）は使わない', () => {
  const draft = { ...approved({ kind: 'table', header: [['', '早強', '普通']], rows: [] }), review: { status: 'draft' } };
  assert.equal(applyTableOverride(LAYOUT, draft).reason, 'override-unreviewed');
});

test('組み直し: 1 文字でも落とすと採用しない', () => {
  const result = applyTableOverride(LAYOUT, approved({
    kind: 'table',
    header: [['', '早強', '普通']],
    rows: [['15℃以上', '3日', '5日'], ['10℃以上', '4日', '']],
  }));
  assert.equal(result.ok, false);
  assert.match(result.detail, /不足 .*7×1/);
});

test('組み直し: 前の版面を取り込む表は、取り込んだ版面の文字も合わせて照合する', () => {
  const head = ['  ふるいの呼び寸法(㎜)    質量百分率(％)'];
  const body = ['    2.5       100', '    1.2     90～100'];
  const absorbing = {
    key: tableKey(body), layout: body, review: { status: 'approved' }, kind: 'parts', absorbs: [tableKey(head)],
    parts: [{ kind: 'table', header: [['ふるいの呼び寸法(㎜)', '質量百分率(％)']], rows: [['2.5', '100'], ['1.2', '90～100']] }],
  };
  const absorbed = { key: tableKey(head), layout: head, review: { status: 'approved' }, kind: 'absorbed', into: absorbing.key };
  const lookup = (key) => ({ [absorbing.key]: absorbing, [absorbed.key]: absorbed })[key];

  assert.equal(applyTableOverride(head, absorbed, { lookup }).kind, 'absorbed');
  const ok = applyTableOverride(body, absorbing, { lookup, absorbedBodies: new Map([[absorbed.key, head]]) });
  assert.equal(ok.ok, true);
  // 取り込む版面が前に無ければ止める（本文が消えるため）
  assert.equal(applyTableOverride(body, absorbing, { lookup }).reason, 'override-absorb-missing');
});

test('組み直し: 表の外で段落に化けた行（absorbsParagraphs）も照合に含め、表の key は変えない（DN-0755）', () => {
  const body = ['    10       100', '     5     90～100'];
  const entry = {
    key: tableKey(body), layout: body, review: { status: 'approved' }, kind: 'parts',
    absorbsParagraphs: { after: ['0.15 2～10 ［注1］'] },
    parts: [{ kind: 'table', header: [['ふるい', '百分率']], rows: [['10', '100'], ['5', '90～100'], ['0.15', '2～10 ［注1］']] }],
  };
  // 見出し（ふるい・百分率）は版面に無い文字なので、版面にも見出しを足して照合する
  const layout = ['  ふるい   百分率', ...body];
  const withHeader = { ...entry, key: tableKey(layout), layout };
  assert.equal(applyTableOverride(layout, withHeader).ok, true);
  // 取り込む段落を宣言しないと、足した行の文字が余分になって採用しない
  const missing = applyTableOverride(layout, { ...withHeader, absorbsParagraphs: undefined });
  assert.equal(missing.reason, 'override-lossy');
  assert.match(missing.detail, /余分 .*注×1/);
});

test('組み直し: headerFill は見出しの空欄だけを指した表の見出しで補い、文字のある欄と照合は変えない', () => {
  const source = { key: 'f'.repeat(16), kind: 'table', header: [['気温', '早強セメント', '普通セメント']], rows: [['a', 'b', 'c']], review: { status: 'approved' } };
  const lookup = (key) => (key === source.key ? source : undefined);
  const result = applyTableOverride(LAYOUT, approved({
    kind: 'table',
    header: [['', '早強', '普通']],
    rows: [['15℃以上', '3日', '5日'], ['10℃以上', '4日', '7日']],
    headerFill: source.key,
  }), { lookup });
  assert.equal(result.ok, true, result.reason);
  const table = result.parts.find((part) => part.kind === 'table');
  // 空欄だけ補う（「早強」「普通」は版面の字のまま）。補った「気温」は版面に無いが照合の外
  assert.deepEqual(table.header[0], ['気温', '早強', '普通']);

  const wrongWidth = { ...source, header: [['気温', '早強']], rows: [['a', 'b']] };
  const bad = applyTableOverride(LAYOUT, approved({
    kind: 'table', header: [['', '早強', '普通']], rows: [['15℃以上', '3日', '5日'], ['10℃以上', '4日', '7日']], headerFill: source.key,
  }), { lookup: () => wrongWidth });
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, 'override-bad-header-fill');
});

test('組み直し: 縦に結合したセルの長い文（30 字超）は 2 行目以降を（同上）と表示し、短い値はそのまま写す', () => {
  const long = 'あ'.repeat(31);
  const layout = [`${long} 1`, ' 2', ' 3'];
  const override = { key: tableKey(layout), layout, review: { status: 'approved' }, kind: 'table', header: [['', '']], rows: [[long, '1'], [{ same: 'above' }, '2'], [{ same: 'above' }, '3']] };
  const result = applyTableOverride(layout, override);
  assert.equal(result.ok, true, result.reason);
  const table = result.parts.find((part) => part.kind === 'table');
  assert.deepEqual(table.rows.map((row) => row[0]), [long, '（同上）', '（同上）']);
});
