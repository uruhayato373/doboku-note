---
name: project_video_content_pipeline
description: "YouTube通常動画を核とする動画パック基盤(DN-0110 Phase0-3完了・企画33本・pilot4本qa_passed、残=mp4生成と承認)。総監YouTube戦略SSOT・Shorts台本品質キャンペーン(完了)を含む"
metadata:
  type: project
---

YouTube 通常動画を核とするストックコンテンツ基盤（DN-0110）。2026-08-28 に Phase 0〜3 まで実装完了、develop へ push 済み。

**動く仕組み（すべて実装済み）**
- 契約 SSOT `config/video-content.json` ＋ ゲート `check-video-content`（fixture で偽 PASS 防止）
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

**引き継ぎの注意**: mp4/wav は Git に置かない契約なので、別PCで作った動画は pull しても来ない（公開はレンダリングした側か R2 経由）。状態の正本はコンテンツ台帳 `content/registry/`（YouTube は 2026-10-09 に切り替え・`video-content-status.json` は写し）。予約→公開は CI の registry-reconcile が develop へ書き戻す。

関連: [[feedback_metrics_cicd_supplied]] / [[feedback_gate_zero_coverage_false_pass]] / [[project_admin_app_consolidation]]

## 統合: 総監 YouTube 戦略 SSOT（旧 cem_youtube_strategy_ssot・2026-06-12）
`docs/project/03_SNS/05_YouTube戦略_技術士総監.md` v1。二層構造＝Tier1 Shorts（稼働中・台帳 `.claude/state/youtube-schedule.json`）／Tier2 通常動画16:9（5ピラー P1択一演習/P2キーワード/P3聞き流し/P4記述式思考系＝note 送客主力/P5体験キャリア）。ポジショニング＝総監特化×合格者×発注者視点×顔出しなしTTS。登録者数は主KPIにしない（送客器評価）。Phase A 残: 16:9テンプレ実装（slide-render.mjs）・競合「技術士 総監 約3〜10分チャンネル」実態調査・台帳 meta.total ドリフト是正・試験日の内部/外部不一致の解消（engineer.or.jp で照合し§6補正）。

## 統合: Shorts 台本品質キャンペーン（旧 yt_shorts_quality_campaign）
総監キーワード Shorts 139本の storyboard 台本品質改善は完走（2026-05-21・真実源 `.claude/state/sns/quality-campaign-progress.json`）で再開不要。戦略 v7 以降 YT は IG Reels 派生（`ig-reel-create`→`yt-shorts-create --from-reels`）。mp4 化は ffmpeg+VOICEVOX 環境が前提。
