import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBacklog, findOrphanHeadings, KINDS, CANONICAL_CATEGORIES } from '../scripts/lib/backlog-lib.mjs';
import { validateCards, validateStagedLines } from '../scripts/check-backlog-schema.mjs';
import { signatureTokens, duplicateCandidates } from '../scripts/check-backlog-health.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 語彙定数（KINDS / CANONICAL_CATEGORIES）が load-bearing であることを**挙動で**固定する。
 *
 * 守りたい事故: CANONICAL_CATEGORIES は 2026-08-18 まで「どこからも import されないデッド export」で、
 *   語彙検証が 1 つも存在しないまま実体が 6 種 → 14 種に散った。knip は scripts/** を entry 扱いする
 *   ので捕まえない（実測確認済み）。import の grep でも「import だけして使わない」状態を通してしまう。
 *   よって「語彙外の値を入れたら実際に違反が出る」ことをテストする。
 */

const OPTS = {
  rawHeadingCount: 1,
  npmScripts: new Set(['check-note-republish']),
  allowedCategories: new Set(CANONICAL_CATEGORIES),
};
// ID は 2026-08-18 に必須化。語彙の検査だけを見たいので fixture 側に ID を持たせる
const one = (tag) => parseBacklog(['## 🔴 高', '### [DN-0001] T', `タグ: ${tag}`].join('\n'));
const rules = (tag, opts = OPTS) => validateCards(one(tag), [], opts).map((v) => v.rule);

test('KINDS: 語彙外の [種類:] は違反になる（KINDS が効いている証明）', () => {
  assert.deepEqual(rules('[収益化] [種類:バグ]'), ['kind']);
  for (const k of KINDS) assert.deepEqual(rules(`[収益化] [種類:${k}]`), [], `${k} が弾かれた`);
});

test('廃止済み [実行:] は unknown-key 違反になる（2026-08-26 軸廃止の再導入ラチェット）', () => {
  assert.deepEqual(rules('[収益化] [実行:sweep]'), ['unknown-key']);
});

test('CANONICAL_CATEGORIES: 語彙外カテゴリは違反、baseline 掲載なら通す', () => {
  assert.deepEqual(rules('[運用基盤]'), ['category']);
  const withBaseline = { ...OPTS, allowedCategories: new Set([...CANONICAL_CATEGORIES, '運用基盤']) };
  assert.deepEqual(rules('[運用基盤]', withBaseline), []);
});

test('未知キーの token は違反になる（category に化けさせない）', () => {
  assert.deepEqual(rules('[実行者:sweep] [収益化]'), ['unknown-key']);
});

test('[検証:] が package.json に無ければ違反（「検証したつもり」を止める）', () => {
  assert.deepEqual(rules('[収益化] [検証:存在しないscript]'), ['verify']);
  assert.deepEqual(rules('[収益化] [検証:check-note-republish]'), []);
});

test('生 ### 行数とカード数の不一致は違反（パーサ退行・フェンス事故）', () => {
  const v = validateCards(one('[収益化]'), [], { ...OPTS, rawHeadingCount: 3 });
  assert.deepEqual(v.map((x) => x.rule), ['parser']);
});

// --- staged モード（完了 prose のラチェット） ----------------------------------

const added = (...texts) => texts.map((text, i) => ({ file: '.claude/todo/backlog.md', line: i + 1, text }));

test('完了 prose の追加は違反（backlog.md:5 の自ルール違反を機械で止める）', () => {
  const v = validateStagedLines(
    added(
      '> [!done] 2026-08-17 に完了',
      '### ~~会員特典22本~~ → **完了**',
      '対応完了しました',
      '- [x] やった',
    ),
    [],
  );
  assert.equal(v.length, 4, `検出漏れ: ${JSON.stringify(v)}`);
  assert.ok(v.every((x) => x.rule === 'done-prose'));
});

test('「完了条件」「完了したら」等は違反にしない（これから完了させる記述）', () => {
  const v = validateStagedLines(
    added('**完了条件**: プロキシ環境で exit 1 になること', '完了したら reference を更新する', '完了検知は check-* が行う'),
    [],
  );
  assert.deepEqual(v, []);
});

test('.claude/todo に 4 層以外の .md が追加されたら違反（影のバックログ）', () => {
  const v = validateStagedLines([], ['.claude/todo/new-roadmap.md']);
  assert.deepEqual(v.map((x) => x.rule), ['todo-layer']);
});

// --- surfacer 側の純関数 --------------------------------------------------------

test('固有トークンは裸の数値を拾わない（年・価格の一致で偽ペアを作らない）', () => {
  const s = signatureTokens('2026 年に 980 円へ。scripts/foo.mjs と n1234567890ab を使う');
  assert.ok(!s.has('2026'), '年を拾っている');
  assert.ok(!s.has('980'), '価格を拾っている');
  assert.ok(s.has('n1234567890ab'));
});

