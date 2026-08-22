---
taskId: DN-0103
phase: 02
title: 文書の多軸分類とMarkdown表示改善
status: blocked-by-phase-01
---

# Phase 02: 文書の多軸分類とMarkdown表示改善

## 目的

`docs/`の物理ディレクトリを唯一の分類にせず、文書の目的・対象チャネル・保持区分で探せるようにする。MarkdownをSSOTのまま、管理画面でCallout・表・関連タスク・関連チャネルを読みやすく表示する。

## 現状契約

- `document-store.ts` はgray-matterでfrontmatterを読み、最初のディレクトリをcategoryにする。
- `markdown.ts` はremark + GFM + sanitize済みHTMLを生成し、同じASTからH2/H3目次を作る。
- docs detailは`projectAnalysis`でDN ID、未チェック記法、廃止参照を解析する。
- 82文書すべてを一括変換すると差分が大きいため、既定推論を先に導入し、overrideが必要な文書だけfrontmatterを追加する。

## 分類モデル

### 文書目的 `documentType`

許可値をコードで固定する。

- `strategy`: 事業・市場・チャネル全体の判断
- `product-spec`: 商品・プロダクトの仕様、根拠、検証
- `policy`: 編集・デザイン・品質の恒久規則
- `runbook`: 運用手順、SOP、自動化仕様
- `research`: 競合・実測・バックテスト等の調査記録
- `review`: 評価・監査結果
- `handoff`: 一時的な引継ぎ記録
- `index`: README・索引

### 対象チャネル `channel`

単一または配列を許可する。

- `cross`
- `site`
- `note`
- `x`
- `instagram`
- `youtube`
- `coconala`
- `kindle`
- `brain`

### 保持区分 `retention`

- `durable`: 恒久判断・仕様
- `temporary`: review / handoff等、抽出後削除する文書

日々変わる`status`、担当、進捗はdocsへ追加しない。それらはbacklog / plans / stateの責務を維持する。

## 既定推論

frontmatterが無い文書は次で推論する。

| docsの先頭dir | documentType | retention | channel |
|---|---|---|---|
| `strategy` | strategy | durable | cross |
| `products` | product-spec | durable | cross |
| `editorial` | policy | durable | cross |
| `design` | policy | durable | cross |
| `operations` | runbook | durable | cross |
| `marketing` | strategy | durable | cross |
| `reviews` | review | temporary | cross |
| `handoffs` | handoff | temporary | cross |
| root README | index | durable | cross |

frontmatterはこの推論をoverrideする。ディレクトリ別の巨大metadata mapを別ファイルへ作らない。

## Brain文書のoverride

Phase 03で残す`docs/products/brain-*`の各文書には、内容を実読して最小frontmatterを追加する。

```yaml
---
title: ...
documentType: product-spec | research
channel: brain
retention: durable
---
```

販売本文、無料note下書き、ココナラ原稿、手動playbookはPhase 03の棚卸し対象であり、分類だけ付けて放置しない。

## UI変更

### `/docs` 一覧

- PageHeadの表示名を`方針・設計`にする。
- 件数は`表示件数 / 全件数`を維持する。
- filterは次の3つを独立させる。
  - 目的
  - チャネル
  - 保持区分
- 検索queryと3filterをURL queryへ保存する。
- cardはタイトル、要約、目的、チャネル、更新日を2〜3行で表示する。
- ファイルパスは補助情報へ下げ、長いパスを主列にしない。
- temporary文書は警告色ではなく、明確な`一時記録`badgeで区別する。

### 詳細

- H1は従来どおりページ側1つだけ。
- 上部に目的・チャネル・保持区分を小さく表示する。
- DN関連タスク、目次、警告を右railで維持する。
- `channel != cross`なら対応するコンテンツチャネルへのread-onlyリンクを出す。
- VS Codeリンクを維持する。

## Markdown表示改善

### Callout

Obsidian形式の既存Calloutを次のallowlistで表示する。

