# 2026-05-18 関連キーワード 404 リンク 一括監査

## 状況サマリ

- **発端**: `http://localhost:3020/docs/civil-construction-1-textbook-transport-machinery` の関連キーワードに 404 リンクが混入しているとユーザーが目視発見
- **対象**: 1 級土木施工管理技士（civil-construction-1）配下 83 記事の `<RelatedKeywords>` slug 群＋全 749 MDX
- **根本原因**: 既存 `check-links.mjs` は Markdown リンクと裸 URL しか検出しておらず、`<RelatedKeywords items={[{slug:"..."}]} />` のような JSX prop 内 slug を読み飛ばしていた
- **方針**: `check-links.mjs` を 1 ファイル拡張して JSX 内 slug も検出対象に追加（CI 週次 link-audit にも自動で乗る）
- **結果**: 拡張版で新規 +19 件検出（全部 PE 配下の bare slug 補完失敗）。civil-construction-1 配下の RelatedKeywords は全件健全だった。**ユーザーが見た 404 は別パターン**（Markdown リンクの `civil-construction-1-` 接頭辞抜け）で、ベースラインで既に検出されていた

詳細計画書: `C:\Users\m004195\.claude\plans\http-localhost-3020-docs-civil-construct-dreamy-falcon.md`

---

## 進捗チェックリスト

- [x] handoff ファイル作成（このファイル）
- [x] ベースライン取得（拡張前 `check-links` の HIGH 件数）
- [x] `check-links.mjs` に RelatedKeywords slug 抽出を追加
- [x] 拡張後 `check-links` 再実行とレポート確認
- [x] spot check（既知 404・既知 OK の確認）
- [x] このファイルに結果書き込み
- [ ] commit（check-links.mjs + handoff の 2 ファイルのみ）
- [ ] 検出された 404 の修正方針判断（次セッション）

---

## 修正対象ファイル（実装済み）

| ファイル | 変更内容 |
|---|---|
| `.claude/skills/quality/check-mdx/scripts/rules/links/check-links.mjs` | `extractLinks()` に `<RelatedKeywords>` ブロック内 slug 抽出を追加（+24 行）。`buildRelatedKeywordHref()` ヘルパー追加（+8 行）。生成 href は `RelatedKeywords.tsx` の `buildHref` と同等ロジックで `civil-construction-1-` / `pe-comprehensive-management-` 接頭辞補完を再現 |
| `docs/handoffs/2026-05-18-related-keywords-404-audit.md` | このファイル |

**触らない**: `RelatedKeywords.tsx` / 既存 MDX 749 ファイル / `.github/workflows/link-audit.yml`（既存 CI がそのまま新ロジックで動く）

---

## ベースライン（拡張前 = Markdown リンクのみ）

| 指標 | 値 |
|---|---|
| 走査ファイル | 826 |
| チェックしたリンク | 5,440 |
| HIGH 件数 | **79** |
| civil-construction-1 ファイル数 | 6 |

---

## 拡張後（Markdown + JSX RelatedKeywords slug）

| 指標 | 値 | 差分 |
|---|---|---|
| 走査ファイル | 826 | 同 |
| チェックしたリンク | 11,615 | **+6,175**（RelatedKeywords slug 取り込み） |
| HIGH 件数 | **98** | **+19**（全部 RelatedKeywords 由来） |
| civil-construction-1 ファイル数 | 6 | 同（純増ゼロ） |

レポート出力: `.tmp/related-keywords-audit/latest-report.md`

---

## 検出された 404（要修正）

### A. RelatedKeywords 由来（新規検出・全 19 件 / 全部 PE 配下）

すべて bare slug が `pe-comprehensive-management-{slug}` に補完されるが該当ページが存在しないケース。

