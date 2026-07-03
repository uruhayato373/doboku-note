---
name: fetch-gsc-data
description: >
  Google Search Console の検索パフォーマンスデータを取得する。
  Use when user asks to [GSCデータ取得, サーチコンソール, 検索クエリ分析, /fetch-gsc-data].
---

## 用途

Google Search Console API から検索パフォーマンスデータ（クエリ・ページ・クリック数・表示回数・CTR・掲載順位）を取得し、SEO分析に活用する。

## 前提条件

> **恒久ルール（2026-06-05・`docs/reference/measurement-incidents.md`）**: 計測データは **CI/CD 供給が正・ローカル creds は不要**。会社 PC はプロキシで外部 API が遮断されるため、**まず `.claude/state/metrics/gsc/` の既存スナップショット（CI 生成）を読む**。ローカル取得は Mac/CI/クラウドでのみ可。以下のローカル creds 手順は CI/Mac でフレッシュ取得が必要な場合に限る。

1. GCPコンソールでサービスアカウントを作成済み
2. Search Console API を有効化済み
3. JSON鍵ファイルを `credentials/` に配置済み
4. GSCプロパティ（`sc-domain:doboku-note.com`）にサービスアカウントのメールアドレスをユーザー追加済み
5. `.env.local` に `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` を設定済み

## 引数

| 引数 | 必須 | 説明 | デフォルト | 例 |
|---|---|---|---|---|
| --days | — | 取得期間（日数） | 28 | `--days 7` |
| --dimension | — | 集計軸（query/page/date/country/device） | query | `--dimension page` |
| --limit | — | 取得件数上限 | 100 | `--limit 50` |
| --query | — | クエリフィルタ（部分一致） | — | `--query "技術士"` |
| --page | — | URLフィルタ（部分一致） | — | `--page "/docs/"` |

## 実行手順

### Step 1: データ取得

Bash ツールで以下を実行:

```bash
npm run fetch-gsc-data -- [オプション]
```

**よく使うパターン:**

```bash
# 基本: 過去28日のクエリ別パフォーマンス
npm run fetch-gsc-data

# 過去7日のページ別パフォーマンス
npm run fetch-gsc-data -- --dimension page --days 7

# 「技術士」を含むクエリのみ
npm run fetch-gsc-data -- --query "技術士"

# /docs/ 配下のページのみ
npm run fetch-gsc-data -- --dimension page --page "/docs/"

# 日付別トレンド
npm run fetch-gsc-data -- --dimension date --days 90
```

### Step 2: 結果の分析

取得したデータは以下に出力される:
- **コンソール**: サマリー（上位30件）
- **JSONファイル**: `.claude/state/metrics/gsc/gsc-{dimension}-{timestamp}.json`（全件）

JSONファイルを Read ツールで読み込み、以下の観点で分析する:
- **高インプレッション低CTR**: タイトル・ディスクリプションの改善候補
- **高順位低クリック**: リッチスニペット対策の候補
- **低順位高インプレッション**: コンテンツ強化で上位表示を狙える候補
- **ゼロクリック**: 掲載はあるがクリックされていないページ

## 出力形式

```json
{
  "meta": {
    "startDate": "2026-03-13",
    "endDate": "2026-04-07",
    "dimension": "query",
    "limit": 100
  },
  "rows": [
    {
      "keys": ["技術士 総合技術監理"],
      "clicks": 42,
      "impressions": 1200,
      "ctr": 0.035,
      "position": 8.2
    }
  ]
}
```

## 参照

- `.claude/skills/analytics/fetch-gsc-data/scripts/fetch-gsc-data.mjs` — 実装
- `CLAUDE.md` — プロジェクト概要
- `gsc-index-auditor` エージェント — URL Inspection から index coverage を診断（`/gsc-review` 経由・月次）
- `metrics-analyzer` エージェント — GSC/GA4 から performance 改善候補を抽出（`/weekly-improve` 経由・週次）
- `docs/reference/gsc-management.md` — GSC 管理の分業・閾値・判断マトリクスの真実源
