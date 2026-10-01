---
name: project-ig-business-suite-publish
description: Instagram カルーセル予約投稿を Playwright + Meta Business Suite で自動化する新スキル publish-ig-bs（2026-06-09 実機検証済み）
metadata: 
  node_type: memory
  type: project
  originSessionId: b1ed7e6f-6867-4691-9d1a-b2a2ea541609
---

`publish-ig-bs`（`.claude/skills/social/publish-ig-bs/`）= Playwright 永続プロファイルで Meta Business Suite を操作し **Instagram カルーセル＋リールを予約投稿**する新スキル（2026-06-09 新設・カルーセル/リールとも実機で予約成功を Planner 確認→削除済み）。`--reel` で reels/video.mp4 を投稿。

**2026-06-17 更新（Graph API 全廃・本スキルに一本化）**: IG 投稿は Business Suite（本スキル）のみ。**即時は `--now` / 予約は `--schedule`**。Graph API 経路は全削除した（PR #259）= `scripts/publish-ig.mjs`（即時）・`.claude/scripts/instagram/{post-from-schedule.cjs,upload-to-r2.mjs,ig-login-token.mjs,README.md,SETUP-mac.md}`・`.claude/scripts/{meta-auth.mjs,get-meta-token.mjs}`・`.claude/scripts/lib/sns-common/media-uploader.mjs`（+ その単体テスト）・cron `post-instagram-scheduled.yml`/`upload-instagram-assets.yml`・state `instagram-schedule.json`。理由: cron は secrets 未設定で連日失敗の不要機能、ユーザー決定「IG は Meta Business で投稿」。残置（素材生成）= `generate-caption.cjs`・`build-stories.mjs`・`build-highlight-materials.mjs`・`publish-reel-jit.mjs`。**旧「役割分担: 即時=publish-ig.mjs / 予約=本スキル」は失効**。設計は [[feedback_publish_x_false_success]] と同系（システム Chrome + 永続プロファイル + dry-run 必須 + 偽成功を出さない fail-safe）。

**Why**: ユーザー要望「Business Suite で IG 自動投稿（予約）」。Graph API のトークン管理不要＋ネイティブ予約が動機。ToS グレーは承知の上。

**How to apply / 実機で判明した罠**:
- ログインは `... login`（システム Chrome 手動 2FA）→ `.local/playwright-ig-bs-profile/` に保存。CI 不可、ローカル GUI 前提。
- 投稿先で FB ページ option（`role=option` / `aria-selected`）を外すと **IG 単独モード**。その際メディアボタンが「写真を追加」→**「写真・動画を追加」**に変わる。
- 時刻欄は **`role="spinbutton"`**: 値は `aria-valuenow`（`.value` は空）。`keyboard.type` で設定。
- 確定後の成功モーダルは Meta が**複数文言を出し分け**（「日時が指定されました」/「時間を節約」）。共通の「後で」ボタンで検知＆クローズ。
- **リール（--reel）**: 入口=ホーム「リール動画を作成」→ reels_composer（作成→編集→シェアする の3ステップ）。動画は filechooser＋処理待ち。ステップ送りは**右下の「次へ」を座標 click**（サムネ送りの ZWSP「次へ」誤爆回避）。予約=「日時を指定」→日付/時刻（spinbutton 共通）→「公開日時を指定」確定。即時=「今すぐシェア」。
- **テスト予約の削除**: Planner で時刻バッジ（一意）→ カードを Locator.hover() → 「アクション」→「投稿を削除」→「削除する」。`アクション`ボタンは hover 時のみ DOM 生成。座標 hover は不安定なので Locator.hover 必須。
- アカウント名: FB `Doboku-note` / IG `dobokunotecom`（env `IG_BS_FB_PAGE`/`IG_BS_IG_ACCOUNT` で上書き可）。

**動画ストレージは JIT（2026-06-09 確立）**: IG リール mp4・reels/img(PNG)・slide-NN.mp4 は **gitignore＝意図的に git に持たない**（再生成可能な派生物）。**SoT は slide-data.json ＋ reels/wav（音声）だけコミット**。投稿は `scripts/publish-reel-jit.mjs`（生成→Business Suite 予約→mp4 削除）。これで作業ツリー ~1.15GB 削減・今後の肥大停止。**「video.mp4 が無い＝正常」**（混乱しないこと）。1問1リールは `per-problem-shorts.mjs --ig-mode`。`--from-reels`(legacy) を使う時だけ ig-reel-create で reels/img・slide-NN.mp4 を先に再生成。wav の R2 化・`.git` 履歴圧縮(force-push)は未実施（後者は並行作業中は危険）。

詳細は SKILL.md の実測セレクタ表が真実源。
