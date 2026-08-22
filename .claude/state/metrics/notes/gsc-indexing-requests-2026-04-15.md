# GSC 手動 indexing リクエスト 作業リスト

**作成日**: 2026-04-15 07:29
**最終更新**: 2026-04-15 07:35（API 一括チェック結果を反映）
**目的**: EXP-001「統合ハウスキーピング」Step 2 の手動リクエスト作業
**関連**: `data/experiments.json` の EXP-001

---

## 🤖 API 自動チェック結果（2026-04-15 07:34）

API でできること:
- ✅ **インデックス状態の一括取得**（`scripts/inspect-url.mjs`）
- ✅ **Googlebot UA でのライブフェッチ テスト**（curl）

API でできないこと:
- ❌ **「インデックス登録をリクエスト」** — Google が API 禁止（一般コンテンツサイトは不可、`JobPosting`/`BroadcastEvent` の構造化データのみ例外）
- ❌ **GSC UI の「ライブテスト」ボタン相当** — API は最後の既知状態のみ返す

### 自動チェック結果

| # | URL | API 状態 | Googlebot 200 | 要アクション |
|---|---|---|---|---|
| 1 | pdca-cycle | 🟢 **PASS (indexed)** | ✅ | **不要** |
| 2 | business-continuity-plan | 🟡 検出・未登録 | ✅ | 手動リクエスト |
| 3 | risk-assessment | 🟡 検出・未登録 | ✅ | 手動リクエスト |
| 4 | labor-standards-act | 🟡 検出・未登録 | ✅ | 手動リクエスト |
| 5 | key-performance-indicators | 🟡 検出・未登録 | ✅ | 手動リクエスト |
| 6 | analytic-hierarchy-process | 🟡 検出・未登録 | ✅ | 手動リクエスト |
| 7 | cause-and-effect-diagram | 🔴 **Google 未認識** | ✅ | 手動リクエスト（最優先）|
| 8 | four-m-of-production | 🟡 検出・未登録 | ✅ | 手動リクエスト |
| 9 | r01-primary | 🟡 検出・未登録 | ✅ | 手動リクエスト |
| 10 | r07-primary | 🟡 検出・未登録 | ✅ | 手動リクエスト |
| 11 | civil-construction-1 r07-a | 🟡 検出・未登録 | ✅ | 手動リクエスト |
| 12 | civil-construction-1 r06-a | 🟡 検出・未登録 | ✅ | 手動リクエスト |
| 13 | civil-construction-1 r05-a | 🟡 検出・未登録 | ✅ | 手動リクエスト |
| 14 | civil-construction-1 textbook-construction-mgmt-overview | 🟡 検出・未登録 | ✅ | 手動リクエスト |
| 15 | civil-construction-1 guide-earthwork-key-points | 🟡 検出・未登録 | ✅ | 手動リクエスト |

**要約**:
- 🟢 インデックス済み: **1 件**（pdca-cycle、republish 後もそのまま PASS 維持）
- 🟡 検出・未登録: **13 件**（sitemap で Google は認識済みだが未インデックス）
- 🔴 Google 未認識: **1 件**（cause-and-effect-diagram、最優先でリクエスト）
- 全 15 URL が **Googlebot UA で 200 OK**（サイト側は完全に健全）

→ **pdca-cycle を除く 14 件が手動リクエスト対象**

---

## 実施手順

