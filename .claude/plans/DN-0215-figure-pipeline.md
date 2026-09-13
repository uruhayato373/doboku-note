---
taskId: DN-0215
type: implementation-plan
createdAt: 2026-09-13
deleteOnComplete: true
---

# 資格別の図解SNS書き出し・制作手順を統一する

## 目的と根拠

render-figure-sns はカテゴリ指定を受けるがYouTube用画像に「技術士 総合技術監理」を固定表示する。ig-figure-packにも総監固定の文言と廃止パスが残る。

## SSOT と対象

.claude/scripts/sns/render-figure-sns.mjs / .claude/skills/social/ig-figure-pack/SKILL.md / .claude/knowledge/reference/figure-canvas-policy.md

優先順位・残作業は backlog、担当は todo:claim、完了記録は dispatch-log。図の正典はサイトSVG、配信状態は既存SNS台帳。新しい進捗台帳は作らない。

## 確定設計・手順

既存レンダラーに資格名の自動解決・未知資格の拒否・再現可能な出力先を実装し、既存図を使う制作手順を3重点資格に対応させる。既存のキャラクター意匠改修はDN-0184の守備範囲を維持する。

元記事を読み、図が解決する学習上の疑問を1文で定義する。事実・問題条件は一次資料で確認し、375pxで内容を読み取れることを確かめる。図の増加数そのものを成果にしない。

## 検証・受入条件

3重点資格の代表図について誤った資格名が出ず、未指定互換と未知カテゴリ拒否をテストする。スキル・参照規約・生成互換・doc-syncを通す。

`npm run check-backlog-schema`、`npm run check-task-plan-links`、`npm run check-dispatch-log` を通す。具体的な実走結果を完了記録へ残す。

## 停止条件・禁止事項

原問題の判読不能や出典の食い違いは推測で補完しない。rank-watchのobserving対象は7日間の再改善をしない（重大な誤記修正は実験と分けて記録）。noindex・大きなページ構造・商品価格は変更しない。外部送信・公開は具体的な対象が承認された既存フローで扱い、素材生成を公開済みと数えない。公開済み投稿や計測の履歴は書き換えない。

## 抽出先・削除条件

恒久的な制作ルールは既存図版/SNSポリシー、効果判定はbusiness reviewへ記録する。受入条件を満たしたらplan参照を除去し、todo:completeでカードとclaimを閉じ、この計画を削除する。

## 起動プロンプト

DN-0215 を backlog とこの計画から実査し、`npm run todo:claim -- DN-0215 --owner codex` → 実装 → 指定検証 → `npm run todo:complete -- DN-0215 --confirm-conditions --commit --owner codex --verify "実際に通した検証"` の順で進める。
