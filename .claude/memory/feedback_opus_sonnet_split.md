---
name: feedback_opus_sonnet_split
description: "親エージェントOpusで思考、サブエージェントSonnetで実行するモデル分業方針。Fable 5は条件が重なる場合のみ主ループで指定"
metadata:
  type: feedback
---

親エージェント（Claude Code 本体）は Opus で計画・判断・統合、サブエージェントは原則 `model: sonnet` で高速・低コストに実行する。Fable 5 は第三のティアとして主ループの `Agent` ツール呼び出しで明示指定する（サブエージェント定義ファイルには使わない）。

**Why**: 2026-04-15、ユーザーから「opusで考えて、sonnetで実行するモデルがあるのではないだろうか」と提案され、以降すべてのスキル・エージェント作成時にこの方針を設計するよう明示指示。コスト効率と判断の質の両立。2026-06-11 に Fable 5（$50/MTok output、Opus 4.8 の2倍）の適合ケースを実証。

**How to apply**:
- 新規サブエージェントは frontmatter `model:` を必ず決める。既定 `sonnet`。
- Generator（生成・リライト・データ収集）と定型ルーブリック Evaluator → `sonnet`。オーケストレーター（戦略判断・批判的レビュー・事前検死）→ `inherit`。
- `model: opus` 固定は例外扱い（frontmatter description と本文「モデル方針」欄に理由明記）。
- **Fable 5（`model: "fable"`）は以下が重なる場合のみ主ループの `Agent` で指定**: 5本以上のファイルを横断読みして矛盾・合成が必要／価格設計・LP コピー・リリースカレンダーなど複数の異なる出力を一括生成／単発の戦略セッション（長時間実行でなく深い推論が目的）／Opus 4.8 で試して深さが不足と感じたとき。**NG**: ファイル1〜2本の編集・定型レビュー・単純な生成 → Opus 4.8 で十分。
- 既存一覧と判定フローの真実源は `CLAUDE.md`「ハーネス設計原則」§5/§6 と `.claude/skills/dev/create-skill/SKILL.md`「サブエージェント作成時の model 指定ルール」。既存エージェント追加・改修時は CLAUDE.md のクイックリファレンス表も同時更新。bulk fan-out の Sonnet 明示は [[feedback_workflow_orchestration_gotchas]]。
