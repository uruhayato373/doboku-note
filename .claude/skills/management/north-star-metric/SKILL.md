---
name: north-star-metric
description: >
  NSMとInput Metricsを定義してKPIツリーを設計する。Use when user asks to [北極星指標, NSM, 重要指標を決めたい, /north-star-metric].
---

doboku-note の North Star Metric（最重要指標）と 3-5 の Input Metrics を定義する。

原典: [phuryn/pm-skills](https://github.com/phuryn/pm-skills) (MIT License) の `north-star-metric` をカスタマイズ。

## 引数

```
/north-star-metric [context]
```

- `context`（任意）: 追加コンテキスト（例: `収益重視`, `成長重視`）

## プロジェクトコンテキスト

doboku-note は土木工学ドキュメントサイト。以下の特性を前提に分析すること:

- **プロダクト**: 土木工学・施工管理・河川・道路・法律の技術ノートを無料提供
- **ビジョン**: 土木技術の知識を体系的に整理し、技術者・受験者の学習を支援する
- **収益モデル**: 広告・アフィリエイト（トラフィック依存）
- **ユーザー**: 土木系技術者、施工管理技士受験者、技術士受験者、公務員試験受験者、学生
- **技術基盤**: Next.js 16 + next-mdx-remote + Cloudflare Pages（運用コスト極小）
- **運営**: 個人開発
- **成長チャネル**: SEO（検索流入が主）

## North Star Metric の要件

NSM は以下の 7 基準を**すべて**満たす必要がある:

| # | 基準 | 説明 |
|---|---|---|
| 1 | **理解しやすい** | 即座に理解できる |
| 2 | **顧客中心** | ユーザーに提供する価値を反映 |
| 3 | **持続的価値** | 習慣化・長期エンゲージメントを示す |
| 4 | **ビジョン整合** | プロダクトビジョンへの進捗を表す |
| 5 | **定量的** | 明確な数値で計測可能 |
| 6 | **アクション可能** | 施策によって直接影響を与えられる |
| 7 | **先行指標** | 将来のビジネス成功を予測する |

## 手順

### Step 1: ビジネスゲームの分類

| ゲーム | 定義 | 例 |
|---|---|---|
| **Attention** | ユーザーの滞在時間 | YouTube, TikTok |
| **Transaction** | 取引・コンバージョン回数 | Amazon, Uber |
| **Productivity** | タスク完了の効率 | Notion, Canva |

doboku-note は技術リファレンスとして **Productivity ゲーム**（学習・業務の効率化）と **Attention ゲーム**（コンテンツ閲覧）のハイブリッド。

### Step 2: 現在のメトリクス調査

以下を収集する:
- docs/ 配下の公開ページ数（カテゴリ別）
- GA4/GSC のアクセスデータ（利用可能な場合）

### Step 3: NSM 候補の検討

| 候補 | 概要 |
|---|---|
| 月間オーガニック検索流入ユーザー数 | SEO 経由の新規ユーザー数 |
| 週間 2ページ以上閲覧セッション数 | 学習目的のエンゲージメント指標 |
| 月間リピーター数 | 定期的に参照するユーザー数 |
| 月間ページ閲覧数（PV） | 全体の利用量 |
| 月間平均滞在時間 | コンテンツの深い利用 |

### Step 4: NSM の決定

7 基準の評価表を作成し、最もスコアの高い候補を NSM として選定する。

### Step 5: Input Metrics の定義

NSM を駆動する 3-5 の Input Metrics を定義する。

## 出力フォーマット

> **分量バジェット**（真実源: `.claude/knowledge/reference/docs-markdown-style.md`「長さの既定」）:
> 結論を先頭に。**各案・各項目は 12 行以内**、表は上位 5 行＋「他 N 件」。
> 検討したが採らなかった案は 1 行で理由だけ書く（比較表を作らない）。

```markdown
# doboku-note North Star Metric

## ビジネスゲーム
- 分類: [Attention / Productivity]
- 理由: ...

## North Star Metric

### [NSM 名]
- **定義**: ...
- **現在値**: N
- **目標値**: N（3ヶ月後）

### 7 基準チェック
| 基準 | 評価 | 根拠 |
|---|---|---|
| 理解しやすい | ○ | ... |
| ... | | |

## Input Metrics

### 1. [Input Metric 名]
- **定義**: ...
- **NSM との関係**: [Input] → [NSM] のメカニズム
- **施策例**: ...

## メトリクスツリー

NSM
├── Input 1
├── Input 2
└── Input 3

## 計測方法
| 指標 | データソース | 更新頻度 |
|---|---|---|
| NSM | GA4 / GSC | 週次 |
```

会話内で出力する（恒久保存は `.claude/skills/management/nsm-experiment/references/definition.md` を更新）。

## 参照

- `.claude/skills/management/growth-loops/SKILL.md` — 成長ループ分析
- `.claude/skills/management/monetization-strategy/SKILL.md` — 収益化戦略
- 原典: Pawel Huryn の North Star Framework
