# docs — 人が読む恒久的な判断と仕様

`docs/` に置くのは**時間が経っても読み返す判断**（戦略・設計・方針・記録）で、
顧客へ届ける制作物は `content/`、エージェントが繰り返し読む規約・手順は `.claude/knowledge/` にある。
置き場に迷ったときの判断フローは
[.claude/knowledge/reference/information-architecture.md](../.claude/knowledge/reference/information-architecture.md)。

管理画面からは `/docs` で全領域を横断検索できる（read-only・`npm run admin`）。

## 領域

| 領域 | 内容 | 代表 SSOT |
|---|---|---|
| [strategy/](./strategy/) | 事業・プロダクト・収益・競合の戦略 | `01_プロダクト戦略.md`（北極星）／`03_事業戦略.md`／`07_競合調査.md` |
| [editorial/](./editorial/) | コンテンツ制作方針・執筆計画 | `01_記述式コンテンツ戦略.md` |
| [marketing/](./marketing/) | SNS・チャネル動線・集客 | `01_SNS集客戦略.md`／`02_チャネル動線設計.md`／`06_動画コンテンツ運用設計.md` |
| [operations/](./operations/) | 運営の手順・自動化・計測基盤 | `04_自動化マップ.md`／`gsc-ga4-playwright-automation-spec.md` |
| [products/](./products/) | 商品・アプリ・キットの仕様 | `06_PWA過去問アプリ設計方針.md` |
| [design/](./design/) | UI コンポーネントの視覚ギャラリー | `callout-gallery.md`／`speclist-gallery.md` |
| [reviews/](./reviews/) | 単発の監査・批判的レビューの記録 | 日付つきレビュー |
| [handoffs/](./handoffs/) | セッション引き継ぎ（**溜めない**） | 抽出→削除が既定 |

デザインの**規約**（トークン・レイアウト体系・禁止パターン）は
[.claude/knowledge/design-system/design-system.md](../.claude/knowledge/design-system/design-system.md) が真実源で、
`design/` はその視覚サンプル置き場。

## 境界

- **`content/` との境界** — 「何を作るか決めた記録」は docs、「作った物とその入力」は content。
  note の記事本文・SNS 投稿素材・Kindle 原稿・原典 PDF は content 側。
  資格別の note 販売計画（`noteコンテンツ計画.md`）は制作物と同じ場所に置く運用のため content 側にある。
- **`.claude/knowledge/` との境界** — エージェントが作業のたびに参照する規約・手順は knowledge。
  docs は人が意思決定のために読む。同じ内容を両方に置かない。
- **`.claude/todo/` との境界** — 実行タスクの台帳は `.claude/todo/backlog.md` ただ 1 つ。
  docs は判断と根拠を持ち、タスクは `DN-####` で参照するだけで本文を複製しない。

## アーカイブ層は持たない

役目を終えた文書は削除する（記録は git 履歴に残る）。
「履歴だから」と別ディレクトリへ退避すると、そこだけ検査の対象外になって腐る
（旧 `docs/project/_archive/` は 2026-08-18 に 3 件を個別分類して廃止した）。
残す価値のある知見は該当 SSOT へ抽出し、残作業は backlog へ起票してから本体を消す。
