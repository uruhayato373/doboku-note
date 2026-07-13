# SEO品質ゲートとClaude分業 実装計画

> [!todo]
> **目的**: [SEO監査 再精査版](../../reviews/2026-07-14-seo-access-audit-v2.md) のP0/P1をClaude Codeで安全に実装し、ソース・build成果物・本番・GSCの4層を継続監査できる状態にする。

## 0. 実装原則

- 既存の `gsc-index-auditor`、`metrics-analyzer`、`performance-auditor` の責務分離を維持する。
- 2026-06-19に退役したcatch-all `seo-auditor`は復活させない。
- 判定可能な処理はNodeスクリプトとunit testへ置き、LLMエージェントは診断・優先順位・検索意図の評価だけを行う。
- GeneratorとEvaluatorを分離する。監査エージェントは修正しない。
- 既存債務はbaseline / ratchetで固定し、新規悪化をブロックする。P0の166リンクはbaseline化せず根治する。
- 大規模title・description一括変更をしない。GSC page × queryに基づく少数実験に限定する。
- 現在の共有worktreeには未コミット変更が多い。別セッションが動いている場合は独立worktreeを使い、他セッションの差分をresetしない。

## 1. 目標アーキテクチャ

```text
source checks
  ├─ frontmatter / MDX / slug / internal link
  └─ route and metadata source contracts
           │
           ▼
npm run build
           │
           ▼
check-seo-build
  ├─ sitemap / robots / redirects
  ├─ title / canonical / OGP / robots
  ├─ SSR main / H1 / JSON-LD
  └─ internal link graph / assets
           │
           ├──────── deploy後 ──────── check-seo-production
           │
           └──────── 計測 ─────────── GSC / PSI / GA4
                                      │
                                      ▼
                              /seo-growth-review
                              既存Evaluator + 新規Evaluator
```

## 2. Claudeエージェント分業

### 2.1 維持・拡張する既存エージェント

| エージェント | 責務 | 変更 |
|---|---|---|
| `gsc-index-auditor` | index coverage / hygiene | 維持。canonical不一致の具体URL出力をbuild監査と突合 |
| `metrics-analyzer` | index済みページのperformance | page × query、cannibalization、content decayを追加 |
| `performance-auditor` | PSI / CWV | 維持。template種別とGSC landing page重要度を入力に追加 |
| `content-planner` | keyword gap /企画 | 機械候補が出た後だけ使用。技術SEOを担当させない |

### 2.2 新設候補A: `technical-seo-auditor`

種別: Evaluator、model: sonnet、audit-only。

入力:

- `check-seo-build` JSON。
- `check-seo-production` JSON。
- `check-links` JSON。
- 最新URL Inspection hygiene。

担当:

- source / build / production / GSCの矛盾をURL単位で束ねる。
- root causeを metadata継承、route欠落、redirect、Cloudflare差分、内部リンク生成に分類する。
- 修正順と影響範囲を返す。

担当外:

- crawler実行、コード修正、frontmatter書換、deploy、戦略判断。

出力は会話へ返し、`.claude/state/*.md`を新規作成しない。最終レポートはオーケストレータが`docs/reviews/seo/`へ保存する。

### 2.3 新設候補B: `search-intent-auditor`

種別: Evaluator、model: sonnet、audit-only。全記事を読ませず、機械抽出された最大20 URLだけを評価する。

入力:

- GSC page × query候補。
- 現在のrendered title / description / H1 / 冒頭本文。
- 変更前後のGSC基準値。

担当:

- query intentとページ内容の一致。
- title変更、冒頭改善、内部リンク、統合、何もしない、の提案。
- 同一queryに複数URLが出る場合のカニバリ候補評価。

制約:

- 文言を一括適用しない。
- FAQ rich resultを提案理由にしない。
- 既存SSOTの「大規模title改変禁止」を守る。

### 2.4 エージェントを増やさない領域

- sitemapとHTMLの存在確認。
- canonical / `og:url`比較。
- JSON-LD parse。
- redirect chain。
- image寸法・mime・HTTP status。
- GSCの閾値抽出。

これらは決定的なのでスクリプトで実装する。`seo-fix-worker`のような自動修正エージェントも新設しない。修正は親Claudeがwork orderごとに実施する。

