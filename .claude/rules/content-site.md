---
paths:
  - "content/site/**"
---

# content/site（サイト記事 MDX）を編集するときの規約

CLAUDE.md §2/§3/§11 の記事規約の詳細。真実源は [content-authoring.md](../knowledge/reference/content-authoring.md)（書き方）と [content-principles.md](../knowledge/reference/content-principles.md)（品質ルール）。

## 着手前に読む

- MDX を追加・編集する前に content-authoring.md を Read する（MDX コンポーネント・過去問構造・モバイル視認性・画像配信・frontmatter テンプレ）
- 試験別の整備方針・コンテンツ別レビュー視点・新資格追加手順 → [exam-content-policy.md](../knowledge/reference/exam-content-policy.md)
- 原本・一次資料から文字起こしや記事を作る／参考文献を追加・変更する → [reference-sources-policy.md](../knowledge/reference/reference-sources-policy.md)（参考文献 6 区分の逐語・図・文字起こし公開・出典粒度と、原本→Drive 文字起こし→記事 `sources` ID→検査のライフサイクル）。スキャン書籍の逐語複製で公開記事を作らない
- キーワードページ・ガイド記事の執筆と評価 → content-principles.md（ExamPoint 個数・参考資料構成・Callout 12 種の使い分け）。ガイド記事は本文 3,000 字以上、試験統計・制度は公開前に一次情報で照合

## 書き方

- Convention A（個別ファイル名・`civil-construction-1/`）と Convention B（`article.mdx`・`pe-comprehensive-management/`）が共存する。新規は B 推奨。既存ファイルの方式を勝手に変換しない
- 絵文字禁止（`<Callout type="...">` で表現）。数式は KaTeX 一択（`$$...$$` / `$...$`）。表は 2 軸比較のみ・4 列以上禁止。見出しは H2 以下（H1 は frontmatter から自動生成）
- Callout の選び方は視覚ギャラリー [callout-gallery.md](../../docs/design/callout-gallery.md) と [Callout/README.md](../../src/components/ui/Callout/README.md)。仕様書調リストは [speclist-gallery.md](../../docs/design/speclist-gallery.md) と [SpecSheetList/README.md](../../src/components/ui/SpecSheetList/README.md)
- frontmatter 必須: `title` / `seoTitle` / `description` / `category` / `tags` / `published`。`created` / `dateModified` も frontmatter が真実源（欠けるとビルドが git 履歴へフォールバックし、sitemap lastmod と JSON-LD datePublished がリネームや履歴書換えで動く。検査 `npm run check-mdx-dates`、書き込みは pre-commit の `backfill-mdx-dates --staged`）
- 書き込みは `lib/mdx-io.mjs` の `writeMdxFile` 経由（直接 `writeFileSync` は CRLF 混在を起こし pre-commit で reject される）。書き込み後は `U+FFFD`（`﹖`）で文字化けを走査する
- 図・写真を追加・置換するときは `**/img/**` を開くと assets-images ルールが載る（判定フロー・出典表記は [image-policy.md](../knowledge/reference/image-policy.md)、`figure-*.svg` の固定キャンバスは [figure-canvas-policy.md](../knowledge/reference/figure-canvas-policy.md)）。過去問の問題図に解答情報を入れない
- 過去問（primary/secondary）は正答・全選択肢の正誤・ExamPoint（引っかけ 1 行＋items 最大 2）・RelatedKeywords（civil は `civil-construction-1-` 接頭辞）を守る。新年度の過去問は `exam-keyword-map.json` へ追記して backlink を配線する

## 完了条件

- PDF→MDX 変換は `/verify-pdf-mdx` でルーブリック ≥ 2.0
- MDX 追加・変更後は `npm run refresh-indexes` を実行してから commit（backlinks・cross-exam・tags・pillar 問題・頻出論点のインデックス不整合を防ぐ）
- 1 記事の修正が完了したら即 commit（`git add` は変更したファイルだけ明示）
- 統合済み記事を再公開しない: `published: true` なのに `_redirects` の転送元になっているとページは在るのに別ページへ飛ぶ（`npm run check-published-vs-redirects`）
- 太字・GFM テーブルが実際に描画されるか（`npm run check-bold-rendering` / `npm run check-table-rendering`、機械修正は `npm run fix-bold-rendering`）。本文が指す「表N.M」のキャプション実在（`npm run check-table-references`）
- 公的基準の章記事 `content/site/standards-articles/` は `npm run build-standard-articles` の生成物。検査は `npm run check-standard-articles`（コマンドの全一覧 → [commands.md](../knowledge/reference/commands.md)）
- 公開ページが GSC 404/リダイレクト URL を指していないか（`npm run check-internal-links-vs-gsc`）
