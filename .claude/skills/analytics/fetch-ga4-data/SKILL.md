Google Analytics 4 (GA4) Data API から doboku-note.com のアクセスデータを取得する。

## 用途

- ページ別 PV・ユーザー数・滞在時間を取得したいとき
- 流入経路（Direct / Organic / Referral / Social）の内訳を確認したいとき
- デバイス別のアクセス傾向を分析したいとき

## 引数

```
$ARGUMENTS — [期間] [レポート種類] [フィルタ]
             期間: last7d | last28d | last3m | last6m | YYYY-MM-DD:YYYY-MM-DD（デフォルト: last28d）
             レポート種類: pages | channels | devices | daily | overview（デフォルト: pages）
             フィルタ: 任意のページパスフィルタ（例: page=/docs/general）
```

## 前提

- サービスアカウント鍵: `doboku-note-*.json`（リポジトリルートに配置、gitignore 済み）
- GA4 プロパティ ID: 要設定（`docusaurus.config.js` の gtag trackingID: `G-8VXJ1RL1HG` を参照）
- npm パッケージ: `googleapis`

## 手順

### Step 1: データ取得

`node -e` でインライン実行する。

```javascript
const { google } = require('googleapis');
const fs = require('fs');
const keyFile = fs.readdirSync('.').find(f => f.startsWith('doboku-note-') && f.endsWith('.json'));
if (!keyFile) throw new Error('サービスアカウント鍵が見つかりません');
const auth = new google.auth.GoogleAuth({
  keyFile,
  scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
});
const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });
const PROPERTY = 'properties/<GA4_PROPERTY_ID>';
```

### Step 2: レポート種類別のリクエスト

#### pages — ページ別 PV

```javascript
requestBody: {
  dateRanges: [{ startDate, endDate }],
  dimensions: [{ name: 'pagePath' }],
  metrics: [
    { name: 'screenPageViews' },
    { name: 'activeUsers' },
    { name: 'averageSessionDuration' },
  ],
  orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
  limit: 30,
}
```

#### channels — 流入経路別

```javascript
requestBody: {
  dateRanges: [{ startDate, endDate }],
  dimensions: [{ name: 'sessionDefaultChannelGroup' }],
  metrics: [
    { name: 'sessions' },
    { name: 'activeUsers' },
    { name: 'screenPageViews' },
    { name: 'bounceRate' },
  ],
}
```

#### overview — サマリー

```javascript
requestBody: {
  dateRanges: [{ startDate, endDate }],
  metrics: [
    { name: 'activeUsers' },
    { name: 'sessions' },
    { name: 'screenPageViews' },
    { name: 'averageSessionDuration' },
    { name: 'bounceRate' },
    { name: 'newUsers' },
  ],
}
```

### Step 3: 期間の計算

| 指定 | startDate | endDate |
|---|---|---|
| last7d | 8日前 | 1日前 |
| last28d | 29日前 | 1日前 |
| last3m | 91日前 | 1日前 |
| last6m | 181日前 | 1日前 |

### Step 4: 分析コメント

- **人気ページ**: PV 上位のページとカテゴリ
- **滞在時間**: 学習コンテンツとしてのエンゲージメント
- **流入経路**: Organic の割合（SEO 効果の指標）
- **デバイス**: モバイル vs デスクトップの比率

## よく使うパターン

```bash
/fetch-ga4-data last28d overview                    # 全体サマリー
/fetch-ga4-data last28d pages                       # ページ別PV
/fetch-ga4-data last28d pages page=/docs/general    # 一般カテゴリ
/fetch-ga4-data last28d channels                    # 流入経路
/fetch-ga4-data last28d daily                       # 日別推移
```

## 参照

- [GA4 Data API ドキュメント](https://developers.google.com/analytics/devguides/reporting/data/v1)
- GA4 Measurement ID: `G-8VXJ1RL1HG`（docusaurus.config.js）