## 3. 新設スキル案

### `/seo-growth-review`

配置候補:

```text
.claude/skills/management/seo-growth-review/SKILL.md <!-- doc-ref:ignore -->
```

役割:

1. 最新レポートの鮮度を検査する。
2. 決定的チェックを実行または既存JSONから読む。
3. `technical-seo-auditor`、`gsc-index-auditor`、`metrics-analyzer`、`performance-auditor`を並列起動する。
4. 必要な場合だけ`search-intent-auditor`を最大20 URLで起動する。
5. 重複所見をURL単位で統合し、impact × confidence × effortで優先順位を付ける。
6. `docs/reviews/seo/YYYY-MM-DD-seo-growth-review.md`へ保存する。
7. 自動修正せず、ユーザーが選んだwork orderを親Claudeへ返す。

既存スキルとの境界:

- `/gsc-review`: 月次coverage専任。置換しない。
- `/weekly-improve`: 週次performance専任。置換しない。
- `/psi-audit`: CWV専任。置換しない。
- `/check-seo-meta`: 技術検査。将来はbuild scannerのwrapperにする。
- `/seo-growth-review`: 上記を横断して意思決定用に統合する四半期または大改修時の入口。

## 4. 実装フェーズ

### Phase 0: 作業前の固定

1. branchとorigin差分を確認する。
2. 現在のdirty filesを記録し、対象外を触らない。
3. 代表コマンドのbaselineを保存する。

```bash
git branch --show-current
git status --short
npm run check-links -- --scope site
npm run check-ogp-coverage -- --json
npm run type-check
```

完了条件: 既存失敗と今回修正対象を区別できること。

### Phase 1: P0リンク修正

対象:

- `src/components/ui/RelatedKeywords/RelatedKeywords.tsx`
- `.claude/skills/quality/check-mdx/scripts/rules/links/check-links.mjs`
- 必要なら `src/lib/` の純関数helper。
- `tests/` fixture。

実装:

- category prefixを`src/config/categories.json`から導出する。
- legacy bare総監slugの補完は維持する。
- componentとcheckerで同じ挙動をテストする。Node checkerからTSを直接読みにくい場合も、同じJSONを真実源にして重複定数を廃止する。

fixture:

- `risk-management` → 総監prefix補完。
- `pe-comprehensive-management-risk-management` →変更なし。
- `civil-construction-1-*` →変更なし。
- `civil-construction-2-*` →変更なし。
- `pe-first-stage-*` →変更なし。
- `pe-construction-*` →変更なし。
- `concrete-chief-engineer-*` →変更なし。
- `concrete-diagnostician-*` →変更なし。
- `reference-materials-*` →変更なし。

完了条件: `BROKEN_SLUG=0`、正規URL4件をunit test、本番相当HTMLに誤prefixがない。

### Phase 2: P0 metadata修正

対象:

- `src/lib/metadata.ts`
- `src/app/category/[slug]/page.tsx`
- `src/app/{about,contact,privacy,terms,search,sitemap-keywords}/page.tsx`

実装:

- root canonicalの継承事故を防ぐ設計を選ぶ。
- category metadataにself canonical / OG / Twitter / imageを追加。
- searchにmetadataを追加し`noindex, follow`。
- sitemap-keywordsのtitle二重とOG URLを修正。

完了条件:

- indexableページはself canonical / self OG URL。
- searchはnoindexかつsitemap非掲載。
- サイト名二重0。

### Phase 3: build後SEO scanner

新規候補:

```text
scripts/check-seo-build.mjs
.claude/config/seo-build-config.json
tests/seo-build-audit.test.mjs
```

実装上の注意:

- regexだけでHTML属性を読む実装にしない。`parse5`等の構造化parserをdev dependencyとして明示追加するか、既存依存で同等のparserを確認して使う。
- URL正規化、route→HTML path、robots判定、JSON-LD抽出、link graphは純関数へ分離する。
- configにseverity、除外、minimum expected URL ratioを置く。
- JSON stdout、human report、`--ci`、`--update-baseline`を持つ。
- baselineは重複titleやdepth等の既存候補に限る。404、missing HTML、canonical不一致、JSON parse errorはgrandfather不可。

推奨ルールID:

```text
SEO001 sitemap_missing_html
SEO002 sitemap_non_indexable
SEO003 canonical_missing
SEO004 canonical_not_self
SEO005 og_url_not_self
SEO006 title_missing_or_site_duplicate
SEO007 robots_sitemap_conflict
SEO008 redirect_source_in_sitemap
SEO009 internal_broken_link
SEO010 internal_noncanonical_link
SEO011 jsonld_parse_error
SEO012 jsonld_visible_mismatch
SEO013 ssr_main_or_h1_missing
SEO014 orphan_or_unreachable
SEO015 duplicate_rendered_title
SEO016 asset_missing
SEO017 audit_population_too_small
```

CI配線:

```json
{
  "check-seo-build": "node scripts/check-seo-build.mjs",
  "check-seo-build:ci": "node scripts/check-seo-build.mjs --ci"
}
```

`.github/workflows/ci.yml` の`npm run build`直後に`npm run check-seo-build:ci`を追加する。prebuildの`quality:audit:ci`へbuild依存scannerを混ぜない。

### Phase 4: `check-seo-meta`再設計

- 現行`doc-meta-index.json`の`docs` objectに対応する。
- minimum population guardを追加する。
- build scannerの検査関数を再利用する。
- `--source out`を既定にし、`--base-url`はproduction smoke用とする案を優先する。
- URL一覧をconfig手書きに依存させず、build routeとcategory configから生成する。
- 互換コマンド名は維持し、SKILL.mdの件数・制約・severityを更新する。

### Phase 5: production smoke

新規候補:

```text
scripts/check-seo-production.mjs
.github/workflows/seo-production-audit.yml
```

- sitemapからURLを取得する。
- deploy直後は重要route + 変更route、日次は層化サンプル、月次は全件を低並列で走査する。
- 429 / 403 / 5xxをサイト不具合とbot protectionに分類する。
- Cloudflare Managed Content追記後のrobotsを検査する。
- local build fingerprintとの差分を出す。
- GitHub Actionsから本番データやコードを自動修正しない。

### Phase 6: GSC page × query

対象:

- `.claude/skills/analytics/fetch-gsc-data/scripts/fetch-gsc-data.mjs`
- `.github/workflows/fetch-metrics.yml`
- `.claude/agents/metrics-analyzer.md`
- `.claude/scripts/report-ga4-gsc-crosswalk.mjs`または新規SEO opportunity reporter。

実装:

- `--dimensions page,query`。
- 25000件単位のpagination。最大取得件数はconfig化。
- filenameを`gsc-page-query-*.json`にする。
- `keys[0]=page`, `keys[1]=query`をschemaで明示する。
- CIで週次取得する。
- opportunity、cannibalization、decayを算出する。
- 生のCTR閾値だけでなくposition帯別baselineを使用する。標本不足は提案しない。

### Phase 7: Claude skill / agent

新規:

- `.claude/agents/technical-seo-auditor.md` <!-- doc-ref:ignore -->
- `.claude/agents/search-intent-auditor.md` <!-- doc-ref:ignore -->
- `.claude/skills/management/seo-growth-review/SKILL.md` <!-- doc-ref:ignore -->

同一commitで必須更新:

- `docs/reference/agents-registry.md`
- `docs/reference/skills-guide.md`
- `docs/reference/skills-registry.md`
- `docs/reference/workflows.md`
- 必要なら `docs/reference/gsc-management.md`

検証:

```bash
npm run check-doc-coupling
npm run check-doc-refs
```

## 5. テスト戦略

### Unit

- slug prefix解決。
- route→out HTML path。
- URL正規化。
- robots / noindex判定。
- canonical自己一致。
- HTML parserの属性順序、quote、entity。
- JSON-LD graph / array / parse error。
- redirect loop / chain。
- link graphのorphan / depth。
- GSC複数dimension / pagination。

### Fixture integration

小さい`tests/fixtures/seo-site/`を作り、正常サイトと各違反を1件ずつ持つ。全1111記事をunit test fixtureにしない。

### Repository integration

```bash
npm run check-links -- --scope site
npm run type-check
npm run lint
npm test
npm run build
npm run check-seo-build:ci
npm run check-ogp-coverage -- --json
npm run check-doc-refs
npm run check-doc-coupling
```

