---
name: project_video_content_pipeline
description: DN-0110 動画パック基盤。Phase0-3完了・企画33本・pilot4本qa_passed。残=mp4生成(Mac/VOICEVOX+ffmpeg)とユーザー承認
metadata: 
  node_type: memory
  type: project
  originSessionId: 37edd7d1-b4e2-42e0-a481-7e143b8d32ab
  modified: 2026-08-28T10:57:05.688Z
---

YouTube 通常動画を核とするストックコンテンツ基盤（DN-0110）。2026-08-28 に Phase 0〜3 まで実装完了、develop へ push 済み。

**動く仕組み（すべて実装済み）**
- 契約 SSOT `.claude/config/video-content.json` ＋ ゲート `check-video-content`（fixture で偽 PASS 防止）
- 16:9 レンダラー `npm run render-longform`（storyboard→PNG＋ASS 字幕＋mp4・出力は `.tmp/video-render/`）
- 企画バンク 33 パック（`content/sns/video-packs/{exam}/{slug}/video-pack.json`）・一覧は `build-video-pack-index` 生成の README
- 共通ライフサイクル `scripts/lib/content-lifecycle.mjs`（6ステージ写像・全チャネル横断）
- 管理画面 `/content/video`（企画ボード）`/content/lifecycle`（横断）`/metrics/video`（成果）`/sns`（派生 join）
- 成果計測: GA4 campaign 次元を CI 週次供給（`utm_campaign = packId` で join）
- 公開実体の照合: 実査 `verify-video-publication`（CI 週次）＋ ゲート `check-video-publication`（オフライン・quality:audit）

**残っていること**
1. pilot 4 本（koji-gaiyo-7items / anzen-ippanron-3riyu / gokanri-tradeoff / monbun-yomikata）の **mp4 生成**。会社PCには VOICEVOX・ffmpeg が無く PNG＋字幕まで。**Mac で** VOICEVOX 起動（:50021）＋ ffmpeg を用意し `npm run render-longform -- --pack-dir <path>`
2. **ユーザー承認**（`approved` はユーザーだけが設定できる契約）→ 公開 → 派生（Shorts 2・IG・X）
3. 公開後 6 週間で継続/停止判断

**引き継ぎの注意**: mp4/wav は Git に置かない契約なので、別PCで作った動画は pull しても来ない（公開はレンダリングした側か R2 経由）。状態 `.claude/state/video-content-status.json` は Git 管理なので公開後の更新は commit が要る。

関連: [[feedback_metrics_cicd_supplied]] / [[feedback_gate_zero_coverage_false_pass]] / [[project_admin_app_consolidation]]