- note
- tip
- important
- warning / warn
- caution
- todo

要件:

- markerと任意titleをASTで認識する。
- class/typeはallowlistからのみ生成し、入力文字列を属性へ直挿ししない。
- 本文内のMarkdownリンク、強調、リストを維持する。
- unknown typeは通常blockquoteへフォールバックする。
- sanitizeを無効化しない。
- raw `<script>`、event handler、javascript URLが出力されないことをテストする。

### 表

- GFM tableを横スクロール可能なwrapperへ入れる。
- headerを視覚的に区別し、セル内改行を増やしすぎない。
- mobileでページ全体の横スクロールを発生させない。
- HTML文字列を正規表現だけで無制限に書き換えない。ASTまたは安全な固定tag変換を使う。

### Checkbox

- docsのcheckboxは実行状態のSSOTではないため、adminから変更できない。
- disabled checkboxとして視覚化し、クリック操作を付けない。
- `projectAnalysis`の未チェック件数と表示件数がずれないことをテストする。

## 実装箇所

- `tools/admin-app/src/lib/document-store.ts`
- `tools/admin-app/src/lib/markdown.ts`
- `tools/admin-app/src/lib/project.ts`
- `tools/admin-app/src/components/DocRootView.tsx`
- `tools/admin-app/src/components/DocDetailView.tsx`
- `tools/admin-app/src/app/docs/page.tsx`
- `tools/admin-app/src/app/docs/[...path]/page.tsx`
- admin CSS / UI primitives
- `tests/admin-document-store.test.mjs`
- admin E2E
- `tools/admin-app/README.md`

## テストケース

- frontmatter無しstrategy文書が`strategy/durable/cross`
- frontmatter overrideで`research/brain/durable`
- 不正なdocumentType/channel/retentionは`unknown`にせず、開発時に検出可能な警告またはtest failure
- queryで3filterが復元される
- Callout type別HTML
- unknown Callout fallback
- raw script除去
- H2/H3 TOC id一致
- 同名見出しの連番
- table wrapper
- checkbox disabled
- DN関連タスクと未チェック件数の既存契約維持

## 検証

```bash
node --test tests/admin-document-store.test.mjs tests/backlog-parity.test.mjs
npx tsc --noEmit -p tools/admin-app/tsconfig.json
npm run test:e2e:admin
npm run check-doc-refs
npm run check-information-architecture
npm run lint-ui
git diff --check
```

目視対象は最低5文書:

1. 大きい表を持つstrategy文書
2. Calloutを複数持つoperations文書
3. DN参照を持つproduct文書
4. review文書
5. handoff文書

light/dark、desktop/mobileでスクリーンショットを残す。

## 停止条件

- sanitizeを弱めないとCalloutが実装できない
- 82文書すべてへの必須frontmatter追加が必要になる
- Markdownと生成HTMLを両方保存する設計になる
- docsへ進捗状態を追加する必要が出る
- DN解析・目次・リンクの既存契約を維持できない

## Phase 02専用Claude Codeプロンプト

```text
DN-0103 Phase 02だけを実装してください。Phase 01が検証済みであることを最初に確認してください。

00-master.mdと02-document-taxonomy-and-rendering.md、information-architecture.md、
document-store.ts、markdown.ts、project.ts、既存admin document testsを全文読んでください。

MarkdownをSSOTのまま維持し、documentType/channel/retentionの3軸分類を追加してください。
82文書へ一括frontmatterを追加せず、ディレクトリ既定値＋必要文書だけのoverrideにしてください。
Callout、table、checkboxを安全に表示し、sanitizeを無効化しないでください。

既存のH2/H3目次、DN関連タスク、未チェック件数、VS Codeリンクを壊さないでください。
自動テスト、admin型検査、E2E、5文書×light/dark/mobileの目視結果を報告して停止してください。
Phase 03のファイル移動、commit、push、deployへ進まないでください。
```

