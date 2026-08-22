---
name: seo-growth-review
description: >
  SEO を「技術健全性 × index coverage × performance × 検索意図」の4面で束ねて回すオーケストレータ。
  機械スクリプト（check-seo-build / check-seo-meta / fetch 済み GSC）を先に実行し、その結果を
  audit-only Evaluator（technical-seo-auditor / gsc-index-auditor / metrics-analyzer /
  search-intent-auditor / performance-auditor）へ配って統合レポートにまとめる。決定的判定は機械、
  意味判断は Evaluator、修正はしない（自動修正エージェントは持たない・旧 catch-all seo-auditor は復活させない）。
  Use when user asks to [SEO総合レビュー, SEOグロース, 技術SEO監査, /seo-growth-review].
user-invocable: true
---

SEO を4面（技術健全性 / index coverage / performance / 検索意図）で束ねるオーケストレータ。各面は既存の分業体制（`.claude/knowledge/reference/gsc-management.md` の分業表）に乗り、**決定的な検出は機械スクリプト、意味的な評価は audit-only Evaluator、修正はしない**という原則を通す。

## 設計原則（守る）

- **決定的判定を LLM に委ねない**: broken link / canonical 不一致 / 404 混入 / CTR / 順位 は機械（`check-seo-build`・`seo-checks.mjs`・`metrics-analyzer` の集計）が出す。Evaluator はその結果を読んで統合・意味づけするだけ。
- **自動修正エージェントは作らない**: 本スキルも各 Evaluator も修正しない。改善は各 Generator / ユーザー判断 / `/nsm-experiment`。
- **旧 catch-all `seo-auditor` は復活させない**（2026-06-19 退役）。取得は CI、coverage は gsc-index-auditor、performance は metrics-analyzer、技術は technical-seo-auditor、意図は search-intent-auditor に分割済み。
- **メタの一括変更をしない**: title/description の量産改変は禁止。少数 URL（〜5）の 14〜28 日実験（`/nsm-experiment`）に限る（gsc-management.md 2026-07-10 の教訓）。

## 前提（計測は CI 供給が正）

ローカルで GSC/GA4 API を叩かない（creds 未設定・会社 PC プロキシ遮断＝`measurement-incidents.md` 2026-06-05）。GSC/GA4 は CI（`fetch-metrics.yml` / `index-coverage.yml`）がコミット済みのスナップショットを読む。技術面は `npm run build` 済みの `out/` を機械検査する。

## 手順

1. **機械スクリプトを先に走らせる（決定的検出）**
   - 技術: `npm run build`（未実行/古ければ）→ `npm run check-seo-build -- --json`（out/ 全数検査）
   - 母集合メタ: `npm run check-seo-meta -- --json`（out/ 直接・1,000+ URL）
   - 計測: `.claude/state/metrics/{gsc,ga4}/` の最新スナップショット日付を確認（無ければ CI 実行を案内）

2. **各面を audit-only Evaluator へ配る（意味評価・並列可）**
   - 技術健全性 → `technical-seo-auditor`（check-seo-build / check-seo-meta / index-coverage 履歴 / sitemap を統合）
   - index coverage → `gsc-index-auditor`（url-inspection + history）
   - performance → `metrics-analyzer`（gsc/ga4 + `gsc-page-query-*` で cannibalization/decay も）
   - 検索意図 → `search-intent-auditor`（**metrics-analyzer が surface した最大 20 URL のみ**）
   - CWV → `performance-auditor`（psi・任意）

3. **統合レポートを提示**
   - 4面の Evaluator 出力を 1 本にまとめ、重大度順に「今すぐ直す技術欠陥（error）／様子見の warn／performance の実験候補」を並べる
   - 数値は機械 JSON を出典引用（Evaluator の再判定値は使わない）

4. **打ち手はユーザー判断へ**
   - 技術 error（broken link 等）: 該当 Generator/コード修正を提案（本スキルは修正しない）
   - hygiene（404/redirect）: `.claude/todo/` へ起票を提案
   - performance/意図: 少数 URL の実験を `/nsm-experiment propose` へ橋渡し
   - coverage: `/gsc-review` の観測・判断ログへ（本スキルは coverage の意思決定を重複させない）

## やらないこと

- 修正の自動実施（audit-only オーケストレータ）
- GSC/GA4 データ取得（CI の責務）
- 決定的判定の LLM 再実行（機械 findings を引用）
- title/description の一括変更提案
- 旧 seo-auditor 的な catch-all 化（分業を壊さない）

## 参照

- `.claude/knowledge/reference/gsc-management.md` — GSC 管理 SSOT（分業表・閾値・判断マトリクス）
- `.claude/agents/technical-seo-auditor.md` / `search-intent-auditor.md` — 本スキルが新設した Evaluator
- `.claude/agents/{gsc-index-auditor,metrics-analyzer,performance-auditor}.md` — 既存 Evaluator（本スキルが束ねる）
- `scripts/check-seo-build.mjs` / `.claude/skills/quality/check-seo-meta/` — 決定的検出（機械）
- `.claude/skills/management/{gsc-review,weekly-improve,nsm-experiment}/` — 各面の既存スキル（重複させない）
