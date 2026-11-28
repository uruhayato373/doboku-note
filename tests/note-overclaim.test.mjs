// note 記事の「根拠の無い言い切り」の判定と基準線のラチェット（scripts/lib/note-overclaim.mjs・check-note-overclaim）。
// 2026-11-27 に無料記事が筆者の目安を採点基準のように書いて読者を不安にさせた。語の一覧は lib の 1 か所だけ。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OVERCLAIM_RULES, compareWithBaseline, findOverclaims, isNoteArticleName, nextBaseline } from '../scripts/lib/note-overclaim.mjs';
import { AGENT_CONFIG_SCHEMAS } from '../scripts/lib/dataset-schemas-agent-config.mjs';
import { STEPS } from '../scripts/lib/pre-commit-steps.mjs';
import { AGENT_CONFIG_ROOT, REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const rulesOf = (text) => findOverclaims(text).map((h) => h.rule);

test('採点を断定する語・決まりのように書く語・読者を見下す語を拾う', () => {
  const cases = {
    'これを落とすと減点必至です。': '減点必至',
    '単位を書き忘れると即減点です。': '即減点',
    'この一文は採点上きわめて重要です。': '採点上（きわめて）重要',
    '見出しは採点上重要です。': '採点上（きわめて）重要',
    '設問(3)で最も評価される構造です。': '最も評価され',
    '数値のある答案は高く評価されます。': '高く評価されます',
    '採点者は次の4軸を共通して評価します。': '採点者は〜評価/減点します',
    '採点者は結論の無い答案を容赦なく減点します。': '採点者は〜評価/減点します',
    '答案を書くときの 3 つの鉄則': '鉄則',
    '答案には作法が決まっています。': '作法が決まって',
    'この型で書けば必ず合格できます。': '必ず合格',
    'この教材は合格を保証します。': '合格を保証',
    'これは小学生レベルの誤りです。': '小学生レベル',
    '### 採点者が見るポイント（安全管理）': '採点者が見るポイント',
    '## 採点者視点の仕上げ': '採点者視点',
    '採点者は数値の根拠を見ています。': '採点者は〜を見ています',
    '評価される書き方を身につけます。': '評価される書き方',
    '結論が無いと減点されます。': '加点・減点される',
    'この構成は高評価につながります。': '高評価',
  };
  for (const [text, rule] of Object.entries(cases)) assert.deepEqual(rulesOf(text), [rule], text);
  // 技術・制度の話や断り書きは拾わない
  for (const text of ['最高評価区分にあたります。', '減点されるとは限りません。']) assert.deepEqual(rulesOf(text), [], text);
  // すべての型に検出例がある（型を足したのにテストが無い、を止める）
  assert.deepEqual([...new Set(Object.values(cases))].sort(), OVERCLAIM_RULES.map((r) => r.id).sort());
});

test('似た語・断り書きは拾わない', () => {
  for (const text of [
    '具体例のある答案は評価されます。',
    '鉄筋の継手は原則として同一断面に集めない。',
    '鉄は熱いうちに打て。原則を先に書く。',
    '採点者は公表されていません。',
    '減点の対象になることがあります。',
    '本記事は、合格を保証するものではありません。',
    '実際の出題の再現ではなく、合格を保証するものでもありません。',
    '「1 年で必ず合格」とは約束しません。',
    '小学生にも分かるレベルで書く。',
  ]) assert.deepEqual(findOverclaims(text), [], text);
});

test('否定が別の文にあるなら拾う（断り書きの除外は同じ文の中だけ）', () => {
  assert.deepEqual(rulesOf('この教材は合格を保証します。返金はしません。'), ['合格を保証']);
});

test('frontmatter の中は検査せず、行番号はファイルの先頭から数える', () => {
  const text = ['---', 'title: "記述式の鉄則"', 'description: "減点必至の落とし穴"', '---', '', '本文です。', 'ここが鉄則です。'].join('\n');
  const hits = findOverclaims(text);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 7);
  assert.equal(hits[0].rule, '鉄則');
  // CRLF でも同じ
  assert.equal(findOverclaims(text.replaceAll('\n', '\r\n')).length, 1);
  // frontmatter が無ければ 1 行目から見る
  assert.equal(findOverclaims('鉄則です。')[0].line, 1);
});

test('1 行に複数あればすべて数える', () => {
  assert.equal(findOverclaims('以前は「鉄則」「減点必至」「採点上きわめて重要」と書いていました。').length, 3);
});

