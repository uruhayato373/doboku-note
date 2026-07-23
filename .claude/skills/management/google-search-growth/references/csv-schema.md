# GSC/GA4 UI CSV 正規化 schema（真実源）

`scripts/lib/google-console-csv.mjs` と `scripts/normalize-google-console-csv.mjs` が生成する
共通 JSON の仕様。CSV を直接分析せず、必ずこの共通形式へ正規化してから突合する。

## 生成物の置き場

```
.claude/state/metrics/gsc-ui/<run-id>/
├── manifest.json                              # 取得メタ（fetch-gsc-ui-csv.mjs）
├── <issue>--<scope>--<run-id>.csv             # raw CSV（上書きしない）
└── normalized/
    ├── <issue>--<scope>.json                  # 共通 JSON（正規化）
    └── <issue>--<scope>.rejects.json          # parse 不能行（あるときのみ）
```

`<issue>` = `crawledNotIndexed | redirect | notFound | alternateCanonical | forbidden`
`<scope>` = `allKnownPages | allSubmittedPages`

## 正規化 JSON（gsc-ui-page-indexing）

```json
{
  "schemaVersion": 1,
  "source": "gsc-ui-page-indexing",
  "runId": "2026-07-24T12-00-00Z",
  "property": "sc-domain:doboku-note.com",
  "issue": "crawledNotIndexed",
  "scope": "allSubmittedPages",
  "uiTotal": 346,
  "exportedRows": 346,
  "truncated": false,
  "rows": [
    {
      "url": "https://doboku-note.com/docs/example",
      "comparisonKey": "/docs/example",
      "lastCrawled": "2026-07-11",
      "duplicateCount": 1,
      "raw": { "URL": "...", "最終クロール日": "..." }
    }
  ],
  "rejects": [
    { "line": 12, "rawUrl": "not a url", "raw": {}, "reason": "unparseable-url" }
  ]
}
```

### フィールド定義

| フィールド | 意味 |
|---|---|
| `uiTotal` | GSC 画面上の「該当ページ総数」（1,000 超で truncated の根拠） |
| `exportedRows` | CSV の実データ行数（GSC の例 URL は最大 1,000） |
| `truncated` | `uiTotal > exportedRows` または `uiTotal > 1000` または `exportedRows >= 1000` |
| `rows[].url` | trim 済み原文 URL |
| `rows[].comparisonKey` | 保守的キー（host 除去・fragment 除去・末尾/重複スラッシュ・query・encoding は保持） |
| `rows[].duplicateCount` | 同一 comparisonKey の総出現回数（GSC が同一 URL を複数例示することがある） |
| `rows[].lastCrawled` | 最終クロール日（列が判別できたときのみ） |
| `rows[].raw` | 全列の生値（列名→値） |
| `rejects[]` | parse 不能行（`empty-url` / `unparseable-url`）。分析には使わないが記録する |

## URL キーの二系統（`scripts/lib/url-normalization.mjs`）

- **comparisonKey**（保守的・同一性）: `toComparisonKey()`。
  `/docs/a` と `/docs/a/` は**別**、`/docs/a` と `/docs//a` も**別**（勝手に同一視しない）。
  query・percent-encoding は保持、fragment のみ除去、host は落とす（www 差を吸収）。
- **joinKey**（積極的・突合用）: `toJoinKey()`。
  host(www)・query・fragment・末尾スラッシュを寄せる。GA4 page / GSC page / sitemap /
  URL Inspection との join に使う（`report-ga4-gsc-crosswalk.mjs` の normPath と同規則）。

## CSV パーサの要件（`parseCsv` / `parseCsvRecords`）

- UTF-8 BOM 除去（`stripBom`）
- CRLF / LF / lone CR をレコード区切り
- 引用フィールド内の comma / 改行 / エスケープ `""` を保持
- `split(",")` は使わない（RFC 4180 準拠パーサ）
- ヘッダーは ja/en を `HEADER_ALIASES` で写像（URL / 最終クロール日 ↔ Last crawled）。
  未知ヘッダーは `raw` に温存、URL 列が特定できなければ第 1 列を URL とみなす

## 上書き禁止

- raw CSV・manifest.json は**上書きしない**（再取得は新しい run-id）。
- normalized JSON は run 配下 `normalized/` に生成。ad-hoc（`--file`）は `_adhoc/` に隔離。

## GA4 UI CSV

一次経路は Data API（`npm run fetch-ga4-data`）。UI CSV は API で再現できない探索/照合用の
バックアップとして `.claude/state/metrics/ga4-ui/<run-id>/` に raw + manifest を保存する
（28 日窓・Asia/Tokyo を manifest.window に記録・`apiPreferred: true`）。
