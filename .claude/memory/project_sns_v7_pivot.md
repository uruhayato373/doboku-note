---
name: project_sns_v7_pivot
description: "SNS戦略v7/v7.1(IG一次・YT派生)とInstagram運用の統合記録。投稿はBusiness Suite Playwrightのみ(Graph API不使用)、論点パック122本の予約手順、動画JIT方針"
metadata:
  type: project
---

SNS 戦略 v7/v7.1（2026-05-28 ピボット）と Instagram 運用の統合記録。真実源 `docs/strategy/` の SNS 集客戦略 v7.1、ポリシー（ig-highlight-design / ig-reels / ig-stories / yt-shorts-publisher）、`docs/reference/ig-carousel-skill.md`（運用）、`docs/design-system/instagram-carousel-tokens.json`（デザイン）。再開時は `docs/handoffs/2026-05-28-sns-v7-instagram-pivot.md`（archive 済み・git 履歴から復元）を先に読む。

## 戦略（v7/v7.1）
- **Instagram＝一次制作**（slide-data.json→カルーセル PNG→Reels mp4）、**YouTube Shorts＝Reels 派生**（`yt-shorts-create --from-reels <pack-id>` 一本化・MDX 直結の `--slug` は廃止）。収益実測ではサイト・X・SNS の売上寄与は小さく収益の本体は note 内回遊（[[project_revenue_diagnosis_2026_06]]）。
- IG ハイライトは6種（教材を追加）。**二段ロケット動線**: 06_materials のみ note 着地（プロフィール→無料記事→有料マガジン）、他5種はサイト着地。**直接 note 有料リンク禁止。** ハイライト実投稿は 7月中旬（カルーセル4-5本投稿後）の想定だった。
- エージェント（Generator/Evaluator・sonnet）: ig-reels-writer/qa・ig-stories-writer/qa・ig-highlight-designer/qa・yt-shorts-publisher-qa。意匠: 過去問パック（quiz-slides.mjs・白背景・情報密度）とハイライト（highlight-stories-slides.mjs・モダンシック・ジャンル別6色）は文脈が独立のため統一しない。
- デザイン: 単一 brand `#1858B5`＋semantic（正答 green/誤答 coral/CTA navy）、Manrope＋NotoSansJP、cover-title「令和X年度 ／ 択一式 過去問 #N」、4段階自動圧縮。5管理別配色・727本キャンペーン・notebook-figure 型は廃止。

## 投稿経路（現行）
- **IG 投稿は Meta Business Suite の Playwright（`publish-ig-bs`・`.claude/skills/social/publish-ig-bs/`）のみ**。即時 `--now`／予約 `--schedule`／リール `--reel`。Graph API 経路は 2026-06-17 に全廃（PR #259）、**2026-09-23 ユーザー決定: Meta の制限が解けても Graph API は使わない**（`fetch-ig-insights`/`ig-graph-publish` は使わずインサイトは欠測のまま扱う）。会社PCのプロキシは graph.facebook.com を遮断する。
- ログインはシステム Chrome 手動 2FA→`.local/playwright-ig-bs-profile/`。**hosted CI では不可**（2026-09-21 に CI で1回使った直後 Meta がセッション全面失効→ローカル GUI 前提）。アカウント: FB `Doboku-note`／IG `dobokunotecom`（env `IG_BS_FB_PAGE`/`IG_BS_IG_ACCOUNT`）。設計は dry-run 必須・偽成功を出さない fail-safe（[[feedback_publish_x_false_success]] と同系）。公開状態の照合は `verify-ig-status`/`ig-reconcile`（[[reference_ig_publish_reconcile]]）。
- 実機の罠: 投稿先で FB ページ option を外すと IG 単独モード（メディアボタンが「写真・動画を追加」に変わる）／時刻欄は `role="spinbutton"`（値は `aria-valuenow`）／成功モーダルは複数文言→共通「後で」ボタンで検知／リールは「リール動画を作成」→reels_composer、右下「次へ」を座標 click（ZWSP 誤爆回避）／テスト予約の削除は Planner で時刻バッジ→`Locator.hover()`→アクション→投稿を削除（座標 hover は不安定）。セレクタ表は SKILL.md。
- **動画は JIT（gitignore）**: reels mp4・reels/img・slide-NN.mp4・wav は git に持たない再生成可能物。コミットは `slide-data.json`・`script.txt`・`caption.txt`。「video.mp4 が無い＝正常」。投稿は `scripts/publish-reel-jit.mjs`（生成→予約→mp4 削除）。1問1リールは `per-problem-shorts.mjs --ig-mode`。reels wav/mp4・YT Shorts mp4 は Drive 制作物/SNS音声動画/ へ退避済み・upload-sns-r2 は廃止（[[project_asset_audience_routing]]）。

