# Management スキル

プロジェクトの計画・分析・戦略策定に使うスキル群。

## スキル一覧

| スキル | 用途 | 頻度 |
|---|---|---|
| `/weekly-plan` | 週次計画を生成 | 毎週金曜（review と同時・自動） |
| `/weekly-review` | 週次レビューを生成 | 毎週金曜 20:00 JST（自動・クラウドルーティン） |
| `/critical-review` | 設計書・計画書に対する批判的レビュー | 随時 |
| `/knowledge` | 過去の失敗と学びを参照・追記 | バグ解決時 |
| `/growth-loops` | 成長ループ（フライホイール）の設計・評価 | 四半期ごと |
| `/monetization-strategy` | 収益化戦略のブレインストーム | 四半期ごと |
| `/north-star-metric` | North Star Metric と Input Metrics の定義 | 初回 + 見直し時 |
| `/pre-mortem` | Pre-Mortem（事前検死）の実施 | 四半期ごと |

## 推奨ワークフロー

### 初回セットアップ（プロジェクト立ち上げ・方針転換時）

```
1. /north-star-metric     <- 最重要指標を決める
2. /growth-loops           <- 指標を伸ばす成長メカニズムを設計
3. /monetization-strategy  <- 収益化手段を検討
```

この順序が重要。NSM が定まらないと成長ループの優先度が決まらず、成長の見通しがないと収益化の議論が空転する。

### 週次運用（毎週のルーティン）

```
金曜夜（自動・必要なら週末に手動）:
1. /weekly-review   <- 今週の実績を振り返る
2. /weekly-plan     <- 来週の計画を立てる（レビュー結果を自動参照）
```

### 随時実行

```
設計判断の検証:  /critical-review <対象ファイル>
バグ解決の記録:  /knowledge
```
