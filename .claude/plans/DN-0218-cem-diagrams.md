---
taskId: DN-0218
type: implementation-plan
createdAt: 2026-09-13
deleteOnComplete: true
---

# 総監のALARP・根本原因分析・5管理の学習関係を図解する

## 目的と根拠

ALARP・root-cause-analysis・総監キーワード2026は本文画像がない。図は増やす枚数より意思決定や因果の読み取りを優先する。

## SSOT と対象

content/site/pe-comprehensive-management/alarp-principle/ / content/site/pe-comprehensive-management/root-cause-analysis/ / content/site/pe-comprehensive-management/keyword-2026/

優先順位・残作業は backlog、担当は todo:claim、完了記録は dispatch-log。図の正典はサイトSVG、配信状態は既存SNS台帳。新しい進捗台帳は作らない。

## 確定設計・手順

ALARPの3領域と合理的に実行可能な低減、RCAの事実→直接原因→仕組み→対策、5管理を相互に行き来する学習関係を3図で整理する。既存ネットワーク図の重複制作はしない。

元記事を読み、図が解決する学習上の疑問を1文で定義する。事実・問題条件は一次資料で確認し、375pxで内容を読み取れることを確かめる。図の増加数そのものを成果にしない。

## 検証・受入条件

ALARPを単純な費用便益一致や無条件の追加対策不要と説明しない。RCAは事実と仮説を分け、5管理の正式名を保持。一次根拠・SVG/MDX・375px確認・refresh-indexesを通す。

`npm run check-backlog-schema`、`npm run check-task-plan-links`、`npm run check-dispatch-log` を通す。具体的な実走結果を完了記録へ残す。

## 停止条件・禁止事項

原問題の判読不能や出典の食い違いは推測で補完しない。rank-watchのobserving対象は7日間の再改善をしない（重大な誤記修正は実験と分けて記録）。noindex・大きなページ構造・商品価格は変更しない。外部送信・公開は具体的な対象が承認された既存フローで扱い、素材生成を公開済みと数えない。公開済み投稿や計測の履歴は書き換えない。

## 抽出先・削除条件

恒久的な制作ルールは既存図版/SNSポリシー、効果判定はbusiness reviewへ記録する。受入条件を満たしたらplan参照を除去し、todo:completeでカードとclaimを閉じ、この計画を削除する。

## 起動プロンプト

DN-0218 を backlog とこの計画から実査し、`npm run todo:claim -- DN-0218 --owner codex` → 実装 → 指定検証 → `npm run todo:complete -- DN-0218 --confirm-conditions --commit --owner codex --verify "実際に通した検証"` の順で進める。
