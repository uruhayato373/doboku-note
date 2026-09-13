---
taskId: DN-0219
type: implementation-plan
createdAt: 2026-09-13
deleteOnComplete: true
---

# 既存図3テーマをSNS・動画で再利用できる制作物にする

## 目的と根拠

骨材含水・水準測量・ネットワーク工程には利用可能な既存SVGがある。一方9月土木X計画90投稿はimage:null、動画155パックの明示figureシーンは3。既存77図追加候補は全対象ページに画像があるため一括新作しない。

## SSOT と対象

content/site/civil-construction-1/guide-concrete-key-points/ / content/site/civil-construction-1/textbook-leveling/ / content/site/pe-comprehensive-management/network-planning/ / content/sns/

優先順位・残作業は backlog、担当は todo:claim、完了記録は dispatch-log。図の正典はサイトSVG、配信状態は既存SNS台帳。新しい進捗台帳は作らない。

## 確定設計・手順

既存図を意味確認し、骨材含水4状態、水準の後視/前視、ネットワークの余裕時間を各1テーマの図解投稿下書きにする。各テーマの元記事・元図・次の学習先を保持し、適合する未公開動画のfigureシーンを整備する。資格固定修正後に制作する。

元記事を読み、図が解決する学習上の疑問を1文で定義する。事実・問題条件は一次資料で確認し、375pxで内容を読み取れることを確かめる。図の増加数そのものを成果にしない。

## 検証・受入条件

3テーマの再生成可能な入力と画像の目視確認、出典/リンク/資格の一致、投稿・動画の既存ゲートを通す。公開済み動画の再投稿や投稿履歴の書換えをしない。

`npm run check-backlog-schema`、`npm run check-task-plan-links`、`npm run check-dispatch-log` を通す。具体的な実走結果を完了記録へ残す。

## 停止条件・禁止事項

原問題の判読不能や出典の食い違いは推測で補完しない。rank-watchのobserving対象は7日間の再改善をしない（重大な誤記修正は実験と分けて記録）。noindex・大きなページ構造・商品価格は変更しない。外部送信・公開は具体的な対象が承認された既存フローで扱い、素材生成を公開済みと数えない。公開済み投稿や計測の履歴は書き換えない。

## 抽出先・削除条件

恒久的な制作ルールは既存図版/SNSポリシー、効果判定はbusiness reviewへ記録する。受入条件を満たしたらplan参照を除去し、todo:completeでカードとclaimを閉じ、この計画を削除する。

## 起動プロンプト

DN-0219 を backlog とこの計画から実査し、`npm run todo:claim -- DN-0219 --owner codex` → 実装 → 指定検証 → `npm run todo:complete -- DN-0219 --confirm-conditions --commit --owner codex --verify "実際に通した検証"` の順で進める。