buildログの既存Turbopack / KaTeX warningは別計画の対象。SEO変更で新しいwarningや生成URL減少を起こしていないことは確認する。

## 6. 変更単位

1. PR-A: RelatedKeywords 166件とlink checker。
2. PR-B: canonical / OG / search noindex / sitemap-keywords。
3. PR-C: build SEO scanner + CI post-build gate。
4. PR-D: check-seo-meta統合とproduction smoke。
5. PR-E: GSC page × query + metrics-analyzer。
6. PR-F: Claude agent / skill / registries。

同じworktreeで別セッションが動く場合はPR単位で独立worktreeを作る。各PRは前のPRに依存する場合、最新developへ追随してから開始する。

## 7. Claude Codeへ渡す指示プロンプト

```text
doboku-noteのSEO品質改善を実装してください。最初に次の2ファイルを最後まで読んでください。

- docs/reviews/2026-07-14-seo-access-audit-v2.md
- docs/project/04_運営/11_SEO品質ゲートとClaude分業実装計画.md

また、CLAUDE.md、docs/reference/gsc-management.md、docs/reviews/2026-07-14-mechanical-quality-audit.mdを読み、既存の責務分離とCI設計を守ってください。

今回は一度に全Phaseを混ぜず、Phase 1から順に実装・検証してください。各Phase完了時に、変更ファイル、検証結果、残課題を短く報告してから次へ進んでください。

最優先:
1. RelatedKeywordsが生成するBROKEN_SLUG 166件を0にする。category prefixはsrc/config/categories.jsonを真実源にし、存在する正規URLへリンクする。ページ新設で回避しない。
2. category / about / contact / privacy / terms / search / sitemap-keywordsのcanonical、og:url、robots、title二重を修正する。
3. build後のout全HTMLを検査するcheck-seo-buildを実装し、sitemap、canonical、OG、robots、JSON-LD、SSR main/H1、内部リンクgraphをCIで検査する。
4. check-seo-metaを現行doc-meta-indexのdocs objectと1000 URL超の母集合に対応させる。
5. GSC取得をpage,query複数dimensionとpaginationに対応し、metrics-analyzerを拡張する。
6. 最後にtechnical-seo-auditor、search-intent-auditor、/seo-growth-reviewを追加し、agent/skill台帳を同一commitで更新する。

重要な制約:
- 既存の未コミット変更をreset、checkout、上書きしない。
- 別セッションが動いている場合は独立worktreeを使う。
- 旧catch-all seo-auditorを復活させない。
- 決定的な判定をLLMエージェントへ委ねない。
- title/descriptionを全件一括変更しない。
- FAQ rich resultを施策KPIにしない。
- description 160文字超だけを理由にCIを失敗させない。
- regexだけのHTML parserを新設しない。
- 404、missing HTML、canonical不一致をbaselineで隠さない。
- .claude/agentsまたはskillsを変更したらskills-guide、skills-registry、agents-registryを同一commitで更新する。
- src/scripts/configを変更したら/doc-sync相当の確認を行う。

Phase 1の受け入れ:
- npm run check-links -- --scope site がexit 0、BROKEN_SLUG 0
- prefix resolverのunit testが全カテゴリとlegacy bare総監slugをカバー

最終受け入れ:
- npm run type-check
- npm run lint
- npm test
- npm run build
- npm run check-seo-build:ci
- npm run check-ogp-coverage -- --json
- npm run check-doc-refs
- npm run check-doc-coupling
- build後scannerが1000 URL以上を検査
- sitemap missing HTML / nonindex混入 / canonical不一致 / broken internal linkが0

実装後はdocs/handoffs/YYYY-MM-DD-seo-quality-gates.mdへ、実施内容、正確な検証コマンドと結果、未完了事項を残してください。deployと本番robots方針変更はユーザー承認なしに行わないでください。
```

## 8. 今回は実装しない判断事項

次はコード修正と分けてユーザーが決める。

- OAI-SearchBot / ChatGPT-User / Perplexity系をallowするか。
- Cloudflare Managed Content-Signalの方針。
- category hubにCollectionPage / ItemListを追加するか。
- index未登録ページを統合 / noindexする基準。
- GSC実験の対象URLと成功指標。

これらをClaudeが独断で変更しないこと。
