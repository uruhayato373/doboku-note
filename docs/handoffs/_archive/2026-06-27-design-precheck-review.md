# Codex 実施ログ：デザイン改修前コードレビュー

> [!done]
> **2026-06-27 完了**：デザイン改修前の設計・実装レビューを実施し、結果を `docs/reviews/weekly/2026-W26.md` に追記。`npm run type-check` / `npm run lint` / `npm test` は pass。
>
> **後続も完結（archive 時追記）**: 本レビューが起票したデザイン改善（Phase 0-5 + token 化）は PR #284-#290 で実装・本番 deploy 済み。Phase 0 で挙げたデッドコード整理も `bbbc39ab8` + PR #284 で完了（`docs/reviews/code/2026-06-27-dead-code-candidates.md` 参照）。残タスク無しのため `_archive` へ退避。

## 背景

ユーザーから、デザイン改良に進む前にコードが適切に設計・実装されているか、非効率な部分やスパゲッティ化の兆候がないかレビューしたい、との依頼があった。

## 実施内容

- Next.js アプリ本体、MDX 読み込み、note CTA 配置、カテゴリページ、MDX コンポーネントローダーを中心に確認。
- 週次計画ファイル `docs/reviews/weekly/2026-W26.md` の末尾に「コードレビュー（デザイン改修前・2026-06-27）」を追加。
- 追加で `docs/design-system/proposals/2026-06-27-docs-template-improvement.md` に docs 記事テンプレートの改善提案を作成。
- 全ページ実装前レビューとして `docs/design-system/proposals/2026-06-27-all-pages-design-review.md` を作成。
- 全ページ方針として、PC 右サイドバーの `sticky` 固定を一旦解除する案をレビュー文書へ反映。対象は主に `/docs/[slug]` の `ArticleSidebar` と `/category/[slug]` の右サイドバー。
- `/links` はサイト全体の editorial design との統一感が弱く、文字説明中心でクリック導線が埋もれるため、優先度を High に上げた。方針は「リンク集」ではなく、試験選択 + 教材選択の **Exam Action Hub** として再設計。
- 右サイドバー方針を明文化。統一感は「全ページに右サイドバーを置く」ことではなく、役割別テンプレートで担保する。右サイドバーは `/docs/[slug]` と `/category/[slug]` に限定し、`/links` / `/search` / `/about` には追加しない方針。
- 追加で、横幅と上部構造の揺れを統一感の主要課題として明文化。現状は `max-w-[1280px]` / `max-w-[1200px]` / `max-w-5xl` / `max-w-[880px]` / `max-w-[780px]` / `max-w-[760px]` が混在し、Hero / PageHeader の扱いもページごとに違う。Phase 0 で共通 `PageShell` / `PageHeader` を決める方針。
- 分散していたレビュー・提案を統合し、`docs/design-system/proposals/2026-06-27-design-implementation-roadmap.md` を作成。今後のデザイン改善実装ではこのドキュメントをメインロードマップとし、詳細レビューは参照元として扱う。
- デッドコード候補を追加確認。`npm run lint` は pass だが、unused export は lint では拾い切れない。`inlineMobileOnly`、MDX component registry 二重管理、旧サイドバー系、`SidebarSearch`、`ReferenceCardLink`、`ErrorBoundary` 系は Phase 0 で整理判断する。
- デッドコード候補を独立ファイル `docs/reviews/code/2026-06-27-dead-code-candidates.md` に保存。ロードマップからも参照するようにした。
- 主な指摘:
  - `src/lib/magazine-placement.ts` の `resolvePlacement()` が巨大条件分岐化している。
  - `src/lib/docs.ts` に MDX 前処理・slug 解決・FS/R2 読み込みなど複数責務が同居している。
  - `src/lib/component-loader/common.ts` と `src/lib/component-loader/index.ts` の登録情報が二重管理になっている。
  - `inlineMobileOnly` が現描画では未使用の名残になっている。
  - `src/app/category/[slug]/page.tsx` はデザイン改修前に薄く分割すると触りやすい。

## 検証

```bash
npm run type-check
npm run lint
npm test
```

- `npm run type-check`: pass
- `npm run lint`: pass
- `npm test`: pass（97 件中 94 pass / 3 skip）

## 後続メモ

- すぐ大規模リファクタに入る必要はない。
- デザイン改修前の推奨順は以下:
  1. `inlineMobileOnly` と MDX component registry の小掃除。
  2. `resolvePlacement()` の単体テスト追加。
  3. カテゴリ/docs レイアウトの薄い分割。
  4. 必要に応じて `src/lib/docs.ts` の責務分割。
- デザイン改善の初手は `ArticleHeader` 新設が最も低リスク。詳細は `docs/design-system/proposals/2026-06-27-docs-template-improvement.md` を参照。
- 全ページ横断では、まず `primary/gray/blue` 直指定を editorial token へ寄せ、PC 右サイドバーの `sticky top-*` を外す Phase 0 を推奨。詳細は `docs/design-system/proposals/2026-06-27-all-pages-design-review.md` を参照。
- Phase 0 は token 統一だけでなく、ページ外枠 `max-w-[1280px]`、単カラム内側 content rail、トップ以外は原則 `PageHeader` へ寄せることを含む。
- `/links` は独立した Phase 3 として扱う。`LinksHero` / `ExamActionGrid` / `FeaturedProductRail` / `SupportLinks` に分割し、文字説明カードを減らして、試験カード・教材画像・短い判断ラベル・明確な CTA を主役にする。
- `/search` は検索集中の単カラム、`/about` は信頼情報を順に読ませる単カラム、`/links` は全幅アクションカード中心の単カラム/グリッドが基本。共通 `PageHeader` / `SectionCard` / `RelatedActions` で統一する。
- 次に実装へ入る場合は `docs/design-system/proposals/2026-06-27-design-implementation-roadmap.md` の Phase 0 から着手する。`/links` 個別改修は Phase 0 完了後。
- Phase 0 では `npm run lint` に加え、デッドコード候補を削除する場合は `npm run type-check` / `npm test` まで通す。
