---
title: SEOアクセスアップ監査レビュー
description: doboku-note の検索流入を増やすためのSEO監査。canonical、メタ監査、構造化データ、sitemap、GSC機会、PSI、運用チェックを優先度つきで整理。
created: 2026-07-14
status: superseded
---

# SEOアクセスアップ監査レビュー（2026-07-14）

> [!warning]
> この初版は再精査により一部の優先順位と根拠を改訂した。実装判断には [SEOアクセスアップ監査レビュー 再精査版](./2026-07-14-seo-access-audit-v2.md) を使用すること。特に、関連リンク166件の404、FAQ施策、description文字数、個別title変更、AI bot方針を更新している。

## 結論

doboku-note は、記事ページの `title` / `description` / canonical / Article JSON-LD / Breadcrumb / FAQ / sitemap / OGP 生成までかなり整備されている。一方で、検索流入を増やす観点では **カテゴリ・固定ページのcanonical誤り** と **SEO監査スクリプトの盲点** が最優先で、ここを直さないと「実際は問題があるのに監査が緑」という状態が続く。

最初にやるべき順序は以下。

1. **P0: 固定ページ・カテゴリページのcanonicalを自己URLに修正する**
2. **P0: `check-seo-meta` を現行 `doc-meta-index.json` 形式に対応させ、全記事を本当に巡回する**
3. **P1: sitemap / out / deploy の整合をCIで検査し、sitemap掲載URLの404を防ぐ**
4. **P1: GSCで見えている高imp低CTRページをCTR改善・FAQ・内部リンクで詰める**
5. **P2: AI検索・LLM検索露出、無料ツール流入、カテゴリhub強化を設計判断する**

## 参照した主な根拠

- Google Search Central: SEO Starter Guide  
  https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Search Central: canonical URL の統合  
  https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google Search Central: sitemap の作成と送信  
  https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google Search Central: 構造化データの導入  
  https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- Google Search Central: title link の管理  
  https://developers.google.com/search/docs/appearance/title-link
- ローカル実装: `src/lib/metadata.ts`, `src/app/docs/[...slug]/page.tsx`, `src/components/seo/StructuredData.tsx`, `scripts/generate-sitemap.mjs`, `.claude/skills/quality/check-seo-meta/scripts/check-seo-meta.mjs`
- 既存戦略: `docs/project/04_運営/06_seo-note-synergy-strategy.md`

## 監査で実行した機械チェック

```bash
npm run check-seo-meta -- --json
npm run check-seo-meta -- --base-url https://doboku-note.com --json
npm run check-ogp-coverage -- --json
node scripts/generate-sitemap.mjs
npm run check-doc-lifecycle
```

補助的に以下も実行した。

```bash
node - <<'NODE'
// src/config/doc-meta-index.json の title/description/FAQ/OGP/frontmatter 統計
NODE

node - <<'NODE'
// 本番URLの canonical / og:url / title を固定ページ・カテゴリ・toolsで巡回
NODE

node - <<'NODE'
// 最新GSC query/page と PSI 履歴の機会抽出
NODE
```

## 現状の良い点

- 記事ページは `src/app/docs/[...slug]/page.tsx` で canonical が `/docs/${slug}` に設定され、metadataBase により本番URLへ解決される。
- Article / Breadcrumb / FAQ / Quiz / DefinedTerm の JSON-LD が `StructuredData` から出る。特に資格・キーワード系サイトとしては良い土台。
- `generate-sitemap.mjs` は `published:false`、`noindex:true`、`public/_redirects` の旧slugを除外しており、重複URLをsitemapに載せない意図がある。
- `check-ogp-coverage` は published 記事の `ogp.png` 欠落を検出できる。再実行時点では `checked: 1069, missing: []`。
- `src/config/doc-meta-index.json` 上、published 1067件で `description` 欠落 0、短すぎ 0、重複description 0。frontmatter品質はかなり良い。
- 最新PSI履歴では、多くの主要ページでSEOスコア100、アクセシビリティ98以上。SEO以前の技術基盤は大きく崩れていない。

## P0: 今すぐ直すべき問題

### 1. 固定ページ・カテゴリページの canonical がホームを向いている

本番を直接巡回した結果、以下のページが自己URLではなく `https://doboku-note.com` を canonical として出している。

