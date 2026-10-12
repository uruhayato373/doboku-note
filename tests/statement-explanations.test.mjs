import test from 'node:test';
import assert from 'node:assert/strict';
import { SOURCES, buildDataset, statementFields } from '../scripts/build-quiz-data.mjs';
import { toBundleQuestion, bundledImageRels } from '../scripts/build-ios-quiz-bundle.mjs';
import { extractStatementExplanations, hasStatementStem, renderStatementsHtml, withStatementHtml } from '../scripts/lib/statement-explanations.mjs';

const details = (body) => `\n\n**正答：3**\n\n${body}\n\n<ExamPoint summary="要点" items={["a"]} />\n`;

test('①〜④の記述ごとの解説を、記号・印を除いた本文・正誤で取り出す。選択肢の行（1.）と正答の行は読まない', () => {
  const got = extractStatementExplanations(details([
    '① 低騒音型の機械を採用する。適当 ✅', '',
    '② 労働基準監督署の立会いを求める。不適当 ❌', '',
    '適当なものは①の1つ。', '',
    '1. 1つ ✅',
    '2. 2つ ❌',
  ].join('\n')));
  assert.deepEqual(got, [
    { label: '①', text: '低騒音型の機械を採用する。適当', correct: true },
    { label: '②', text: '労働基準監督署の立会いを求める。不適当', correct: false },
  ]);
});

test('数値文字参照で書いた記号（&#x2460;）・（ア）・ア の見出しと、複数行にまたがる記述を読む', () => {
  const got = extractStatementExplanations(details([
    '&#x2460; 一行目', '続きの行 ✅', '',
    '（ア）は、アの説明。誤り ❌', '(イ) イの説明 ○',
    'ウ　ウの説明 ×',
  ].join('\n')));
  assert.deepEqual(got.map((s) => [s.label, s.correct]), [['①', true], ['ア', false], ['イ', true], ['ウ', false]]);
  assert.equal(got[0].text, '一行目\n続きの行');
  assert.equal(got[1].text, 'アの説明。誤り'); // 見出しの直後の「は、」は落とす
});

test('印が無い記述は、文の言い切りの語（適切・誤り・先頭の「不適切。」）から正誤を読む。読めなければ null', () => {
  const got = extractStatementExplanations(details([
    '（ア）密度を規定するので適切。', '（イ）CBR を使うため誤り。', '（ウ）不適切。条文と異なる。', '（エ）数値は 10 である。',
  ].join('\n')));
  assert.deepEqual(got.map((s) => s.correct), [true, false, false, null]);
});

test('1 行に（ア）は…。（イ）は…。と続けた解説は記述ごとに分け、最後のまとめの文を落とす', () => {
  const got = extractStatementExplanations(details('（ア）は、無酸素化で溶出するので不適切。（イ）は、選択取水が適切。（ウ）は、pH が上がるため不適切。適切なのは（イ）の1つである。'));
  assert.deepEqual(got.map((s) => [s.label, s.correct]), [['ア', false], ['イ', true], ['ウ', false]]);
  assert.equal(got[2].text, 'pH が上がるため不適切。');
  // 文中の「（ア）と（イ）」の並びは分けない
  assert.deepEqual(extractStatementExplanations(details('（ア）と（イ）の組合せが適切 ✅')), []);
});

test('「① 〜④のすべてが適当」はまとめの文。記述が 2 つ未満なら記述ごとの解説と見なさない', () => {
  const got = extractStatementExplanations(details('① あ ✅\n\n② い ✅\n\n① 〜④のすべてが適当であり、正答は①②③④。'));
  assert.deepEqual(got.map((s) => s.label), ['①', '②']);
  assert.deepEqual(extractStatementExplanations(details('① だけ ✅')), []);
  assert.deepEqual(extractStatementExplanations(''), []);
});

test('問題文が記述を並べる形でなく、解説に選択肢の行もあるときは、空欄の答えの列挙（ア：…）を記述の解説にしない', () => {
  const blanks = details('ア：持続可能な発展\nイ：国際行動規範\n\n1. ア：持続可能な発展 ✅\n2. 誤り ❌');
  assert.deepEqual(extractStatementExplanations(blanks, '空欄に入る語句の組合せはどれか。\n\n1. ア：x'), []);
  assert.equal(extractStatementExplanations(blanks).length, 2); // 問題文を渡さないときは門を通さない
  // 選択肢の行が無いときは、この行が唯一の解説なので取り出す
  assert.equal(extractStatementExplanations(details('（イ）40。上限は週 40 時間。\n（ロ）8。上限は 1 日 8 時間。'), '空欄（イ）（ロ）に入る数値の組合せ').length, 2);
});

test('hasStatementStem: 記述の行が 2 行以上ある問題文だけが true（&#x2460; も読む）', () => {
  assert.equal(hasStatementStem('次の記述のうち、適当なものの数は。\n\n&#x2460; 低騒音型の機械を採用する。\n\n&#x2461; 広報板を設置して挨拶する。'), true);
  assert.equal(hasStatementStem('- (イ) 既設管渠内に表面部材をかん合して製管する。\n- (ロ) 既設管渠より小さな管径の管を挿入する。'), true);
  assert.equal(hasStatementStem('空欄ア、イに入る語句。\n\n（イ） ── （ロ）\n\n1. 洗浄水 ── pH'), false);
});

