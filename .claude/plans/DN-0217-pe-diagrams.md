---
taskId: DN-0217
type: implementation-plan
createdAt: 2026-09-13
deleteOnComplete: true
---

# 技術士建設部門の設問分解・答案活用・劣化対策を図解する

## 目的と根拠

建設部門の公開135記事のうち本文画像ありは5記事、SVGは0。setsumon-bunkai・hissu-kamoku-kaitourei・steel-concrete-exam-themesは本文画像がない。

## SSOT と対象

content/site/pe-construction/setsumon-bunkai/ / content/site/pe-construction/hissu-kamoku-kaitourei/ / content/site/pe-construction/steel-concrete-exam-themes/

優先順位・残作業は backlog、担当は todo:claim、完了記録は dispatch-log。図の正典はサイトSVG、配信状態は既存SNS台帳。新しい進捗台帳は作らない。

## 確定設計・手順

設問の条件→求める答案、模範解答→骨子→自分の答案、劣化事象→原因→調査→対策という異なる3つの関係を図示する。設問分解ではR7必須Iの設問(4)も落とさない。年度別分析のR8追加はDN-0206に委ねる。

元記事を読み、図が解決する学習上の疑問を1文で定義する。事実・問題条件は一次資料で確認し、375pxで内容を読み取れることを確かめる。図の増加数そのものを成果にしない。

## 検証・受入条件

3図が別々の学習課題を解決し、専門事実の一次資料照合・SVG/MDX/出典検査・375px視認性・refresh-indexesを満たす。予想を実際の試験と混同しない。

`npm run check-backlog-schema`、`npm run check-task-plan-links`、`npm run check-dispatch-log` を通す。具体的な実走結果を完了記録へ残す。

## 停止条件・禁止事項

原問題の判読不能や出典の食い違いは推測で補完しない。rank-watchのobserving対象は7日間の再改善をしない（重大な誤記修正は実験と分けて記録）。noindex・大きなページ構造・商品価格は変更しない。外部送信・公開は具体的な対象が承認された既存フローで扱い、素材生成を公開済みと数えない。公開済み投稿や計測の履歴は書き換えない。

## 抽出先・削除条件

恒久的な制作ルールは既存図版/SNSポリシー、効果判定はbusiness reviewへ記録する。受入条件を満たしたらplan参照を除去し、todo:completeでカードとclaimを閉じ、この計画を削除する。

## 起動プロンプト

DN-0217 を backlog とこの計画から実査し、`npm run todo:claim -- DN-0217 --owner codex` → 実装 → 指定検証 → `npm run todo:complete -- DN-0217 --confirm-conditions --commit --owner codex --verify "実際に通した検証"` の順で進める。
