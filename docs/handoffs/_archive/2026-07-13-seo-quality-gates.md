---
title: SEO 品質ゲート実装 handoff（Phase 1-7）
date: 2026-07-13
branch: claude/doboku-note-seo-quality-bfi3x7
---

# SEO 品質ゲート実装 handoff（2026-07-13）

技術 SEO 欠陥（誤内部リンク・canonical/OGP 継承事故・母集合を検査しない監査）を段階解消し、
build 後 SEO ゲートを CI に常設、GSC 取得を page×query に強化、audit-only の Claude 分業を追加した。
ブランチ `claude/doboku-note-seo-quality-bfi3x7`（base: develop）。7 コミット。

## 実施内容（Phase 別）

### Phase 1: RelatedKeywords BROKEN_SLUG 166 → 0
- `src/lib/keyword-href.mjs` 新設（解決規則の単一真実源・純粋関数）。カテゴリ接頭辞は
  `categories.json` から供給、接頭辞なしの bare slug のみ legacy 総監補完。
- `RelatedKeywords.tsx` と `check-links.mjs` を共有関数へ統一（`#src/*` import alias 追加）。
- 原因: 旧実装は 3 カテゴリのみハードコードし、残り 5 カテゴリ（pe-first-stage /
  pe-construction / concrete-chief-engineer / concrete-diagnostician / reference-materials）
  の完全修飾 slug を誤って `/docs/pe-comprehensive-management-…` に変換していた。
- `tests/keyword-href.test.mjs`（全 8 カテゴリ + legacy bare + 誤変換防止 + 照合順）。

### Phase 2: canonical / OGP / robots
- `src/lib/metadata.ts`: root から `alternates.canonical` と `openGraph.url` を撤去（子が
  homepage 値を継承する事故構造を根絶）。共有ヘルパー `buildPageMetadata()` 追加。
- home / category / search（noindex,follow）/ sitemap-keywords（title 二重解消 + og:url）/
  about・contact・privacy・terms（self canonical）/ links（title 二重解消）。

### Phase 3: build 後 SEO scanner
- `scripts/lib/seo-checks.mjs`（node-html-parser・検査関数ライブラリ）+
  `scripts/check-seo-build.mjs`（out/ 全数検査）。
- スキャナが検出した実在欠陥も恒久修正:
  - `src/lib/pe-keyword-nav.ts` 新設。SectionKeywords / CategoryNavCard が pe-chapters.json の
    phantom slug（bcp-crisis-management・ページ未作成）へ張っていた内部リンク切れ 40 本を、
    doc-meta-index.json（published のみ）を真実源に実在ページだけリンクへ是正。
  - `pe-comprehensive-management/api` の `<SeeAlso href="/docs/iot">` → 正規 slug に修正。
  - links の title サイト名二重を Phase 2 側で解消。
- `tests/seo-checks.test.mjs` + `tests/fixtures/seo/*.html`（fixture ベース）。

### Phase 4: CI 配線
- `package.json`: `check-seo-build` / `check-seo-build:ci`。
- `.github/workflows/ci.yml`: build 直後に `check-seo-build:ci`、build 前に
  `check-links --scope site` を昇格。

### Phase 5: check-seo-meta 再設計
- 現行 doc-meta-index.json `{docs:{slug:meta}}` 形式に対応し published を全収集（1,064）。
  out/ 直接検査を主経路（dev server 不要）、seo-checks 共有、self URL 完全一致 canonical。
- 母集合ガード: doc URL < max(1000, published×0.9) で exit 1（収集不足を成功扱いにしない）。
- `npm test` を `node --test tests/*.test.mjs` に変更（Node 22 で dir 引数が回帰するため）。

### Phase 6: GSC 取得強化
- `fetch-gsc-data.mjs`: `--dimensions page,query`（複数軸）+ `--all` + 25,000 行ページング。
  出力 `gsc-page-query-*.json`。meta に api_note（全行返却を保証しない旨）/ truncated 等。
- `fetch-metrics.yml`（週次金曜）に page×query --all step 追加。
- `metrics-analyzer`: Pattern 7 Cannibalization + Pattern 8 Content-Decay（計 8 パターン）。
  メタ改善は少数 URL の 14〜28 日実験に限る（title/description 一括変更禁止・2026-07-10 の教訓）。

### Phase 7: Claude 分業基盤（audit-only）
- `technical-seo-auditor`（機械出力を統合・決定的判定を再実行しない）。
- `search-intent-auditor`（機械抽出の最大 20 URL のみ意味評価）。
- `/seo-growth-review`（4 面の Evaluator を束ねるオーケストレータ・修正なし）。
- 旧 catch-all `seo-auditor` は復活させない・自動修正エージェントは作らない。
- 台帳同期: agents-registry（64→66）/ skills-registry（85→86・management 15）/
  skills-guide / workflows / gsc-management。

## 検証コマンドと結果（2026-07-13 実行）

