---
name: project_rccm_launch_2026_09
description: "RCCM 全チャネル展開（2026-09-15 着手）。note 5 商品（問題III 模範論文集・問題I・択一50問・暗記ノート・まるごとパック ¥5,980）＋ココナラ 3 出品＋X 9 本予約済み。サイト /exam/rccm（ハブ＋ガイド 7 本 /exam/rccm/guide/<slug>）は 2026-09-18 に本番稼働。残=Kindle h-01 出版承認・口頭・2027 サイクル"
metadata:
  type: project
---

2026-09-15、`docs/strategy/06_多資格展開戦略.md` の RCCM 不採用（06-09）を撤回し全チャネル展開に着手（計画 `~/.claude/plans/rccm-staged-reef.md`）。根拠＝note 流入元実測（[[project_revenue_diagnosis_2026_06]]）と市場 5,500 人規模・2026 年度 CBT 期間 9/1〜10/31 が進行中。

**公開済み（note）**: `content/note/RCCM/magazines/RCCM問題III-2026模範論文集/` 序章（無料 n801ee5046624）＋6 テーマ（¥780・境界 `模範論文`）→ マガジン `m770bef96b39f` ¥3,480。L2 `RCCMもくじ` nd297cb9b31e0。導線は `note-funnel.json exams.rccm`＋L1 追記済み。試験事実の SSOT は同 dir の `_facts-2026.md`（協会 PDF `2026_mondai_3.pdf` から設問①②・指定用語を一次転記。過去問は事務局非公開＝問題文は一切転載しない）。

**基盤（PR #513 feat/rccm-scaffold）**: ExamKey `rccm`（examKeyOf は tankan フォールバックより先に判定）・`--exam-rccm` 赤褐色・exam-calendar/stats・agents `rccm-essay-writer`/`rccm-essay-qa`（**新規 agentType はセッション内で解決されないので `general-purpose` + 定義 Read で起動**）・`npm run check-rccm-essay`（1,200〜1,600 字・「」4 語以上）・ココナラ 3 draft（thumb 生成済）・`business-direction.json` は salesAttribution のみ（重点資格登録は `/exam/rccm/` 公開と同時＝seo-rank-watch が候補記事を要求する）。

**2026-09-16 追記**: 問題I テンプレ（rccm-essay-qa 3.0）と 択一 50 問（content-qa 14/15・問44 落下高 76cm 是正・inline LaTeX は note 非対応なので平文化）を公開。サイト vertical（PR #514・feat/rccm-vertical・base=feat/rccm-scaffold）: categories/home-card/tags/curriculum/lib/components 配線＋ガイド 7 本（受験の手引 PDF 一次照合・受験手数料 17,320 円）＋ business-direction 重点資格＋ seo-watchword。単発商品の frontmatter は `noteSeries`（`noteMagazine` にすると magazine-membership 未分類で赤）。note-traffic-fetch（DN-0249）新設・8/9 月分保存。X は実台帳の空き 10/23〜31 の 9 本（status=scheduled・予約は publish-x 待ち）。EXP-009/010 running。

**残タスク**: ココナラ 3 出品（**ログイン切れで ABORT・運営者ログイン後に `/coconala-publish --service coconala-rccm-* --commit`**）／Kindle h-01（KDP Select OFF・`build-essay-kindle` の「過去問題を出典」固定文を `creditBody` で上書き）／X 9 本の予約（`x-schedule-guard --queue` → `publish-x`）／口頭試験（hearing-sheet 回答待ち）／建設部門パック batch B/C／会員ドリップ W7 9/17・学科09 9/18・W8 9/19…（README 配信表）。2027 は 3/1 合格発表→5 月申込→公開テーマ発表で更新。

**How to apply**: RCCM 記事は writer→qa の 2 段。QA で毎回出た指摘＝解説節（読み解き・答案構成）が「である調」になる → writer 起動時に「ですます・1 文≒1 段落」を明示。カバー headline は 8 字程度でないと V4 フィット検証で落ちる。`inject-magazine-url.cjs` は dir パス指定可（2026-09-15 一般化）。
