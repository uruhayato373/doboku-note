import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  splitHeadingId, parseTagLine, parseBacklog, findOrphanHeadings, pickTasks } from '../scripts/lib/backlog-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- パース契約（tools/admin-app/src/lib/todo.ts と同一であること） -------------

test('tier セクションの外にある ### はカードにしない', () => {
  const md = ['### 外にある見出し', 'タグ: [収益化]', '', '## 🔴 高', '', '### 中にある見出し', 'タグ: [収益化]'].join('\n');
  const cards = parseBacklog(md);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].title, '中にある見出し');
  // 捨てられた見出しは orphan として別途拾える
  const orphans = findOrphanHeadings(md);
  assert.equal(orphans.length, 1);
  assert.equal(orphans[0].title, '外にある見出し');
});

test('タグ行は本文が始まる前のものだけ採る', () => {
  const md = ['## 🔴 高', '', '### T', '本文が先に来た', 'タグ: [収益化]'].join('\n');
  const [c] = parseBacklog(md);
  assert.equal(c.hasTagLine, false);
  assert.equal(c.category, '未分類');
});

test('tier 絵文字を high/mid/low/hold へ写像する', () => {
  const md = ['## 🔴 高', '### A', '## 🟡 中', '### B', '## 🟢 低', '### C', '## 🟣 判断待ち', '### D'].join('\n');
  assert.deepEqual(parseBacklog(md).map((c) => c.tier), ['high', 'mid', 'low', 'hold']);
});

test('Codex候補フラグと category を分離する', () => {
  const md = ['## 🔴 高', '### T', 'タグ: [コンテンツ品質] [Codex候補]'].join('\n');
  const [c] = parseBacklog(md);
  assert.equal(c.codex, true);
  assert.equal(c.category, 'コンテンツ品質');
});

// --- スキーマ v2 の token（後方互換） ------------------------------------------

test('検証/起票 token を解釈し、category は残りの先頭を採る', () => {
  const md = ['## 🔴 高', '### T', 'タグ: [収益化] [検証:check-note-republish] [起票:2026-08-17]'].join('\n');
  const [c] = parseBacklog(md);
  assert.equal(c.category, '収益化');
  assert.equal(c.verify, 'check-note-republish');
  assert.equal(c.filed, '2026-08-17');
});

test('廃止済み [実行:] は unknownKeys に落ちる（再導入ラチェット・2026-08-26 軸廃止）', () => {
  const md = ['## 🔴 高', '### T', 'タグ: [収益化] [実行:sweep]'].join('\n');
  const [c] = parseBacklog(md);
  assert.equal(c.category, '収益化');
  assert.deepEqual(c.unknownKeys.map((k) => k.key), ['実行']);
});

test('複数カテゴリは先頭を category・残りを extraCategories に退避する', () => {
  const md = ['## 🔴 高', '### T', 'タグ: [品質][機械チェック]'].join('\n');
  const [c] = parseBacklog(md);
  assert.equal(c.category, '品質');
  assert.deepEqual(c.extraCategories, ['機械チェック']);
});

// --- スキーマ v3 の [種類:] と未知トークンの扱い（2026-08-18） ------------------

test('[種類:] は位置に関係なく kind として読み、category を汚さない', () => {
  for (const tag of [
    'タグ: [種類:不具合] [収益化] [検証:npm test]',
    'タグ: [収益化] [種類:不具合] [検証:npm test]',
    'タグ: [収益化] [検証:npm test] [種類:不具合]',
  ]) {
    const [c] = parseBacklog(['## 🔴 高', '### T', tag].join('\n'));
    assert.equal(c.kind, '不具合', `位置依存になっている: ${tag}`);
    assert.equal(c.category, '収益化', `category が汚れた: ${tag}`);
  }
});

test('全角コロンの [種類：不具合] も kind になる（category に化けない）', () => {
  const md = ['## 🔴 高', '### T', 'タグ: [種類：不具合] [収益化]'].join('\n');
  const [c] = parseBacklog(md);
  assert.equal(c.kind, '不具合');
  assert.equal(c.category, '収益化');
});

