import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  splitHeadingId, parseTagLine, parseBacklog, findOrphanHeadings, pickTasks, SELF_EXECUTABLE } from '../scripts/lib/backlog-lib.mjs';

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

test('実行/検証/起票 token を解釈し、category は残りの先頭を採る', () => {
  const md = ['## 🔴 高', '### T', 'タグ: [収益化] [実行:sweep] [検証:check-note-republish] [起票:2026-08-17]'].join('\n');
  const [c] = parseBacklog(md);
  assert.equal(c.category, '収益化');
  assert.equal(c.executor, 'sweep');
  assert.equal(c.verify, 'check-note-republish');
  assert.equal(c.filed, '2026-08-17');
});

test('複数カテゴリは先頭を category・残りを extraCategories に退避する', () => {
  const md = ['## 🔴 高', '### T', 'タグ: [品質][機械チェック]'].join('\n');
  const [c] = parseBacklog(md);
  assert.equal(c.category, '品質');
  assert.deepEqual(c.extraCategories, ['機械チェック']);
});

test('token の順序が違っても executor を拾う（category より前に来る場合）', () => {
  const md = ['## 🔴 高', '### T', 'タグ: [実行:機械] [収益化]'].join('\n');
  const [c] = parseBacklog(md);
  assert.equal(c.executor, '機械');
  assert.equal(c.category, '収益化');
});

// --- スキーマ v3 の [種類:] と未知トークンの扱い（2026-08-18） ------------------

