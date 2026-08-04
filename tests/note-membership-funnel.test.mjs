// note メンバーシップ「土木セコカン合格ラボ」訴求・加入導線のドリフト検出テスト。
//
// 目的: SoT（note-magazines.ts）・note 記事本文・サイト配置（magazine-placement.ts）が
//       「公開済み・加入導線あり」の状態から再び「未公開扱い」へ戻るのを機械検出する。
//
// テストのために商品定義や本文を二重定義しない。すべて実ソースを読み、実 resolvePlacement を
// esbuild でトランスパイルして呼ぶ（magazine-placement.ts は import type のみ＝ランタイム依存ゼロ）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

// URL.pathname は Windows で "/C:/..." を返し、readFileSync が "C:\C:\..." と
// 解決して ENOENT になる（CI は Linux なので緑、ローカルだけ赤という割れ方をする）。
// fileURLToPath でプラットフォーム固有のパスへ変換する。
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(ROOT + rel, 'utf8');

const JOIN_URL = 'https://note.com/dobokunote/membership/join';
const MEMBERSHIP_ID = 'civil-membership-lab';
const CTA_MARKER = '<!-- cta:civil-membership-lab -->';
const INTRO_SELF_URL = 'https://note.com/dobokunote/n/n6b66793ca20c';

// 加入導線の対象 6 記事（作業票 §4）。
const TARGET_ARTICLES = [
  'docs/note/1級・2級土木/土木もくじ/article.md',
  'docs/note/1級・2級土木/経験記述-落ちる答案診断-無料/article.md',
  'docs/note/1級・2級土木/経験記述-独学添削の限界-無料/article.md',
  'docs/note/1級・2級土木/経験記述-予想問題で書く練習-無料/article.md',
  'docs/note/1級・2級土木/1級土木/magazines/1級土木-二次まるごとパック/article.md',
  'docs/note/1級・2級土木/メンバーシップ/はじめに-合格ラボ/article.md',
];
const INTRO_ARTICLE = 'docs/note/1級・2級土木/メンバーシップ/はじめに-合格ラボ/article.md';

function stripFrontmatter(content) {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
}
function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

// ── SoT: civil-membership-lab が公開済みで正式加入 URL を持つ ──────────────
test('note-magazines.ts: civil-membership-lab は published:true・noteUrl=加入URL', () => {
  const src = read('src/lib/note-magazines.ts');
  const block = src.match(/'civil-membership-lab':\s*\{([\s\S]*?)\n {2}\},/);
  assert.ok(block, "civil-membership-lab エントリが見つからない");
  const body = block[1];
  assert.match(body, /\bpublished:\s*true\b/, 'published:true でない（未公開へドリフト）');
  assert.match(
    body,
    /noteUrl:\s*'https:\/\/note\.com\/dobokunote\/membership\/join'/,
    'noteUrl が正式加入 URL(/membership/join) でない',
  );
});

// ── note 記事: 対象 6 記事に CTA マーカーと加入 URL が各 1 件 ─────────────
for (const rel of TARGET_ARTICLES) {
  test(`note 記事に CTA マーカーと加入 URL が各1件: ${rel}`, () => {
    const content = read(rel);
    assert.equal(countOccurrences(content, CTA_MARKER), 1, `CTA マーカーが 1 件でない: ${rel}`);
    assert.equal(countOccurrences(content, JOIN_URL), 1, `加入 URL が 1 件でない: ${rel}`);
  });
}

// ── 説明記事の本文に自己参照 URL が残っていない（frontmatter の noteUrl/noteId は対象外）──
test('はじめに-合格ラボ: 本文に自己参照 URL が残っていない', () => {
  const body = stripFrontmatter(read(INTRO_ARTICLE));
  assert.equal(
    countOccurrences(body, INTRO_SELF_URL),
    0,
    '本文に自己参照 URL(n6b66793ca20c) が残存（加入 URL へ置換されていない）',
  );
});

// ── サイト配置: 土木二次で top=買い切り・inline[0]=メンバーシップ ────────────
test('resolvePlacement: 土木二次は top=買い切り・inline[0]=メンバーシップ', async () => {
  const ts = read('src/lib/magazine-placement.ts');
  const js = transformSync(ts, { loader: 'ts', format: 'esm' }).code;
  const mod = await import('data:text/javascript,' + encodeURIComponent(js));
  const { resolvePlacement } = mod;
  assert.equal(typeof resolvePlacement, 'function', 'resolvePlacement を import できない');

  // [slug, docGroup] の代表面。すべて top=買い切り（≠メンバーシップ）・inline[0]=メンバーシップ が契約。
  const cases = [
    ['civil-construction-1-secondary-r07', 'secondary'],
    ['civil-construction-2-secondary-r07', 'secondary'],
    ['civil-construction-1-secondary-experience-writing-guide', 'secondary'],
    ['civil-construction-2-secondary-experience-writing-examples', 'secondary'],
    ['civil-construction-2-secondary-getting-started', 'secondary'],
    ['civil-construction-1-secondary-past-problems', 'secondary'], // 1級 catch-all
    ['civil-construction-1-guide-last-minute-2026', 'guide'], // 二次隣接（直前）
  ];

  for (const [slug, group] of cases) {
    const p = resolvePlacement(slug, group);
    assert.ok(p.top, `${slug}: top（冒頭 買い切り CTA）が無い`);
    assert.notEqual(
      p.top.magazineId,
      MEMBERSHIP_ID,
      `${slug}: 冒頭 top はメンバーシップでなく買い切りであるべき`,
    );
    assert.ok(p.inline.length > 0, `${slug}: inline が空`);
    assert.equal(
      p.inline[0].magazineId,
      MEMBERSHIP_ID,
      `${slug}: inline[0]（本文中間 CTA 供給源）がメンバーシップでない`,
    );
  }
});
