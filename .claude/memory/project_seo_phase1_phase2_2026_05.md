---
name: seo-phase-1-2-2026-05-17
description: GSC/GA4 分析からの 7 施策のうち、Phase 1 (Quick Win) + Phase 2 大半を 1 セッションで完了
metadata: 
  node_type: memory
  type: project
  originSessionId: 69ca72e4-67ba-4530-a605-5691cc8a57c3
---

2026-05-17 セッションで実施した SEO 改善 7 施策の進捗。Plan ファイル: `/Users/minamidaisuke/.claude/plans/clever-purring-bachman.md`

## 完了した施策

### Phase 1 (即日)
- **①CTR=0% ページ seoTitle 修正 9 件** (commit 1086c1f8 ~ 3955a3c52)
  - Civil textbook: river-act / standard-contract / road-act / building-standards / labor-standards / explosives-act / control-chart / network-schedule / crane
  - パターン: `"<主題>とは｜<論点>【1級土木施工管理技士】"` で統一
  - 効果検証: 7 日後の GSC 取得で CTR 改善を測定
- **③llms.txt 拡充 + llms-full.txt 新規** (commit と同じ)
  - llms.txt に Civil hub セクション・記述式 R03-R07 クロス参照・白書テーマ追加
  - llms-full.txt = 795 ページ完全リスト（AI 検索引用用、`.claude/scripts/build-llms-full.mjs` で自動生成）
- **⑤LCP 真因診断** (docs/handoffs/2026-05-17-lcp-rca-and-next-steps.md)
  - 真因仮説: AdSense `strategy="afterInteractive"` が field LCP 4978ms の主因
  - 実装は P2 で別 PR

### Phase 2 (1 週間)
- **⑥Civil hub ページ keyword-2026 新設** (commit 3955a3c52)
  - 教科書 34 ページを 7 カテゴリで目次化
  - PE keyword-2026 相当の Civil 版が不在だった問題解消
- **④圏外クエリ 5 ページ強化** (commit 3955a3c52)
  - green-infrastructure / communication-planning / ppm-analysis / extended-producer-responsibility / root-cause-analysis
  - 5 並列サブエージェント (sonnet) で 各 +30〜+77 行強化
  - seoTitle クエリ整合・FAQ 5 件追加・内部リンク 5-10 本

## ユーザー作業待ち

- **②note 4 マガジン公開** (4-6 時間ユーザー手動)
  - 4 ペルソナマガジン × 18 記事を note.com で公開
  - noteUrl 4 つ取得後、`src/lib/note-magazines.ts` の 4 行 diff を私が作成 → /deploy
  - インフラ完成済み (5/17): カバー画像 4 種 webp/png、`magazine-placement.ts` 配置ロジック

## 完了 (P2-⑤ / P3-⑦ / P4 全件)

- **⑤LCP 改善実装** (commit cc0b49691)
  - `src/components/AdSenseScript.tsx`: strategy を `lazyOnload` に切替
  - 環境変数 `NEXT_PUBLIC_ADSENSE_EAGER=1` で `afterInteractive` に即時ロールバック可能
  - field LCP 4978→3500ms 目標、CrUX 反映は 28 日後
  - 注意: 直近 lab PSI で site root LCP=8353ms と計測ばらつき大、実効果は CrUX で判断
- **⑦記述式独自データ公開**
  - `.claude/scripts/analyze-essay-keywords.mjs` + `.claude/state/essay-keyword-frequency.json`
  - `/docs/pe-comprehensive-management-essay-data-2026` 公開
  - 18 essay × 637 keyword 突合、Top: 安全管理 35 / 形式知 26 / 暗黙知 22 / 情報開示 20

## Phase 4 完了 (2026-05-17 同セッション継続)

- **P4-A seoTitle 拡張 21 件**: guide 6 + secondary 15 を suffix-only → "<主題>｜<論点>【1級土木 第N次検定】" 形式統一
- **P4-B publishedAt 補完 57 件**: `.claude/scripts/backfill-published-at.mjs` 新設、git 初回 commit から自動補完
- **P4-C 択一統計公開**: `analyze-primary-answers.mjs` + `/docs/pe-comprehensive-management-primary-statistics-2026`、R01-R07 × 280 問 χ²=1.107 で「正答番号偏りなし」確定（受験戦略の俗説否定）
- **P4-D R2 WebP 検証**: generate-webp 0 件変換（既存最新）、R07 一部 R2 同期未了→次回 /deploy で解消見込み
- **LCP ハンドオフ更新**: images.unoptimized:false 化が Static Export 制約で「実装不可」と確定

## 累計セッション成果 (2026-05-17)
- commit 約 14 件 (X 1 + IG 1 + SEO 全 12)
- seoTitle 修正 計 52 件 (Civil textbook 31 + guide/secondary 21)
- 新規スクリプト 5 (check-x-length / publish-ig / build-llms-full / analyze-essay-keywords / analyze-primary-answers / backfill-published-at)
- 新規公開ページ 3 (civil-keyword-2026 hub / essay-data-2026 / primary-statistics-2026)
- llms.txt 大幅拡充 + llms-full.txt 新規
- X 予約投稿 216 件 仕込み済（5/18 〜 7/28）

## 重要メトリクス (2026-05-17 ベースライン、JP)

- 流入: Bing 252 / Direct 101 / Google 77 / **OpenAI 45** / Yahoo 25 / note.com 23 / ChatGPT+Copilot 16
- AI 検索合計 61 users = Google の 79%
- GSC W18: imp 609 (+388 wow), pos 16.2 (悪化), CTR 3.1%
- PSI mobile: lab LCP 1927ms / field LCP 4978ms
- Civil textbook 34 ページ、PE 713 ページ、公開 795/821

**Why**: ユーザー指示「SEO 向上のため何をすべきか、GSC/GA4 データを踏まえて提案」→ 「全てやって」
**How to apply**: 次セッションは Phase 3 着手（独自データ）or Phase 2 ⑤実装（LCP 改善）から。note 公開はユーザー手動なのでブロッカーになる

関連: [[gsc-pivot-2026-04]] / [[seo-umbrella]] / [[next-font-render-blocking]] / [[hub-strengthening-approach]]