| URL | 現在のcanonical | 影響 |
|---|---|---|
| `/about` | `/` | aboutの評価がホームに統合される可能性 |
| `/contact` | `/` | 固定ページとしての正規URLが曖昧 |
| `/privacy` | `/` | 同上 |
| `/terms` | `/` | 同上 |
| `/search` | `/` | noindex方針にするなら明示が必要 |
| `/category/civil-construction-1` | `/` | 重要hubの正規URLがホーム扱いになる可能性 |
| `/category/civil-construction-2` | `/` | 同上 |
| `/category/pe-comprehensive-management` | `/` | GSCで既に順位3.95・22impがあるため機会損失 |
| `/category/pe-first-stage` | `/` | 同上 |
| `/category/pe-construction` | `/` | 同上 |
| `/category/concrete-chief-engineer` | `/` | 同上 |
| `/category/concrete-diagnostician` | `/` | 同上 |
| `/category/reference-materials` | `/` | 同上 |

原因は `src/lib/metadata.ts` の root metadata に `alternates.canonical: "/"` があり、固定ページ・カテゴリページ側で `alternates.canonical` を上書きしていないこと。Next metadata の継承で canonical がホームのまま残っている。

実装方針:

- `src/app/category/[slug]/page.tsx` の `generateMetadata` で以下を返す。
  - `alternates: { canonical: `/category/${slug}` }`
  - `openGraph.url: `https://doboku-note.com/category/${slug}``
  - `openGraph.title`, `openGraph.description`, `openGraph.type: "website"`, `images`
  - `twitter.card: "summary_large_image"` もカテゴリ別に上書き
- `about/contact/privacy/terms` に `alternates.canonical` を追加。
- `/search` はアクセスアップ目的では index させない方がよい。`robots: { index:false, follow:true }` と `alternates.canonical: "/search"` を検討する。少なくともホームcanonicalのまま放置しない。
- `/sitemap-keywords` は canonical は正しいが、`title: '総合技術監理 キーワード索引 | doboku-note'` に root template が加わり、本番titleが `... | doboku-note | doboku-note` になっている。titleは `総合技術監理 キーワード索引` にする。
- `/sitemap-keywords` は `og:url` がホーム継承になっているので、OGも明示する。

検証:

```bash
npm run build
node .claude/skills/quality/check-seo-meta/scripts/check-seo-meta.mjs --base-url http://localhost:3020 --json
```

加えて、以下のような独自チェックを `check-seo-meta` に入れる。

- indexableな非ホームURLでは `canonical === production_url + path` を原則にする。
- `og:url` もページ自己URLと一致させる。
- `title` 内の `doboku-note` 重複を検出する。

### 2. `check-seo-meta` が全記事を巡回できていない

`npm run check-seo-meta -- --base-url https://doboku-note.com --json` は `urls_checked: 9` で完了した。これは静的include_routesのみで、記事1067件を見ていない。

原因:

- `.claude/skills/quality/check-seo-meta/scripts/check-seo-meta.mjs` の `collectUrls()` は `doc-meta-index.json` が配列、または object values が配列である前提。
- 現在の `src/config/doc-meta-index.json` は以下の形。

```json
{
  "version": 1,
  "generated_at": "...",
  "summary": { "...": "..." },
  "docs": {
    "slug": { "title": "...", "published": true }
  }
}
```

このため `Object.values(idx).flat()` では記事メタが取り出せず、結果として9URLだけの監査になる。

実装方針:

- `collectUrls()` を以下に対応させる。
  - `Array.isArray(idx)`
  - `idx.docs` が array
  - `idx.docs` が slug key object
  - legacy object values
- `published !== false` だけでなく `noindex !== true` も除外条件にする。
- `include_routes` に `/tools`, `/tools/*`, `/links`, `/sitemap-keywords`, 全カテゴリを追加。
- `--strict-self-canonical` のようなフラグを追加し、非ホームindexableページのcanonical不一致をHIGHにする。

受け入れ条件:

- 本番またはローカルサーバーに対して `urls_checked >= 1070` になる。
- `/category/*` の canonical がホームを向いていたらHIGHで落ちる。
- `/sitemap-keywords` のtitle重複を検出する。

## P1: 検索流入を増やすために優先したい改善

### 3. sitemap掲載URLと実HTMLの整合チェック

`node scripts/generate-sitemap.mjs` 実行後、ローカル `out/sitemap.xml` は1087URLになった。一方、本番sitemapは1083URL。ローカルでは新規記事が `src/config/doc-meta-index.json` と `.local/r2/posts` に存在するが、`out/docs/civil-construction-2-guide-career-agent-comparison.html` は存在しなかった。

本番では同URLはsitemapに未掲載で404なので、現時点の本番SEO事故ではない。ただし、**sitemap生成だけが先に走ると、sitemapに404予定URLが入る** 形になり得る。

