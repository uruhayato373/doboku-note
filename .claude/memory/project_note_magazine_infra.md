---
name: note-magazine-infra
description: "note 有料マガジン CTA は frontmatter 駆動 (src/lib/note-magazines.ts SSoT)。8 配置パターン + 4 ペルソナカバー画像準備済み、本番デプロイ済み。公開時は noteUrl 埋めて published: true にするだけで全配置先に自動表示"
metadata: 
  node_type: memory
  type: project
  originSessionId: db38307a-8cf7-4117-b0a1-ca71495838d9
---

note 有料マガジン CTA インフラ (2026-05-16 実装 / 2026-05-17 本番デプロイ完了):

## 構成

- **SSoT**: `src/lib/note-magazines.ts` (マガジン定義) + `src/lib/magazine-placement.ts` (slug→マガジン マッピング)
- **画像**: `public/images/magazines/{tankan,essay-{4 ペルソナ}}-cover.{png,webp}` (1280×670 T06 mono-tag)
- **再生成**: `scripts/generate-magazine-covers.mjs` (satori + 既存 OGP テンプレ再利用)
- **AI 検索導線**: `public/llms.txt` (openai/chatgpt 流入対策)

## 配置パターン (8 種類)

- `pillar` (5 本) / `keyword` (600+) / `keyword-2026` → 精読ガイド ¥7,800 (既公開: `m607bf095b02a`)
- `pattern-essay-{persona}` (4 本) / `r0X-essay-{persona}` (16 本) → 該当ペルソナ模範論文
- `r0X-secondary` (7 本) / `essay-exam-strategy` → 全 4 ペルソナ + 精読ガイド
- `mlit-whitepaper-2025` (白書ハブ) / `essay-mlit-*` (7 テーマ) → テーマ別ペルソナ

## マガジン一覧

- **既公開**: tankan-reading-guide (¥7,800)
- **公開準備中 (published: false)**: essay-{river-consultant, general-contractor, environment-survey, road-municipality}-magazine
  - 原稿: `docs/note/magazines/総監模範論文-*/R0X/article.md` に完成済み (各 5 本、道路のみ 3 本)
  - カバー画像: `public/images/magazines/essay-{persona}-cover.{png,webp}` 準備済み

## Why

GA4 で note.com → site が 21u/14d・engagement 76%・12分滞在と異常に良質だったが、site → note は pillar/keyword のみで pattern-essay-* / r07-secondary に未到達だった。frontmatter 駆動で「note 公開時に運営者が `noteUrl` を埋めるだけ」を実現。

## How to apply

模範論文を note 公開した時の手順 (運営者作業):
1. note.com で 4 ペルソナ × 5 年分マガジン作成、`public/images/magazines/essay-{persona}-cover.png` をカバーにアップ
2. 各マガジンの URL を取得し、`src/lib/note-magazines.ts` の対応エントリで `noteUrl` を埋めて `published: true` に変更
3. commit → `/deploy` → 約 35 配置先に CTA が即時表示

## UTM 規約

utm_source=doboku-note / utm_medium=referral / utm_campaign=note-magazine / utm_content={slug-prefix-stripped}-{position}

## 落とし穴

- **MagazineInlineCard / SidebarCard は aspect-square クロップ**: カバーは 1280×670 landscape だが中央 630×630 セーフティゾーン内に主要要素を配置 (T06 テンプレが対応)
- **`exactOptionalPropertyTypes: true`**: `price?: string` に `undefined` を渡せない → conditional spread `{...(price ? { price } : {})}` で対応
- **mlit-whitepaper-2025 で `<SeeAlso items={[...]} />` 誤用 → 500 エラー**: SeeAlso は単体 (`{href, title, reason}`)、リスト用途は RelatedKeywords か Markdown bullet。エラーメッセージは "Cannot destructure property 'auth'" と紛らわしい

関連: [[project_v3_strategy]] (合格体験者ポジション)、[[hub-strengthening-approach]] (CTR 改善)、handoff: `docs/handoffs/2026-05-17-magazine-cta-and-deploy.md`
