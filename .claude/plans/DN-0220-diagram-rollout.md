---
taskId: DN-0220
type: implementation-plan
createdAt: 2026-09-13
deleteOnComplete: true
---

# 図解整備を公開・配信し資格別KPIの初回実測を閉じる

## 目的と根拠

図解の制作・公開・効果は別々に確認する。EXP-007/008で実験枠2が埋まっており、現時点で新しいSEO改善実験を開始したとは扱わない。

## SSOT と対象

.claude/config/business-direction.json / .claude/state/metrics/business/ / .claude/state/experiments.json / docs/strategy/01_プロダクト戦略.md / /metrics/business

優先順位・残作業は backlog、担当は todo:claim、完了記録は dispatch-log。図の正典はサイトSVG、配信状態は既存SNS台帳。新しい進捗台帳は作らない。

## 確定設計・手順

制作カードの成果をdevelopへ統合後、公開対象と差分を整理して既存deploy手順で本番反映する。側圧の訂正文案は原投稿IDを示して外部送信の承認を得た後に投稿・実体確認する。SNSは既存公開/予約SSOTに接続し、公開日を起点に7日観察・28日補助確認を行う。

元記事を読み、図が解決する学習上の疑問を1文で定義する。事実・問題条件は一次資料で確認し、375pxで内容を読み取れることを確かめる。図の増加数そのものを成果にしない。

## 公開対象と再生成コマンド

- サイト：DN-0214〜0218・DN-0221で扱う記事と、骨材含水・水準測量・ネットワーク工程の修正図。公開前に `git diff origin/main...develop -- content/site` で今回以外の未公開変更も確認する。
- X訂正：`content/sns/x/draft/096-civil1-pressure-correction/tweets.md`。訂正元は `https://x.com/doboku373/status/2095356106256105570`。送信後のIDと実表示を記録する。
- X図解3投稿：`content/sns/x/draft/097-civil1-diagram-reuse/`。画像は同ディレクトリの `render.mjs` で再生成。既存の9月投稿予約に追加せず、既存枠との重複・頻度を確認する。
- IG：`content/sns/instagram/civil-1/keyword-packs/{aggregate-moisture,leveling-principle,network-floats}` の3パック。各パックは `node scripts/render-figure-pack.mjs --pack civil-1/keyword-packs/{slug}` でPNGを再生成し、既存 `/ig-reconcile` → `/publish-ig-bs` へ渡す。
- Reels：上記3パックの `reels/script.txt` と `caption.txt`。VOICEVOXのない現端末では音声・mp4は未生成。VOICEVOXが使える環境で `node scripts/figure-reel-create.mjs --pack civil-1/keyword-packs/{slug}` を実行し、音声・字幕・尺を確認してから配信候補にする。
- 既存動画：`koji-gaiyo-7items` は公開済み（hJYV_U0qKvA）、測量・ネットワーク通常動画もアップロード/予約済み（qIL2YIrhb2w / gNqsZBc_-sM）。元の制作物・IDを保持し、無断で新規動画へ置き換えない。新しい図は上の独立した未公開Reels入力で再利用する。

DN-0221の公開差分には、コンクリート過去問10年度16問の設問・解答対応と土量計算表、機械選定の作業対応・速度区分・適応距離・規格単位の訂正を含む。旧記事への訂正注記とリンク先を本番で確認する。

公開前は順位改善のobservingに移さない。公開日が確定してから7日後・28日後をレビュー日に設定し、既存business reviewへ実測を残す。日付が未定の間は、このカードを次回週次レビューで確認する。

## 検証・受入条件

公開URL・投稿ID・公開日・測定窓・取得元を記録し、資格別の実測と次の判断をbusiness reviewへ残す。GSC平均順位とGA4行動、SNSで取得可能な反応、note/ココナラアクセス/販売の範囲を分ける。欠測を0と扱わず、順位・販売への因果は断定しない。

`npm run check-backlog-schema`、`npm run check-task-plan-links`、`npm run check-dispatch-log` を通す。具体的な実走結果を完了記録へ残す。

## 停止条件・禁止事項

原問題の判読不能や出典の食い違いは推測で補完しない。rank-watchのobserving対象は7日間の再改善をしない（重大な誤記修正は実験と分けて記録）。noindex・大きなページ構造・商品価格は変更しない。外部送信・公開は具体的な対象が承認された既存フローで扱い、素材生成を公開済みと数えない。公開済み投稿や計測の履歴は書き換えない。

## 抽出先・削除条件

恒久的な制作ルールは既存図版/SNSポリシー、効果判定はbusiness reviewへ記録する。受入条件を満たしたらplan参照を除去し、todo:completeでカードとclaimを閉じ、この計画を削除する。

## 起動プロンプト

DN-0220 を backlog とこの計画から実査し、`npm run todo:claim -- DN-0220 --owner codex` → 実装 → 指定検証 → `npm run todo:complete -- DN-0220 --confirm-conditions --commit --owner codex --verify "実際に通した検証"` の順で進める。
