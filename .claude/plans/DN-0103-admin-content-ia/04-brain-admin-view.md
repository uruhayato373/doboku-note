---
taskId: DN-0103
phase: 04
title: Brain専用read-only管理画面
status: blocked-by-phase-03
---

# Phase 04: Brain専用read-only管理画面

## 目的

Brain商品の状態・販売本文・画像・配布物・関連設計を1画面で確認できるようにする。公開操作は既存skill/CLIの責務に残す。

## route

- 一覧: `/content/brain`
- 商品詳細が必要なら `/content/brain/[id]`
- Phase 01のchannel registryでBrainをenabledにし、コンテンツグループへ表示する。

商品が2件だけの現状では、一覧内の詳細展開で十分なら動的詳細routeを作らない。routeを増やすこと自体を目的にしない。

## 入力SSOT

| 表示 | 入力 |
|---|---|
| id/title/shortTitle/description | `src/lib/brain-products.ts` |
| price/status/articleId/productUrl/distFile | `src/lib/brain-products.ts` |
| bodyText/imagePath/paidMarker | `content/brain/listings.json` |
| 画像実在・寸法・bytes | `content/brain/assets/**` |
| ZIP実在・bytes・sha256 | `content/brain/dist/**` |
| 配線結果 | `check-brain-wiring`と同じpure検査ロジック |
| 関連設計 | docs metadataの`channel: brain` |
| 運用規約 | `.claude/knowledge/reference/brain-operations.md` |

アカウント設定、token、cookie、秘密値は入力にしない。

## 実装構造

### pure inventory

Brain配線判定をadminへ重複実装しない。可能なら`check-brain-wiring.mjs`の判定部分を副作用のないmoduleへ抽出する。

例:

```text
scripts/lib/brain-inventory.mjs
  loadBrainInventory()
  validateBrainInventory()

scripts/check-brain-wiring.mjs
  pure moduleを呼び、CLI用exit/outputだけ担当

tools/admin-app/src/lib/brain.ts
  pure moduleの結果を表示モデルへ変換
```

Next Server Componentから安全にimportできない場合は、共通JSON schemaと小さなparserを共有する。CLIをページ表示のたびにchild_process実行する方式は避ける。

### 画面

上段:

- 商品総数
- listed / submitted / draft / rejected / paused件数
- 配線OK / warning / error件数
- 最終更新時刻ではなく、実ファイルmtimeの範囲

商品table:

| 列 | 内容 |
|---|---|
| 商品 | shortTitle + id |
| 状態 | status badge |
| 価格 | catalog値 |
| Brain | productUrlの有無。listedのみ外部リンク表示 |
| 販売文 | body文字数、paidMarker、有料後URL |
| 画像 | thumbnail preview、実在、bytes |
| 配布物 | basename、bytes、sha256先頭8桁、URL一致 |
| 関連設計 | 件数とdocsリンク |
| 配線 | OK / 要確認 / 不整合 |

詳細展開:

- description
- 販売本文の冒頭だけをplain textで表示
- paidMarker前後の位置関係
- 画像一覧
- 配布ファイル情報
- 関連設計文書
- 運用規約へのリンク

販売本文全量を一覧へ展開しない。長文は折りたたみまたは詳細へ送る。

## 状態表示

- 検査を実行していない状態を緑にしない。
- listing無し、image無し、dist無し、URL位置不正は赤または明確な要確認。
- listedなのにproductUrl無しはerror。
- draftでproductUrl無しは正常。
- 外部URLへHEADやlive APIを自動実行しない。画面はローカルSSOT整合を表示する。

## read-only制約

追加してよい操作:

- 商品URLを開く
- VS CodeでSSOTを開く
- 関連docs/knowledgeを開く
- id/path/hashをコピーする

追加しない操作:

- 公開申請
- 本文更新
- status flip
- price変更
- R2 upload
- ZIP削除
- 任意CLI実行

skillを使うべき操作は、操作ボタンではなく「`/brain-publish`を使う」という案内に留める。

## チャネル横断入口

`/content`のBrain cardは次を表示する。

- 商品2件
- listed件数
- assets / distの件数と容量
- 不整合件数

物理パスは補助表示にする。クリックで`/content/brain`へ進む。

## テスト

fixtureは秘密情報を含まない最小データを使う。

- 2商品を読み取れる
- catalog/listings id一致
- status集計
- listed URL必須
- image/dist実在
- paidMarkerより後にdist URL
- missing listing/image/distをPASSにしない
- sha256表示
- docs `channel: brain`だけを関連設計として返す
- Brain画面に`brain-account`やsecret値が出ない
- write API / form / action buttonがない
- channel registryのBrain entryがPhase 04でenabled

## 検証

```bash
npm run check-brain-wiring
node --test tests/admin-document-store.test.mjs tests/information-architecture.test.mjs tests/repository-paths.test.mjs
npx tsc --noEmit -p tools/admin-app/tsconfig.json
npm run test:e2e:admin
npm run check-information-architecture
npm run check-doc-refs
npm run lint-ui
git diff --check
```

目視:

- `/content`
- `/content/brain`
- Brain商品2件の展開状態
- light/dark
- 1280px / 768px / mobile相当
- thumbnailの縦横比、table横スクロール、長い日本語titleの改行

## 停止条件

- ページ表示に外部ログインやAPIが必要になる
- CLIロジックを丸ごと重複しないと実装できない
- 秘密設定を読む必要が出る
- write actionを追加しないと要件を満たせない
- Phase 03の旧新パスが両方残っている

## Phase 04専用Claude Codeプロンプト

```text
DN-0103 Phase 04だけを実装してください。Phase 03のcontent/brain移行と全ゲートが完了していることを確認してください。

00-master.md、04-brain-admin-view.md、brain-products.ts、content/brain/listings.json、
check-brain-wiring、brain-operations、admin channel registryを全文読んでください。

/content/brainにread-only画面を作り、商品状態・価格・販売文・paid marker・画像・ZIP・sha256・
関連設計・配線結果を横断表示してください。判定ロジックはcheck-brain-wiringと共有し、
未検査や欠落を緑にしないでください。

公開、本文更新、status/price変更、R2 upload、任意CLI実行ボタンは追加しないでください。
brain-accountやsecretを読み込まず、画面・ログ・fixtureへ出さないでください。

全テスト、型検査、E2E、light/dark/mobile目視を実施し、変更一覧とスクリーンショットを報告して停止してください。
push、deploy、外部変更、Phase 99へ自動で進まないでください。
```

