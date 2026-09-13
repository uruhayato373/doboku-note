---
paths:
  - ".claude/skills/**"
  - ".claude/agents/**"
  - ".claude/commands/**"
---

# スキル・サブエージェントを追加・修正するときの規約

## 台帳との結合（CLAUDE.md §8）

- `.claude/skills/` または `.claude/agents/` を追加・修正・削除した場合は、同一 commit で [skills-guide.md](../knowledge/reference/skills-guide.md)（一覧）と [skills-registry.md](../knowledge/reference/skills-registry.md)（退役ログ）または [agents-registry.md](../knowledge/reference/agents-registry.md) を必ず更新する。**追加・削除・description 変更は `npm run check-doc-coupling` が pre-commit で機械検知してコミットを止める**（台帳更新もれ＝capability ドリフトの再発防止。正当に不要なら `SKIP_DOC_COUPLING=1`）
- 件数の SSOT はディレクトリの実数と各 registry の表。CLAUDE.md や他 doc に件数・per-agent の表を書かない
- 設計チェックリスト（frontmatter 必須要件・description 形式・progressive disclosure・`.claude/pdfs/guide.pdf` 準拠） → [skills-design-guide.md](../knowledge/reference/skills-design-guide.md)。新規作成は `/create-skill`、既存 description のレビューも同ガイド。新スキルの重複はカテゴリ早引き skills-guide.md で先に確認する
- コミット前に `/doc-sync` を 1 回回す（スキル・エージェントは「ドキュメント化された面」）

## ハーネス設計原則の実装（CLAUDE.md §5 の詳細）

- サブエージェントは `model: sonnet` 既定。Opus は親エージェントのみ。model 判定ルールは `/create-skill` の「サブエージェント作成時の model 指定ルール」、per-agent の model 一覧は agents-registry.md「エージェント一覧」が唯一
- audit-only（`*-qa` / `*-auditor` / `*-fact-checker`）は frontmatter に `tools:` allowlist（`Read, Glob, Grep, Bash, WebSearch, WebFetch`）を持ち `Edit`/`Write`/`NotebookEdit` を機構的に除外する。Generator（`*-writer` / `*-rewriter` / `*-restorer`）は `tools:` 無指定。Generator/Evaluator 分離の原則と呼出マップは agents-registry.md
- 同時起動は原則 3 体まで・Workflow の並行は 2 本まで。委任は「大きく・独立・並列化できる」作業のみ。自分のインライン作業を検証させるためだけの起動はしない（`*-writer`↔`*-qa` の分離パイプラインは別物・維持）。委任には必要最小限の直近コンテキストまたは `fork_turns: none`
- スキル・エージェントに書いてよい検証は**決定的ゲートだけ**（実行するコマンドと合格条件が特定できるもの）。「必ず最後に検証」「ダブルチェック」「サブエージェントで検証させる」は書かない（CLAUDE.md §9）
- モデル／reasoning／fork 範囲は実行時の能力。プロバイダ固有のルーティング SSOT をリポジトリに作らない
- `/schedule`（RemoteTrigger）で定期エージェントを新規作成する前に `/routines`（`RemoteTrigger {action:"list"}`）で既存を確認し、同一成果物の重複・cron 衝突を避ける（2026-05-30 weekly-review 重複事故）
- 今やること別のスキル推奨組み合わせ → skills-guide.md。スキル→エージェント呼出マップ → agents-registry.md。週次 PDCA・変換フロー → [workflows.md](../knowledge/reference/workflows.md)
