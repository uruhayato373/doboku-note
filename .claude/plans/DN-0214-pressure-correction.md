---
taskId: DN-0214
type: implementation-plan
createdAt: 2026-09-13
deleteOnComplete: true
---

# 側圧の誤説明とR1・H30コンクリート過去問の空欄対応を修復する

## 目的と根拠

調査で secondary-concrete-past-problems に「スランプが小さく打上がり速度が遅いほど側圧は大きい」という逆転と、R1/H30の問題文・解答記号の不整合を確認した。Xの2026-09-03投稿（ID 2095356106256105570）にも同じ説明がある。

## SSOT と対象

content/site/civil-construction-1/secondary-concrete-past-problems/article.mdx / content/sns/x/draft/090-civil-2026-09-a/ / .claude/state/x-metrics/own-posts.json

優先順位・残作業は backlog、担当は todo:claim、完了記録は dispatch-log。図の正典はサイトSVG、配信状態は既存SNS台帳。新しい進捗台帳は作らない。

## 確定設計・手順

原問題の年度・問題番号・空欄を照合し、記事の問題文と独自解説を修正する。誤説明の再利用箇所を検索し、公開済み投稿の記録を保存したまま訂正文案と原投稿IDを用意する。

元記事を読み、図が解決する学習上の疑問を1文で定義する。事実・問題条件は一次資料で確認し、375pxで内容を読み取れることを確かめる。図の増加数そのものを成果にしない。

## 検証・受入条件

当該2問の原問題との対応確認、誤説明の再利用防止、MDX検査・refresh-indexes。外部投稿と本番反映は公開・実測カードで扱う。

`npm run check-backlog-schema`、`npm run check-task-plan-links`、`npm run check-dispatch-log` を通す。具体的な実走結果を完了記録へ残す。

## 停止条件・禁止事項

原問題の判読不能や出典の食い違いは推測で補完しない。rank-watchのobserving対象は7日間の再改善をしない（重大な誤記修正は実験と分けて記録）。noindex・大きなページ構造・商品価格は変更しない。外部送信・公開は具体的な対象が承認された既存フローで扱い、素材生成を公開済みと数えない。公開済み投稿や計測の履歴は書き換えない。

## 抽出先・削除条件

恒久的な制作ルールは既存図版/SNSポリシー、効果判定はbusiness reviewへ記録する。受入条件を満たしたらplan参照を除去し、todo:completeでカードとclaimを閉じ、この計画を削除する。

## 起動プロンプト

DN-0214 を backlog とこの計画から実査し、`npm run todo:claim -- DN-0214 --owner codex` → 実装 → 指定検証 → `npm run todo:complete -- DN-0214 --confirm-conditions --commit --owner codex --verify "実際に通した検証"` の順で進める。
