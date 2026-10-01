---
name: project_nsm
description: "NSM=手数料控除後の月の受取額（netReceipts）・目標 月¥100,000（2026-09-27 切替）。実験pending確認・8領域モデル・週次レビュー運用を含む"
metadata:
  type: project
---

2026-09-27 に運営者が NSM を「月間オーガニック検索流入ユーザー（organicUsers）」から **手数料等控除後の月の受取額（`netReceipts`）** へ切り替え、全体目標を **月 ¥100,000** と決めた。ツリーと追加 KPI は `docs/strategy/15_KPIツリー.md`、機械正本は `.claude/config/business-direction.json` の `northStar`。

**Why:** organicUsers は大半が Bing（Google は月100クリック前後）で、売上の大半は note の中の検索・回遊で起きる。流入を頂点にすると売上と連動しない。受取額・費用・作業時間は 2026-09 時点で一度も計測されていなかった。

**How to apply:** 目標は `target` 記録で持つ（完全な実測 snapshot が前提なので、先に受取額の月次計測を残す）。チャネルをまたいで割り算しない。organicUsers は Google と Bing を分けて集客の補助として読む。関連: [[project_revenue_diagnosis_2026_06]]。

## 統合: 実験の pending 確認（旧 nsm_experiment_tracking）
`.claude/state/experiments.json` が唯一の真実源。NSM／実験／GSC／インデックス／「昨日の続き」等の文脈、または open question の「次何する？」では先にこれを Read し、`status==='running'` の `pending_user_actions` を surface、`next_check_date` 到来なら `/weekly-improve` の measure を提案。期限 surfacer は `npm run check-experiment-due -- --json` の1本（判定は `scripts/lib/experiment-due.mjs`・旧 check-experiments-due は削除・DN-0252）。週次レビューはこの JSON を転記するだけで手で期限計算しない。

## 統合: 領域モデル（旧 domain_model・2026-09-26）
事業を8領域（戦略/計画/商品/アフィリエイト/サイト/SNS/教材/管理）で束ねる。正本 `.claude/config/domains.json`、考え方 `docs/strategy/14_領域モデル.md`。
- **Why:** 収益拡大の打ち手が多く、同じ分類で優先順位とスケジュールを持つため。ユーザーはエージェント・スキル・文書まで同じ領域で整理することを求めた。
- **How to apply:** 新スキル/エージェントは frontmatter `domain:` 必須、新しい docs/reference は domains.json `documents` に割当、backlog カードは `[領域:]` 必須（check-domains / check-backlog-schema が止める）。置き場（ディレクトリ）は作業の種類で決め、領域のためには移さない。横断視点（計測・品質・動線）は独立領域にせず対象領域へ割り振る。年間計画 annual.md は四半期×領域で日付・受験者数を書かない。

## 統合: 週次レビュー運用（旧 weekly_review_automation）
- 出力先は GitHub Issue でなく `docs/reviews/weekly/YYYY-Www-review.md`（plan は `YYYY-Www.md`）。**2026-09-19 からクラウドルーティン（`doboku-note weekly PDCA`・cron 土曜）は退役（enabled:false）し、土曜にローカル対話セッションで `/weekly-review`**（review＋翌週計画＋PR base develop）。クラウドは許可プロンプト沈黙・Playwright/tsx 依存で不向き。Phase 9 で obsidian `notes/claude/agent-log.md` への週次ログも追記（Phase 1-8 と疎結合）。
- クラウド側は repo 独立 checkout でローカル creds なし→ライブ GA4/GSC 不可。CI（`fetch-metrics.yml` 金曜 06:00 JST）がコミットした `.claude/state/metrics/{ga4,gsc,psi}/` を読む設計。NSM の WoW は 7日窓の `ga4-channel-organic-*` を優先（CI 既定の `ga4-channel-*`/`gsc-query-*` は28日窓で WoW にならない）。
- X 予約キュー投入 surfacer `npm run x-queue-surfacer`（go-live が8日以内の未投入下書きを DUE/OVERDUE 列挙）。実投入はローカル publish-x で人手。
- 教訓: `/schedule` で routine を作る前に既存を確認（重複を作って無効化した前例）。`on: schedule` の cron はデフォルトブランチ（main）のファイルで動くので develop merge だけでは効かず main deploy 後に有効化。`gh pr merge` はローカル develop を進めないので deploy 前は `git fetch`＋origin/develop を使う。
