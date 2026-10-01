---
name: opus-sonnet-split
description: 親エージェントOpusで思考、サブエージェントSonnetで実行するモデル分業方針
type: feedback
originSessionId: 10d887ae-75e2-49b1-bece-734023c2fd30
---
親エージェント（Claude Code 本体）は Opus で計画・判断・統合、サブエージェントは原則 `model: sonnet` で高速・低コストに実行する。Fable 5 は第三のティアとして主ループの `Agent` ツール呼び出しで明示指定する（サブエージェント定義ファイルには使わない）。

**Why**: 2026-04-15、ユーザーから「opusで考えて、sonnetで実行するモデルがあるのではないだろうか」との提案。以降すべてのスキル・エージェント作成時にこの方針を確実に設計するよう明示的に指示された。コスト効率と判断の質の両立が狙い。2026-06-11 に Fable 5（$50/MTok output、Opus 4.8 の 2 倍）の適合ケースを実証。

**How to apply**:
- 新規サブエージェント作成時は frontmatter `model:` を必ず決める。既定値は `sonnet`
- Generator（生成・リライト・データ収集）と定型ルーブリック Evaluator → `sonnet`
- オーケストレーター（戦略判断・批判的レビュー・事前検死）→ `inherit`（親が Opus のとき Opus で動く）
- `model: opus` 固定は例外扱い。frontmatter description と本文「モデル方針」欄に理由明記が必要
- **Fable 5（`model: "fable"`）は以下の条件が重なる場合のみ主ループの `Agent` で指定する**:
  - 5 本以上のファイルを横断読みして矛盾・合成が必要
  - 価格設計・LP コピー・リリースカレンダーなど複数の異なる出力を一括生成
  - 単発の戦略セッション（長時間エージェント実行ではなく深い推論が目的）
  - Opus 4.8 で試して出力の深さが不足と感じたとき
  - **NG**: ファイル1〜2本の編集、定型レビュー、単純な生成タスク → Opus 4.8 で十分
- 既存一覧と判定フローは `CLAUDE.md`「ハーネス設計原則」§6 と `.claude/skills/dev/create-skill/SKILL.md`「サブエージェント作成時の model 指定ルール」を真実源とする
- 既存エージェント追加・改修時は CLAUDE.md のクイックリファレンス表も同時更新