test('[種類:] は位置に関係なく kind として読み、category を汚さない', () => {
  for (const tag of [
    'タグ: [種類:不具合] [収益化] [実行:sweep]',
    'タグ: [収益化] [種類:不具合] [実行:sweep]',
    'タグ: [収益化] [実行:sweep] [種類:不具合]',
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
  assert.equal(c.executor, null);
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
      '### 本物', 'タグ: [収益化] [実行:sweep]',
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
  '### 高-改善-sweep', 'タグ: [収益化] [種類:改善] [実行:sweep]', '',
  '### 高-改善-ユーザー', 'タグ: [収益化] [種類:改善] [実行:ユーザー]', '',
  '### 高-未分類', 'タグ: [収益化]', '',
  '## 🟡 中',
  '### 中-機械', 'タグ: [インフラ・計測] [種類:改善] [実行:機械]', '',
  '## 🟢 低',
  '### 低-不具合-sweep', 'タグ: [UI・UX] [種類:不具合] [実行:sweep]', '',
  '### 低-種類なし-sweep', 'タグ: [UI・UX] [実行:sweep]', '',
  '## 🟣 判断待ち',
  '### 判断-sweep', 'タグ: [収益化] [種類:意思決定] [実行:sweep]', '',
].join('\n');

test('自分で回せる executor だけを実行候補にする', () => {
  const r = pickTasks(parseBacklog(sample), { limit: 5 });
  assert.deepEqual(
    [...r.run.map((c) => c.title)].sort(),
    ['低-不具合-sweep', '中-機械', '低-種類なし-sweep', '高-改善-sweep'].sort(),
  );
});

test('hold（🟣 判断待ち）は executor があっても自動選定しない', () => {
  const r = pickTasks(parseBacklog(sample), { limit: 5 });
  assert.ok(!r.run.some((c) => c.tier === 'hold'));
  assert.equal(r.holdTotal, 1);
});

test('🟢 の不具合が 🔴 の改善より先に選ばれる（不具合が第1キー）', () => {
  const r = pickTasks(parseBacklog(sample), { limit: 1 });
  assert.equal(r.run[0].title, '低-不具合-sweep');
  assert.equal(r.order, 'kind-then-tier');
});

test('種類未付与は不具合として扱わない（🟢種類なし は 🔴改善 より後）', () => {
  const r = pickTasks(parseBacklog(sample), { limit: 5 });
  const titles = r.run.map((c) => c.title);
  assert.ok(
    titles.indexOf('高-改善-sweep') < titles.indexOf('低-種類なし-sweep'),
    `種類未付与が繰り上がっている: ${titles.join(' > ')}`,
  );
});

test('不具合を除けば tier 順（高→中→低）を保つ', () => {
  const r = pickTasks(parseBacklog(sample), { limit: 5 });
  const nonDefect = r.run.filter((c) => c.kind !== '不具合').map((c) => c.tier);
  assert.deepEqual(nonDefect, ['high', 'mid', 'low']);
});

test('defects は limit に影響されず全件返る', () => {
  const r = pickTasks(parseBacklog(sample), { limit: 1 });
  assert.equal(r.defects.length, 1);
  assert.deepEqual(r.sunkDefects.map((c) => c.title), ['低-不具合-sweep']);
});

test('分類待ちは欠けている token を missing で返す', () => {
  const r = pickTasks(parseBacklog(sample), { limit: 5, classifyLimit: 9 });
  const byTitle = Object.fromEntries(r.classify.map((c) => [c.title, c.missing]));
  assert.deepEqual(byTitle['高-未分類'], ['実行', '種類']);
  assert.deepEqual(byTitle['低-種類なし-sweep'], ['種類']);
  assert.equal(byTitle['高-改善-sweep'], undefined, '揃っているカードが分類キューに載っている');
});

test('unclassified バケットは executor だけで決まる（種類で動かない＝分割を保つ）', () => {
  const r = pickTasks(parseBacklog(sample), { limit: 5, classifyLimit: 9 });
  assert.equal(r.unclassifiedTotal, 1, 'kind 欠けが unclassified に混ざっている');
  assert.equal(r.needsTagTotal, 2);
  assert.equal(r.partitionOk, true);
});

test('executor 未付与は分類待ちへ回し、除外は理由別に数える', () => {
  const r = pickTasks(parseBacklog(sample), { limit: 5, classifyLimit: 9 });
  assert.ok(r.classify.some((c) => c.title === '高-未分類'));
  assert.equal(r.excludedTotal, 1);
  assert.deepEqual(r.excludedBy, { 'ユーザー': 1 });
});

test('SELF_EXECUTABLE は sweep と 機械 のみ（外向き権限を勝手に広げない）', () => {
  assert.deepEqual([...SELF_EXECUTABLE].sort(), ['sweep', '機械'].sort());
});

// 2026-08-18: excluded に hold フィルタが無く、hold+非self が excludedTotal と holdTotal に
// 二重計上され、hold+executor無しはどのバケットにも入らなかった（実 backlog で 41+0+57=98≠99）。
// 「実行可能 N 件」を信じて回す運用なので、合計が合わない状態を作らせない。
const holdSample = [
  '## 🔴 高',
  '### 高-sweep', 'タグ: [収益化] [実行:sweep]', '',
  '## 🟣 判断待ち',
  '### 判断-self', 'タグ: [収益化] [実行:sweep]', '',
  '### 判断-非self', 'タグ: [収益化] [実行:対話]', '',
  '### 判断-無印', 'タグ: [収益化]', '',
].join('\n');

test('4 バケットは総数の真の分割（hold の二重計上・取りこぼしを禁じる）', () => {
  const r = pickTasks(parseBacklog(holdSample), { limit: 5, classifyLimit: 5 });
  assert.equal(r.holdTotal, 3);
  assert.equal(r.excludedTotal, 0, 'hold の非self が excluded に二重計上されている');
  assert.equal(r.runnableTotal, 1);
  assert.equal(r.unclassifiedTotal, 0);
  assert.equal(r.runnableTotal + r.unclassifiedTotal + r.excludedTotal + r.holdTotal, r.total);
  assert.equal(r.partitionOk, true);
});

test('実 backlog でも 4 バケットが総数を分割する', () => {
  const text = readFileSync(join(ROOT, '.claude/todo/backlog.md'), 'utf8');
  const r = pickTasks(parseBacklog(text), { limit: 2, classifyLimit: 2 });
  assert.equal(
    r.runnableTotal + r.unclassifiedTotal + r.excludedTotal + r.holdTotal,
    r.total,
    `内訳が総数と合わない: ${r.runnableTotal}+${r.unclassifiedTotal}+${r.excludedTotal}+${r.holdTotal} ≠ ${r.total}`,
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
  const t = parseTagLine('[収益化] [進行中] [実行:sweep]');
  assert.equal(t.wip, true);
  assert.equal(t.category, '収益化');
  assert.equal(t.executor, 'sweep');
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