test('未知キーは unknownKeys に記録し、category に化けさせない', () => {
  const md = ['## 🔴 高', '### T', 'タグ: [実行者:sweep] [収益化]'].join('\n');
  const [c] = parseBacklog(md);
  assert.equal(c.category, '収益化');
  assert.deepEqual(c.unknownKeys.map((k) => k.key), ['実行者']);
});

test('語彙外の裸トークンは unknownCategories にも記録する（沈黙させない）', () => {
  const md = ['## 🔴 高', '### T', 'タグ: [収益化] [試験前 7/20]'].join('\n');
  const [c] = parseBacklog(md);
  assert.deepEqual(c.extraCategories, ['試験前 7/20']);
  assert.deepEqual(c.unknownCategories, ['試験前 7/20']);
});

test('タグ行が無いカードでも tokens/unknownKeys が配列で存在する', () => {
  const [c] = parseBacklog(['## 🔴 高', '### T', '本文だけ'].join('\n'));
  assert.deepEqual(c.tokens, []);
  assert.deepEqual(c.unknownKeys, []);
  assert.equal(c.kind, null);
});

// --- コードフェンス（誤分割の防止） --------------------------------------------

test('コードフェンス内の ### / ## は構造として扱わない', () => {
  for (const f of ['```', '~~~']) {
    const md = [
      '## 🔴 高',
      '### 本物', 'タグ: [収益化]',
      f + 'bash',
      '## 🟢 低',
      '### 偽物',
      f,
      '本文の続き',
    ].join('\n');
    const cards = parseBacklog(md);
    assert.equal(cards.length, 1, `${f} でカードが誤分割された`);
    assert.equal(cards[0].title, '本物');
    assert.equal(cards[0].tier, 'high', `${f} で tier が偽リセットされた`);
    assert.equal(findOrphanHeadings(md).length, 0);
  }
});