## パック構造と生成
- 格納 `docs/sns/instagram/_exam-packs/{試験}/{年度}/pack-NN/`（試験軸は `技術士総監`〔既定〕/`1級土木`/`2級土木`・総監42パック R3-R7）。年度目次 `_summary/` を使う3階層誘導（ストーリー年度入口→年度目次カルーセル→個別パック。リンクスタンプは1個までのため）。総監カバーは試験識別 `exam-cover-ig`（carousel/reels/stories 対応）。**カバー PNG だけ更新する運用は禁止**（reel 動画1枚目と desync→`yt-shorts-create` の `assertCoverInSync`：SSIM<0.90 で中断。`ig-reel-create` で動画も同時再生成）。r03-r06 reels の 09-cta.png が旧テンプレ世代のドリフトは既知（`ig-post-create --size reels` 再描画で統一）。
- **1級/2級土木は年度括りから論点（頻出問題）括りへ移行（2026-07-16）**: 論点分類は Kindle A系と単一源（`scripts/build-takuitsu-reconstruct.mjs` の `THEMES`・6管理/39論点）。`generate-civil-theme-packs.mjs`→`render-civil-theme-packs.mjs`、出力 `docs/sns/instagram/civil-{1,2}/theme-packs/{theme}-{subtopic}/pack-NN/`、cover=`exam-quiz-cover-ig.mjs`。IG 適性フィルタ（個数型/解説合計>420字を除外）後 122パック（1級85/2級37）。v1 対象外＝土木一般・専門土木の技術系論点（分類率1級44%/2級43%）。旧 `civil-*/exam-packs`（351）と `generate-civil-{1,2}-pack.mjs` は退役。地雷: `src/config/civil-{1,2}-exam-questions.json` は現行 MDX から stale→再生成必須／`parse-civil-2` は前期「1.」書式を拾えず fallback 追加／2級 MDX は表記ゆれ多数（正答「正解:(N)」等・CRLF）。
- 予約: 30/122 件を予約済み（7/18〜8/1・1日2件）。**一括自動予約は凍結リスク大（X 凍結歴）→1セッション約30件**。継続 `node .claude/scripts/sns/schedule-civil-theme-packs.mjs --count 30`（決定的プラン・status.json で予約済 skip＝冪等・1週空いたら先に `--dry-run`・実行後 status.json を commit）。残92件は backlog「IG 論点パック 残92件」。
- Reels 生成: `ig-reel-create`（v1.2・多資格・`--exam-dir <1級土木|2級土木> --exam <r07[k|z]-pack-NN> --skip-png`）。ネイティブ VOICEVOX（`/Users/minamidaisuke/voicevox_engine_dl/macos-arm64/run --host 127.0.0.1 --port 50021`・完了後 `pkill -f voicevox_engine_dl`）。生成済み: 1級 r07(20)＋2級 r07k/r07z(24)＋総監27本。読み辞書: 「過去問」→かこもん・「全問」→ぜんもん（該当 cover/cta の2スライドだけ再 TTS）。再生成で60秒超になる境界パックは pair-swap か微速調整（atempo/setpts ≒1.05x）で吸収。未生成: 1級 h26-r06・2級 r03-r06・総監 r05残り/r06。
- X/IG の caption 生成 `generate-caption.cjs`（`_meta.exam` で試験別ハッシュタグ）、X の 280 字等は [[project_x_account_reboot_2026_06]]。
