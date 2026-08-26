import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectReuse,
  parseCommitTimesByCardId,
  computeStaleAfterCommit,
  computeCompletionProseHeavy,
} from '../scripts/check-backlog-health.mjs';

/**
 * S10「ID の再利用」の契約。
 *
 * 完了カードはセクションごと削除する運用なので DN-#### は歯抜けになる。空き番を
 * 新しいカードが拾うと、**過去のコミットメッセージ・plan・レビューが指す ID が別物になる**
 * （2026-08-20 に DN-0096 / DN-0097 で実発生。同日に 2 件）。
 *
 * 難しいのは **tier セクション間の移動**で、これは 1 つの commit の中で削除＋追加として出る。
 * ここを再利用と数えると毎回誤検知するので、commit 単位の差集合で判定することを固定する。
 */

const log = (...commits) =>
  commits.map(([sha, ...lines]) => [`COMMIT ${sha}`, ...lines].join('\n')).join('\n');

test('削除 → あとの commit で再追加 = 再利用', () => {
  const r = detectReuse(log(
    ['aaa', '+### [DN-0001] 最初のタスク'],
    ['bbb', '-### [DN-0001] 最初のタスク'],
    ['ccc', '+### [DN-0001] まったく別のタスク'],
  ));
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'DN-0001');
  assert.equal(r[0].removedAt, 'bbb');
  assert.equal(r[0].readdedAt, 'ccc');
});

test('同一 commit 内の削除＋追加（tier 間の移動）は再利用にしない', () => {
  const r = detectReuse(log(
    ['aaa', '+### [DN-0002] タスク'],
    ['bbb', '-### [DN-0002] タスク', '+### [DN-0002] タスク'],
  ));
  assert.deepEqual(r, []);
});

test('削除しただけ（完了）は再利用にしない', () => {
  const r = detectReuse(log(
    ['aaa', '+### [DN-0003] タスク'],
    ['bbb', '-### [DN-0003] タスク'],
  ));
  assert.deepEqual(r, []);
});

test('一度も消えていない ID は再利用にしない', () => {
  const r = detectReuse(log(
    ['aaa', '+### [DN-0004] タスク'],
    ['bbb', '+### [DN-0005] 別タスク'],
  ));
  assert.deepEqual(r, []);
});

test('複数 ID が独立に判定される', () => {
  const r = detectReuse(log(
    ['aaa', '+### [DN-0006] A', '+### [DN-0007] B'],
    ['bbb', '-### [DN-0006] A'],
    ['ccc', '+### [DN-0006] A2', '-### [DN-0007] B'],
  ));
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'DN-0006');
});

test('再利用が 2 周しても各サイクルを 1 件ずつ数える', () => {
  const r = detectReuse(log(
    ['a1', '+### [DN-0008] v1'],
    ['a2', '-### [DN-0008] v1'],
    ['a3', '+### [DN-0008] v2'],
    ['a4', '-### [DN-0008] v2'],
    ['a5', '+### [DN-0008] v3'],
  ));
  assert.equal(r.length, 2);
  assert.deepEqual(r.map((x) => x.readdedAt), ['a3', 'a5']);
});

test('カード見出し以外の +/- 行は無視する', () => {
  const r = detectReuse(log(
    ['aaa', 'diff --git a/.claude/todo/backlog.md b/.claude/todo/backlog.md', '--- a/.claude/todo/backlog.md', '+++ b/.claude/todo/backlog.md', '@@ -1,4 +1,5 @@', '+タグ: [UI・UX] [種類:改善]', '+### [DN-0009] タスク', '-## 🔴 高', ' ### [DN-0010] 変更されていない文脈行'],
    ['bbb', '-### [DN-0009] タスク'],
    ['ccc', '+本文の ### [DN-0009] という言及'],
  ));
  assert.deepEqual(r, []);
});

test('空入力で例外を投げない', () => {
  assert.deepEqual(detectReuse(''), []);
});

/**
 * S11「実績コミット後にカード本文が未更新」の契約。
 *
 * DN-0093 が「claim/release/complete の共通 CLI を実装する」commit が push されたのに、
 * カードの「残」欄は旧内容（未実装）のまま残り続けていた実例の再発防止（2026-08-26）。
 */

test('parseCommitTimesByCardId: 件名のDN-####ごとに最新commit秒を拾う', () => {
  const raw = [
    '100\tfeat(todo): 最初の実装（DN-0093 順1）',
    '300\tfeat(todo): CLIを実装する（DN-0093 順3）',
    '200\tchore: 無関係の変更',
  ].join('\n');
  const m = parseCommitTimesByCardId(raw);
  assert.equal(m.get('DN-0093'), 300);
  assert.equal(m.size, 1);
});

