---
name: weekly-improve
description: >
  週次の計測→改善サイクルを束ねる軽量オーケストレータ。GSC/GA4 取得 → metrics-analyzer が改善候補を抽出 → `/nsm-experiment` で rubric 採点・登録 → pending 実験の再計測までを 1 コマンドで回す。
  Use when user asks to [週次改善, 改善ループ, /weekly-improve, 計測改善サイクル, 今週の改善候補].
user-invocable: true
---

# /weekly-improve — 週次 計測→改善サイクル

**実行環境**: ライブ fetch を伴うため **macOS（creds + 外部到達性あり）専用**。会社 PC（社内プロキシで Google API 遮断）では Phase 1 の取得が通らない。

> その環境では本スキルではなく `/weekly-review` を使う（CI がコミットした `.claude/state/metrics/` のスナップショットを読む＝既定経路）。計測自体は CI/CD 供給が正で、ローカル creds 未設定は「計測基盤未整備」ではない。恒久ルール: `docs/reference/measurement-incidents.md`（2026-06-05）。
> なお `--no-fetch` を付ければ本スキルもコミット済み最新メトリクスで動く。

## なぜこのスキルがあるのか

`/weekly-review` は**網羅的な振り返り**（計画達成率・成果・学び）を担う。一方で「計測データから改善候補を surface → 実験として登録」の軽量ループは別に必要。本スキルは後者に特化し、**20 分以内で週次改善サイクルを回す**ことを目的とする。

役割分離:
| スキル | 目的 | 頻度 | 重さ |
|---|---|---|---|
| `/weekly-review` | 振り返り・学び記録 | 週1 | 重（30-60分） |
| `/weekly-improve` | 改善候補抽出・実験登録 | 週1 | 軽（15-20分） |
| `/nsm-experiment` | 実験ライフサイクル管理 | 随時 | — |

`/weekly-review` と `/weekly-improve` は **両方回す**のが理想だが、時間が無い週は `/weekly-improve` のみでも NSM 改善サイクルは途切れない。

## 引数

```
/weekly-improve                 # フルサイクル（取得 → 抽出 → 採点 → 登録）
/weekly-improve --analyze-only  # 候補抽出まで（登録しない）
/weekly-improve --no-fetch      # 既存の最新メトリクスを使う（再取得しない）
```

## 実行手順

### Phase 1: メトリクス取得（並列、`--no-fetch` 時はスキップ）

Bash で並列実行:

```bash
# GSC: クエリ別 + ページ別
npm run fetch-gsc-data -- --limit 100
npm run fetch-gsc-data -- --dimension page --limit 100

# GA4: ページ別 + 日付別（トレンド判定用）
npm run fetch-ga4-data -- --dimension page --limit 50
npm run fetch-ga4-data -- --dimension date --days 28
```

出力先: `.claude/state/metrics/gsc/` と `.claude/state/metrics/ga4/`

### Phase 2: パターン抽出（metrics-analyzer エージェント）

`metrics-analyzer` サブエージェントを起動:

```
prompt: 最新の GSC/GA4 データから6パターン（High-Impr-Low-CTR, Rank-Stuck,
Traffic-Drop, Hidden-Winner, Orphan-Query, SNS-Source-Shift〔SNS 流入の急変・
要 ga4-sourceMedium-sns-*.json〕）で改善候補を抽出し、
`.claude/state/improvements/{today}.md` に出力してください。
```

出力ファイルを Read して親コンテキストに取り込む。

### Phase 3: pending 実験の再計測

`.claude/state/experiments.json` を読み、status が `running` かつ `started_at + 10 日経過`の実験を列挙。該当があればユーザーに提示:

```
以下の実験は計測推奨です:
- EXP-001: 統合ハウスキーピング（経過 14 日）→ /nsm-experiment measure EXP-001 推奨
```

### Phase 4: 候補のランキング（`/nsm-experiment propose` 連携）

抽出された改善候補を `/nsm-experiment propose` の入力形式に変換して呼び出す。propose 側が rubric（インパクト40%・工数30%・学習価値20%・確実性10%）で採点し、加重合計降順で上位 3-5 件を表示。

### Phase 5: ユーザー判断

以下を提示して判断を仰ぐ:

```
=== 今週の改善候補（rubric 採点済み） ===

1. [加重 2.7] トップページ / title 改善
   現状: impr 25 / pos 6.3 / CTR 0%
   仮説: title に主戦場キーワード追加で CTR 3%+ へ

2. [加重 2.4] general/common-specs title 改善
   現状: impr 44 / pos 7.5 / CTR 0%
   ...

どれを実験として開始しますか？（例: "1,2" / "1" / "skip"）
```

### Phase 6: 実験登録

ユーザーが採用した候補を `/nsm-experiment start` で `running` 状態に遷移。baseline が固定される。

## 出力

- `.claude/state/metrics/gsc/*.json` — 取得した GSC データ
- `.claude/state/metrics/ga4/*.json` — 取得した GA4 データ
- `.claude/state/improvements/{YYYY-MM-DD}.md` — 改善候補リスト
- `.claude/state/experiments.json` — 採用された候補が追記される（status: running）

## 運用ルール

- **週 1 回実行**（推奨: 月曜朝 or 日曜夜）
- **同時 active 実験は最大 2 件**（rubric 原則）。3 件目が提案されたら既存の `measure` or `abandon` を先に
- **GSC は 3 日遅延**するため、月曜実行なら前週火曜までのデータ
- **Traffic-Drop 検出のため snapshot を蓄積**: 週次で `snapshot-weekly-metrics` を別途実行しておくと前週比が効く

## 担当外

- **振り返り（計画達成率・成果・学び）**: `/weekly-review` の責務
- **施策実行（meta 書き換え・記事追加）**: ユーザー or `keyword-rewriter` / 既存 MDX 編集系スキル
- **NSM 定義変更**: `/north-star-metric` スキル
- **月次集計**: Phase 2 以降

## 失敗モード

| 症状 | 対処 |
|---|---|
| GSC/GA4 取得でエラー | `.env.local` と `credentials/gsc-service-account.json` を確認。サービスアカウントの権限付与も |
| metrics-analyzer が候補 0 件 | データ量が少ない可能性。`--days 90` で期間を伸ばして再取得 |
| 採用候補が rubric 1.5 未満ばかり | 本質的に impressions が少ない段階。先にコンテンツ追加で母数を増やすフェーズ |

## 参照

- `.claude/agents/metrics-analyzer.md` — 改善候補抽出の Evaluator
- `.claude/skills/management/nsm-experiment/SKILL.md` — 実験ライフサイクル管理
- `.claude/skills/management/nsm-experiment/references/rubric.md` — 優先順位評価軸
- `.claude/skills/management/weekly-review/SKILL.md` — 網羅的な振り返り（併用推奨）
- `.claude/scripts/lib/metrics-reader.mjs` — 週次メトリクス取得ユーティリティ
- CLAUDE.md §ハーネス設計原則 — Generator/Evaluator 分離・シンプルさ優先