実装方針:

- build後に `out/sitemap.xml` の `<loc>` を全件読み、対応する `out/*.html` が存在するか検査する `check-sitemap-build-integrity` を追加。
- `/docs/foo` は `out/docs/foo.html`、`/tools/bar` は `out/tools/bar.html`、`/` は `out/index.html` に解決する。
- `_redirects` で301される旧URLは sitemap から除外済みなので、sitemap内に出たURLは原則HTML必須。

受け入れ条件:

```bash
npm run build
npm run check-sitemap-integrity
```

で、sitemap掲載URLの404候補が0件。

### 4. GSCの高imp低CTRページをCTR改善する

最新GSC（2026-06-08〜2026-07-06）では、ページ単位で以下が目立つ。

| ページ | clicks | imp | CTR | position | 優先施策 |
|---|---:|---:|---:|---:|---|
| `/docs/pe-comprehensive-management-keyword-2026` | 17 | 285 | 6.0% | 8.6 | title/description再調整、上位導入文、FAQ維持 |
| `/docs/civil-construction-1-textbook-scraper` | 3 | 196 | 1.5% | 9.9 | 「スクレーパとは」系title最適化、冒頭定義、FAQ |
| `/docs/civil-construction-1-primary-r07-b` | 5 | 148 | 3.4% | 6.8 | 年度・種別・無料解説をtitle先頭へ |
| `/docs/civil-construction-1-primary-r04-a` | 3 | 56 | 5.4% | 9.1 | 同上 |
| `/docs/civil-construction-1-primary-r04-b` | 1 | 38 | 2.6% | 8.3 | 同上 |
| `/docs/civil-construction-1-primary-r03-b` | 1 | 30 | 3.3% | 8.8 | 同上 |
| `/docs/pe-construction-r07-construction-planning` | 2 | 29 | 6.9% | 6.7 | 建設部門・施工計画・R7を明確化 |

クエリ単位では以下が「順位はページ1付近だがクリックが弱い」。

| query | imp | position | 優先対応 |
|---|---:|---:|---|
| スクレーパとは | 38 | 10.8 | `textbook-scraper` のtitle/冒頭/FAQ |
| スクレープドーザとは | 22 | 11.4 | 同上 |
| スクレープドーザ | 17 | 9.1 | 同上 |
| トライポッド理論 | 12 | 9.8 | 該当キーワードページのtitle/FAQ |
| スクレープドーザーとは | 10 | 10.3 | 同上 |

実装方針:

- GSC page/query の突合スクリプトを作る。queryだけでは対応ページが分かりにくいので、Search Console API の `dimensions: ["page","query"]` 取得を追加できると理想。
- `imp >= 20 && position <= 12 && CTR < 8%` を「CTR改善候補」としてレポート化。
- 対象ページに対し、以下を機械補助で点検する。
  - `seoTitle` が検索語を前半に含むか
  - `description` が検索意図と試験名を含むか
  - `faqs` が2〜3件あるか
  - 冒頭100文字に明確な定義・対象者・年度があるか
  - 関連hubから内部リンクされているか

### 5. `description` 長すぎ24件を修正する

`src/config/doc-meta-index.json` 統計:

- published: 1067
- description欠落: 0
- description短すぎ（50文字未満）: 0
- description重複: 0
- description長すぎ（160文字超）: 24
- seoTitle欠落: 1
- seoTitle長すぎ（70文字超）: 0
- FAQあり: 191件（17.9%）

長すぎの上位は R8想定論文テーマ群と一部textbook。

例:

- `pe-comprehensive-management-r8-essay-theme-circular-economy` 248文字
- `pe-comprehensive-management-r8-essay-theme-ai-governance` 234文字
- `pe-comprehensive-management-r8-essay-theme-disaster-recovery` 221文字
- `pe-comprehensive-management-r8-essay-theme-infrastructure-maintenance` 221文字
- `pe-comprehensive-management-r8-essay-theme-economic-security` 218文字
- `civil-construction-1-textbook-safety-work-environment` 195文字

実装方針:

- `description` は80〜120文字を推奨レンジ、160文字超はCI警告にする。
- R8想定論文テーマ群はテンプレートで短縮する。
  - 例: `技術士総合技術監理部門のR8記述式対策。循環経済・ネイチャーポジティブ・サプライチェーン強靱化を5管理で整理し、想定問題と解答方針を示す。`
- `pe-comprehensive-management-course-selection-guide` に `seoTitle` を追加する。

### 6. カテゴリhubの構造化データを追加する

