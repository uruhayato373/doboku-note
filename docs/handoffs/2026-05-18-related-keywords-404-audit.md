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
- [x] commit #1: check-links.mjs 拡張 + handoff（38e2cd66e）
- [x] B カテゴリ civil 16 件修正（接頭辞補完 4 件 + テーブル行削除 12 件）
- [x] commit #2: civil 404 修正 + handoff 更新（5dde8fe17）
- [x] commit #3: 空き殻 5 ディレクトリ削除（80 ファイル）+ handoff 更新
- [ ] A カテゴリ PE 19 件の対処（次セッション）
- [ ] R2 残骸（storage.doboku-note.com 配下の同パス）の扱い（次セッション）

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

## B カテゴリ修正後

| 指標 | 値 | 差分 |
|---|---|---|
| HIGH 件数 | **82** | **-16**（civil 16 件全消化） |
| civil-construction-1 ファイル数 | **0** | 全消化 |

レポート出力: `.tmp/post-fix-audit/latest-report.md`

---

## 検出された 404（要修正）

### A-detail. RelatedKeywords 由来 19 件（未対処、PE 配下）

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

### B. civil-construction-1 配下 Markdown リンク由来（ベースラインで既出 → 本セッションで全件修正済み）

ユーザーが視認した 404 はおそらくここ。

**サブカテゴリ B-1: 接頭辞抜け（4 件、機械的補完で修正済み）**

| ファイル | 行 | Before | After |
|---|---|---|---|
| `civil-construction-1/textbook-loader/article.mdx` | L192 | `/docs/textbook-shovel-excavator`, `/docs/textbook-transport-machinery` | `civil-construction-1-` 接頭辞補完 |
| `civil-construction-1/textbook-quality-overview/article.mdx` | L223 | `/docs/textbook-histogram`, `/docs/textbook-control-chart` | `civil-construction-1-` 接頭辞補完 + リンクテキストを slug 文字列から日本語に修正 |

**サブカテゴリ B-2: 空き殻ディレクトリ参照（12 件、テーブル/行削除で修正済み）**

`textbook-construction-plan-text-{01,02}`, `textbook-related-laws-{01,02}`, `textbook-quality-management-text` の 5 ディレクトリは **過去存在したが `885e00002` の textbook 再構成で article.mdx 削除済み**（OGP 画像だけ残存）。参照していた guide-* 4 ファイルから該当リンクを削除（テーブル行 or 列ごと）。

| ファイル | 削除内容 |
|---|---|
| `guide-concrete-key-points` | L70（[品質管理 本文] リンク）、L484（quality-management-text 列）、L487（plan-text-01/02 列）、L488（related-laws 行ごと） |
| `guide-earthwork-key-points` | L467（plan-text-01/02 列） |
| `guide-quality-management` | L397（plan-text-01/02 列） |
| `guide-schedule-management` | L393（plan-text-01/02 列） |

→ **civil-construction-1 配下の HIGH は 0 件に**（98 → 82）。

### B-3. 空き殻ディレクトリ自体の掃除（commit #3）

参照を除去しただけだとディレクトリと img 残骸が残るので、5 ディレクトリを `git rm -r` で削除（80 ファイル）:

- `textbook-construction-plan-text-01/` (20 ファイル: fig-2-1〜10 png/webp + ogp)
- `textbook-construction-plan-text-02/` (14 ファイル: fig-2-11〜16 png/webp + ogp)
- `textbook-related-laws-01/` (8 ファイル: fig-7-1, fig-7-2, fig-7-construction-system png/webp + ogp)
- `textbook-related-laws-02/` (10 ファイル: fig-7-3〜6 png/webp + ogp)
- `textbook-quality-management-text/` (28 ファイル: fig-4-1〜12+ png/webp + ogp)

事前チェック: 他 MDX からの参照ゼロを `grep -rln "textbook-XXX/img"` で確認済。同名 fig は各 secondary-* 配下の別物（完全パスで参照）。

