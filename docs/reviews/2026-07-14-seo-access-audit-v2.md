---
title: SEOアクセスアップ監査レビュー 再精査版
description: doboku-noteのSEO監査を現行コード、本番HTML、GSC管理SSOT、公式資料で再検証し、技術SEO・内部リンク・計測・運用の優先順位を改訂したレビュー。
created: 2026-07-14
status: review
supersedes: docs/reviews/2026-07-14-seo-access-audit.md
---

# SEOアクセスアップ監査レビュー 再精査版

> [!important]
> 本書を2026-07-14時点のSEO監査の正とする。初版のcanonical指摘と監査スクリプトの盲点は正しかったが、関連リンク404を見落としており、FAQ・description・title改善の優先順位も高すぎたため修正した。

## 1. 結論

最優先は記事量産やメタ文言の一括変更ではなく、検索エンジンと利用者が正しいURLへ到達できる状態を機械的に保証することである。

1. **P0: `RelatedKeywords` が生成する404リンク166件を修正する**
2. **P0: カテゴリ・固定ページのcanonicalとOG URLを自己URLへ修正する**
3. **P0: `check-seo-meta` の9 URLしか見ない盲点を解消する**
4. **P1: build後の全HTML、sitemap、robots、redirect、内部リンクをCIで整合検査する**
5. **P1: GSC取得をpage × query対応・ページング対応にし、少数ページの実験だけを提案する**
6. **P2: index coverage、CWV、重複・薄層、AI検索露出を定期監査する**

現行サイトは記事メタ・OGP・構造化データ・sitemap・GSC/PSI履歴の土台が強い。一方、CIはbuild完走までで、生成後HTMLのSEO契約を検査していない。さらに既存の内部リンク監査は166件のHIGHを検出しているがreport-onlyのため、実害が残ったままになっている。

## 2. 再精査で初版から修正した点

| 初版の扱い | 再精査後 |
|---|---|
| canonicalと`check-seo-meta`をP0 | 維持。2026-07-14に本番で再現確認済み |
| 関連リンク問題を未記載 | **P0追加**。166件が誤った総監URLへ変換され、本番404 |
| FAQ追加をCTR改善策としてP1 | **格下げ**。一般サイトではFAQ rich resultsを期待しない。本文UXに必要な場合だけ維持 |
| description 160文字超を一括修正 | **警告へ格下げ**。Googleに固定上限はない。固有性・正確性を優先 |
| 高imp低CTRページのtitle修正 | **少数実験へ変更**。既存SSOTは大規模title改変の反復を禁止 |
| カテゴリにCollectionPage / ItemList追加 | BreadcrumbListを優先。未対応typeをSEO効果として約束しない |
| AI bot blockをGA4汚染と関連付け | 根拠不足。クローラー制御とGA4参照流入は分けて判断 |
| frontmatter published 1067件 | 現行indexでは1069件。実ファイル監査は1111件 |

## 3. 監査根拠

### 3.1 ローカル実装

- `src/components/ui/RelatedKeywords/RelatedKeywords.tsx`
- `.claude/skills/quality/check-mdx/scripts/rules/links/check-links.mjs`
- `src/lib/metadata.ts`
- `src/app/category/[slug]/page.tsx`
- `src/app/sitemap-keywords/page.tsx`
- `.claude/skills/quality/check-seo-meta/scripts/check-seo-meta.mjs`
- `.claude/config/seo-meta-config.json`
- `.claude/skills/analytics/fetch-gsc-data/scripts/fetch-gsc-data.mjs`
- `scripts/quality-audit.mjs`
- `.github/workflows/ci.yml`
- `docs/reference/gsc-management.md`
- `docs/reviews/2026-07-14-mechanical-quality-audit.md`

### 3.2 公式資料

- Google canonical: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google sitemap: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google internal links: https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- Google snippet / description: https://developers.google.com/search/docs/appearance/snippet
- Google AI features: https://developers.google.com/search/docs/appearance/ai-features
- Google FAQ変更: https://developers.google.com/search/blog/2023/08/howto-faq-changes
- Search Analytics API: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- OpenAI ChatGPT Search: https://help.openai.com/en/articles/9237897-chatgpt-search