記事ページはArticle/Breadcrumbが強いが、カテゴリページはrootの WebSite / Organization のみ。カテゴリhubは検索流入の入口なので、以下を検討する。

- `BreadcrumbList`: Home > Category > category label
- `CollectionPage`: カテゴリhubとしてのページ
- `ItemList`: 代表記事またはカテゴリ内主要記事リスト

ただし構造化データは「ページに見えている内容」と一致させること。Googleの構造化データ方針上、見えない情報を盛るのは避ける。

### 7. FAQの使い所をGSCで絞る

FAQありは191/1067件で17.9%。全ページに増やすより、以下に絞る。

- position 5〜12
- impressions 20以上
- CTR 8%未満
- FAQがSERPの意図に合う「とは」「違い」「難易度」「受験資格」「使えるか」系

今回の候補:

- `civil-construction-1-textbook-scraper`
- `civil-construction-1-primary-r07-b`
- `civil-construction-1-primary-r04-a`
- `civil-construction-1-primary-r04-b`
- `civil-construction-1-primary-r03-b`
- `pe-construction-r07-construction-planning`
- `pe-comprehensive-management-tripod-theory` 相当

## P2: アクセス増のための攻め筋

### 8. 無料ツールSEOを強化する

`/tools/juken-shikaku` は最新GSCで `imp: 40, position: 74.3`。順位は低いが、無料ツールは被リンク・SNS共有・再訪に強い。アクセスアップの中長期レバーとして価値がある。

施策:

- `受験資格チェッカー` ページに、検索向けの静的説明セクションを追加する。
  - 1級・2級の新受検資格
  - 何を入力すると何が判定できるか
  - 判定結果の注意点
  - 公式情報へのリンク
- `SoftwareApplication` または `WebApplication` JSON-LD を検討する。
- `無料ツール一覧` から各ツールへの内部リンク文言を検索語に寄せる。
- 関連guide記事からツールへ文脈リンクする。

### 9. `robots.txt` のAI検索bot方針を再検討する

現在 `scripts/generate-sitemap.mjs` は以下をdisallowしている。

- `GPTBot`
- `ChatGPT-User`
- `OAI-SearchBot`
- `ClaudeBot`
- `PerplexityBot`
- `Google-Extended`
- その他AI/SEOクローラー

これは学習データ収集やbot流入対策として合理性がある。一方、今後のアクセスアップを「AI検索・回答エンジンからの参照」まで含めるなら、`OAI-SearchBot` や `Perplexity-User` などを全面blockするかは再判断余地がある。

提案:

- 方針を2レイヤーに分ける。
  - 学習利用bot: block維持
  - ユーザーリクエスト型/検索表示型bot: allow候補
- ただし、bot混入でGA4が汚れる懸念があるため、許可する場合はGA4除外・Cloudflareログ・Search Consoleの推移確認とセットで試す。

### 10. noteとのカニバリ監査を再起動する

既存戦略 `06_seo-note-synergy-strategy.md` では「サイト=SEO本体、note=体験/有料導線」と整理済み。今後コンテンツが増えるほど、note.comのドメインがサイトを押し下げる可能性がある。

施策:

- GSCで自サイトが伸びないクエリを抽出し、同テーマのnote記事有無を確認。
- note側は丸写しではなく、サイトcanonicalへのdeep linkを増やす。
- サイト側は中立・体系・一次情報寄り、note側は体験・判断・教材導線に寄せる。

### 11. PSI低スコアページのSEO副作用を潰す

最新PSI履歴（2026-07-13）では以下が気になる。

| URL | strategy | performance | SEO | 主因候補 |
|---|---|---:|---:|---|
| `/search` | desktop | 76 | 92 | CLS 0.766 |
| `/category` | desktop | 93 | 83 | 404 noindexページを監査対象に含めている |
| `/docs/civil-construction-1-primary-r07-a` | desktop | 86 | 100 | CLS 0.221 |
| `/docs/pe-comprehensive-management-activity-abc` | desktop | 70 | 100 | TBT 936ms |

SEOスコア100でも、検索流入後のUXやCore Web Vitalsには効く。まずは監査対象から404 `/category` を外し、`/search` のCLSを修正する。

## P3: 継続運用の改善

### 12. SEO品質ゲートをCIに組み込む

追加したいコマンド:

```json
{
  "check-seo-meta:prod": "node .claude/skills/quality/check-seo-meta/scripts/check-seo-meta.mjs --base-url https://doboku-note.com",
  "check-sitemap-integrity": "node scripts/check-sitemap-integrity.mjs",
  "check-gsc-opportunities": "node scripts/check-gsc-opportunities.mjs"
}
```

