/**
 * check-note-structure の有料プローブ（PAYWALL_LEAK 判定の鍵）の選定を固定する。
 *
 * 背景（2026-09-18）: RCCM 問題III 論文集は無料側の「テーマの読み解き」で模範論文の冒頭文を再掲する
 * 構成のため、境界直後 30 字を probe にすると**無料側にも在る文**で live 無料本文にヒットし、境界が
 * 正しくても PAYWALL_LEAK（CRITICAL）になった（note-live-audit.yml が赤）。probe は SoT の無料部分に
 * 現れない行から選ぶ。無料側に無い文が live 無料本文に出て初めて漏洩と言える。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';

const { analyzeSource } = await import('../scripts/check-note-structure.mjs');

const article = (freeQuote) => `---
notePricing: paid
price: 980
paidBoundary: 模範論文
noteId: "n000000000000"
---

## テーマの読み解き

${freeQuote}

## 答案構成の設計

三点に整理して書く。

## 模範論文

### ① 現状と課題
高度経済成長期に集中整備された道路橋・トンネル等の社会資本は老朽化している。
こうした状況の課題は三点に整理できる。第一に縦割り管理である。
`;

test('無料側に再掲されている文は有料プローブに使わず、次の固有文を選ぶ', () => {
  const a = analyzeSource(article('高度経済成長期に集中整備された道路橋・トンネル等の社会資本は老朽化している。'));
  assert.equal(a.hasBoundary, true);
  assert.ok(a.paidProbe.startsWith('こうした状況の課題は三点に整理できる'), `probe が無料側の再掲文を選んでいる: ${a.paidProbe}`);
});

test('無料側に再掲が無ければ従来どおり境界直後の最初の本文行を選ぶ', () => {
  const a = analyzeSource(article('老朽化の背景を読み解く。'));
  assert.ok(a.paidProbe.startsWith('高度経済成長期に集中整備された'), `probe: ${a.paidProbe}`);
});

test('見出し・画像・note.com 行は probe にしない（従来契約）', () => {
  const a = analyzeSource(article('前置き。'));
  assert.ok(!a.paidProbe.startsWith('#'), '見出しを probe にしている');
  assert.ok(!/^!\[/.test(a.paidProbe), '画像行を probe にしている');
});
