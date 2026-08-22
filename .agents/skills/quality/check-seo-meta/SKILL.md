---
name: check-seo-meta
description: >
  build 済み out/ の全 URL（/docs/* + 静的ルート）を検査して title・description・self canonical・
  self og:url・robots・JSON-LD・SSR の欠落/不一致を検出する。canonical は self URL 完全一致で判定。
  検査ロジックは build 後 SEO スキャナ（scripts/lib/seo-checks.mjs）を再利用。母集合は
  doc-meta-index.json（published のみ）で、収集不足時は監査失敗にする。dev server は不要（out/ 直接検査が主経路・HTTP は --base-url）。
  Use when user asks to [SEO meta 監査, OGP 検証, title 重複チェック, 構造化データ検証, /check-seo-meta].
---

# /check-seo-meta — SEO meta タグ・OGP・JSON-LD 監査

build 済み out/ の全 URL の HTML から `<title>`, `<meta>`, `<link rel="canonical">`, `og:url`, `robots`, `<script type="application/ld+json">`, `<main>`/`<h1>`/本文 を構造化パーサ（node-html-parser）で抽出し、self canonical/og:url 一致・title 重複・欠落を検出するスキル。検査関数は build 後 SEO スキャナ（`scripts/lib/seo-checks.mjs`）と共有し、`npm run check-seo-build` と同じ判定を単一 URL 群にも適用する。

## 設計の真実源

すべての運用パラメータは **`.Codex/config/seo-meta-config.json`** に集約。

| 項目 | 初期値 | 変更する時 |
|---|---|---|
| 検査対象 | build 済み `out/`（主経路） | HTTP は `--base-url https://doboku-note.com` |
| 巡回 URL ソース | `src/config/doc-meta-index.json`（`docs` object・published/noindex で絞る）+ `include_routes` | 静的ルート追加・除外時 |
| 母集合ガード | doc URL ≥ max(1000, published×0.9) | 記事総数が大きく変わった時 |
| concurrency | 8（HTTP モードのみ） | 本番巡回で詰まったら下げる |
| title | `doboku-note` 出現 ≤ 1（重複検出） | サイト名変更時 |
| description | 160 文字超は警告のみ | SEO 方針変更時 |
| canonical / og:url | **self URL 完全一致**（seo-checks 共通） | ドメイン変更時 |
| JSON-LD | parse 可能・Article 系は headline 整合（参考） | 構造化データ戦略変更時 |

> [!note]
> 判定ロジック（閾値含む）の実体は `scripts/lib/seo-checks.mjs`。config の `thresholds`/`severity` は
> HTTP 巡回の互換用に残るが、canonical/og:url/title/SSR の実判定は seo-checks 側が真実源。

## 前提

- **主経路は out/ 直接検査（dev server 不要）**。先に `npm run build` で out/ を生成しておく
  - HTTP 巡回が必要な場合のみ `--base-url https://doboku-note.com`（本番は Cloudflare Bot 保護で制限され得る・Issue #159）
- **母集合ガード**: doc-meta-index.json（`published !== false && noindex !== true`）から doc URL を全収集し、
  収集数が published の 90%（かつ最低 1,000）を下回ると監査失敗（exit 1）。母集合不足を「違反ゼロ＝成功」と誤認しない
- Node 20+ / node-html-parser（`seo-checks.mjs` 経由）に依存

## 実行フロー

### 検査（一発で実行）

```bash
# 全 URL（out/ 直接・1,000+ ページ）
npm run check-seo-meta

# 先頭 20 URL のみ（dry-run・母集合ガードはスキップ）
npm run check-seo-meta -- --limit 20

# 結果 JSON を stdout に流す
npm run check-seo-meta -- --json

# HTTP 巡回（本番・Bot 注意）
npm run check-seo-meta -- --base-url https://doboku-note.com
```

結果は `.Codex/state/metrics/seo-meta/seo-meta-{timestamp}.json` に時系列保存。

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
  "version": 2,
  "generated_at": "2026-07-13T22:00:00.000Z",
  "base_url": "out/ (static export)",
  "mode": "out",
  "summary": {
    "urls_checked": 1073,
    "doc_urls_collected": 1064,
    "published_total": 1064,
    "urls_with_violations": 74,
    "by_severity": { "HIGH": 0, "MEDIUM": 81, "LOW": 0 },
    "by_type": { "jsonld_headline_mismatch": 55, "description_long": 24, "ssr_thin_body": 2 },
    "duration_ms": 73300
  },
  "results": [
    {
      "url": "/docs/...",
      "title": { "value": "...", "length": 45 },
      "description": { "value": "...", "length": 120 },
      "canonical": "https://doboku-note.com/docs/...",
      "og_url": "https://doboku-note.com/docs/...",
      "robots": "index, follow",
      "json_ld": { "count": 5 },
      "violations": []
    }
  ],
  "violations_by_type": { "description_long": ["/docs/..."] }
}
```

## 違反タイプと Severity

seo-checks.mjs の findings を写像（`error → HIGH` / `warn → MEDIUM` / `info → LOW`）。

| type | severity | 内容 |
|---|---|---|
| `title_missing` | HIGH | `<title>` 自体が無い |
| `title_sitename_dup` | **HIGH** | `doboku-note` が title 内で 2 回以上出現（template 重複の検出） |
| `description_missing` | HIGH | meta description が無い |
| `description_long` | MEDIUM | 160 文字超（**警告のみ・CI は落とさない**） |
| `canonical_missing` | HIGH | `<link rel="canonical">` が無い |
| `canonical_mismatch` | HIGH | canonical が self URL と**完全一致しない**（ドメイン接頭辞だけでは判定しない） |
| `og_url_missing` | HIGH | og:url が無い |
| `og_url_mismatch` | HIGH | og:url が self URL と一致しない |
| `unexpected_noindex` | HIGH | indexable 期待ページに robots noindex |
| `jsonld_parse_error` | HIGH | JSON-LD が JSON.parse できない |
| `jsonld_missing` | MEDIUM | `<script type="application/ld+json">` が 1 つも無い |
| `jsonld_headline_mismatch` | MEDIUM | Article 系 JSON-LD headline が可視 H1/title と乖離（seoTitle と H1 の設計差は許容範囲・参考） |
| `ssr_no_main` / `ssr_no_h1` | HIGH | `<main>` / `<h1>` が無い（SSR 破壊） |
| `ssr_thin_body` | MEDIUM | 本文が薄い（main/H1 は在る・hidden カテゴリ等は正当） |
| `html_missing` | HIGH | out に対応 HTML が無い |
| `fetch_error` | HIGH | （HTTP モード）URL の取得自体が失敗 |

## ワークフロー

1. `npm run build` で out/ を生成
2. `npm run check-seo-meta -- --limit 20` で動作確認
3. 全 URL 検査: `npm run check-seo-meta`（1,000+ URL・母集合ガード有効）
4. レポート確認: `npm run check-seo-meta:check`
5. HIGH 違反があれば修正 → 再ビルド → 再検査
6. build 直後の常設ゲートは `npm run check-seo-build:ci`（CI 配線済み）。本スキルは母集合全体の定点観測・履歴保存用

## 関連スキル

- `.Codex/skills/analytics/psi-audit/`: 同じパイプライン構造（巡回 → JSON 保存 → 閾値検証）
- `.Codex/skills/quality/check-mdx/`: MDX 自体の品質チェック（content 側）

## 既知の制約

- **out/ 直接検査が主経路**（dev server 不要・本番に一致）。`--base-url` の HTTP 巡回は Cloudflare Bot 保護（Issue #159）で遮断され得る
- **JSON-LD 構造の深い検証は対象外** — parse と headline の基本整合まで。Rich Results は FAQ 施策 KPI にしない（Google Rich Results Test で目視補完）
- **description 160 文字超は警告のみ**（CI を落とさない）。title/description の一括変更はしない方針（GSC 管理 SSOT の 2026-07-10 教訓）
