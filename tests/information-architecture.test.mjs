import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditPath, auditDualSsot, auditStalePathLiterals, listTargets } from '../scripts/check-information-architecture.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CFG = JSON.parse(readFileSync(join(ROOT, '.claude/config/information-architecture.json'), 'utf8'));

/**
 * 4 領域モデル（docs / content / .claude / 実装）への逆戻りを止めるゲートの契約。
 *
 * 一番大事なのは「**禁止パスを新しく足したら確実に落ちる**」ことと、
 * 「**正当な docs・content・.claude/plans は通る**」こと。前者だけだと過検知で
 * 使われなくなり、後者だけだと検査ゼロと同じになる。
 */

test('廃止した置き場に新規ファイルを置くと落ちる', () => {
  for (const bad of [
    'docs/project/01_戦略/x.md',
    'docs/ui/gallery.md',
    'docs/note/技術士総監/article.md',
    'docs/sns/instagram/x/slide-data.json',
    'docs/textbook/白書等/a.pdf',
    'docs/coconala-blog/x/article.md',
    '.claude/content/kindle/strategy.md',
    '.local/r2/posts/civil-construction-1/a/article.mdx',
    '.claude/prompts/new.md',
    '.claude/plans/completed/old.md',
    '.claude/plans/archive/old.md',
    'docs/_archive/old.md',
    'content/_archive/old.md',
  ]) {
    const v = auditPath(bad, CFG);
    assert.ok(v.length > 0, `検出できていない: ${bad}`);
  }
});

test('docs/ に制作物が混じると落ちる（ファイル名・拡張子の両方）', () => {
  assert.equal(auditPath('docs/strategy/article.md', CFG)[0]?.rule, 'content-in-docs');
  assert.equal(auditPath('docs/operations/x.mdx', CFG)[0]?.rule, 'content-in-docs');
  assert.equal(auditPath('docs/products/demo.mp4', CFG)[0]?.rule, 'content-in-docs');
  assert.equal(auditPath('docs/editorial/pack/slide-data.json', CFG)[0]?.rule, 'content-in-docs');
});

test('content/ に台帳・計画が混じると落ちる', () => {
  assert.equal(auditPath('content/note/backlog.md', CFG)[0]?.rule, 'flow-in-content');
  assert.equal(auditPath('content/site/plans/x.md', CFG)[0]?.rule, 'flow-in-content');
  assert.equal(auditPath('content/sns/todo/weekly.md', CFG)[0]?.rule, 'flow-in-content');
});

test('正当な配置は通る（過検知で使われなくならないこと）', () => {
  for (const ok of [
    'docs/README.md',
    'docs/strategy/01_プロダクト戦略.md',
    'docs/operations/13_AdSense再申請SOP.md',
    'docs/design/images/callout-note.png',   // allowDirs
    'docs/handoffs/2026-08-18-x.md',          // allowDirs
    'docs/reviews/2026-07-11-audit.md',       // allowDirs
    'content/note/技術士総監/x/article.md',
    'content/site/civil-construction-1/a/article.mdx',
    'content/sns/instagram/pack/slide-data.json',
    'content/kindle/books/d-03/front-matter.md',
    'content/sources/textbook/白書等/a.pdf',
    '.claude/todo/backlog.md',
    '.claude/plans/DN-0094-x/00-master.md',
    '.claude/knowledge/reference/information-architecture.md',
    'src/lib/local-post-reader.ts',
  ]) {
    assert.deepEqual(auditPath(ok, CFG), [], `正当な配置を落としている: ${ok}`);
  }
});

test('二重 SSOT は旧ルートの実在で検出する', () => {
  const pairs = [{ legacy: 'docs/note', target: 'content/note' }];
  assert.deepEqual(auditDualSsot(pairs, () => false), []);
  assert.equal(auditDualSsot(pairs, () => true)[0]?.rule, 'dual-ssot');
});

test('実リポジトリは違反 0 で、検査対象が 0 件ではない', () => {
  const files = listTargets();
  // 2026-08-29 に 10000 → 8000 へ。全ストレージ最適化 P3/P4 で ogp.webp 1,166 件（読むコード
  // 0 行の純中間物）と ogp.png 1,166 件（R2 退避・--verify 1166/1166 確認済み）を追跡から
  // 外し、リポジトリ全体の追跡数が 12,091 → 9,759 まで下がった。この下限は「今と同じ桁」の
  // 目安（走査の破損を疑う基準）で、正確な値に意味は無い。
  assert.ok(files.length > 8000, `検査対象が少なすぎる（走査の破損を疑う）: ${files.length}`);
  const violations = files.flatMap((f) => auditPath(f, CFG));
  assert.deepEqual(violations.slice(0, 5), [], `違反 ${violations.length} 件`);
});

test('allowlist は空を保つ（既存違反を恒久黙認しない）', () => {
  assert.deepEqual(CFG.allowlist.entries, [], 'allowlist に例外が溜まっている。理由を確認して解消する');
});

/* ------------------------------------------------------------------ *
 * 旧パスの文字列が残っていないか（正規表現エスケープ形を含む）
 * ------------------------------------------------------------------ */

const STALE = CFG.stalePathLiterals;

test('正規表現エスケープ形の旧パスを検出する（移行の素の置換が素通りした形）', () => {
  const src = String.raw`const ok = /^docs\/note\/.*\/article\.md$/.test(p);`;
  const v = auditStalePathLiterals('scripts/x.mjs', src, STALE);
  assert.equal(v.length, 1, `検出できていない: ${src}`);
  assert.match(v[0].msg, /正規表現エスケープ形/);
});

test('素の文字列の旧パスも検出する', () => {
  const v = auditStalePathLiterals('scripts/x.mjs', "join(ROOT, 'docs/sns', 'instagram')", STALE);
  assert.equal(v.length, 1);
  assert.match(v[0].msg, /素の文字列/);
});

test('新パスは検出しない（過検知で使われなくならないこと）', () => {
  for (const src of [
    String.raw`/^content\/note\/.*\/article\.md$/`,
    "join(ROOT, 'content/sns', 'instagram')",
    "const p = 'content/sources/textbook/白書等';",
    "const p = 'content/site/civil-construction-1';",
  ]) {
    assert.deepEqual(auditStalePathLiterals('scripts/x.mjs', src, STALE), [], src);
  }
});

test('走査対象外のパスと allowFiles は検査しない', () => {
  // docs/ 配下の .md は歴史記述を持てるので対象外（scanGlobs はコードだけ）
  assert.deepEqual(auditStalePathLiterals('docs/strategy/a.md', "当時の docs/note を参照", STALE), []);
  // 旧パスを検出するため自分自身が旧パス文字列を持つファイルは allowFiles
  assert.deepEqual(
    auditStalePathLiterals('scripts/check-information-architecture.mjs', "'docs/note'", STALE),
    [],
  );
});

test('allowFiles に挙げたファイルは実在する（消えた例外を残さない）', async () => {
  const { existsSync } = await import('node:fs');
  const missing = (STALE.allowFiles ?? []).filter((f) => !existsSync(join(ROOT, f)));
  assert.deepEqual(missing, [], `allowFiles に実在しないファイルがある: ${missing.join(', ')}`);
});
