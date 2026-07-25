# 週次レビュー 2026-W30

作成日: 2026-07-24（木）  
対象期間: 2026-07-20（月）〜 2026-07-26（土）  
前週: [2026-W29-review.md](./2026-W29-review.md)

---

## サマリー

- **計画達成率**: W29 Must 2件のうち確認済み完了 0件（解答速報 note 公開・X countdown 064投入 — 共にステータス未確認）
- **主な成果**:
  1. pe-keyword 総監キーワード体系 Phase1〜3 完結（660 keywords、PR #429 merged）
  2. pe-keyword バッチ3〜5 実装（経済性管理・人的資源・情報バッチ、ハブ配線・pe-chapters登録）
  3. 標準テキスト網羅 完全対応表 + D/E全実装（新規2ページ・補強17箇所）
  4. W30 新規 handoff 11件（Brain チャネル・civil note 導線等、積極展開の証拠）
- **NSM（Organic Search）**: 1,198 ユーザー（前週 1,112、**+7.7% WoW**）— 試験翌週の反落が底を打ち微回復
- **要注意**:
  - PSI **CRITICAL REGRESSION**: Performance 59（-10）、LCP 10,158ms（+3,280ms）— 原因不明、W31 即対応必須
  - X countdown 064 **OVERDUE 継続**（2週間以上未着手）
  - EXP-005 **3週連続未着手**（実験文化の形骸化リスク）

---

## 計画 vs 実績

| タスク | 計画元 | 状態 | メモ |
|---|---|---|---|
| 解答速報 note 公開 | W29 Must | ⏳ 未確認 | ステータス確認できず。W30 handoff 未発見 |
| X countdown 064 投入 | W29 Must | 🔴 OVERDUE | 2週以上未着手。W31 Must へ繰越 |
| EXP-005 start | W29 Should | ⏸ 未着手 | 3週連続 proposed のまま |
| BK-09/10 R08予想 note 公開 | W29 Should | ⏳ 未確認 | handoff 発見されず |
| pe-keyword Phase3 実装 | 継続 | ✅ 完了 | PR #429 merged、660 keywords |

---

## 成果ハイライト

1. **pe-keyword 体系完結**: 総監キーワードページ 660件を Phase1〜3 で完全実装。標準テキスト網羅対応表と Phase 完結により、pe-keyword は基盤フェーズから活用フェーズへ移行。
2. **標準テキスト完全対応**: 新規2ページ（D/E全体）+ 既存17箇所補強で、競合サイトに対するコンテンツ優位性が確立。
3. **Brain チャネル立ち上げ**: handoff `2026-07-22-brain-channel-launch.md` 生成。副業チャネル多様化の布石。
4. **civil-note 導線整備**: CTA wiring handoff 生成（`2026-07-24-civil-note-funnel-remediation.md`）。ファネル強化の準備完了。

---

## 開発活動

- **今週のコミット数**: 5件以上（top 5 確認、すべて `feat(pe-keyword)` 系）
- **主な変更クラスタ**:
  - `feat(pe-keyword)`: Phase3 完結（keyword-relations同期・registry phantom解消・orphan 8件登録）
  - `feat(pe-keyword)`: バッチ3〜5（経済性管理・人的資源・情報管理・標準テキスト対応表）
  - `feat(pe-keyword)`: ハブ配線・pe-chapters登録・OGP生成
  - PR #429 merged（2026-07-24）: 総監標準テキスト網羅 完全対応表＋D/E全実装

---

## コンテンツ実績

| カテゴリ | 追加 | 内容 |
|---|---|---|
| pe-keyword | 660 件体系完結 | Phase1〜3、orphan 8件含む registry 整備 |
| pe-comprehensive-management | 2ページ新規 | 標準テキスト D/E 全体カバー |

---

## NSM（オーガニック検索流入）

> データソース: `.claude/state/weekly-metrics/2026-W30.json`（CI生成 2026-07-23T21:59Z）  
> GA4 計測期間: 2026-07-16〜07-22 vs 2026-07-09〜07-15

### GA4 チャネル別ユーザー数

| チャネル | 今週 | 前週 | WoW |
|---|---|---|---|
| **Organic Search（NSM）** | **1,198** | 1,112 | **+7.7%** |
| Direct | 391 | 259 | +51.0% |
| Referral | 320 | 77 | +315.6% |
| Organic Social | 116 | 27 | +329.6% |
| AI Assistant | 30 | 26 | +15.4% |
| **合計** | **2,080** | **1,510** | **+37.7%** |

### GSC パフォーマンス

> GSC 計測期間: 2026-07-14〜07-20 vs 2026-07-07〜07-13

