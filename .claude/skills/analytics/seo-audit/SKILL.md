---
name: seo-audit
description: >
  doboku-note の SEO 健全性を技術・コンテンツ・内部リンクの 3 軸で総合監査し、改善アクションリストを出力する。sitemap 整合性・meta タグ・構造化データ・タイトル重複・内部リンク構造をチェック。
  Use when user asks to [SEO 監査, SEO チェック, サイト監査, /seo-audit].
---

# /seo-audit — SEO 総合監査

サイト全体の SEO 健全性を監査し、改善アクションリストを生成するスキル。

## 実行トリガー

ユーザーが `/seo-audit` を実行した時。

## 監査カテゴリ

### 1. 技術 SEO

| チェック項目 | 確認方法 | 重要度 |
|---|---|---|
| sitemap.xml | `public/sitemap.xml` + `public/sitemap-0.xml` の存在・URL整合性 | Critical |
| robots.txt | `public/robots.txt` の内容・ドメイン整合性 | Critical |
| メタデータ (title, description) | 全 `.mdx` ファイルの frontmatter 確認 | High |
| canonical URL | 各ページの canonical 設定（重複排除） | High |
| 構造化データ (JSON-LD) | `src/components/seo/StructuredData.tsx` の実装状況 | Medium |
| OGP / Twitter Card | `src/lib/metadata.ts` の設定確認 | Medium |
| モバイル対応 | viewport メタタグ・レスポンシブ CSS | Medium |
| ページ速度要因 | 画像最適化・font-display・lazy loading | Low |

### 2. コンテンツ SEO

| チェック項目 | 確認方法 | 重要度 |
|---|---|---|
| 見出し構造 (h1/h2/h3) | MDX 内の `#` / `##` / `###` 階層 | High |
| 画像 alt 属性 | `<img>` タグの alt 有無 | High |
| 内部リンク | `/docs/` リンクの充実度・孤立ページ検出 | High |
| description 長さ | 50〜160文字の範囲内か | Medium |
| title 長さ | 30〜60文字の範囲内か | Medium |

### 3. ドメイン・設定整合性

| チェック項目 | 確認方法 | 重要度 |
|---|---|---|
| ドメイン統一 | robots.txt / sitemap / metadata / StructuredData のドメイン一致 | Critical |
| published フラグ | `published: false` のページが sitemap に含まれていないか | High |

## 出力形式

### レポート構成

```markdown
# SEO 監査レポート — {日付}

## サマリー
- Critical: {n}件
- High: {n}件
- Medium: {n}件
- Low: {n}件

## Critical 問題
...

## High 問題
...

## Medium 問題
...

## Low 問題
...

## 改善アクションリスト（優先順）
1. ...
2. ...
```

### 出力先

- 画面表示（会話内）
- **GitHub Issue 化**: 監査結果は md では保存せず、GitHub Issue として起票し継続的に追跡する
  - 初回監査は Umbrella Issue を起票し、優先度別アクション（P1〜）を子 Issue として分解
  - 再監査時は新規 Issue `[SEO Audit] YYYY-MM-DD` として起票し、既存 Umbrella の comment にリンク
  - 既存 Umbrella: #72 （2026-04-08 監査ベース）
  - label: `seo`, `umbrella`（初回のみ）

## 注意事項

- GSC / GA4 データは別スキル（`/fetch-gsc-data`, `/fetch-ga4-data`）で取得。本スキルはコードベース・設定ファイルの静的監査に集中
- 外部ツール（PageSpeed Insights, Lighthouse等）は参考情報として言及するが、API呼び出しは行わない
- **監査 md は `docs/reviews/seo-audit/` に残さない**（2026-04-22 運用変更）。継続改善は Issue で管理する