CI基準:

- `check-seo-meta` は全記事+全固定ページを巡回。
- canonical/og:url不一致はHIGH。
- title重複、description長すぎ、description欠落は失敗または警告。
- sitemap掲載URLのHTML欠落は失敗。
- OGP欠落は既存 `check-ogp-coverage` で失敗。

### 13. `include_routes` を真実源化する

`.claude/config/seo-meta-config.json` の固定ルートが古い。

追加候補:

- `/tools`
- `/tools/kakomon-quiz`
- `/tools/juken-shikaku`
- `/tools/keiken-charcount`
- `/links`
- `/sitemap-keywords`
- 全カテゴリ8件

削除候補:

- `/category` は存在しないためPSI/SEO監査対象から外す。カテゴリ一覧ページを作るなら別途実装する。

### 14. Search Consoleのpage+queryレポートを自動化する

現在のGSC履歴はquery単体・page単体が中心。CTR改善やカニバリ判断には `page + query` が必要。

追加したい出力:

- `.claude/state/metrics/gsc/gsc-page-query-*.json`
- `query`, `page`, `clicks`, `impressions`, `ctr`, `position`
- opportunity score = `impressions * (targetCtr - ctr) * positionWeight`

これで「どのページのどの検索語を直すか」がClaude/Codexで即作業できる。

## Claude Code 実装プロンプト

以下をそのままClaude Codeに渡せる。

```text
doboku-note のSEOアクセスアップ監査レビュー `docs/reviews/2026-07-14-seo-access-audit.md` を読み、P0/P1を順に実装してください。

優先順:
1. 固定ページ・カテゴリページの canonical / og:url / title重複を修正する。
   - `src/app/category/[slug]/page.tsx` の `generateMetadata` に self canonical, category別OG, twitter を追加。
   - `src/app/about/page.tsx`, `src/app/contact/page.tsx`, `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` に self canonical を追加。
   - `src/app/search/page.tsx` は `robots: { index:false, follow:true }` と self canonical を追加する。
   - `src/app/sitemap-keywords/page.tsx` の title重複と og:url継承を修正する。

2. `.claude/skills/quality/check-seo-meta/scripts/check-seo-meta.mjs` を修正し、現行 `src/config/doc-meta-index.json` の `docs` object から全published記事URLを収集できるようにする。
   - `noindex:true` は除外。
   - 非ホームindexableページは `canonical === production_url + path` を検査する。
   - `og:url` も自己URL一致を検査する。
   - `include_routes` を `/tools`, `/tools/*`, `/links`, `/sitemap-keywords`, 全カテゴリに拡張する。
   - `urls_checked >= 1070` を確認できるようにする。

3. sitemap整合チェックを追加する。
   - `scripts/check-sitemap-integrity.mjs` を作成し、`out/sitemap.xml` の全 `<loc>` が対応する `out/*.html` を持つか検査する。
   - package.json に `check-sitemap-integrity` を追加する。
   - `_redirects` 旧URLはsitemapに出ない前提でよい。

4. メタ品質の小修正を実施する。
   - `description` 160文字超24件を80〜120文字目安に短縮する。
   - `pe-comprehensive-management-course-selection-guide` に `seoTitle` を追加する。

5. 検証する。
   - `npm run lint`
   - `npm run type-check`
   - `npm run build`
   - `npm run check-ogp-coverage -- --json`
   - `npm run check-seo-meta -- --base-url http://localhost:3020 --json`（ローカルサーバーが必要なら起動して実行）
   - `npm run check-sitemap-integrity`

注意:
- 既存の未コミット変更を勝手に戻さない。
- 関係ないUI差分は触らない。
- 監査スクリプトが記事1067件以上を見ていない状態を「成功」としない。
- `/category` は現状404なので監査対象に含めない。カテゴリ一覧ページを作る場合は別タスクにする。
```

## 期待インパクト

- canonical修正: カテゴリhub・固定ページの評価がホームに寄るリスクを解消。特に `/category/pe-comprehensive-management` は既に検索表示があるため即効性がある。
- 監査スクリプト修正: 今後のSEO劣化を自動検知できるようになる。これは最も再発防止効果が高い。
- sitemap整合: 新規記事追加時の404掲載事故を防ぐ。
- CTR改善: 既にpage 1付近にいるページのクリック増を狙える。新規記事量産より低コスト。
- 無料ツール強化: 中長期で被リンク・SNS・再訪の入口になる。