## 4. 今回の実測

### 4.1 本番HTML

2026-07-14に本番を再取得した。

| URL群 | 結果 |
|---|---|
| `/about`, `/contact`, `/privacy`, `/terms` | HTTP 200だがcanonicalはホーム。OG URLは自己URL |
| `/search` | HTTP 200、ホームtitle・ホームcanonical、`index, follow` |
| `/category/*` | HTTP 200だがcanonicalとOG URLはホーム |
| `/sitemap-keywords` | canonicalは自己URL、titleはサイト名二重、OG URLはホーム |
| `/tools`, `/links` | self canonical / self OG URLで正常 |
| 本番sitemap | HTTP 200、1083 URL、searchと404は非掲載 |

### 4.2 ソース品質

- `doc-meta-index.json`: 1069 published、description欠落0、160文字超24、seoTitle欠落1、FAQあり193。
- frontmatter lint: 1111ファイル、HIGH 0、MEDIUM 0、LOW 165。LOWは主にタグallowlist。
- OGP coverage: 直近実行でpublished記事の欠落0。
- GSC index coverage最新履歴: 2026-07-01時点で784 / 1051、74.6%。404 / redirectは0。

> [!warning]
> `out/` は監査途中に別プロセスで削除されたため、今回の再精査ではbuild成果物の全件DOM監査を完走していない。この不安定さ自体が、build直後の同一CI job内で検査を実行すべき理由になる。

## 5. P0: 即時修正

### 5.1 関連リンク166件が404になる

`npm run check-links -- --scope site` は1111ファイル、12391リンクを検査し、`BROKEN_SLUG` 166件でexit 1になった。

原因は `RelatedKeywords.tsx` の `KNOWN_CATEGORY_PREFIXES` が次の3件しかないこと。

- `pe-comprehensive-management-`
- `civil-construction-1-`
- `civil-construction-2-`

そのため、例えば `concrete-chief-engineer-textbook-construction` は `/docs/pe-comprehensive-management-concrete-chief-engineer-textbook-construction` に変換される。前者の正規URLは本番200、後者は本番404である。`pe-first-stage-*` も同様。

修正方針:

- `src/config/categories.json` のslugから `${slug}-` を導出し、コンポーネントとcheckerの共通の真実源にする。
- legacy bare slugだけに `pe-comprehensive-management-` を補完する。
- `buildHref()` を純関数へ切り出してunit testする。
- 166件を0にした後、site internal linksをCI gateへ昇格する。
- ページ新設で帳尻を合わせない。現存する正規URLへリンクする。

受け入れ条件:

```bash
npm run check-links -- --scope site
npm test
```

`BROKEN_SLUG=0`、上記4つの代表URLが正規パスへ解決すること。

### 5.2 canonicalとOG URLの継承誤り

`src/lib/metadata.ts` のroot metadataがcanonical `/` とOG URLホームを持ち、個別ページが上書きしない場合にホームを出力する。

修正対象:

- 全 `/category/{slug}`: self canonical、self OG URL、カテゴリ固有title/description/image。
- `/about`, `/contact`, `/privacy`, `/terms`: self canonical。OGは現状self URLなので維持確認。
- `/search`: `noindex, follow`、self canonical、検索ページ固有title/description。sitemapには載せない。
- `/sitemap-keywords`: titleから手書きのサイト名を外し、self OG URLを設定。

原則:

- indexable URLはcanonical、sitemap、内部リンク先を同じURLに揃える。
- noindex URLも誤ってホームへ統合せず、自己URLをcanonicalとする。
- root metadataのcanonicalを削除する案も比較し、全子ページが明示できるなら削除を推奨する。

### 5.3 `check-seo-meta` が9 URLしか見ない