**R2 残骸**: `storage.doboku-note.com/posts/civil-construction-1/textbook-{*}/img/...` は残存。`npm run upload-images-r2` は upload のみで delete しないため、R2 側の手動掃除 or CI スクリプト拡張が次セッション以降の課題。

### A. RelatedKeywords 由来（PE 配下 19 件、未対処）

> 次セッション以降の対象。slug 張り替え or RelatedKeywords エントリ削除の判断が必要。

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

### このファイルを開いた Claude へ — 着手手順

1. **このファイル全体を Read** して背景把握（特に「A-detail. RelatedKeywords 由来 19 件」表が作業対象）
2. **本セッション 3 commit は origin/develop に push 済み**（`38e2cd66e` / `5dde8fe17` / `e7e4d9fd8`）。pull で同期されている
3. **着手前に最新監査を再生成**（CI 結果が更新されている可能性あり）:
   ```bash
   node .claude/skills/quality/check-mdx/scripts/rules/links/check-links.mjs --scope site --report .tmp/audit
   grep "RelatedKeywords slug" .tmp/audit/latest-report.md
   ```

### 残課題 — 優先度順

#### Priority 1: PE RelatedKeywords 19 件の張り替え or 削除

**作業対象**: 上記「A-detail」表（L78 周辺）の 19 件。すべて `pe-comprehensive-management/{file}/article.mdx` L# の `<RelatedKeywords items={[{label, slug: "bare-slug"}]} />` 内の bare slug。

**判断フロー**（slug ごとに繰り返す）:
1. `ls .local/r2/posts/pe-comprehensive-management/ | grep -i "<keyword>"` で類似実在 slug を探す
2. **見つかれば**: slug を実在名に張り替え（例: `lca` → `life-cycle-assessment` が実在すれば差し替え。`label` も自然なら維持）
3. **見つからなければ**: RelatedKeywords の該当エントリ `{ label, slug }` 自体を削除
4. **判断が分かれる候補**（例: `rasis` → `raid` 系？など）はユーザーに確認

**完了条件**:
- `node .claude/skills/quality/check-mdx/scripts/rules/links/check-links.mjs --scope site` で RelatedKeywords 由来 HIGH = 0
- `npm run refresh-indexes` 実行
- commit & push

#### Priority 2: R2 残骸（80 ファイル相当）の手動掃除

**対象**: `storage.doboku-note.com/posts/civil-construction-1/textbook-{construction-plan-text-01,construction-plan-text-02,related-laws-01,related-laws-02,quality-management-text}/...`

本セッション commit `e7e4d9fd8` で git からは削除済みだが、`npm run upload-images-r2` は upload only のため R2 側は残存。誰もリンクしないので害は無いがストレージコスト微増。

**選択肢**:
- (a) `wrangler r2 object delete` で 1 ディレクトリずつ手動掃除
- (b) `scripts/upload-images-r2.mjs` を「ローカルに無い R2 オブジェクトを delete する」モード追加で常時整合
- (c) 放置（コスト軽微なら）

#### Priority 3: main へのデプロイ判断

本セッション 3 commit + 並行 commit が develop に乗っている。コンテンツ/リンク修正なので本番反映の価値はある。`/deploy` スキルでユーザー判断。

### 横展開候補（中期）

- `<CrossExam>` `<Backlinks>` 等の他 JSX コンポーネントも同様の slug ハードコードを持つ可能性 → 同パターンで `check-links.mjs` に追加可能
- 今回の拡張は `<RelatedKeywords>` 専用パターン。共通化するなら「JSX 内 `slug:` を一律抽出する汎用ロジック」も検討余地あり（誤検出リスクとトレードオフ）
- `RelatedKeywords.tsx` 自体の silent fallback（`pe-comprehensive-management-` 接頭辞自動補完）を廃止し、明示プレフィックス必須にする破壊的変更も検討余地あり（既存 666 件 MDX への影響大）
