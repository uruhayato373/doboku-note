import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { checkArticleMarks, lineVerdict, parseAnswerLine, stemPolarity } from '../scripts/lib/answer-marks.mjs';

const civil2 = (marks, polarity = '**適当でないもの**はどれか。') => `## 問題 No.1

盛土の施工に関する次の記述のうち，${polarity}

**(1)** 甲

**(2)** 乙

<details>
<summary>解答・解説</summary>

**正解: (2)**

1. 甲は正しい ${marks[0]}

2. 乙とするのは誤り ${marks[1]}

<ExamPoint>要点</ExamPoint>

</details>
`;

const peFirst = `## Ⅰ-1-2

確率分布に関する次の記述のうち、不適切なものはどれか。

1. 一様分布

2. ポアソン分布

<details>

<summary>解答・解説</summary>

**正答：2**

1. サイコロの目は一様分布で適切 ✅

2. 正規分布とするのは不適切 ❌

<ExamPoint
  summary="要点"
  items={["計数はポアソン"]}
/>

</details>
`;

test('1級・2級土木の書式（## 問題 No.N・**正解: (N)**）と技術士の書式（## Ⅰ-…・**正答：N**）を照合する', () => {
  const civil = checkArticleMarks(civil2(['✅', '❌']));
  assert.equal(civil.questions, 1);
  assert.equal(civil.checked, 1);
  assert.equal(civil.directionChecked, 1);
  assert.deepEqual(civil.issues, []);
  const pe = checkArticleMarks(peFirst);
  assert.equal(pe.checked, 1);
  assert.deepEqual(pe.issues, []);
});

test('否定の問いで正答に ✅ が付いていれば印が逆として止める', () => {
  const r = checkArticleMarks(civil2(['❌', '✅']));
  assert.ok(r.issues.some((i) => i.includes('印が逆')), r.issues.join('\n'));
  assert.ok(r.issues.some((i) => i.includes('解説 2 の文は「誤り・不適当」なのに ✅')));
});

test('正答が ✅ の集合にも ❌ の集合にも一致しなければ止める', () => {
  const r = checkArticleMarks(civil2(['❌', '❌']).replace('甲は正しい', '甲は'));
  assert.ok(r.issues.some((i) => i.includes('一致しない')), r.issues.join('\n'));
});

test('①〜④の数を問う問題で、記述の解説を 1. 2. で書いていれば止め、①〜で書けば通す', () => {
  const stem = `## 問題 No.25

下記の①〜②の2つの記述のうち，**適当なものの数**は次のうちどれか。

① 甲

② 乙

1. 1つ

2. 2つ

<details>
<summary>解答・解説</summary>

**正答：1**
`;
  const bad = checkArticleMarks(`${stem}
1. 甲の手順で行う。適当である。 ✅
2. 乙の手順で行う。適当でない。 ❌

</details>
`);
  assert.ok(bad.issues.some((i) => i.includes('記述ごとの解説を選択肢と同じ番号')), bad.issues.join('\n'));
  const good = checkArticleMarks(`${stem}
① 甲の手順で行う。適当である。 ✅

② 乙の手順で行う。適当でない。 ❌

適当なものは①の1つ。

1. 1つ（①） ✅
2. 2つ ❌

</details>
`);
  assert.deepEqual(good.issues, []);
});

test('記述式・全員得点は数えるだけで照合しない', () => {
  assert.deepEqual(parseAnswerLine('下記の解答例を参照（3つから2つ選択）'), { kind: 'essay', numbers: [] });
  assert.equal(parseAnswerLine('受験者全員に得点（出題不備）').kind, 'void');
  assert.deepEqual(parseAnswerLine('3 又は 4（公式に両方を正答扱い）'), { kind: 'numbers', numbers: [3, 4] });
  assert.deepEqual(parseAnswerLine('(2), (4)').numbers, [2, 4]);
});

test('問いの向き: 適当でない・不適切は否定、適当な・最も適切なは肯定、「該当しない」「なければならない」は照合しない', () => {
  assert.equal(stemPolarity('次の記述のうち，**適当でないもの**はどれか。'), 'neg');
  assert.equal(stemPolarity('次の記述のうち、最も適切なものはどれか。'), 'pos');
  assert.equal(stemPolarity('正しいものの数は次のうちどれか。'), 'count');
  assert.equal(stemPolarity('主要構造部に該当しないものは，次のうちどれか。'), null);
  assert.equal(stemPolarity('建築基準法上，適用しなければならないものはどれか。'), null);
  // 「誤差」の「誤」は否定ではない（技術士一次 H27 基礎 Ⅰ-2-1 で誤検出した）
  assert.equal(stemPolarity('数値計算の誤差として最も適切なものはどれか。'), 'pos');
});

test('記述の見出しを数値文字参照（&#x2460; = ①）で書いた記事も記述の問題として読む', () => {
  const r = checkArticleMarks(`## 問題 No.24

下記の&#x2460;〜&#x2461;の2つの記述のうち，**適当なものの数**は次のうちどれか。

&#x2460; 甲

&#x2461; 乙

<details>
<summary>解答・解説</summary>

**正答：1**

1. 甲の手順で行う。適当である。 ✅
2. 乙の手順で行う。適当でない。 ❌

</details>
`);
  assert.ok(r.issues.some((i) => i.includes('記述ごとの解説を選択肢と同じ番号')), r.issues.join('\n'));
});

test('解説の文の判定の語: 直した値を述べる「…が正しい」・「誤りはない」・両方ある行を取り違えない', () => {
  assert.equal(lineVerdict('…を確保する。適当である。 ❌'), 'right');
  assert.equal(lineVerdict('…とするのは誤り ✅'), 'wrong');
  assert.equal(lineVerdict('「5 cm以下」ではなく「3 cm以下」が正しい。 ❌'), null);
  assert.equal(lineVerdict('…に数値・用語・適用対象の誤りはない ✅'), 'right');
  assert.equal(lineVerdict('…は誤り（…点は正しい） ❌'), null);
});

test('CLI: 指定した記事に正答行のある問題が 0 問なら検査不成立で exit 1、整合なら exit 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'answer-marks-'));
  const empty = join(dir, 'empty.mdx');
  writeFileSync(empty, '## 見出し\n\n本文だけ。\n');
  const ok = join(dir, 'ok.mdx');
  writeFileSync(ok, peFirst);
  const script = join(REPO_ROOT, 'scripts', 'check-answer-marks.mjs');
  const bad = spawnSync(process.execPath, [script, empty], { encoding: 'utf8' });
  assert.equal(bad.status, 1, bad.stdout + bad.stderr);
  assert.match(bad.stderr, /検査不成立/);
  const good = spawnSync(process.execPath, [script, ok], { encoding: 'utf8' });
  assert.equal(good.status, 0, good.stdout + good.stderr);
  assert.match(good.stdout, /印を照合 1/);
});
