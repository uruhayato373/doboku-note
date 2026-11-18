---
paths:
  - ".claude/skills/**"
  - ".claude/agents/**"
  - ".claude/commands/**"
---

# スキル・サブエージェントを追加・修正するときの規約

## 台帳との結合（CLAUDE.md §8）

- `.claude/skills/` または `.claude/agents/` を追加・削除・description 変更したら `npm run build-capability-index` を回し、書き換わった [skills-guide.md](../knowledge/reference/skills-guide.md)・[agents-registry.md](../knowledge/reference/agents-registry.md) を同じ commit に含める。一覧は frontmatter からの生成物で、手では直さない（`npm run check-doc-coupling` が pre-commit と CI で一致を見る。変更の経緯は git の履歴・正当に不要なら `SKIP_DOC_COUPLING=1`）
- 件数の SSOT はディレクトリの実数と各 registry の表。CLAUDE.md や他 doc に件数・per-agent の表を書かない
- 設計チェックリスト（frontmatter 必須要件・description 形式・progressive disclosure・`.claude/pdfs/guide.pdf` 準拠） → [skills-design-guide.md](../knowledge/reference/skills-design-guide.md)。新規作成は `/create-skill`、既存 description のレビューも同ガイド。新スキルの重複はカテゴリ早引き skills-guide.md で先に確認する
- frontmatter に `domain:`（事業の領域 id・正本 `config/domains.json`）を必ず書く。ディレクトリ（作業の種類）とは別の軸で、管理画面は領域ごとに束ねて出す。欠落・語彙外は `npm run check-domains` が止める
- エージェントは frontmatter に `role:`（`config/domains.json` の agentRoles）と `target:`（agentTargets）も必ず書く。資格では分けず、資格は呼び出し時に渡す。同じ role と target のエージェントがすでにいるなら、違いを agentOverlaps に書くか既存の 1 体に足す（`npm run check-domains` が止める）
- 役割は「作る（writer）→ 採点（qa）→ 直す（rewriter）→ 照合（verifier）」の流れで分ける。新規の執筆と指摘の適用は別の役、意味の採点と外部の一次情報・原典との突き合わせも別の役。分析・採点・照合・監査の役は `tools:` で Write・Edit を外し、結果は親へ返す
- エージェントの本文（frontmatter の後）は 150 行まで。本文は起動のたびに全部読まれるので、資格・モード別の規則は設定ファイルへ出し、呼び出し時に必要な 1 つだけ読ませる。今の超過と書き込める判定役は `.claude/config/agent-shape-baseline.json` が持ち、増やせない（`npm run check-domains` が止める）

## ハーネス設計原則の実装（CLAUDE.md §5 の詳細）

- サブエージェントは `model: sonnet` 既定。Opus は親エージェントのみ。model 判定ルールは `/create-skill` の「サブエージェント作成時の model 指定ルール」、per-agent の model 一覧は agents-registry.md「エージェント一覧」が唯一
- audit-only（`*-qa` / `*-auditor` / `*-fact-checker`）は frontmatter に `tools:` allowlist（`Read, Glob, Grep, Bash, WebSearch, WebFetch`）を持ち `Edit`/`Write`/`NotebookEdit` を機構的に除外する。Generator（`*-writer` / `*-rewriter` / `*-restorer`）は `tools:` 無指定。Generator/Evaluator 分離の原則と呼出マップは agents-registry.md
- 同時起動は原則 3 体まで・Workflow の並行は 2 本まで。委任は「大きく・独立・並列化できる」作業のみ。自分のインライン作業を検証させるためだけの起動はしない（`*-writer`↔`*-qa` の分離パイプラインは別物・維持）。委任には必要最小限の直近コンテキストまたは `fork_turns: none`
- スキル・エージェントに書いてよい検証は**決定的ゲートだけ**（実行するコマンドと合格条件が特定できるもの）。「必ず最後に検証」「ダブルチェック」「サブエージェントで検証させる」は書かない（CLAUDE.md §9）
- モデル／reasoning／fork 範囲は実行時の能力。プロバイダ固有のルーティング SSOT をリポジトリに作らない
- `/schedule`（RemoteTrigger）で定期エージェントを新規作成する前に `/routines`（`RemoteTrigger {action:"list"}`）で既存を確認し、同一成果物の重複・cron 衝突を避ける（2026-05-30 weekly-review 重複事故）
- 今やること別のスキル推奨組み合わせ → skills-guide.md。スキル→エージェント呼出マップ → agents-registry.md。週次 PDCA・変換フロー → [workflows.md](../knowledge/reference/workflows.md)
