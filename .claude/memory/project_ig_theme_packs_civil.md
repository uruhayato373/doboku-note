---
name: project_ig_theme_packs_civil
description: 1級/2級土木IGを年度括り→論点括り(頻出問題)に移行。131パック生成済
metadata: 
  node_type: memory
  type: project
  originSessionId: 94812941-0eef-4751-b1db-44d2d0558885
---

競合 @miyabi_labo（フォロワー3,626・1枚目にQで訴求）分析を受け、1級/2級土木の IG カルーセルを**年度括り→論点（頻出問題）括り**へ移行（2026-07-16、branch `feature/ig-quiz-cover`・未push）。

- **論点分類は Kindle A系と単一源**: `scripts/build-takuitsu-reconstruct.mjs` の `THEMES`（6管理テーマ/39論点）を export し `generate-civil-theme-packs.mjs` が import。1論点×4問（複数年度採録）・テーマ間重複は GOUBON 順で先勝ち。
- **生成**: `generate-civil-theme-packs.mjs`（slide-data・exam-packs総入替）→ `render-civil-theme-packs.mjs`（PNG+caption）。cover=`templates/exam-quiz-cover-ig.mjs`（科目ピル+論点見出し+頻出度★+第1問Q+出題年度）。
- **実績**: 1級 94パック/39論点、2級 37パック/26論点 = 計131。出力 `docs/sns/instagram/civil-{1,2}/theme-packs/{theme}-{subtopic}/pack-NN/`。旧 `civil-*/exam-packs`（351）と `generate-civil-{1,2}-pack.mjs` は退役。
- **v1対象外**: 土木一般・専門土木の技術系論点は THEMES 未定義（別途論点設計が必要）。分類率は1級44%/2級43%。
- **踏んだ地雷**: ①`src/config/civil-{1,2}-exam-questions.json` は現行MDXから大幅stale→再生成必須 ②`parse-civil-2` は前期(zenki)「1.」書式を拾えず→fallback追加 ③`ig-post-create`/旧generator の出力パスが実データ位置とドリフト→自己完結スクリプトで回避。

品質: 解答スライドの長文解説が「ここがポイント」箱に重なる不具合を発見→IG適性フィルタ（個数型/解説合計>420字を除外）で是正、131→122パック（civil-1 85/civil-2 37）。

予約(2026-07-17): publish-ig-bs で **30/122件を予約済**（7/18〜8/1・1日2件 昼=2級/夜=1級・★★★優先・0失敗）。予約プラン=deterministic（★desc→2級先行）で全122件が 7/18〜9/16（Meta+75日枠=9/30内）に収まる。**残92件は次セッション以降に波状継続**（一括自動予約は凍結リスク大＝X凍結歴あり[[project_x_account_reboot_2026_06]]のため1セッション~30件に制限）。**継続コマンド= `node .claude/scripts/sns/schedule-civil-theme-packs.mjs --count 30`**（決定的プラン再構築＋status.json で予約済skip＝冪等・次バッチ#31/8/2から。1週空いたら先に --dry-run）。実行後 status.json commit。backlog「IG 論点パック 残92件」に手順。

残: 予約92件継続、sns-image-policy §12 追記、/doc-sync、feature/ig-quiz-cover の push/PR。真実源 → [[reference_ig_publish_reconcile]]・ig-carousel-skill.md シリーズC。
