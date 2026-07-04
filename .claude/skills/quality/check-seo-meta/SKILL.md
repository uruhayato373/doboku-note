---
name: check-seo-meta
description: >
  サイトの全 URL（/docs/* + 静的ルート）を巡回して title・description・OGP・twitter card・canonical・JSON-LD
  の重複・欠落・長さ違反を検出する。`.claude/config/seo-meta-config.json` の閾値で評価し、
  結果を `.claude/state/metrics/seo-meta/` に時系列保存。Issue #125 の implementation。
  Use when user asks to [SEO meta 監査, OGP 検証, title 重複チェック, 構造化データ検証, /check-seo-meta].
---

# /check-seo-meta — SEO meta タグ・OGP・JSON-LD 監査

サイト全 URL の HTML から `<title>`, `<meta>`, `<link rel="canonical">`, `<script type="application/ld+json">` を抽出し、閾値違反を検出するスキル。

## 設計の真実源

すべての運用パラメータは **`.claude/config/seo-meta-config.json`** に集約。

| 項目 | 初期値 | 変更する時 |
|---|---|---|
| base_url | `http://localhost:3020` | 本番計測時は `--base-url https://doboku-note.com` で上書き |
| 巡回 URL ソース | `src/config/doc-meta-index.json` + `include_routes` | 静的ルート追加・除外時 |
| concurrency | 8 | dev サーバーが詰まったら下げる |
| title 上限 | 70 文字 / `doboku-note` 出現 ≤ 1 | サイト名変更時 |
| description | 50〜160 文字 | SEO 方針変更時 |
| canonical | 必須 / `https://doboku-note.com/` で始まる | ドメイン変更時 |
| og 必須キー | title, description, image, url, type | OGP 戦略変更時 |
| twitter 必須キー | card | 廃止時 |
| JSON-LD | ≥1 件、BreadcrumbList または WebSite を含む | 構造化データ戦略変更時 |
| FAQ 検証 | mainEntity ≥1、Q ≥5 文字、A ≥10 文字 | FAQ 規約変更時 |

## 前提

- **ローカル `npm run dev` 起動中**（既定 port 3020）が必須
  - 本番（`https://doboku-note.com`）は Cloudflare Bot 保護で外部巡回が制限される（Issue #159 既知）
  - `--base-url` で本番指定も可能だが現状は localhost 推奨
- Node 20+ の native `fetch` のみ依存（cheerio・puppeteer 不要）

## 実行フロー

### 巡回 + 検証（一発で実行）

```bash
# 全 URL（数百ページ、所要 30〜90 秒）
npm run check-seo-meta

# 先頭 10 URL のみ（dry-run、所要 5〜10 秒）
npm run check-seo-meta -- --limit 10

# 結果 JSON を stdout に流す
npm run check-seo-meta -- --json
```

結果は `.claude/state/metrics/seo-meta/seo-meta-{timestamp}.json` に時系列保存。

### 結果レポート出力

```bash
# 最新スナップショットを Markdown 表で表示
npm run check-seo-meta:check

# Markdown ファイルに出力
npm run check-seo-meta:check -- --output /tmp/seo-meta-report.md

# HIGH のみ表示
npm run check-seo-meta:check -- --severity HIGH

# CI 用: 違反があれば exit 1
npm run check-seo-meta:check -- --exit-on-violation
```

## 出力 JSON スキーマ（抜粋）

```json
{
  "version": 1,
  "generated_at": "2026-04-26T12:00:00.000Z",
  "base_url": "http://localhost:3020",
  "summary": {
    "urls_checked": 783,
    "urls_with_violations": 0,
    "by_severity": { "HIGH": 0, "MEDIUM": 0, "LOW": 0 },
    "by_type": {},
    "duration_ms": 45123
  },
  "results": [
    {
      "url": "/docs/...",
      "title": { "value": "...", "length": 45, "doboku_note_count": 1 },
      "description": { "value": "...", "length": 120 },
      "canonical": "https://doboku-note.com/...",
      "og": { "title": "...", "description": "...", "image": "...", "url": "...", "type": "article" },
      "twitter": { "card": "summary_large_image" },
      "json_ld": { "count": 4, "types": ["WebSite", "Organization", "TechArticle", "BreadcrumbList"], "faq_count": 0 },
      "violations": []
    }
  ],
  "violations_by_type": { "title_site_name_duplicate": ["/category/civil-construction-1"] }
}
```

## 違反タイプと Severity

| type | severity | 内容 |
|---|---|---|
| `title_missing` | HIGH | `<title>` 自体が無い |
| `title_too_long` | MEDIUM | 70 文字超 |
| `title_site_name_duplicate` | **HIGH** | `doboku-note` が title 内で 2 回以上出現（template 重複の検出） |
| `description_missing` | HIGH | meta description が無い |
| `description_too_short` | LOW | 50 文字未満 |
| `description_too_long` | MEDIUM | 160 文字超 |
| `canonical_missing` | MEDIUM | `<link rel="canonical">` が無い |
| `canonical_invalid` | MEDIUM | URL が `https://doboku-note.com/` で始まらない |
| `og_key_missing` | MEDIUM | og:title / og:description / og:image / og:url / og:type のいずれかが無い |
| `twitter_card_missing` | LOW | twitter:card 未設定 |
| `json_ld_missing` | MEDIUM | `<script type="application/ld+json">` が 1 つも無い |
| `json_ld_required_type_missing` | LOW | BreadcrumbList / WebSite のいずれも JSON-LD type に無い |
| `faq_main_entity_empty` | LOW | FAQPage の mainEntity が空 |
| `faq_qa_too_short` | LOW | FAQ の Q が 5 文字未満 / A が 10 文字未満 |
| `fetch_error` | HIGH | URL の取得自体が失敗 |

## ワークフロー

1. `npm run dev`（別ターミナル）でローカル開発サーバーを起動
2. `npm run check-seo-meta -- --limit 10` で動作確認
3. 全 URL 計測: `npm run check-seo-meta`
4. レポート確認: `npm run check-seo-meta:check`
5. HIGH 違反があれば修正 → 再計測
6. （任意）GitHub Actions に組み込んで日次で計測（PSI と同じパターン）

## 関連スキル

- `.claude/skills/analytics/psi-audit/`: 同じパイプライン構造（巡回 → JSON 保存 → 閾値検証）
- `.claude/skills/quality/check-mdx/`: MDX 自体の品質チェック（content 側）

## 既知の制約

- **本番巡回時の Cloudflare Bot 保護**（Issue #159）— 短時間の高頻度アクセスで遮断される可能性。`concurrency: 4` 程度に下げ、`User-Agent` ヘッダ追加が必要なら fetch オプションを追加
- **dev サーバーの初回コンパイル遅延** — 783 URL 巡回前に `npm run build` で生成した静的 `out/` を任意の静的サーバ（例 `npx serve out`）で配信して巡回する選択肢もあり（より速く・本番に近い）
- **JSON-LD 構造の深い検証は対象外** — Google Rich Results Test での目視確認で補完する