test('parseCommitTimesByCardId: 1commitに複数IDがあれば両方に反映', () => {
  const raw = '500\tfix: DN-0001とDN-0002をまとめて直す';
  const m = parseCommitTimesByCardId(raw);
  assert.equal(m.get('DN-0001'), 500);
  assert.equal(m.get('DN-0002'), 500);
});

function cardFixture(id, startLine, endLine, title = 'サンプル') {
  return { id, startLine, endLine, line: startLine, title };
}

test('computeStaleAfterCommit: カード最終編集がコミットよりbuffer超前なら候補', () => {
  const cards = [cardFixture('DN-0093', 10, 12)];
  const commitTimeById = new Map([['DN-0093', 10_000]]);
  const blameSec = new Map([[10, 1_000], [11, 1_000], [12, 1_000]]); // commitの9000秒前
  const r = computeStaleAfterCommit(cards, commitTimeById, blameSec, 3600);
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'DN-0093');
  assert.equal(r[0].hoursBehind, 3); // (10000-1000)/3600 = 2.5 → round 3
});

test('computeStaleAfterCommit: buffer以内（ほぼ同時編集）は候補にしない', () => {
  const cards = [cardFixture('DN-0001', 5, 7)];
  const commitTimeById = new Map([['DN-0001', 10_000]]);
  const blameSec = new Map([[5, 9_000], [6, 9_500], [7, 9_900]]); // commitの100〜1000秒前（buffer内）
  const r = computeStaleAfterCommit(cards, commitTimeById, blameSec, 3600);
  assert.deepEqual(r, []);
});

test('computeStaleAfterCommit: カード側の方が新しければ候補にしない（本文が追随済み）', () => {
  const cards = [cardFixture('DN-0002', 5, 7)];
  const commitTimeById = new Map([['DN-0002', 10_000]]);
  const blameSec = new Map([[5, 20_000], [6, 20_000], [7, 20_000]]); // commitより後に編集済み
  const r = computeStaleAfterCommit(cards, commitTimeById, blameSec, 3600);
  assert.deepEqual(r, []);
});

test('computeStaleAfterCommit: commit件名に登場しないIDは対象外', () => {
  const cards = [cardFixture('DN-0003', 5, 7)];
  const commitTimeById = new Map(); // 空＝どのIDも件名に出ていない
  const blameSec = new Map([[5, 1_000]]);
  const r = computeStaleAfterCommit(cards, commitTimeById, blameSec, 3600);
  assert.deepEqual(r, []);
});

test('computeStaleAfterCommit: blame情報が1行も無いカードは判定不能として除外', () => {
  const cards = [cardFixture('DN-0004', 5, 7)];
  const commitTimeById = new Map([['DN-0004', 10_000]]);
  const blameSec = new Map(); // 空
  const r = computeStaleAfterCommit(cards, commitTimeById, blameSec, 3600);
  assert.deepEqual(r, []);
});

/**
 * S12「完了 prose の蓄積」の契約。閾値以上の完了報告表現が本文に溜まったカードを
 * TRIM 候補として拾う（DN-0013 が「死守コア2つ」の完了経緯で肥大した型の機械検出）。
 */

test('computeCompletionProseHeavy: 閾値以上の「済み」「完了し」でTRIM候補になる', () => {
  const cards = [{
    line: 1,
    title: '肥大化したカード',
    body: '会員ローンチは完了済み。添削は通過済み。定員は確定済み。募集中を確認済み。無料集客も実査済み。',
  }];
  const r = computeCompletionProseHeavy(cards, 5);
  assert.equal(r.length, 1);
  assert.equal(r[0].count, 5);
});

test('computeCompletionProseHeavy: 閾値未満は候補にしない', () => {
  const cards = [{ line: 1, title: '普通のカード', body: 'これは対応済みだが残作業がまだ多い。' }];
  const r = computeCompletionProseHeavy(cards, 5);
  assert.deepEqual(r, []);
});

test('computeCompletionProseHeavy: 件数降順で返す', () => {
  const cards = [
    { line: 1, title: '少ない方', body: '済み済み済み済み済み' }, // 5
    { line: 2, title: '多い方', body: '済み済み済み済み済み済み済み' }, // 7
  ];
  const r = computeCompletionProseHeavy(cards, 5);
  assert.equal(r[0].title, '多い方');
  assert.equal(r[1].title, '少ない方');
});