1. [Google Search Console](https://search.google.com/search-console) を開く
2. プロパティ `doboku-note.com` を選択
3. **(一度だけ) サイトマップ再送信**: 左メニュー「サイトマップ」→ `sitemap.xml` を送信
4. 各 URL について:
   - 画面上部の **「URL 検査」** に URL を貼り付け（スペース混入注意！）
   - 検査結果ページで **「インデックス登録をリクエスト」** をクリック
   - 数秒待ち、「URL のインデックス登録をリクエスト済み」と表示されたら完了
   - チェックボックスにチェック
   - 次の URL へ

**レート制限**: GSC の手動リクエストは 1 日 10-20 件程度が上限と推定。**実測では 11 件で割当到達**（2026-04-15 実績）。

---

## ⏸ 進捗状況（2026-04-15 中断時点）

- **完了**: 11/14 件 ✅
- **残**: 3 件（1 級土木 下位、Day 2 以降で継続）
  - #12 civil-construction-1-primary-r05-a
  - #13 civil-construction-1-textbook-construction-mgmt-overview
  - #14 civil-construction-1-guide-earthwork-key-points
- **次回作業日**: **2026-04-16 以降**（GSC の 1 日クォータがリセットされるタイミング）

### 完了の内訳

| グループ | 完了数 | 残数 |
|---|---:|---:|
| 🔴 Google 未認識（最優先） | 1/1 | 0 |
| ⭐ 総監 核キーワード | 4/4 | 0 |
| 中優先（新公開 + 総監過去問）| 4/4 | 0 |
| 下位（1 級土木）| 2/5 | 3 |
| **合計** | **11/14** | **3** |

### 重要な実測値

- **GSC 1 日クォータ**: 実測 ~11 件。次回も同程度を見込み、残り 3 件は 1 セッションで片付く想定
- **次回所要時間**: 3 件なら 5 分程度

---

## Day 1 — 2026-04-15（最優先 + 中優先 9 件）

### 🔴 最優先: Google 未認識 1 件

- [x] 1. 特性要因図（Google に URL 自体が認識されていない） ✅ 2026-04-15

```
https://doboku-note.com/docs/pe-comprehensive-management-cause-and-effect-diagram
```

### ⭐ 最優先: 総監の核キーワード 4 件（pdca-cycle は既 indexed のため除外）

- [x] 2. 事業継続計画 (BCP) ✅ 2026-04-15

```
https://doboku-note.com/docs/pe-comprehensive-management-business-continuity-plan
```

- [x] 3. リスクアセスメント ✅ 2026-04-15

```
https://doboku-note.com/docs/pe-comprehensive-management-risk-assessment
```

- [x] 4. 労働基準法 ✅ 2026-04-15

```
https://doboku-note.com/docs/pe-comprehensive-management-labor-standards-act
```

- [x] 5. KPI (Key Performance Indicators) ✅ 2026-04-15

```
https://doboku-note.com/docs/pe-comprehensive-management-key-performance-indicators
```

### 中優先: 新公開キーワード + 総監過去問 4 件

- [x] 6. AHP (階層分析法) ✅ 2026-04-15

```
https://doboku-note.com/docs/pe-comprehensive-management-analytic-hierarchy-process
```

- [x] 7. 生産の 4M ✅ 2026-04-15

```
https://doboku-note.com/docs/pe-comprehensive-management-four-m-of-production
```

- [x] 8. 令和 1 年度 総監 1 次過去問 ✅ 2026-04-15

```
https://doboku-note.com/docs/pe-comprehensive-management-r01-primary
```

- [x] 9. 令和 7 年度 総監 1 次過去問 ✅ 2026-04-15

```
https://doboku-note.com/docs/pe-comprehensive-management-r07-primary
```

---

## Day 2 — 2026-04-16（下位 5 件）

### 下位: 1 級土木 過去問 + ガイド

- [x] 10. 1 級土木 R7 第 1 次 問題 A ✅ 2026-04-15

```
https://doboku-note.com/docs/civil-construction-1-primary-r07-a
```

- [x] 11. 1 級土木 R6 第 1 次 問題 A ✅ 2026-04-15（1 日の割当量到達でここまで）

```
https://doboku-note.com/docs/civil-construction-1-primary-r06-a
```

- [ ] 12. 1 級土木 R5 第 1 次 問題 A

```
https://doboku-note.com/docs/civil-construction-1-primary-r05-a
```

- [ ] 13. 1 級土木 施工管理の概要（テキストブック）

```
https://doboku-note.com/docs/civil-construction-1-textbook-construction-mgmt-overview
```

- [ ] 14. 1 級土木 土工の重要ポイント（ガイド）

```
https://doboku-note.com/docs/civil-construction-1-guide-earthwork-key-points
```

---

## 完了後の確認

Day 2 終了後、以下を確認:

- [ ] 全 14 件のチェックが入っている
- [ ] GSC の「URL 検査履歴」で 14 件のリクエストが表示されている
- [ ] sitemap.xml が GSC サイトマップ画面で「成功」ステータスになっている

完了したら assistant に「GSC 手動リクエスト完了」と合図してください。EXP-001 の history に記録し、2 週間後（2026-04-29 前後）の再監査をスケジュールします。

---

## 今回の作業で判明した重要な制約

### なぜ API で一気にできないか

Google は **2018 年以降、一般コンテンツサイト向けの Indexing API 使用を禁止** しています。理由は:

1. **スパム対策**: 低品質サイトが大量のページを即 indexing 要求するのを防ぐ
2. **品質担保**: Google 側で独自に品質判定する時間を確保
3. **例外用途**: `JobPosting`（求人情報）と `BroadcastEvent`（ライブイベント）など、**時間価値が極めて短いコンテンツ** のみ許可

### 代替のアプローチ

時間節約するには:

1. **API で状態を事前チェック** → すでに indexed のものは除外（今回 1 件節約）
2. **Googlebot UA で curl テスト** → 404/5xx を事前に発見（今回 0 件、全て健全）
3. **sitemap 再送信の自動化**（将来）: `scripts/submit-sitemap.mjs` を作れば 1 クリックで済む

### 今後の改善アイデア

- **毎週の cron で inspect-url を回す**: 全 748 ページの indexed 率を時系列で追跡
- **未インデックスが新規発生した時の slack 通知**
- **sitemap URL の自動更新 + GSC 送信スクリプト化**（Search Console API の `sitemaps.submit` 経由）

---

## 作業ログ（適宜メモ）

| 時刻 | URL | 結果 | メモ |
|---|---|---|---|
| | | | |
