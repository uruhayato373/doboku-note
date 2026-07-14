# Codex 実施ログ：カードプリミティブ統一 第1弾

> [!warning]
> **2026-07-14 完了**：検索画面・トップ最新記事・about 学習開始カードに加え、tools 系と links ページ主要カードを `card-surface-*` へ移行し、UI全体の `transition-all` を0件化した。`lint-ui` / `type-check` / `lint` / `build` は通過。

## 背景

ユーザーから doboku-note のデザイン改善を Codex 側で継続する依頼があった。前回までに UI-002 / UI-003 / UI-004 を実装済みのため、続きとして `docs/reviews/2026-07-11-static-ui-codebase-audit.md` の UI-005（カードプリミティブ統一）に着手した。

## 実施内容

- `src/components/search/SearchResults.tsx`
  - 検索結果カードを直書きの `bg/border/radius/shadow` から `card-surface-section` へ移行。
  - `transition-all` を `transition-[border-color,box-shadow]` へ限定。
  - 検索結果タイトルリンクと再試行ボタンに `focus-ring` を追加。
- `src/components/search/SearchZeroState.tsx`
  - 試験カテゴリカードを `card-surface-content` へ移行。
  - 人気記事リスト枠を `card-surface-content shadow-none` へ移行。
  - カード/行リンクに `focus-ring` を追加。
- `src/components/search/SearchBox.tsx`
  - 検索候補ドロップダウンの外枠を `card-surface-content` へ移行。
  - 入力欄そのものはフォームコントロールなので、直書きの `bg/border/radius` は維持。
- `src/components/home/LatestArticles.tsx`
  - 最新記事カードを `card-surface-section` へ移行。
  - `transition-all` を `transition-[border-color,box-shadow]` へ限定。
  - カードリンクに `focus-ring` を追加。
- `src/app/about/page.tsx`
  - 学習開始セクションの3カードを `card-surface-section` へ移行。
  - `transition-all` を `transition-[border-color,box-shadow]` へ限定。
  - カードリンクに `focus-ring` を追加。
- `src/app/tools/page.tsx`
  - ツール一覧カードを `card-surface-section` へ移行。
  - カードリンクに `focus-ring` を追加。
- `src/app/tools/juken-shikaku/JukenShikakuClient.tsx`
  - 入力/結果の大カードを `card-surface-section` へ移行。
  - 関連リンクカードを `card-surface-content shadow-none` へ移行。
- `src/app/tools/keiken-charcount/KeikenCharcountClient.tsx`
  - 入力/結果の大カードを `card-surface-section` へ移行。
  - 関連リンクカードを `card-surface-content shadow-none` へ移行。
  - 進捗バーの `transition-all` を `transition-[width]` へ限定。
- `src/app/tools/kakomon-quiz/KakomonQuizClient.tsx`
  - 結果/問題カードを `card-surface-section` へ移行。
  - 関連リンクカードを `card-surface-content shadow-none` へ移行。
  - 進捗バーの `transition-all` を `transition-[width]` へ限定。
- `src/app/links/page.tsx`
  - note マガジンカード、無料リンク、ペルソナ集約カード、運営者/SNS導線、価値提案カードを共通 primitive へ寄せた。
  - `transition-all` を限定 transition へ置換。
  - 主要リンクに `focus-ring` を追加。
- `src/components/ui/BackToTopButton.tsx`
  - `transition-all` を `transition-[border-color,box-shadow,color]` へ限定。
  - `focus-ring` を追加。
- `src/components/category/CategoryViews.tsx`
  - キーワード索引カードを `card-surface-content` へ移行。
  - `transition-all` を `transition-[border-color,box-shadow]` へ限定。
- `src/components/home/ExamCards.tsx`
  - 試験カードの `transition-all` を `transition-[border-color,box-shadow,transform]` へ限定。
  - `focus-ring` を追加。
- `src/components/ui/AffiliateParts.tsx`
  - CTA の `transition-all` を `transition-[gap]` へ限定。
- `scripts/lint-ui.mjs`
  - `transition-all` を検出する `transition-all` ルールを追加。
- `docs/design-system/design-system.md`
  - `transition-all` 禁止と明示 transition の方針を追記。

## 検証

```bash
node scripts/lint-ui.mjs --all
npm run type-check
npm run lint
npm run build
```

- `lint-ui --all`: pass（101 UI files）
- `type-check`: pass
- `lint`: pass
- `npm run build`: pass

build の状況:

- 以前は Claude 側と思われる別の `npm run build` / `next build` が `.next/lock` を保持していたが、ロック解消後に再実行して完走。
- build 中に既存の Turbopack broad pattern warning と KaTeX strict warn が出たが、今回変更由来ではない。

## 後続メモ

- UI-005 はまだ一部のみ。次は `CareerAffiliate` / `NoteLink` / `MagazineInlineCard` / `LinkCardClient` / `RelatedArticleCard` などの本文カードへ広げる。
- UI-006（`transition-all` 排除）は完了。`rg -n "transition-all" src/app src/components -g '*.tsx'` は0件、`lint-ui` に再発防止ルールあり。
- `npm run build` 実行により `refresh-indexes` が走ったため、既存の `src/config/*` 生成物は引き続き dirty のまま。