| 指標 | 今週 | 前週 | WoW |
|---|---|---|---|
| Clicks | 98 | 74 | +32.4% |
| Impressions | 1,342 | 904 | +48.5% |
| CTR | 7.30% | 8.19% | -0.89pp |
| Position | 12.54 | 14.27 | 改善 |

### 主要クエリ（今週 Top）

| クエリ | Clicks | Position |
|---|---|---|
| 総合技術監理 キーワード集 2026 | 2 | 9.1 |
| 技術士二次試験 | 1 | 10.4 |
| 技術士二次試験 令和8年 | 1 | 2.0 |

### 洞察

- NSM +7.7% は試験翌週（W28→W29で-17.9%急落）後の反発底打ち。試験直前需要の反動が収束し、来年受験生の新規流入が開始していると解釈。
- Referral +315.6%、Organic Social +329.6% は SNS 流入急増（note 251、X 109）が寄与。
- CTR -0.89pp は impressions 急増（+48.5%）に対してクリック増が追いついていない。pe-keyword 追加による低 CTR ページのインデックス増加が原因と推察。

---

## 実験の進捗

### Running

なし（EXP-005 は proposed のまま）

### Proposed（3週放置）

| ID | title | status | 放置週数 | 次のアクション |
|---|---|---|---|---|
| EXP-005 | docs テンプレ モバイル LCP 改善 | proposed | **3週** | **W31 Must: /nsm-experiment start** |

### Completed / Cancelled

| ID | title | 最終状態 |
|---|---|---|
| EXP-001 | インデックス解放 | done/success |
| EXP-002 | 5記事非公開 | cancelled |
| EXP-003 | seoTitle 修正 | done/partial |
| EXP-004 | suffix 重複除去 | done/partial |

### 次サイクルへの提言

EXP-005（docs テンプレ LCP 改善）を W31 に即 start。今週の PSI CRITICAL REGRESSION（LCP 10,158ms）とは別問題だが、同時進行で LCP 戦略を二本立てにする。

---

## PSI パフォーマンス推移

> データソース: `.claude/state/weekly-metrics/2026-W30.json`（homepage のみ）

| 指標 | W29 | **W30** | WoW |
|---|---|---|---|
| Performance | 69 | **59** | **-10 CRITICAL** |
| LCP (ms) | 6,878 | **10,158** | **+3,280ms CRITICAL** |
| TBT (ms) | 117 | 75 | -42ms 改善 |
| CLS | 0 | 0 | 変化なし |
| FCP (ms) | — | 4,949 | — |

### 洞察

- Performance 59 は閾値（70）を大きく下回る。前週比 -10 は CRITICAL 回帰基準（-10以上）にちょうど抵触。
- LCP 10,158ms は前週 6,878ms から +3,280ms の急激な悪化。Hero 画像の R2 配信遅延・新規 Hero コンポーネント変更・Large JS ブロックのいずれかが原因として疑われる。
- TBT は改善しているため、JavaScript ブロックは減少。LCP は画像・CSS 系の問題が濃厚。
- W31 最優先タスク：PSI 回帰の原因特定（git bisect or PageSpeed Insights Filmstrip）+ 修正。

---

## 収益カバレッジ ダッシュボード

| チャネル | 状態 | メモ |
|---|---|---|
| AdSense | 外部承認待ち | W29 以降ステータス変化なし |
| note（土木キーワード） | 公開継続 | W30 新規公開確認できず |
| Brain | 立ち上げ準備 | `2026-07-22-brain-channel-launch.md` handoff |
| ココナラ | 継続運用 | 受注状況未確認 |

---

## SNS 流入と投稿実績

> SNS セッション: `.claude/state/weekly-metrics/2026-W30.json`

| ソース | 今週 | 前週 | WoW |
|---|---|---|---|
| note | 251 | 18 | +1,294% |
| X（Twitter） | 109 | 0 | new |
| **SNS 合計** | **360** | **18** | **+1,900%** |

### 洞察

- note と X が同時爆発。note は過去記事のバズか新規公開の伸び。X 109 ユーザーは前週 0 からの完全新規流入 — X 投稿効果が初めて GA4 で可視化。
- X countdown 投稿が機能していると仮定するなら、064 以降の継続投入が急務。

### YT Shorts 状況

- pending_overdue 107件（W29 から変化なし、W31 要確認）

---

## 校正学習の蒸留

- pe-keyword Phase1〜3 完結を通じ、keyword-relations の phantom（registry 未登録 slug）解消パターンが確立。registry 整合 → phantom check → orphan 登録 の 3-step が定型化。
- 標準テキスト網羅対応表の実装で「コンテンツ存在」と「網羅評価」の分離設計が有効と実証。

