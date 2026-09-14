---
name: project_ig_api_posting_setup
description: IG API予約投稿の実装状況と最大の制約（会社PCプロキシがMeta API遮断、Mac/Actionsで実施）
metadata: 
  node_type: memory
  type: project
  originSessionId: 42f51b76-f564-4742-a4b6-2f1a47e7f209
---

Instagram API 予約投稿パイプラインの整備状況（2026-06-05 時点）。

**最大の制約 = 会社PCのプロキシ（Digital Arts i-FILTER / Palo Alto auris vsys5）が `graph.facebook.com` を遮断**。ローカル(この Windows PC)から Meta API を一切叩けない。これが過去の失敗の真因。
- → トークン取得・テスト投稿は **プロキシ外の Mac** で行う
- → 素材アップロード・定期投稿は **GitHub Actions（クラウド）** で行う（遮断されない）
- api.github.com（gh CLI）と storage.doboku-note.com（R2公開）はローカルから到達可

**確定方針**
- 認証ルート = **Facebook ログイン版**（graph.facebook.com + Page/User トークン + instagram_business_account.id）。Instagram ログイン版は token generator が「開発者の役割が不十分です」で頓挫し断念
- stats47 既存アプリを流用（新規アプリ作成はビジネスポートフォリオ制限「prohibited from advertising, including claiming apps」で不可）。ユーザーは stats47 アプリの管理者、アプリは制限ビジネス未紐付け
- app secret がプロキシのブロック画面URLに露出 → 要リセット

**実装済み（commit e5baaa8db, develop）**
- 手順書 `.claude/scripts/instagram/SETUP-mac.md`（Phase1最小疎通/Phase2パック対応/Phase3自動化）
- `post-from-schedule.cjs`: graph.facebook.com 既定化（IG_GRAPH_BASEで切替）、.env.local 読込、META_* キー互換
- `get-meta-token.mjs`(既存,FB route) / `ig-login-token.mjs`(新,IG route代替)
- GitHub Secrets: CLOUDFLARE_* は登録済、INSTAGRAM_ACCESS_TOKEN_DOBOKU_NOTE / INSTAGRAM_BUSINESS_ACCOUNT_ID_DOBOKU_NOTE は未登録

**未解決 = Phase 2 パック対応**: 実コンテンツ `docs/sns/instagram/_exam-packs/{試験}/{年度}/pack-NN/` はカルーセル10枚可変・3階層パス・caption が carousel/caption.txt。現スクリプトの想定（5枚固定・フラット・直下caption）と不整合。Phase1疎通後に改修予定。