| ファイル | 行 | 不在 slug |
|---|---|---|
| `pe-comprehensive-management/centralization-decentralization/article.mdx` | L78 | `rasis` |
| 〃 | L79 | `information-security` |
| `pe-comprehensive-management/communication-planning/article.mdx` | L132 | `information-sharing` |
| 〃 | L134 | `human-resource-management` |
| `pe-comprehensive-management/essay-mlit-green-transformation/article.mdx` | L92 | `lca` |
| `pe-comprehensive-management/essay-mlit-river-basin-management/article.mdx` | L89 | `mitigation-hierarchy` |
| `pe-comprehensive-management/extended-producer-responsibility/article.mdx` | L146 | `3r` |
| `pe-comprehensive-management/green-infrastructure/article.mdx` | L126 | `compact-city` |
| 〃 | L127 | `river-basin-management` |
| `pe-comprehensive-management/h29-primary/article.mdx` | L980 | `risk-communication` |
| `pe-comprehensive-management/mlit-whitepaper-2025/article.mdx` | L571 | `lca` |
| 〃 | L577 | `mitigation-hierarchy` |
| `pe-comprehensive-management/monte-carlo-simulation/article.mdx` | L95 | `risk-management` |
| 〃 | L96 | `decision-theory` |
| `pe-comprehensive-management/ppm-analysis/article.mdx` | L108 | `five-forces` |
| 〃 | L111 | `management-strategy` |
| `pe-comprehensive-management/root-cause-analysis/article.mdx` | L130 | `heinrichs-law` |
| 〃 | L131 | `swiss-cheese-model` |
| `pe-comprehensive-management/whitepaper-study-map/article.mdx` | L280 | `carbon-neutrality` |

### B. civil-construction-1 配下 Markdown リンク由来（ベースラインで既出）

ユーザーが視認した 404 はおそらくここ。`civil-construction-1-` 接頭辞が抜けた Markdown リンク。

| ファイル | 行 | 不在パス |
|---|---|---|
| `civil-construction-1/guide-concrete-key-points/article.mdx` | L70, L484 | `/docs/civil-construction-1-textbook-quality-management-text` |
| 〃 | L487 | `/docs/civil-construction-1-textbook-construction-plan-text-{01,02}` |
| 〃 | L488 | `/docs/civil-construction-1-textbook-related-laws-{01,02}` |
| `civil-construction-1/guide-earthwork-key-points/article.mdx` | L467 | `/docs/civil-construction-1-textbook-construction-plan-text-{01,02}` |
| `civil-construction-1/guide-quality-management/article.mdx` | L397 | `/docs/civil-construction-1-textbook-construction-plan-text-{01,02}` |
| `civil-construction-1/guide-schedule-management/article.mdx` | L393 | `/docs/civil-construction-1-textbook-construction-plan-text-{01,02}` |
| `civil-construction-1/textbook-loader/article.mdx` | L192 | `/docs/textbook-shovel-excavator`, `/docs/textbook-transport-machinery`（**接頭辞抜け**） |
| `civil-construction-1/textbook-quality-overview/article.mdx` | L223 | `/docs/textbook-histogram`, `/docs/textbook-control-chart`（**接頭辞抜け**） |

---

## spot check 結果

- [x] `textbook-transport-machinery` の 5 件（crane / loader / grader-compaction / shovel-excavator / scraper）は **全部 published=true で実在** → 検出されないのが正解（ロジック正常）
- [x] PE 配下 bare slug → `pe-comprehensive-management-` 補完: 19 件で実際に動作確認済み
- [x] 走査リンク数 +6,175 件で `<RelatedKeywords>` 由来 slug の取り込みが効いている
- [x] 既存 Markdown リンク由来 HIGH 件数: 79 件のまま不変 → 既存挙動への副作用なし

---

## 重要な発見

**ユーザーが「transport-machinery で 404」と言ったが、transport-machinery の関連キーワード 5 件は全部実在**。

考えられる 404 視認元:
1. **同じ機械系の `textbook-loader` ページ（L192）**: Markdown リンクで `/docs/textbook-shovel-excavator`（接頭辞抜け）→ 404。ユーザーが回遊中に見た可能性が一番高い
2. 別ページの関連キーワードカード（要追加調査）

→ B カテゴリ（接頭辞抜け Markdown リンク）が真犯人と推定。

---

## 次セッションへの引き継ぎ

### 修正方針判断が必要

- **A カテゴリ（19 件・PE）**: slug を実在 slug に張り替え or RelatedKeywords エントリ削除。多くは類似 slug が存在しそう（`rasis` → `raid` 系？ `lca` → `life-cycle-assessment`？ など要確認）
- **B カテゴリ（接頭辞抜け Markdown リンク・civil 8 件）**: `/docs/textbook-` を `/docs/civil-construction-1-textbook-` に書き換え。または `-text` / `-text-01` のような旧命名を実 slug に正規化

### 横展開候補

- `<CrossExam>` `<Backlinks>` 等の他 JSX コンポーネントも同様の slug ハードコードを持つ可能性 → 同パターンで `check-links.mjs` に追加可能
- 今回の拡張は `<RelatedKeywords>` 専用パターン。共通化するなら「JSX 内 `slug:` を一律抽出する汎用ロジック」も検討余地あり（誤検出リスクとトレードオフ）