---

## SNS 予約キュー投入（X）

| 状態 | 件数 | 内容 |
|---|---|---|
| 投入完了 | 未確認 | W30 分の新規投入件数不明 |
| OVERDUE | 064〜 | W29 以来 OVERDUE 継続 |

**W31 アクション**: X countdown 064 投入を Must に据え、週次 X キュー投入習慣を回復する。

---

## ドキュメント棚卸し（handoff 抽出→削除候補）

### W30 新規 handoff（11件）

| ファイル | 作成日 | 内容 | 優先 |
|---|---|---|---|
| 2026-07-19-brain-claude-code-essay-product.md | 07-19 | Brain Claude Code 記述式キット | High |
| 2026-07-19-civil-note-audit.md | 07-19 | civil note 品質監査 | Medium |
| 2026-07-19-note-cover-clarity-v3-design.md | 07-19 | note カバー明瞭度 v3 | Medium |
| 2026-07-20-playwright-e2e-implementation-docs.md | 07-20 | Playwright E2E 実装 | Medium |
| 2026-07-20-r8-policy-prediction-product.md | 07-20 | R8 政策予測プロダクト | High |
| 2026-07-21-author-authority-banner-live-reflect.md | 07-21 | 著者権威バナー反映 | Medium |
| 2026-07-21-civil-note-cta-wiring.md | 07-21 | civil note CTA 配線 | High |
| 2026-07-22-brain-channel-launch.md | 07-22 | Brain チャネル立ち上げ | High |
| 2026-07-24-civil-note-funnel-remediation.md | 07-24 | civil note ファネル修復 | High |
| 2026-07-24-gsc-ga4-playwright-automation.md | 07-24 | GSC/GA4 Playwright 自動化 | Medium |
| 2026-07-24-pe-textbook-keyword-coverage-audit.md | 07-24 | pe-textbook キーワード網羅監査 | Medium |

### 削除候補

| ファイル | 理由 |
|---|---|
| 2026-07-14-category-ui-accordion-exammatrix.md | PR #393/#395/#397 全 merged 済み。完了 handoff |

**W31 アクション**: `/doc-declutter` で 12件 handoff を KEEP/TRIM/DELETE 分類。削除候補 1件を確認の上削除。

---

## 課題・ブロッカー

1. **PSI CRITICAL REGRESSION（最優先）**: Homepage Performance 59、LCP 10,158ms。原因不明。git bisect + PageSpeed Filmstrip で特定必須。W31 先頭タスク。
2. **X countdown OVERDUE**: 064 以降 2週以上未投入。X 流入 109 users が出た今こそ投入継続が最大効果。
3. **EXP-005 3週放置**: 実験文化の形骸化。W31 に /nsm-experiment start を確約。
4. **AdSense 外部承認待ち**: 自己解決不能。ステータス確認のみ継続。
5. **YT Shorts pending_overdue 107件**: 大量滞留。月次棚卸しで部分対応。

---

## 学び

- SNS 流入が可視化された（X 109 users、note 251 users）。X 投稿停止の機会損失が数値で証明された。継続投入の意義は実証済み。
- pe-keyword Phase1〜3 完結により、キーワードページ体系が「点」から「面」へ転換。次は NSM への流入貢献を計測フェーズへ移行。
- PSI 回帰は見えない劣化として積み重なっており、週次 PSI 確認の重要性を再認識。スナップショット CI 化の恩恵がここで活きている。

---

## 来週への申し送り

1. **[Must] PSI 回帰調査**: Homepage LCP 10,158ms の原因を特定し修正。git log で最近の Hero/Image/CSS 変更を特定 → PageSpeed Filmstrip で確認 → 修正 PR。
2. **[Must] EXP-005 start**: `/nsm-experiment start EXP-005` を実行。3週放置の終止符。docs テンプレ LCP ターゲット: r07-a / h26-a / guide-four-management。
3. **[Must] X countdown 064 投入**: X 流入 109 users の勢いを活かす。週次 X キュー習慣を再確立。
4. **[Should] /doc-declutter**: 12件 handoff を整理。2026-07-14 handoff（削除候補）を確認→削除。
5. **[Should] civil-note-cta-wiring 実施**: `2026-07-24-civil-note-funnel-remediation.md` を実行。ファネル強化。
6. **[Could] BK-09/10 R08予想 note 公開**: 試験後来年受験生向けコンテンツ需要。余力があれば。
7. **AdSense 承認ステータス確認**: 変化があれば収益化フェーズへ移行準備。