test('renderStatementsHtml: 記号・正誤・本文の HTML を決まった形で書き出す。記述が無ければ空文字', () => {
  const html = renderStatementsHtml(withStatementHtml([
    { label: '①', text: '施工機械は **低騒音型** を採用する。', correct: true },
    { label: 'ア', text: '労働基準監督署ではない。', correct: false },
    { label: 'イ', text: '数値は 10 である。', correct: null },
  ]));
  assert.equal(html, [
    '<section class="quiz-statements" aria-label="記述ごとの解説"><h4 class="quiz-statements-title">記述ごとの解説</h4>',
    '<div class="quiz-statement"><div class="quiz-statement-head"><span class="quiz-statement-label">①</span><span class="quiz-statement-verdict ok">○ 適当</span></div><div class="quiz-statement-body quiz-rich-text"><p>施工機械は <strong>低騒音型</strong> を採用する。</p></div></div>',
    '<div class="quiz-statement"><div class="quiz-statement-head"><span class="quiz-statement-label">（ア）</span><span class="quiz-statement-verdict ng">× 適当でない</span></div><div class="quiz-statement-body quiz-rich-text"><p>労働基準監督署ではない。</p></div></div>',
    '<div class="quiz-statement"><div class="quiz-statement-head"><span class="quiz-statement-label">（イ）</span></div><div class="quiz-statement-body quiz-rich-text"><p>数値は 10 である。</p></div></div>',
    '</section>',
  ].join(''));
  assert.equal(renderStatementsHtml([]), '');
  assert.equal(renderStatementsHtml(undefined), '');
  assert.deepEqual(statementFields([]), {});
});

test('演習データ: 記述ごとの解説が入った問題は statements と statementsHtml を持ち、記述は 2 つ以上・本文が空でない', () => {
  const found = {};
  // 技術士第一次は MDX 1,830 問の変換に 20 秒かかるので、JSON から作る 3 試験で見る（第一次の抽出も同じ関数）
  for (const source of SOURCES.filter((x) => x.kind !== 'pe-first-stage-mdx')) {
    const ds = buildDataset(source);
    const withStatements = ds.questions.filter((q) => q.statements);
    found[ds.exam] = withStatements.length;
    for (const q of withStatements) {
      assert.ok(q.statements.length >= 2, `${ds.exam}/${q.id}`);
      assert.ok(q.statements.every((s) => s.label && s.text && s.html), `${ds.exam}/${q.id}`);
      assert.equal(q.statementsHtml, renderStatementsHtml(q.statements), `${ds.exam}/${q.id}`);
    }
  }
  // 1級・2級土木・総監のどれも、記述ごとの解説が入っている（0 件なら抽出が壊れている）
  for (const exam of ['civil-1', 'civil-2', 'cem']) assert.ok(found[exam] >= 25, `${exam}: ${found[exam]} 問`);
});

test('iOS 書き出し: 記述ごとの解説の画像をアプリ内の images/ へ書き換え、同梱する画像として数える', () => {
  const q = toBundleQuestion({
    id: 'x', body: '本文', options: [{ num: 1, text: 'a' }], explanations: [{ num: 1, text: '', correct: true }],
    statements: [{ label: '①', text: 'x', html: '<p><img src="/posts/a/fig.webp"></p>', correct: true }, { label: '②', text: 'y', html: '<p>y</p>', correct: false }],
    statementsHtml: '<section><img src="/posts/a/fig.webp"></section>',
  });
  assert.equal(q.statements[0].html, '<p><img src="images/a/fig.webp"></p>');
  assert.equal(q.statementsHtml, '<section><img src="images/a/fig.webp"></section>');
  assert.deepEqual(bundledImageRels(q), ['a/fig.webp']);
  // 記述ごとの解説が無い問題には項目を足さない
  assert.equal('statements' in toBundleQuestion({ id: 'y', body: 'b', options: [], explanations: [] }), false);
});

test('（カ）（キ）まである 7 つの記述も取り出す（DN-0699）', () => {
  const got = extractStatementExplanations(details('（ア）あ ✅\n\n（オ）い ❌\n\n（カ）う ✅\n\n（キ）え ❌'));
  assert.deepEqual(got.map((s) => s.label), ['ア', 'オ', 'カ', 'キ']);
  assert.equal(hasStatementStem('次の記述のうち。\n\n（カ）ファクシミリ機による送受信機能が使える。\n\n（キ）デスクトップパソコンによるメール機能が使える。'), true);
});

test('用語（A）〜（E）を説明する記述の解説も取り出す（DN-0699）', () => {
  const got = extractStatementExplanations(details('（A）信頼性設計は（イ）の説明にあたる ✅\n\n（B）保全性設計は（ア）の説明にあたる ✅'));
  assert.deepEqual(got.map((s) => s.label), ['A', 'B']);
});
