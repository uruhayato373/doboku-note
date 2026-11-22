// 内部リンクのカード・タイル・行は 4 つの共通部品だけで描く（2026-11-17 運営者判断「コンポーネントを完全に共通化」）。
//   上に画像のカード＝ArticleCard／左に画像の行＝ArticleThumbRow／枠つきタイル＝LinkTile／区切り線の行＝LinkRow
// <Link> か <a> の className に枠・カードのクラスを直接書くと、同じ形が別実装に分かれて枠・色・ホバーがずれる（関連記事と前後ナビで起きた）。
// ここでは src/**/*.tsx のリンクの開始タグを数え、部品と、固有の役割を持つ許可リスト以外で 0 件にする。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { test } from 'node:test';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { listFiles } from '../scripts/lib/fs-walk.mjs';

// 枠・カードのクラス（区切り線の行の border-b も含む）
const FRAME = /card-surface-|card-interactive|\bborder border-\(--rule|\bborder-b border-\(--rule|rounded-card-content border\b/;
// ボタン・チップ（inline-flex・rounded-full）とページ内のジャンプ（href="#…"）はカードでも行でもない
const NOT_CARD = /inline-flex|rounded-full|\bdownload\b|href=\{?["'`]#|href=\{`#/;

// 部品そのものと、1 実装のまま使う固有の部品（理由つき）
const ALLOW = new Map([
  ['src/components/ui/ArticleCard/ArticleCard.tsx', '共通部品（上に画像のカード）'],
  ['src/components/ui/ArticleThumbRow/ArticleThumbRow.tsx', '共通部品（左に画像の行）'],
  ['src/components/ui/LinkTile/LinkTile.tsx', '共通部品（枠つきタイル）'],
  ['src/components/ui/NavLinkCard/NavLinkCard.tsx', 'MDX の SeeAlso だけが使う本文のリンクカード（既存の共通部品）'],
  ['src/components/home/ExamCards.tsx', '資格の入口（資格ごとの色の縦線を持つ固有の形）'],
  ['src/components/ui/PersonaSelector/PersonaSelector.tsx', 'MDX の立場の選択（ボタンとリンクの混在）'],
  ['src/components/category/KeywordSections.tsx', '左に太い色線の導入の行とキーワードのチップ'],
  ['src/components/category/CategoryJumpNav.tsx', 'ページ内のジャンプのチップ'],
  // 商品・外部の導線（note・アフィリエイト・ココナラ）。幅と配置は CTA の規則（CTA_STACK_CLASS・check-cta-density）が見る
  ['src/components/ui/CareerAffiliate/CareerAffiliate.tsx', '転職の広告'],
  ['src/components/ui/CareerAffiliate/CareerAffiliateExperiment.tsx', '転職の広告'],
  ['src/components/ui/HubCtaBanner/HubCtaBanner.tsx', 'note の導線'],
  ['src/components/ui/LinkCard/LinkCard.tsx', 'MDX の外部リンクカード'],
  ['src/components/ui/MagazineInlineCard/MagazineInlineCard.tsx', 'note のマガジンの導線'],
  ['src/components/ui/MagazineTopBanner/MagazineTopBanner.tsx', 'note のマガジンの導線'],
  ['src/components/ui/NoteImageCta/NoteImageCta.tsx', 'note の導線'],
  ['src/components/ui/NoteLink/NoteLink.tsx', 'note の導線'],
  ['src/components/ui/OffsiteCta/OffsiteCta.tsx', '外部の商品の導線'],
  ['src/app/tools/kakomon-quiz/KakomonQuizClient.tsx', '演習の後の note の導線（計測つき）'],
  ['src/app/tools/kakomon-quiz/QuizNoteProducts.tsx', 'note の商品'],
  ['src/app/tools/keiken-charcount/page.tsx', 'note の商品'],
]);

// className={CARD}・`${CARD} …` のように同じファイルの定数で書いた枠も見る（旧 PrevNextNav の CARD・基準書の rowLink）
const withConstants = (tag, src) => tag.replace(/\$?\{\s*([A-Za-z_][\w]*)\s*\}/g, (whole, name) => {
  const def = src.match(new RegExp(`const ${name}\\s*=\\s*(['"\`])([\\s\\S]*?)\\1`));
  return def ? def[2] : whole;
});

const linkTags = (src) => [...src.matchAll(/<(Link|a)\s([^<>]*?(?:=>[^<>]*?)*)>/g)].map((m) => ({ tag: m[0], index: m.index }));

test('内部リンクのカード・行を部品の外に手書きしない', () => {
  const files = listFiles(`${REPO_ROOT}/src`, { ext: '.tsx' });
  const hits = [];
  let scanned = 0;
  for (const file of files) {
    const rel = relative(REPO_ROOT, file).split('\\').join('/');
    if (ALLOW.has(rel)) continue;
    scanned++;
    const src = readFileSync(file, 'utf8');
    for (const { tag, index } of linkTags(src)) {
      const resolved = withConstants(tag, src);
      if (!FRAME.test(resolved) || NOT_CARD.test(resolved)) continue;
      hits.push(`${rel}:${src.slice(0, index).split('\n').length}`);
    }
  }
  console.log(`[link-primitives] 検査 ${scanned} ファイル（許可 ${ALLOW.size}）・手書き ${hits.length} 件`);
  assert.ok(scanned > 100, `検査したファイルが少なすぎる（${scanned}）`);
  assert.deepEqual(hits, [], `部品（ArticleCard・ArticleThumbRow・LinkTile・LinkRow）を使う:\n${hits.join('\n')}`);
});

test('許可リストのファイルは実在する', () => {
  for (const rel of ALLOW.keys()) assert.doesNotThrow(() => readFileSync(`${REPO_ROOT}/${rel}`), `${rel} が無い（許可リストから消す）`);
});
