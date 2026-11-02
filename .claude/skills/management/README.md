# Management スキル

プロジェクトの計画・分析・戦略策定に使うスキル群。

## スキル一覧

| スキル | 用途 | 頻度 |
|---|---|---|
| `/weekly-review` | 週次レビューを生成 | 毎週土曜 09:00 JST（自動・クラウドルーティン・2026-09-19 に金曜 20:00 から変更） |
| `/critical-review` | 設計書・計画書に対する批判的レビュー | 随時 |
| `/knowledge` | 過去の失敗と学びを参照・追記 | バグ解決時 |
| `/monetization-strategy` | 収益化戦略のブレインストーム | 四半期ごと |
| `/plan-weekly` | 週間計画（.claude/todo/weekly.md）を更新 | 週次レビューの後（自動） |

## 推奨ワークフロー

### 初回セットアップ（プロジェクト立ち上げ・方針転換時）

```
1. config/business-direction.json と docs/strategy/01_プロダクト戦略.md を読む  <- 重点資格と KPI（指標の変更は /monthly-review の手順で記録）
2. /monetization-strategy  <- 収益化手段を検討
```

### 週次運用（毎週のルーティン）

```
金曜夜（自動・必要なら週末に手動）:
1. /weekly-review   <- 今週の実績を振り返る
2. /plan-weekly     <- 来週の計画を立てる（.claude/todo/weekly.md）
```

### 随時実行

```
設計判断の検証:  /critical-review <対象ファイル>
バグ解決の記録:  /knowledge
```