test('行末に overclaim-ok と理由がある行は除外する。理由が空なら除外しない', () => {
  assert.deepEqual(findOverclaims('以前は「鉄則」「減点必至」と書いていました。 <!-- overclaim-ok: お詫びと訂正で以前の書き方を引用 -->'), []);
  assert.equal(findOverclaims('ここが鉄則です。 <!-- overclaim-ok: -->').length, 1);
  assert.equal(findOverclaims('ここが鉄則です。 <!-- overclaim-ok:   -->').length, 1);
  // 印は行末だけ（行の途中に置いても除外しない）・その行だけに効く
  assert.equal(findOverclaims('<!-- overclaim-ok: 理由 --> ここが鉄則です。').length, 1);
  assert.equal(findOverclaims('引用です。 <!-- overclaim-ok: 引用 -->\nここが鉄則です。').length, 1);
});

test('note 記事のファイル名の判定', () => {
  for (const name of ['article.md', 'article-II2.md', 'article-ゼネコン.md']) assert.equal(isNoteArticleName(name), true, name);
  for (const name of ['article.mdx', 'articles.md', 'README.md', 'hashtags.txt']) assert.equal(isNoteArticleName(name), false, name);
});

test('基準線との比較: 増えたら NG・同じなら OK・減ったら OK で知らせる・基準線に無い記事は 0 件が条件', () => {
  const baseline = { 'content/note/a/article.md': 2, 'content/note/b/article.md': 1 };
  // 同じ
  assert.deepEqual(compareWithBaseline({ 'content/note/a/article.md': 2 }, baseline), { increased: [], decreased: [] });
  // 増えた
  assert.deepEqual(compareWithBaseline({ 'content/note/a/article.md': 3 }, baseline).increased, [{ file: 'content/note/a/article.md', base: 2, now: 3 }]);
  // 減った（NG ではない）
  const down = compareWithBaseline({ 'content/note/a/article.md': 1 }, baseline);
  assert.deepEqual(down.increased, []);
  assert.deepEqual(down.decreased, [{ file: 'content/note/a/article.md', base: 2, now: 1 }]);
  // 基準線に無い記事で 1 件
  assert.deepEqual(compareWithBaseline({ 'content/note/new/article.md': 1 }, baseline).increased, [{ file: 'content/note/new/article.md', base: 0, now: 1 }]);
  // 基準線に無い記事で 0 件
  assert.deepEqual(compareWithBaseline({ 'content/note/new/article.md': 0 }, baseline), { increased: [], decreased: [] });
  // 記事ごとに比べる（別の記事が減っても、増えた記事は NG のまま）
  assert.equal(compareWithBaseline({ 'content/note/a/article.md': 0, 'content/note/b/article.md': 2 }, baseline).increased.length, 1);
});

test('基準線との比較: staged は渡した記事だけ・全件は基準線にあって今は無い記事を 0 件として扱う', () => {
  const baseline = { 'content/note/a/article.md': 2, 'content/note/gone/article.md': 1 };
  const counts = { 'content/note/a/article.md': 2 };
  assert.deepEqual(compareWithBaseline(counts, baseline).decreased, []);
  assert.deepEqual(compareWithBaseline(counts, baseline, { allFiles: true }).decreased, [{ file: 'content/note/gone/article.md', base: 1, now: 0 }]);
});

test('基準線の書き直し: 減る方向だけ自動・増える方向は allowIncrease のときだけ・0 件は行を消す', () => {
  const baseline = { 'content/note/a/article.md': 2, 'content/note/b/article.md': 1, 'content/note/c/article.md': 1 };
  const counts = { 'content/note/a/article.md': 1, 'content/note/b/article.md': 3, 'content/note/c/article.md': 0, 'content/note/new/article.md': 2 };
  assert.deepEqual(nextBaseline(counts, baseline), { 'content/note/a/article.md': 1, 'content/note/b/article.md': 1 });
  assert.deepEqual(nextBaseline(counts, baseline, { allowIncrease: true }), { 'content/note/a/article.md': 1, 'content/note/b/article.md': 3, 'content/note/new/article.md': 2 });
});

test('基準線のファイルは型に合い、pre-commit に --staged で入っている', () => {
  const name = 'note-overclaim-baseline.json';
  const doc = JSON.parse(readFileSync(join(AGENT_CONFIG_ROOT, name), 'utf8'));
  assert.equal(AGENT_CONFIG_SCHEMAS[name].safeParse(doc).success, true);
  for (const f of Object.keys(doc.files)) assert.match(f, /^content\/note\/.+\/article(-[^/]+)?\.md$/);
  const step = STEPS.find((s) => s.id === 'check-note-overclaim');
  assert.deepEqual(step?.args, ['--staged']);
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['check-note-overclaim'], 'node scripts/checks/check-note-overclaim.mjs');
});
