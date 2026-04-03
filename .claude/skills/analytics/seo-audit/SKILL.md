---
name: seo-audit
description: >
  GSC/GA4実データ＋サイト構造を分析してSEO監査レポートを生成する。Use when user asks to [SEO監査, サイトのSEOを確認したい, /seo-audit].
---

doboku-note.com の SEO を総合的に監査する。データ取得 → 分析 → 改善提案を一気通貫で行い、優先度付きのアクションリストを生成する。

## 引数

```
/seo-audit [--focus AREA] [--period PERIOD]
```

- `--focus`: 監査の重点領域（省略時: 全領域）
  - `technical`: 技術 SEO（サイトマップ・Core Web Vitals・構造化データ）
  - `content`: コンテンツ最適化（タイトル・ディスクリプション・内部リンク）
  - `keywords`: キーワード分析（順位・CTR・カニバリゼーション）
- `--period`: GSC/GA4 のデータ期間（デフォルト: `28d`）。`7d`, `28d`, `3m`, `6m`

## 手順

### Phase 1: データ収集（並列サブエージェント）

3つのサブエージェントを**同時に起動**する。

#### Agent A: GSC パフォーマンスデータ

GSC API からデータを取得する（サービスアカウント鍵がある場合）。

取得するデータ:

1. **ページ別パフォーマンス（上位100）**
   - dimensions: page
   - metrics: clicks, impressions, ctr, position

2. **クエリ別パフォーマンス（上位200）**
   - dimensions: query
   - metrics: clicks, impressions, ctr, position

3. **クエリ×ページ（上位500）**
   - カニバリゼーション検出用

4. **デバイス別パフォーマンス**

出力形式:
- 総クリック数・インプレッション数・平均 CTR・平均掲載順位
- カテゴリ別の集計（/docs/general/, /docs/road/, /docs/river/, /docs/low/）
- 上位クエリ 50 件（clicks 順）

#### Agent B: GA4 トラフィックデータ

GA4 API からデータを取得する。

取得するデータ:

1. **ページ別 PV（上位100）**
2. **流入チャネル別**
3. **デバイス別**

出力形式:
- 総 PV・ユーザー数・直帰率・平均セッション時間
- カテゴリ別の PV 集計
- チャネル別セッション比率

#### Agent C: サイト構造・技術監査

コードベースから技術的な SEO 状態を調査する。

```
調査項目:
- docs/ 配下の .mdx ファイル数（カテゴリ別）
- docusaurus.config.js のメタデータ設定
- sitemap 設定（@docusaurus/plugin-sitemap）
- robots.txt の有無（static/robots.txt）
- 構造化データの有無
- 各 MDX ファイルの frontmatter（title, description の有無）
- 内部リンクの状況
```

出力形式:
- コンテンツ規模の全体像
- SEO 設定の充足度
- メタデータ不足のページ一覧

### Phase 2: 分析（5つの観点）

#### 2-1. インデックス状況とカバレッジ
- サイトマップ URL 数 vs GSC データ
- インデックスされていないページの特定

#### 2-2. キーワードパフォーマンス
- **Low-Hanging Fruit（順位 4-20 位）**: 少しの改善で上位表示できるクエリ
- **高インプレッション低 CTR**: タイトル・ディスクリプション改善候補
- **カニバリゼーション**: 同一クエリで複数ページが競合

#### 2-3. コンテンツ最適化
- タイトルタグの品質（長さ、キーワード含有）
- メタディスクリプション（未設定 / 長すぎ / 短すぎ）
- 構造化データの実装状況
- 内部リンクの網羅性

#### 2-4. モバイル・パフォーマンス
- モバイル vs デスクトップの順位差
- 直帰率差異

#### 2-5. 競合・機会分析
- 検索クエリのカテゴリ分布
- 未カバーのテーマ
- 季節性パターン（資格試験シーズン）

### Phase 3: アクションリスト生成

| 優先度 | 基準 |
|---|---|
| P0（今すぐ） | インデックス問題・重大な技術的エラー |
| P1（今週中） | 低コストで効果が見込める改善 |
| P2（今月中） | 中期的な改善 |
| P3（バックログ） | 効果は見込めるが工数が大きい |

### Phase 4: 出力

`docs/reviews/seo-audit/YYYY-MM.md` に保存する。

## トーンと姿勢

- **データで語る**: 推測ではなく数値に基づく提案
- **実行可能性を重視**: 個人開発の現実を踏まえ ROI の高い施策に絞る
- **優先度を明確に**: P0 は最大3件

## 推奨実行頻度

- **月次**: フルレポート（全領域）
- **隔週**: キーワード分析のみ（`--focus keywords`）

## 参照

- `.claude/skills/analytics/fetch-gsc-data/SKILL.md` — GSC データ取得
- `.claude/skills/analytics/fetch-ga4-data/SKILL.md` — GA4 データ取得
- `docusaurus.config.js` — サイト設定