test('重複候補は共有トークン数のしきい値で決まる', () => {
  const mk = (line, body) => ({ line, title: `T${line}`, body });
  const shared = 'a.mjs b.mjs c.mjs d.mjs';
  const pairs = duplicateCandidates([mk(1, shared), mk(2, shared), mk(3, 'z.mjs')]);
  assert.equal(pairs.length, 1);
  assert.deepEqual([pairs[0].a.line, pairs[0].b.line], [1, 2]);
});

// --- 実 backlog に対する健全性（検査ゼロを PASS と呼ばない） ---------------------

test('実 backlog がスキーマゲートを通る（違反 0）', () => {
  const text = readFileSync(join(ROOT, '.claude/todo/backlog.md'), 'utf8');
  const cards = parseBacklog(text);
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const baseline = JSON.parse(readFileSync(join(ROOT, '.claude/config/backlog-vocab-baseline.json'), 'utf8'));
  assert.ok(cards.length > 15, `カード数が異常に少ない: ${cards.length}`);
  const v = validateCards(cards, findOrphanHeadings(text), {
    rawHeadingCount: (text.match(/^### /gm) ?? []).length,
    npmScripts: new Set(Object.keys(pkg.scripts)),
    allowedCategories: new Set([...CANONICAL_CATEGORIES, ...Object.keys(baseline.categories)]),
  });
  assert.deepEqual(v, [], `違反: ${JSON.stringify(v, null, 2)}`);
});

// 2026-08-18: docstring に rule 9 と書かれていたのに未実装だった。[起票:] は手入力ゆえ
// 91 枚中 61 枚で欠落し、鮮度検査 S5 が構造的に発火しなくなっていた（git blame での補完は
// partial clone がコールドだと打ち切られる）。入口で埋めるラチェットを挙動で固定する。
test('新規カードは タグ:/[種類:]/[起票:] が揃っていないと違反', () => {
  const cards = parseBacklog(['## 🔴 高', '### 新規', 'タグ: [収益化]'].join('\n'));
  const v = validateStagedLines([{ file: 'x', line: 2, text: '### 新規' }], [], cards);
  assert.deepEqual(v.map((x) => x.rule), ['new-card-tokens']);
  assert.match(v[0].msg, /\[種類:\] \/ \[起票:\]/);
});

test('揃っている新規カードは違反にしない', () => {
  const cards = parseBacklog(
    ['## 🔴 高', '### 新規', 'タグ: [収益化] [種類:改善] [起票:2026-08-18]'].join('\n'),
  );
  const v = validateStagedLines([{ file: 'x', line: 2, text: '### 新規' }], [], cards);
  assert.deepEqual(v, []);
});

test('既存カード（追加行に見出しが無い）は token 欠落を免除する（ラチェット）', () => {
  const cards = parseBacklog(['## 🔴 高', '### 既存', 'タグ: [収益化]'].join('\n'));
  const v = validateStagedLines([{ file: 'x', line: 3, text: 'タグ: [収益化]' }], [], cards);
  assert.deepEqual(v, []);
});

// 2026-08-18: monthly/weekly が本文を複製せず ID で backlog を参照し、docs/ の恒久文書が
// 実行タスクを ID で指すため、doboku-note でも ID を必須化した。欠落・形式違反・重複を挙動で固定する。
test('ID が無いカードは違反（DN-#### 必須）', () => {
  const cards = parseBacklog(['## 🔴 高', '### ID なし', 'タグ: [収益化] [種類:改善]'].join('\n'));
  assert.deepEqual(validateCards(cards, [], OPTS).map((v) => v.rule), ['id-missing']);
});

test('DN-#### 形式でない ID は違反', () => {
  const cards = parseBacklog(['## 🔴 高', '### [FOO-1] 変な ID', 'タグ: [収益化] [種類:改善]'].join('\n'));
  assert.deepEqual(validateCards(cards, [], OPTS).map((v) => v.rule), ['id-format']);
});

test('重複 ID は違反（採番の再利用を止める）', () => {
  const cards = parseBacklog(
    [
      '## 🔴 高',
      '### [DN-0001] A', 'タグ: [収益化] [種類:改善]', '',
      '### [DN-0001] B', 'タグ: [収益化] [種類:改善]',
    ].join('\n'),
  );
  const v = validateCards(cards, [], { ...OPTS, rawHeadingCount: 2 });
  assert.deepEqual(v.map((x) => x.rule), ['id-duplicate']);
});

test('実 backlog は全カードが一意な DN-#### を持つ', () => {
  const text = readFileSync(join(ROOT, '.claude/todo/backlog.md'), 'utf8');
  const cards = parseBacklog(text);
  assert.ok(cards.length > 15, `カード数が異常に少ない: ${cards.length}`);
  const ids = cards.map((c) => c.id);
  assert.equal(ids.filter(Boolean).length, cards.length, 'ID の無いカードがある');
  assert.equal(new Set(ids).size, cards.length, 'ID が重複している');
  assert.ok(ids.every((id) => /^DN-\d{4}$/.test(id)), 'DN-#### 形式でない ID がある');
});