| コマンド | 結果 |
|---|---|
| `npm run check-links -- --scope site` | exit 0・BROKEN_SLUG 0（1106 ファイル走査） |
| `npm run type-check` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | 113 tests / 110 pass / 0 fail / 3 skip（既存の意図的 skip） |
| `npm run build` | exit 0（1,083 URL sitemap 生成） |
| `npm run check-seo-build:ci` | **error 0**・検査 1,083 URL（母集合 100%） |
| `npm run check-seo-meta`（out/） | 1,073 URL 検査（doc 1,064）・HIGH 0 |
| `npm run check-ogp-coverage -- --json` | checked 1,064 / missing 0 |
| `npm run check-doc-refs` | exit 0（1,097 参照実在） |
| `npm run check-doc-coupling` | exit 0（台帳更新もれなし） |

### check-seo-build の warn（非ゲート・記録のみ）
- `jsonld_headline_mismatch` 55: JSON-LD headline（seoTitle 由来）と H1（plain title）の
  設計上の差＝仕様。乖離ではなく意図的な役割分離。
- `description_long` 24: 160 字超（要件により警告のみ・CI を落とさない）。
- `orphan_page` / `unreachable_page` 各 6: `pe-comprehensive-management-r8-essay-theme-*`
  6 本。R8 予想論文テーマページで意図的にサイト内未リンク（note 導線/直接アクセス想定）。
- `ssr_thin_body` 2: `/category/concrete-diagnostician`・`/category/reference-materials`
  （visible:false の hidden カテゴリで正当に疎。main/H1 は在り SSR 破壊ではない）。

## リベースと CI 統合（重要）

着手時のローカル base は origin/develop より **33 コミット遅れ**ており（別セッションが
UI 刷新・`scripts/quality-audit.mjs` 統合 CHECKS レジストリ・v2 監査 doc 追加を先行）、
実装後に **origin/develop（feec232e）へリベース**して統合した。

- リベースで自動マージ（ci.yml / package.json / about / links の 4 ファイルは非重複ハンク）。
- develop の CI は `quality:audit:ci`（build 前・CHECKS ci:true サブセット）→ `build` 構成。
  そこへ合わせ **生の check-links ステップを撤去し、`quality-audit.mjs` の `internal-links` を
  `ci:false`→`ci:true`（`--scope site`）へ昇格**（v2 §5.1「166→0 後に CI gate 昇格」/§9）。
- `check-seo-build:ci` は build 直後の独立ステップに維持（build 前 gate へ混ぜない）。
- リベース後の再検証: type-check/lint exit 0・test 157 pass 0 fail・build exit 0・
  `check-seo-build:ci` **error 0**・1,088 URL 検査（母集合 100%）。

## 完了 / 保留事項

- **マージ済み**: **PR #390**（merge commit `2aa8ab23`・base: develop）。CI green（`quality:audit:ci`
  → `build` → `check-seo-build:ci` 全通過）。
  - マージ直前に develop 由来の既存 ratchet drift（BuildJob アフィリ3記事の rule 15-1 文末単調・
    私の変更外）を解消して CI を green 化（`guide-buildjob-review` / `guide-career-consultation-before-quit`
    / `guide-career-agent-comparison` の文末表現のみ調整・事実/数値/リンク不変）。
  - 注記: 環境の git relay（127.0.0.1:41729）は最初 413 で push 不能だったが、リモート branch を
    develop tip で先に作成し共通祖先を確定させることで最小パックの push が通った。
- **deploy / robots.txt / Cloudflare 変更は未実施**（意図的・ユーザー承認事項）。canonical/OGP 修正の
  本番反映は `develop→main` の deploy 後。サイト全ページ canonical 一斉更新＝再クロールが走るため、
  **コアアップデート期を避け直後2週間は GSC 日次監視**（gsc-management.md 2026-07-10 の教訓）。
- **build が再生成する index JSON はコミットしていない**（`doc-meta-index.json` 等の
  timestamp/git-date churn。CI が build 前に refresh-indexes で再生成）。
- **orphan/unreachable の gate 昇格は保留**（現状 warn）→ `docs/todo/backlog.md`「SEO 品質ゲート後続」へ起票。
- **GSC page×query の実データ生成は CI 待ち**（ローカルは creds 無し・会社 PC プロキシ遮断＝
  measurement-incidents.md）→ 同 backlog へ起票。次回 `fetch-metrics.yml`（週次金曜）で
  `gsc-page-query-*.json` が初生成され、metrics-analyzer の Pattern 7/8 はそれ以降に有効。
- **Node バージョン差**: ローカル Node 22 では旧 `node --test tests/`（dir 引数）が回帰するため
  `tests/*.test.mjs` に変更済み。CI（Node 20）でも同一 glob で全テスト discovery される。

## 主要ファイル

- 解決規則: `src/lib/keyword-href.mjs`, `src/lib/pe-keyword-nav.ts`
- メタ: `src/lib/metadata.ts`（`buildPageMetadata`）
- スキャナ: `scripts/lib/seo-checks.mjs`, `scripts/check-seo-build.mjs`
- 監査: `.claude/skills/quality/check-seo-meta/scripts/check-seo-meta.mjs`
- GSC: `.claude/skills/analytics/fetch-gsc-data/scripts/fetch-gsc-data.mjs`
- 分業: `.claude/agents/{technical-seo-auditor,search-intent-auditor}.md`,
  `.claude/skills/management/seo-growth-review/SKILL.md`
- CI: `.github/workflows/{ci.yml,fetch-metrics.yml}`