test('実 backlog で 生 ### 行数 == カード数 + orphan 数（パーサ退行の検知）', () => {
  const text = readFileSync(join(ROOT, '.claude/todo/backlog.md'), 'utf8');
  const raw = (text.match(/^### /gm) ?? []).length;
  const cards = parseBacklog(text).length;
  const orphans = findOrphanHeadings(text).length;
  assert.equal(cards + orphans, raw, `生### ${raw} ≠ カード ${cards} + orphan ${orphans}`);
});

// --- 選定ロジック ---------------------------------------------------------------

// 2026-08-18: 種類軸の導入に合わせて拡張。旧 fixture は種類を 1 枚も持たず、
// 並べ替えを「不具合優先」に変えても全テストが緑のまま通ってしまう状態だった。
const sample = [
  '## 🔴 高',
  '### 高-改善A', 'タグ: [収益化] [種類:改善]', '',
  '### 高-未分類', 'タグ: [収益化]', '',
  '## 🟡 中',
  '### 中-改善', 'タグ: [インフラ・計測] [種類:改善]', '',
  '## 🟢 低',
  '### 低-不具合', 'タグ: [UI・UX] [種類:不具合]', '',
  '## 🟣 判断待ち',
  '### 判断', 'タグ: [収益化] [種類:意思決定]', '',
].join('\n');

// [実行:] 軸は 2026-08-26 廃止。hold（🟣）と [進行中] 以外の全カードが実行候補になり、
// 「単独で回せるか」は選定側のモデルが本文を読んで判断する。
test('hold・wip 以外の全カードが実行候補になる', () => {
  const r = pickTasks(parseBacklog(sample), { limit: 9 });
  assert.deepEqual(
    [...r.run.map((c) => c.title)].sort(),
    ['高-改善A', '高-未分類', '中-改善', '低-不具合'].sort(),
  );
});

test('hold（🟣 判断待ち）は自動選定しない', () => {
  const r = pickTasks(parseBacklog(sample), { limit: 9 });
  assert.ok(!r.run.some((c) => c.tier === 'hold'));
  assert.equal(r.holdTotal, 1);
});

test('🟢 の不具合が 🔴 の改善より先に選ばれる（不具合が第1キー）', () => {
  const r = pickTasks(parseBacklog(sample), { limit: 1 });
  assert.equal(r.run[0].title, '低-不具合');
  assert.equal(r.order, 'kind-then-tier');
});

test('種類未付与は不具合として扱わない（🔴改善 と同格＝tier 順）', () => {
  const r = pickTasks(parseBacklog(sample), { limit: 9 });
  const titles = r.run.map((c) => c.title);
  assert.equal(titles[0], '低-不具合');
  assert.ok(
    titles.indexOf('高-未分類') < titles.indexOf('中-改善'),
    `tier 順が壊れている: ${titles.join(' > ')}`,
  );
});

test('不具合を除けば tier 順（高→中）を保つ', () => {
  const r = pickTasks(parseBacklog(sample), { limit: 9 });
  const nonDefect = r.run.filter((c) => c.kind !== '不具合').map((c) => c.tier);
  assert.deepEqual(nonDefect, ['high', 'high', 'mid']);
});

test('defects は limit に影響されず全件返る', () => {
  const r = pickTasks(parseBacklog(sample), { limit: 1 });
  assert.equal(r.defects.length, 1);
  assert.deepEqual(r.sunkDefects.map((c) => c.title), ['低-不具合']);
});

test('分類待ちは [種類:] 欠けを missing で返す', () => {
  const r = pickTasks(parseBacklog(sample), { limit: 9, classifyLimit: 9 });
  const byTitle = Object.fromEntries(r.classify.map((c) => [c.title, c.missing]));
  assert.deepEqual(byTitle['高-未分類'], ['種類']);
  assert.equal(byTitle['高-改善A'], undefined, '揃っているカードが分類キューに載っている');
  assert.equal(r.needsTagTotal, 1);
});

const holdSample = [
  '## 🔴 高',
  '### 高-A', 'タグ: [収益化]', '',
  '## 🟣 判断待ち',
  '### 判断-A', 'タグ: [収益化] [種類:意思決定]', '',
  '### 判断-B', 'タグ: [収益化]', '',
  '### 判断-無印', 'タグ: [収益化]', '',
].join('\n');

test('3 バケット（実行候補/判断待ち/進行中）は総数の真の分割', () => {
  const r = pickTasks(parseBacklog(holdSample), { limit: 5, classifyLimit: 5 });
  assert.equal(r.holdTotal, 3);
  assert.equal(r.runnableTotal, 1);
  assert.equal(r.wipTotal, 0);
  assert.equal(r.runnableTotal + r.holdTotal + r.wipTotal, r.total);
  assert.equal(r.partitionOk, true);
});

// DN-0093 批判的レビュー課題3: [進行中] を選定器が除外せず、複数セッション・Codex との
// 同時実行防止が機能していなかった。wip は hold と同じく自動選定バケットから外す。
const wipSample = [
  '## 🔴 高',
  '### 高-A', 'タグ: [収益化]', '',
  '### 高-進行中A', 'タグ: [収益化] [進行中]', '',
  '### 高-進行中B', 'タグ: [収益化] [種類:改善] [進行中]', '',
].join('\n');

test('[進行中] は自動選定しない（wip 優先で除外）', () => {
  const r = pickTasks(parseBacklog(wipSample), { limit: 5 });
  assert.equal(r.wipTotal, 2);
  assert.ok(!r.run.some((c) => c.wip));
  assert.ok(!r.wip.some((c) => c.title === '高-A'));
  assert.equal(r.runnableTotal, 1);
  assert.equal(r.runnableTotal + r.holdTotal + r.wipTotal, r.total);
  assert.equal(r.partitionOk, true);
});

test('実 backlog でも 3 バケットが総数を分割する', () => {
  const text = readFileSync(join(ROOT, '.claude/todo/backlog.md'), 'utf8');
  const r = pickTasks(parseBacklog(text), { limit: 2, classifyLimit: 2 });
  assert.equal(
    r.runnableTotal + r.holdTotal + r.wipTotal,
    r.total,
    `内訳が総数と合わない: ${r.runnableTotal}+${r.holdTotal}+${r.wipTotal} ≠ ${r.total}`,
  );
  assert.equal(r.partitionOk, true);
});

// --- 実 backlog に対する健全性（検査ゼロを PASS と呼ばない・§9） ----------------

test('実 backlog をパースしてカードが取れる（0件は故障とみなす）', () => {
  const text = readFileSync(join(ROOT, '.claude/todo/backlog.md'), 'utf8');
  const cards = parseBacklog(text);
  assert.ok(cards.length > 50, `カード数が異常に少ない: ${cards.length}`);
  // 全カードが tier を持つ（parseBacklog の不変条件）
  assert.ok(cards.every((c) => c.tier), 'tier を持たないカードがある');
});

// 2026-08-17 の事故: セクション一括削除スクリプトが「次の ### まで」を取る際に
// 直後の `## 🟡 中` 見出しごと巻き込み、42 件のカードが high へ誤集計された
// （🔴70 / 🟡0 という異常値で気づいた）。tier 見出しの消失を機械で止める。
test('実 backlog に 4 つの tier セクションがすべて存在する', () => {
  const text = readFileSync(join(ROOT, '.claude/todo/backlog.md'), 'utf8');
  for (const emoji of ['🔴', '🟡', '🟢', '🟣']) {
    assert.ok(
      new RegExp(`^##\\s+${emoji}`, 'm').test(text),
      `tier 見出し ${emoji} が消えている（セクション削除で巻き込んだ疑い）`,
    );
  }
  // どの tier にもカードが 1 枚以上ある（0 枚は見出し消失か誤配置のサイン）
  const byTier = parseBacklog(text).reduce((a, c) => ((a[c.tier] = (a[c.tier] ?? 0) + 1), a), {});
  for (const t of ['high', 'mid', 'low', 'hold']) {
    assert.ok(byTier[t] > 0, `tier=${t} のカードが 0 件（内訳: ${JSON.stringify(byTier)}）`);
  }
});

// ── v3-unified 拡張（stats47 と共通スキーマ。正典 .claude/knowledge/reference/todo-standards.md）──

test('[進行中] は wip フラグになり category に化けない', () => {
  const t = parseTagLine('[収益化] [進行中] [種類:改善]');
  assert.equal(t.wip, true);
  assert.equal(t.category, '収益化');
  assert.equal(t.kind, '改善');
});

test('[期日:] は due として読む（未知キーに落ちない）', () => {
  const t = parseTagLine('[期日:2026-09-30] [起票:2026-08-01]');
  assert.equal(t.due, '2026-09-30');
  assert.equal(t.filed, '2026-08-01');
  assert.deepEqual(t.unknownKeys, []);
});

test('### [ID] タイトル の ID 抽出と非誤爆（ハイフン無し・小文字は title に残す）', () => {
  assert.deepEqual(splitHeadingId('[FEAT-A-01] タスク'), { id: 'FEAT-A-01', title: 'タスク' });
  assert.deepEqual(splitHeadingId('[WIP] 作業中の何か'), { id: null, title: '[WIP] 作業中の何か' });
  assert.deepEqual(splitHeadingId('[abc-01] 小文字'), { id: null, title: '[abc-01] 小文字' });
  const cards = parseBacklog(['## 🔴 高', '### [EXT-01] ID つき', '### ID なし'].join('\n'));
  assert.equal(cards[0].id, 'EXT-01');
  assert.equal(cards[0].title, 'ID つき');
  assert.equal(cards[1].id, null);
});

test('startLine / endLine は行番号削除に使える範囲（末尾空行は含めない）', () => {
  const text = ['## 🔴 高', '', '### カード A', 'タグ: [収益化]', '', '本文。', '', '### カード B', ''].join('\n');
  const [a, b] = parseBacklog(text);
  assert.equal(a.startLine, 3);
  assert.equal(text.split('\n')[a.endLine - 1], '本文。');
  assert.equal(b.startLine, 8);
  assert.equal(b.endLine, 8);
});
