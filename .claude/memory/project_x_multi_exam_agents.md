---
name: project_x_multi_exam_agents
description: X投稿を多資格エージェント分業化（x-post-writer/qa新設、2026-06-02 1711d3fe4）。資格別でなく媒体×機能で分業、examで横断
metadata: 
  node_type: memory
  type: project
  originSessionId: d1769fb2-37dd-4e1d-a6ea-3ebfa5e8b1ec
---

X(旧Twitter)投稿を IG と同じ「媒体×機能（Generator/Evaluator）」分業に揃えた（2026-06-02, commit 1711d3fe4）。**資格別エージェントは作らない**＝総監/1級/2級は `exam` パラメータで横断（[[project_ig_exam_packs_exam_axis]] と同思想）。

**新設:**
- `.claude/agents/x-post-writer.md`（Generator）: `tweets.md` を多資格執筆。280 weighted 以下・試験別ベースタグ・サイト誘導。
- `.claude/agents/x-post-qa.md`（Evaluator）: 5軸（文字数/論点/タグ1-3個/導線UTM/偽成功検証）。
- `docs/reference/x-post-policy.md`（真実源）: 文字数・試験別タグ・投稿型・カード色・5軸・偽成功検証・リプライ運用。

**連携スキル（既存）:** `social-post`（X投稿テキスト生成）/ `create-x-card`（カード画像）/ `publish-x`（予約投稿）。

**create-x-card 多資格化:** `scripts/gen-x-card.mjs` が draft slug（`-civil1-`/`-civil2-`）で試験判定し色/ヘッダ切替。総監=管理分野色・「総監キーワード解説」（従来互換・目視確認済）、1級=青「1級土木 過去問」、2級=緑「2級土木 過去問」。

**戦略上:** X はリプライ運用（1日10件）がフォロワー獲得の本質で、writer はネタ供給に徹する。1級2級は過去問JSON（`*-exam-questions.json`）主資産で「1問1答/引っかけ集」型。

**残:** 実際の1級2級 X ドラフト生成は運用フェーズ（x-post-writer 実行）。social-post スキル本体の多資格化は未（policy で仕様規定済み、x-post-writer が吸収）。X専用オーケストレーションスキル（/x-post-quality 的）は未新設（親 or social-post 連携で起動）。
