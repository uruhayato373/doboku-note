Google Search Console API から doboku-note.com の検索パフォーマンスデータを取得する。

## 用途

- 検索クエリ別のクリック数・表示回数・CTR・掲載順位を取得したいとき
- ページ別・デバイス別のパフォーマンスを分析したいとき
- コンテンツの SEO 効果を定量評価したいとき

## 引数

```
$ARGUMENTS — [期間] [ディメンション] [フィルタ]
             期間: last7d | last28d | last3m | last6m | YYYY-MM-DD:YYYY-MM-DD（デフォルト: last28d）
             ディメンション: query | page | device | country | date（カンマ区切りで複数可、デフォルト: query）
             フィルタ: 任意のURL/クエリフィルタ（例: page=/docs/general, query=施工管理）
```

## 前提

- サービスアカウント鍵: `doboku-note-*.json`（リポジトリルートに配置、gitignore 済み）
- サイト: `sc-domain:doboku-note.com` または `https://doboku-note.com/`（Search Console に登録済み）
- npm パッケージ: `googleapis`（未インストールの場合は `npm install -D googleapis` を実行）

## 手順

### Step 1: パッケージ確認

```bash
node -e "require('googleapis')" 2>/dev/null && echo "OK" || echo "INSTALL NEEDED"
```

### Step 2: データ取得スクリプト実行

```javascript
const { google } = require('googleapis');
const fs = require('fs');

// サービスアカウント鍵を自動検出
const keyFile = fs.readdirSync('.').find(f => f.startsWith('doboku-note-') && f.endsWith('.json'));
if (!keyFile) throw new Error('サービスアカウント鍵が見つかりません');
const SITE_URL = 'sc-domain:doboku-note.com';

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const searchconsole = google.searchconsole({ version: 'v1', auth });
  const res = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: '<startDate>',
      endDate: '<endDate>',
      dimensions: ['<dim1>'],
      rowLimit: 100,
    },
  });
  console.log(JSON.stringify(res.data, null, 2));
}
main();
```

### Step 3: 期間の計算

| 指定 | startDate | endDate |
|---|---|---|
| last7d | 9日前 | 2日前 |
| last28d | 30日前 | 2日前 |
| last3m | 92日前 | 2日前 |
| last6m | 182日前 | 2日前 |

### Step 4: 結果の整形・レポート

**クエリ別レポート:**

| # | クエリ | クリック | 表示 | CTR | 順位 |
|---|---|---|---|---|---|
| 1 | 施工管理 品質管理 | 150 | 3,200 | 4.7% | 8.2 |

### Step 5: 分析コメント

- **上位クエリ**: 最もトラフィックを稼いでいるキーワード
- **CTR 改善候補**: 表示回数が多いが CTR が低いクエリ
- **順位改善候補**: 11〜20位のクエリ
- **カテゴリ別**: どのセクション（general, road, river, low）が強いか

## よく使うパターン

```bash
/fetch-gsc-data last28d query                    # 検索クエリ上位
/fetch-gsc-data last28d page                     # ページ別
/fetch-gsc-data last28d page page=/docs/general  # 一般カテゴリのみ
/fetch-gsc-data last7d date                      # 日別推移
/fetch-gsc-data last28d device                   # デバイス別
```

## 参照

- [Search Console API ドキュメント](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