`collectUrls()` は現行indexの `docs` objectを読めず、`Object.values(idx).flat()` の結果からslugを抽出できない。またcanonicalはドメインprefixしか検査せず、ホームcanonicalを正常扱いする。

追加修正:

- `idx.docs` object / array、legacy arrayを明示的に扱う。
- `published !== false && noindex !== true` をindexable記事集合とする。
- URL数の下限を設定し、意図した母集合の90%未満なら監査自体を失敗させる。
- canonicalは正規化後の自己URL一致をHIGHで検査する。
- `og:url`、titleのサイト名重複、robotsとsitemapの矛盾も検査する。
- regex依存をやめ、HTML parserで属性順序やsingle/double quote差に耐える。
- dev server必須ではなく、build済み`out/**/*.html`を直接検査できるモードを主経路にする。

## 6. P1: 機械チェックの追加

### 6.1 ソース層

| チェック | 失敗条件 | 運用 |
|---|---|---|
| frontmatter schema | 必須値欠落・型不正 | 既存CIを維持 |
| slug / route衝突 | 同じ公開URLを複数sourceが生成 | CI HIGH |
| internal link / anchor | 存在しないslug、category、fragment | 166件解消後CI HIGH |
| metadata重複 | rendered title / descriptionの完全重複 | 新規悪化をratchet |
| content overlap | 同一カテゴリの本文near-duplicate | report、候補のみ |
| freshness | 年度入りtitleと本文・publishedAtの矛盾 | report。自動書換しない |

### 6.2 build成果物層

`scripts/check-seo-build.mjs` を新設し、`npm run build` 直後の`out/`を全件検査する。

必須ルール:

- sitemap URLごとに対応HTMLが存在する。
- indexable HTMLはHTTP相当の正規route、title、description、self canonical、self `og:url`を持つ。
- noindex URLはsitemapにない。
- sitemap URLはredirect source、404、`_not-found`を含まない。
- canonical URLは同一origin・HTTPS・query/hashなし・正規末尾スラッシュ規則に合う。
- `<main>`が1件、ページH1が1件、主要本文がSSR HTMLに存在する。
- JSON-LDがparseでき、URL、headline、breadcrumbが可視ページと矛盾しない。
- HTML内の内部`href`が存在し、canonical URLへ直接向く。
- 画像・OGP参照がbuild成果物または許可されたR2 URLとして解決可能である。
- rendered title、canonical、`@id`の重複を全体で検出する。

`description`の50〜160文字はranking gateにしない。欠落・完全重複・ページと無関係な共通文は失敗候補、長さはLOW警告とする。

### 6.3 本番層

日次またはdeploy後に、全件または層化サンプルを低並列で確認する。

- status、redirect chain / loop、content-type、canonical、robots、OGP。
- sitemapとrobotsの到達性、Cloudflareによるrobots追記後の必須方針。
- R2 OGPの200、mime、画像寸法。
- soft 404候補: 200だがnot-found文言、本文量極小、ホームcanonical。
- local buildとproductionのSEO fingerprint差分。

PR CIで本番全件クロールは行わない。外部要因でCIを不安定にするため、deploy後またはscheduled workflowでreportし、技術的な404/5xx/canonical回帰だけを通知する。

### 6.4 内部リンクグラフ

build後HTMLからgraphを作る。

- indexableページのinlink 0件。
- ホームまたはカテゴリhubから到達不能。
- 重要ページのclick depthが4超。
- 404、redirect source、noncanonical URLへのリンク。
- 同一アンカーテキストが無関係な複数URLを指す異常。
- category / pillarから主要記事へのcoverage。

Googleは重要ページに少なくとも1本の内部リンクを持たせるよう案内している。sitemap掲載だけでorphanを正常扱いしない。

## 7. P1: GSCと実験設計

現行`fetch-gsc-data.mjs`は単一dimension、default 100行、`startRow=0`固定である。これではロングテールとpage × queryの対応が欠ける。

修正方針:

- `--dimensions page,query` を受け付ける。
- rowLimitは最大25000の範囲で設定し、`startRow`を進めてページングする。
- Search Analytics API自体が全データを保証しない点をmetadataに記録する。
- 週次CIで`gsc-page-query-*.json`を生成する。
- queryが複数pageに分散するカニバリ候補、同一pageのCTR機会、前期間比のcontent decayを算出する。

メタ変更の採択条件:

- page × queryで対象URLと検索意図が確定している。
- impressions、position、CTRに最低サンプルを設ける。
- 1回のdeployで少数URLに限定し、14〜28日観測する。
- 大量title書換をしない。
- 季節性、コアアップデート、index状態の変化を注記する。

`docs/reference/gsc-management.md` の確定判断を優先し、個別メタ修正は全件作業ではなく実験とする。

## 8. P2: 構造化データ、FAQ、AI検索

### 8.1 構造化データ

- 記事のTechArticle / Breadcrumb / Quiz / DefinedTermは、JSONとしての妥当性と可視内容一致を検査する。
- カテゴリhubはまずBreadcrumbListを追加する。
- CollectionPage / ItemListは意味上追加できるが、Googleの表示拡張や順位効果を前提に優先しない。
- schema追加数をKPIにしない。エラー0と可視内容一致をKPIにする。

### 8.2 FAQ

Googleは一般サイトのFAQ rich resultsを常時表示せず、Search Console APIのFAQ search appearanceも2026年8月に廃止予定としている。したがってFAQは次の扱いにする。

- 読者が実際に必要とするQ&Aは本文UXとして残す。
- rich result目的の一括追加はしない。
- FAQPage JSON-LDの存在率をSEO KPIにしない。
- Q/Aと可視本文の一致、空データ、重複だけを機械検査する。

### 8.3 AI検索

Google AI機能に専用schemaや`llms.txt`は不要で、通常のindexability、内部リンク、本文、画像、構造化データ整合が基本である。

本番robotsはCloudflare Managed Contentとリポジトリ生成分が連結され、`OAI-SearchBot`を明示blockしている。OpenAI公式はChatGPT Search掲載にOAI-SearchBotの許可が重要としているため、アクセス増を優先するなら次をADRで決める。

- training botはblock維持。
- search / user-request botはallowするかを個別判断。
- Cloudflare WAFでも公式crawlerを通す。
- referral、engagement、server logを4〜8週観測する。

GA4のBing流入異常だけをAI crawlerの根拠にしない。通常crawlerはGAタグを人間ブラウザ同様に実行するとは限らず、参照流入・spam・計測実装を分離して調査する。

## 9. CI配置

| タイミング | 実行 |
|---|---|
| pre-commit | staged frontmatter、MDX構文、変更リンク、画像/SVG |
| PR build前 | `quality:audit:ci`、全source link、metadata source contract |
| PR build後 | `check-seo-build:ci`、sitemap integrity、rendered HTML graph |
| deploy後 | production smoke、local-production fingerprint差分 |
| 日次 | PSI、代表route status、OGP到達性 |
| 週次 | GSC page/query/date、GA4 crosswalk、CTR/decay/cannibalization |
| 月次 | URL Inspection全sitemap、index coverage、content overlap棚卸し |

## 10. 完了判定

最低限、次を満たした時点で技術SEOのP0/P1を完了とする。

- `BROKEN_SLUG=0`。
- indexableな全build HTMLでself canonical / self OG URL。
- `/search`がnoindexかつsitemap非掲載。
- sitemap掲載URLのHTML欠落0、redirect / noindex / 404混入0。
- `check-seo-meta`または後継scannerが1000 URL以上を検査し、母集合不足を失敗扱いする。
- build後SEO gateがCIに入り、fixture unit testがある。
- GSC page × queryが週次生成される。
- 既存3エージェントの責務を壊さず、catch-all `seo-auditor`を復活させない。

実装の詳細とClaude Code用プロンプトは [SEO品質ゲートとClaude分業実装計画](../project/04_運営/11_SEO品質ゲートとClaude分業実装計画.md) を参照する。
