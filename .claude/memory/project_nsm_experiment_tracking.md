---
name: NSM 実験の pending 作業確認
description: .claude/state/experiments.json に running 実験があれば pending_user_actions を surface。NSM/実験/GSC/インデックス/作業継続 に言及があったら発火
type: project
originSessionId: 7c356070-d66e-4201-a5ea-935b7a7b4a1b
---
doboku-note では NSM 改善 PDCA ループを `/nsm-experiment` および `/weekly-improve` スキルで管理している（2026-04-14 構築、2026-04-18 拡張）。各実験の状態と残作業は `.claude/state/experiments.json` に記録されており、セッション間で継続する作業（GSC 手動リクエスト等、1 日クォータで持越しになる等）が発生する。

**Why:** 新セッション起動時に、進行中の実験と pending 作業を自動的に認識して surface しないと、ユーザーが忘れた時点でタスクが消失する。実験ファイルは永続化層だが、assistant が能動的に読みに行くトリガーが必要。

**How to apply:**

- ユーザーが以下の文脈に触れたら、まず `.claude/state/experiments.json` を直接 Read する:
  - 「NSM」「実験」「仮説」「PDCA」「作業継続」「昨日の続き」「残作業」
  - 「GSC」「インデックス」「indexing」「sitemap」「検索流入」
  - 「今日何をする？」「次何する？」（open question 時）
- `experiments[].status === 'running'` の実験を抽出し、`pending_user_actions` 配列が非空なら surface
- `next_check_date` を現在日と比較し、期日到来なら `/weekly-improve` での measure を提案
- 明示トリガーとして `/nsm-experiment pending` / `/weekly-improve` コマンドをユーザーに紹介する

**関連パス（2026-04-18 時点）:**
- 状態ファイル: `.claude/state/experiments.json`（唯一の真実源）
- スキル定義: `.claude/skills/management/nsm-experiment/SKILL.md`, `.claude/skills/management/weekly-improve/SKILL.md`
- エージェント: `.claude/agents/metrics-analyzer.md`（5パターン抽出）
- ハンドオフ: `.claude/state/session-handoff-YYYY-MM-DD.md`（セッション跨ぎの引き継ぎ）

**期限 surfacer は 1 本（2026-09-19・DN-0252）**: `npm run check-experiment-due -- --json` が唯一。判定は `scripts/lib/experiment-due.mjs`（`judgeExperiment`/`judgeLedger`）に集約し、旧 `check-experiments-due` は削除。measuring でも next_check_date 超過は MEASURE_DUE、`issues[]` に pending_user_actions の 1 行（done の実験は出さない＝EXP-005 の陳腐 pending は DN-0229 で閉じた）。週次レビューはこの JSON を転記するだけで、手で期限を計算しない。
