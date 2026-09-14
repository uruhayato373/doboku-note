---
name: project-x-30days-campaign
description: X 試験 W-7〜W-3 カウントダウン 30 日 × 3 投稿/日 = 90 件予約投稿完了（2026-05-25 実行、配信 5/26-6/24）
metadata: 
  node_type: memory
  type: project
  originSessionId: 2e96f3f9-105d-4d86-b0f0-2063317a9e34
---

**[2026-06-01 v2 成功] R8 30日カウントダウン実績キャンペーン（draft 039）を新規投入し実体検証済み。** 6/2〜6/29 毎日 08:00 JST の 28 件、試験 2026-07-19 まで残りN日(47→20)を自動算出。同一投稿連投はスパム判定リスクが高いため、コピー6種＋R8テーマ訴求のローテ＋画像28枚（カウントダウンカード＋7日ごと実績スクショ）で全件を一意化。`.tmp/x-dump-scheduled-text.mjs` で午前8:00=28件・残り47→20全揃いを確認（前回と違い偽成功でない）。生成器は `.tmp/gen-countdown-campaign.mjs`。即時投稿1件(6/1)= status/2061316385305924046。売上根拠は [[project_sales_log]]。

**[2026-06-01 クイズ枠追加] draft 040 = 過去問クイズ枠28件を別時間帯12:15で投入・検証済み。** 実過去問パック `docs/sns/instagram/_exam-packs`（r03-r07・168問）から5管理ラウンドロビン+年度分散で28問選抜。問題画像（NN-problem.png）+ 当該年度解説ページ `pe-comprehensive-management-{year}-primary` へ誘導。本文/画像/正解番号を原典突合、実キューで午後0:15=28件確認。生成器 `.tmp/gen-quiz-campaign.mjs`。結果: 6/2-6/29 は毎日 08:00カウントダウン+12:15クイズ の2投稿体制（時間帯分離でスパム回避）。publish-x は1画像・自己リプ非対応なのでクイズは「問題画像+解説リンク」型（答えはリンク先）。

**[2026-06-01 訂正] この「90 件予約完了」は偽成功だった可能性が極めて高い。** 6/1 に実 X キューを仮想スクロール全件ダンプ（`.tmp/x-dump-scheduled-text.mjs`）した結果、実キューには C-xx/D-xx/N-xx/M-xx/S-xx 系列が 1 件も存在せず、入っていたのはクイズ#08-#19・白書告知・マガジン誘導の別バッチ計 13 件（6/1〜6/8 中心＋7/28 単発）のみ。`x-publish-log.csv` にも 30days の記録ゼロ、status.json は 5/25 で凍結。→ status.json の scheduled=90 は X 投入を意味しない。実体は必ずライブキューで確認すること。関連: [[feedback-publish-x-false-success]]

---

X 試験カウントダウン 30 日キャンペーン、2026-05-25 に 90 件全件予約完了（と当時 status.json は記録）。

**配信期間:** 2026-05-26 08:00 〜 2026-06-24 21:00 JST（毎日 3 投稿 = 08:00 / 14:00 / 21:00）

**配分（戦略 v6 準拠）:** D27 過去問クイズ / N24 note 論点予告 / C15 カウントダウン / M13 合格者メタ / S11 応援

**実行 commits:**
- `52ca135eb` Tweet 43-90 ハッシュタグ 3 個セット拡張
- `531bbd4a9` 90 件ドラフト + schedule.md
- `76aaf273d` status.json 全 90 件 scheduled 反映
- `4b29fe07c` publish-x.ts 4 大バグ修正

**Why:** 試験まで 51 日のラストスパート集客フェーズで、note 6 商品（M2 無料 / M3/M5/M6/M8 有料）への送客動線を 30 日間ドリップ。

**How to apply:**
- 配信モニタは X profile or `.tmp/x-list-scheduled.ts` で随時確認可
- 6/25 以降の W-3 〜 W-0 期間は別キャンペーン要設計（Tweet 90 で予告済「毎日 1 投稿で論点リマインダー」）
- Tweet 01-42 は単タグ、43-90 は 3 タグ（混在は仕様）
- 関連: [[feedback-x-hashtag-count]] [[project-paid-note-pricing]]

**素材:** `docs/sns/x/draft/032-30days-countdown/{tweets.md, schedule.md, status.json}`
