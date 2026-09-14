---
name: project-cem-youtube-strategy-ssot
description: "総監YouTube戦略SSOT v1制定(2026-06-12, 88a26612d)。docs/project/03_SNS/05_YouTube戦略_技術士総監.md。二層構造とPhase A残タスクあり"
metadata: 
  node_type: memory
  type: project
  originSessionId: 550aecf9-c365-426a-91e9-34b7800e1e3a
---

総監YouTube戦略の独立SSOT `docs/project/03_SNS/05_YouTube戦略_技術士総監.md` v1 を制定（2026-06-12、commit 88a26612d、develop push済）。01_SNS集客戦略.md v7のYouTube節に参照ポインタ追記済。

要点:
- 二層構造: Tier1=Shorts（**既に稼働中**: 台帳 `.claude/state/youtube-schedule.json` 実200本中 uploaded 7/pending 193、`per-problem-shorts.mjs` YT専用再描画でIG mp4非依存=v7単一障害点は緩和済）／Tier2=通常動画16:9一次制作（5ピラー P1択一演習/P2キーワード/P3聞き流し/P4記述式思考系=note送客主力/P5体験キャリア）
- ポジショニング: 総監特化×合格者×発注者視点×顔出しなしTTS（競合空白、2026-06 WebSearch検証済）。登録者数は主KPIにしない（送客器評価）
- シナリオ素案6本を§12に収録（実在過去問R7 Ⅰ-1-3/4/6・ALARP等で裏取り済）

Phase A 残タスク（§9/§11）:
- 16:9テンプレ実装（slide-render.mjs、推定0.5-1日）
- 競合「技術士 総監約3〜10分チャンネル」(UCMY7e9Ri9Vh_syU8b7kuMdA) 実態調査
- 台帳meta.totalドリフト是正（meta=168 vs 実items=200）
- 試験日の内部外部不一致解消（内部SoT 07-13想定 vs 外部R8筆記7/19-20、engineer.or.jp公式で照合し§6とnoteコンテンツ計画を補正）

関連: [[project-ig-api-posting-setup]]（Mac/Actions実行制約）、[[project-sales-log]]
