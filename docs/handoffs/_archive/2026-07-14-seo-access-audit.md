# Codex 実施ログ：SEOアクセスアップ監査・再精査

> [!important]
> **2026-07-14 再精査完了**：初版を現行コード、本番HTML、既存GSC管理SSOT、Google/OpenAI公式資料で再検証し、訂正版レビューとClaude Code向け実装計画を保存した。コード実装は未着手。

## 背景

ユーザーから「このサイトのアクセスアップのためにseoの観点でできることはある？網羅的に監査してレビューを作成してほしい」と依頼があった。ローカル実装、既存GSC/GA4/PSI履歴、既存SEO戦略ドキュメント、Google Search Centralの基本方針を突き合わせて監査した。

## 実施内容

- `src/lib/metadata.ts`, `src/app/docs/[...slug]/page.tsx`, `src/app/category/[slug]/page.tsx`, `src/components/seo/StructuredData.tsx`, `scripts/generate-sitemap.mjs`, `check-seo-meta` を確認。
- 本番URLの固定ページ・カテゴリ・toolsの canonical / og:url / title を巡回。
- `src/config/doc-meta-index.json` を集計し、published件数、description長、seoTitle欠落、FAQカバー率を確認。
- 最新GSC query/page履歴から高imp低CTR、striking-distanceページを抽出。
- 最新PSI履歴からSEO/Performance/CLS/TBTの低いページを確認。
- 監査結果と優先実装案を `docs/reviews/2026-07-14-seo-access-audit.md` に保存。

### 再精査で追加・修正した内容

- `npm run check-links -- --scope site` を再実行し、1111ファイル・12391リンク中 `BROKEN_SLUG` 166件を確認。
- `RelatedKeywords` のcategory prefix判定が3カテゴリのみで、`concrete-chief-engineer-*` と `pe-first-stage-*` などを存在しない総監URLへ変換することを特定。本番で誤URL404・正規URL200を確認。
- 本番の固定ページ、カテゴリ、search、sitemap-keywordsを再取得し、canonical / OG / title問題を再現。
- 現行 `doc-meta-index.json` を再集計し、published 1069、description 160文字超24、seoTitle欠落1、FAQあり193を確認。
- frontmatter全量lintで1111ファイル、HIGH 0、MEDIUM 0、LOW 165を確認。
- `docs/reference/gsc-management.md` と初版の個別title改善案を照合し、大規模メタ変更ではなくpage × queryに基づく少数実験へ修正。
- FAQ rich resultsの一般サイトでの制限、descriptionに固定文字数上限がないこと、Search Analytics APIの複数dimension / 25000行paginationを公式資料で再確認。
- 本番robotsがCloudflare Managed Contentとリポジトリ生成分の連結で、OAI-SearchBotをblockしていることを確認。AI検索露出はコード修正から分離した判断事項とした。
- 訂正版 `docs/reviews/2026-07-14-seo-access-audit-v2.md` を作成し、初版をsuperseded扱いに変更。
- Claude Code向けのエージェント分業、skill設計、7 Phaseの実装仕様、テスト、受け入れ条件、実行プロンプトを `docs/project/04_運営/11_SEO品質ゲートとClaude分業実装計画.md` に保存。

## 検証

実行したコマンド:

```bash
npm run check-seo-meta -- --json
npm run check-seo-meta -- --base-url https://doboku-note.com --json
npm run check-ogp-coverage -- --json
node scripts/generate-sitemap.mjs
npm run check-doc-lifecycle
```

主な結果:

- `check-seo-meta -- --json`: ローカルdevサーバー未起動のため9URLすべてfetch error。
- `check-seo-meta -- --base-url https://doboku-note.com --json`: 9URLのみ巡回、違反0。ただし記事1067件を見ておらず、カテゴリcanonical誤りも検出できていない。
- `check-ogp-coverage -- --json`: 再実行時点で `checked: 1069`, `missing: []`。
- `generate-sitemap.mjs`: ローカル `out/sitemap.xml` は1087URL。production sitemapは1083URL。
- `check-doc-lifecycle`: 既存handoffのorphan候補を表示。SEO監査自体とは直接関係なし。

再精査で実行した主なコマンド:

```bash
npm run check-links -- --scope site
npm run check-ogp-coverage -- --json
node .claude/scripts/lint-frontmatter.mjs --all
npm run check-doc-refs
```

再精査結果:

- internal links: **FAIL**、`BROKEN_SLUG` 166件。P0実装対象。
- OGP coverage: 欠落0。
- frontmatter: 1111 files、HIGH 0、MEDIUM 0、LOW 165。
- `check-doc-refs`: PASS。1097ファイルの参照は全て実在。
- `check-doc-coupling`: PASS。今回はskill / agent本体を未変更のため台帳更新もれなし。
- build成果物全件DOM監査: 監査途中に別プロセスが`out/`を削除したため未完走。build直後CI gateの必要性として計画へ記録。

## 後続メモ

- **実装の正は再精査版と実装計画**。初版末尾の旧プロンプトをそのまま使わない。
- 最優先は `RelatedKeywords` の166件404修正。category prefixは`src/config/categories.json`を真実源にする。
- 最優先はカテゴリ/固定ページのcanonical自己URL化。現本番では多くの固定・カテゴリページが `https://doboku-note.com` をcanonicalとして出している。
- `check-seo-meta` は現行 `doc-meta-index.json` の `docs` object 形式に未対応で、記事をほぼ監査できていない。P0で直す。
- `/sitemap-keywords` はtitleが `| doboku-note | doboku-note` になっているため修正対象。
- `/search` はindex不要の可能性が高く、`robots: noindex, follow` とself canonicalを推奨。
- FAQ一括追加、description 160文字超の一括短縮、title全件変更は優先しない。
- AI search botのallow/blockはユーザー判断が必要。Claudeは独断でrobots / Cloudflare設定を変えない。
- Claude Codeには `docs/project/04_運営/11_SEO品質ゲートとClaude分業実装計画.md` 末尾のプロンプトを渡す。
