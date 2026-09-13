---
taskId: DN-0216
type: implementation-plan
createdAt: 2026-09-13
deleteOnComplete: true
---

# 1級土木の経験記述と土量変化を図解する

## 目的と根拠

経験記述ガイドの答案欄対応は文章中心、発注者の関係図は390pxで文字が小さい。土工計画記事は本文約1.5万字に本文画像がない。

## SSOT と対象

content/site/civil-construction-1/secondary-experience-writing-guide/ / content/site/civil-construction-1/textbook-earthwork-planning/ / content/sns/video-packs/civil-construction-1/

優先順位・残作業は backlog、担当は todo:claim、完了記録は dispatch-log。図の正典はサイトSVG、配信状態は既存SNS台帳。新しい進捗台帳は作らない。

## 確定設計・手順

経験記述の(1)現場状況・課題・検討項目→(2)対応処置・評価を図示する。発注者と受注者の一般的な役割を独自図へ置換し、同図を使う未公開動画の参照を更新する。土量は地山・ほぐし・締固めの状態遷移とL/Cの方向を1図にする。

元記事を読み、図が解決する学習上の疑問を1文で定義する。事実・問題条件は一次資料で確認し、375pxで内容を読み取れることを確かめる。図の増加数そのものを成果にしない。

## 検証・受入条件

3図のArticleImage結線、1級/2級の答案欄混同0、図の意味・375px視認性・SVG/MDX/出典検査・refresh-indexes。顧客の工事事実を創作しない。

`npm run check-backlog-schema`、`npm run check-task-plan-links`、`npm run check-dispatch-log` を通す。具体的な実走結果を完了記録へ残す。

## 停止条件・禁止事項

原問題の判読不能や出典の食い違いは推測で補完しない。rank-watchのobserving対象は7日間の再改善をしない（重大な誤記修正は実験と分けて記録）。noindex・大きなページ構造・商品価格は変更しない。外部送信・公開は具体的な対象が承認された既存フローで扱い、素材生成を公開済みと数えない。公開済み投稿や計測の履歴は書き換えない。

## 抽出先・削除条件

恒久的な制作ルールは既存図版/SNSポリシー、効果判定はbusiness reviewへ記録する。受入条件を満たしたらplan参照を除去し、todo:completeでカードとclaimを閉じ、この計画を削除する。

## 起動プロンプト

DN-0216 を backlog とこの計画から実査し、`npm run todo:claim -- DN-0216 --owner codex` → 実装 → 指定検証 → `npm run todo:complete -- DN-0216 --confirm-conditions --commit --owner codex --verify "実際に通した検証"` の順で進める。
