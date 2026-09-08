---
paths:
  - "content/note/**"
  - "content/sns/**"
  - "content/kindle/**"
  - "content/coconala/**"
  - "content/brain/**"
---

# 販売・集客チャネルの制作物（note / SNS / Kindle / ココナラ / Brain）を扱うときの規約

サイト記事（`content/site/`）とは別系統。各チャネルの真実源を先に Read してから書く。CLAUDE.md §8「提案の前に現物を確認する」はここで最も効く（既存 CTA・公開状態・価格は必ず実物で裏取り）。

## note（content/note/**）

- 索引と戦略の入口 → `content/note/README.md`（試験別構造・戦略 SSOT 体系）。戦略・Red Line・価格企画の真実源は各試験の `noteコンテンツ計画.md`、**実価格・noteUrl は `src/lib/note-magazines.ts`**（サイト側 CTA の配線は `src/lib/magazine-placement.ts`）
- 記事を公開レベルへ引き上げる 10 工程（網羅性照合／過去問配置／図版／カバー／e-gov リンク／段落分割／検証） → [note-publish-enhancement.md](../knowledge/reference/note-publish-enhancement.md)
- 記事**内部**の構成テンプレ（売れる 9 型＋5 ステップ骨格） → [note-selling-structures.md](../knowledge/reference/note-selling-structures.md)
- 記事**間**の導線（L1 全資格サイトマップ / L2 資格別もくじ / L3 記事内 CTA） → [note-funnel-architecture.md](../knowledge/reference/note-funnel-architecture.md)。機械可読は `.claude/config/note-funnel.json`、監査は `audit-note-funnel` スキル／`npm run check-note-funnel`／`note-funnel-auditor`
- 総監 記述式の模範論文レビュー（字数→散文性→監理可能性→専門度→白書根拠の 9 ステップ、各施策 600 字以内が最優先） → [note-essay-review-checklist.md](../knowledge/reference/note-essay-review-checklist.md)
- 公開状態の照合（`npm run verify-note-magazines`・note public API・会社 PC プロキシは `curl --ssl-no-revoke`） → [note-api-verification.md](../knowledge/reference/note-api-verification.md)
- 図解 SVG/PNG（`content/note/**/img/figure-*`） → [note-svg-policy.md](../knowledge/reference/note-svg-policy.md)。カバー画像は [note-cover.md](../knowledge/design-system/note-cover.md)
- 施工経験記述の解答欄の割り振り（1 級=(1)検討項目/(2)対応処置・評価、2 級=(1)課題/(2)検討項目と対応処置） → `npm run check-keiken-answer-split`（note 原稿と模試の生成 markdown を走査）
- note 記事の走査は `/^article(-[^/\\]+)?\.md$/`（型別 `article-*.md` を落とさない）。note は HTML 非対応。販売履歴のある有料記事を下書きへ戻さない（差し替えは新規＋入替）
- 売上の記録 → [sales-tracking.md](../knowledge/reference/sales-tracking.md)（`/record-sales`・`npm run note-sales-fetch`）。会員配信ドリップの真実源は `メンバーシップ/README.md` の配信表（`npm run check-membership-drip`。日付をカードへ複製しない）

## SNS（content/sns/**: instagram / x / youtube）

- 戦略と動線 → `docs/marketing/01_SNS集客戦略.md`（v7: Instagram が一次制作、YouTube Shorts は IG Reels mp4 の二次展開、X は合格者発信の信頼／note 誘導）と `docs/marketing/02_チャネル動線設計.md`（UTM 統一フォーマット・季節×チャネル）
- 投稿画像（IG/X/Shorts のキャンバス・スワイプ方向・記号統一） → [sns-image-policy.md](../knowledge/reference/sns-image-policy.md)。6 切り口（結論/理由/体験/反論/数字/ハウツー）と `angle` → [content-angle-policy.md](../knowledge/reference/content-angle-policy.md)・[sns-repurpose-policy.md](../knowledge/reference/sns-repurpose-policy.md)
- Instagram: カルーセル 2 シリーズ → [ig-carousel-skill.md](../knowledge/reference/ig-carousel-skill.md)、公開状態の照合・未公開の予約（`@dobokunotecom`・`verify-ig-status`→`ig-reconcile`→`ig-publish-auditor`） → [ig-publish-reconcile.md](../knowledge/reference/ig-publish-reconcile.md)、Reels → [ig-reels-policy.md](../knowledge/reference/ig-reels-policy.md)、Stories → [ig-stories-policy.md](../knowledge/reference/ig-stories-policy.md)、ハイライト → [ig-highlight-design-policy.md](../knowledge/reference/ig-highlight-design-policy.md)
- X → [x-post-policy.md](../knowledge/reference/x-post-policy.md)（280 weighted・試験別ベースタグ・5 軸ルーブリック。凍結対策 §11＝重複/連投/一括予約回避）。自投稿の反応は `npm run x-own-metrics`（中央値で読む）
- YouTube Shorts（IG Reels 派生 mp4 + meta.json・UTM 必須） → [yt-shorts-publisher-policy.md](../knowledge/reference/yt-shorts-publisher-policy.md)
- マスコット「doboku-note 先生」素材 → [character-asset-policy.md](../knowledge/reference/character-asset-policy.md)。`/links` リンクハブ（SNS bio 用・UTM 設計） → [links-hub.md](../knowledge/reference/links-hub.md)
- 投稿済みバイナリ（reels wav/mp4・Shorts mp4）の退避 → [sns-archive-policy.md](../knowledge/reference/sns-archive-policy.md)（Google Drive vault・`drive-vault-sync --group sns-archived-media`）
- 動画パック（DN-0110） → [video-content-policy.md](../knowledge/reference/video-content-policy.md)。ゲート `npm run check-video-content`、レンダー `npm run render-longform`、公開実体の照合 `npm run check-video-publication`
- 投稿 URL がローカル doc-meta-index と一致するか `check-sns-urls`（公開＋refresh 済みなら deploy 前でも結線可）

## Kindle（content/kindle/**）

- 戦略 `content/kindle/strategy.md`。書籍 spec と前付けは `kindle-book-composer`、入稿は `kdp-operator`（`/kdp-publish`）、監査は `kindle-book-qa`
- 修正版は既存を差し替える（新規作成しない）。提出後は ASIN を catalog に即記録
- EPUB の章名/frontmatter 印字と BOM → `npm run check-kindle-epub-leak`。KDP カテゴリ未登録 → `npm run check-kdp-category-coverage`。ロイヤリティ → `npm run kdp-report`

## ココナラ（content/coconala/**）・Brain（content/brain/**）

- ココナラ運用 SSOT（受注 E2E・KPI の read-only 自動取得・休止/再開/アーカイブ・捏造 NG・外部誘導 NG・**返信送信は運営者**） → [coconala-operations.md](../knowledge/reference/coconala-operations.md)。カタログ `src/lib/coconala-services.ts`。ブログ記事 → [coconala-blog-policy.md](../knowledge/reference/coconala-blog-policy.md)
- Brain 運用 SSOT（カタログ `src/lib/brain-products.ts`・listings・配布 ZIP→R2・draft-first＋`--commit`・同意モーダルは `--agree` gate） → [brain-operations.md](../knowledge/reference/brain-operations.md)
- 売れる型は note-selling-structures.md を横断で参照する（誠実証明のガードレール必須）
