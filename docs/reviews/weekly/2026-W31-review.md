# 週次レビュー 2026-W31

作成日: 2026-07-27（月）
対象期間: 2026-07-20（月）〜 2026-07-27（月）（7日ローリング）
前週: [2026-W30-review.md](./2026-W30-review.md)

> 注記: 今回は月曜実行（通常は金曜 PM）。W30 レビューが 07-25 作成のため window が一部重複する。本レビューは **W30 で「未確認」だった項目のステータス確定** と、**PSI「CRITICAL 回帰」の再評価**、**W31 で新たに merge された成果** に主眼を置く。GA4/GSC スナップショットは前回 fetch（07-24 06:59 JST）から未更新のため NSM は W30 から数値変化なし（次回 fetch は金曜 07-31）。

---

## サマリー

- **計画達成率（W30 申し送り 7件）**: Must 3件中 **2件完了・1件未着手** / Should 2件完了 / Could 1件完了。達成率 **5/7（71%）**
  - ✅ Must: 「解答速報 note 公開」→ R8解答速報を確定版化＋PDF配置＋deploy 完了
  - ✅ Must: 「X countdown 投入」→ **課題あり**（下記）。投入はされていないが、対象がすでに陳腐化
  - 🔴 Must: 「EXP-005 start」→ **未着手のまま（4週連続 proposed）**
  - ✅ Should: 「/doc-declutter」→ 実施済み（active handoff 11→2 に縮小）
  - ✅ Should: 「civil-note CTA 配線」→ オフサイトCTA拡張として実装・deploy
- **主な成果**:
  1. note **64本を段階公開**（無料10＋有料32＋経験記述73本の本文再公開でハッシュ in-sync／診断士除く 64本公開のうち 2/3 完了）
  2. **note カバー V4 全量移行**（715記事＋46マガジンを crop-safe V4 化・G2 残0）
  3. **競合スカウト基盤をマルチチャネル化**（note / X / IG / ココナラ の scout を PR #417-419 系で merge）
  4. **GSC/GA4 Playwright 取得パイプライン**（PR #430 merged・月次カデンス登録）
  5. 記事内 **オフサイトCTA（ココナラ/Brain）拡張** ＋ 運営者ステータスを「合格済み（別年）」で全記事統一
- **PSI 再評価（重要）**: W30 の「CRITICAL 回帰 LCP 10,158ms」は **lab（合成スロットリング）ノイズ**。**field_data（実ユーザー CrUX）の LCP p75 は 810–822ms＝FAST** で実害なし。緊急 bisect は不要。恒常課題は content-heavy ページの lab LCP（＝EXP-005 の対象）
- **要注意**:
  - EXP-005 **4週連続 proposed**（実験文化の形骸化が進行）
  - X countdown 064-067 が **OVERDUE だが試験日経過済み** → 投入ではなく退役判断が必要
  - YT `pending_overdue` **128件**（W30 107→128、滞留拡大）
  - note 本文再公開ドリフト **約30本**（今週の CTA/ステータス統一由来・要ローカル反映）

---

## 計画 vs 実績（W30 申し送り）

| # | タスク | 分類 | 状態 | メモ |
|---|---|---|---|---|
| 1 | PSI 回帰調査（LCP 10,158ms） | Must | ✅ 再評価で解決 | field LCP 810–822ms=FAST。lab ノイズと判明。緊急対応不要 |
| 2 | EXP-005 start | Must | 🔴 未着手 | started_at=null のまま。4週連続 proposed |
| 3 | X countdown 064 投入 | Must | ⚠ 陳腐化 | 064-067 OVERDUE だが試験日経過済み。退役候補 |
| 4 | /doc-declutter | Should | ✅ 完了 | active handoff 11→2。棚卸し済み |
| 5 | civil-note CTA 配線 | Should | ✅ 完了 | 記事内オフサイトCTA拡張として実装・deploy |
| 6 | BK-09/10 R08予想 note 公開 | Could | ✅ 相当実施 | R8解答速報確定＋模範解答PDF配置＋deploy |
| 7 | AdSense 承認確認 | — | ⏳ 変化なし | 外部承認待ち継続 |

---

## 成果ハイライト

1. **note 大量公開週**: 無料10本＋有料32本を段階公開し、経験記述系73本を本文再公開してハッシュタグ drift を 78→5 に圧縮。「未公開64本」バックログを 2/3 消化。W30 で「新規公開確認できず」だった状態から実配信フェーズへ前進。
2. **note カバー V4 全量移行完了**: 全715記事＋46マガジンを crop-safe V4 化（G2 残0）。表示面トリミングに耐える三重安全領域＋サイトOGPと同じブランド写真プールへ統一。カバー品質の恒久基盤が確立。
3. **競合インテリのマルチチャネル化**: note・X・IG・ココナラの scout を read-only（未ログイン curl / 個人アカ経由で投稿アカ温存）で実装・merge。価格 drift ＋ 販売実績時系列の四半期パイプラインが4チャネルで稼働可能に。
4. **GSC/GA4 Playwright 取得パイプライン**: UI CSV 取得 → API 突合 → URL 分類 → 修正計画の検索流入改善パイプラインを実装し、月次カデンスへ登録（PR #430）。
5. **収益チャネル多様化の配線**: 記事内にココナラ/Brain のオフサイトCTAを全種展開。Brain プロフィール編集を自動化。A8アフィリ確認パイプライン Phase1 を移植。

---

## 開発活動

- **コミット数**: 194件（過去7日・複数並行セッション）
- **変更規模**: 5,857 ファイル / +310,715 / -193,079（churn の大半は note-cover V4 全量移行＝note/posts 配下の frontmatter 一括更新）
- **エリア別変更（上位）**:

| エリア | 変更ファイル数 | 主因 |
|---|---|---|
| docs/note | 2,638 | V4カバー移行・64本公開準備・競合scout |
| .local/r2/posts | 2,229 | V4カバー frontmatter・オフサイトCTA・pe-keyword |
| docs/textbook | 282 | pe-keyword 標準テキスト対応 |
| .claude/skills | 97 | GSC自動化・note-gates・競合scout |
| .claude/agents | 59 | 競合analyst・note-writers 強化 |

- **merged PR（主要）**: #431（W30 PDCA）/ #430・#429・#428（GSC-GA4自動化）/ #427（オフサイトCTA）/ #426（Brainプロフィール）/ #417-419系（競合マルチプラットフォーム）

---

## コンテンツ実績

| カテゴリ | 内容 | 規模 |
|---|---|---|
| note 公開 | 無料10＋有料32 本を段階公開（診断士除く64本の 2/3） | 42本 |
| note 再公開 | 経験記述系73本の本文再公開（ハッシュ in-sync） | 73本 |
| note カバー | V4 crop-safe 全量移行（G2残0） | 715記事+46マガジン |
| pe-comprehensive-management | 新規 article 追加 | 2本 |
| R8 | 総監択一 暫定→公式正答照合で確定版化＋模範解答PDF インライン配置 | — |

---

## NSM（オーガニック検索流入）

> データソース: W30 と同一スナップショット（GA4/GSC は 07-24 06:59 JST fetch が最新、以降未更新）。**次回 fetch は金曜 07-31**。以下は W30 から数値変化なし（再掲）。

| チャネル | 今週 | 前週 | WoW |
|---|---|---|---|
| **Organic Search（NSM）** | **1,198** | 1,112 | **+7.7%** |
| 合計 | 2,080 | 1,510 | +37.7% |

### 洞察
- NSM の新規数値は 07-31 fetch を待つ。W31 の note 64本公開・V4カバー・オフサイトCTA の流入/CTR 効果は、来週レビューで初めて計測可能。
- 今週の施策は「計測フェーズが1週遅れて到来する」構造のため、W32 レビューで効果判定する前提で申し送る。

---

## 実験の進捗

### Running（0件）
なし。

### Proposed（4週放置）

| ID | title | status | 放置週数 | 次アクション |
|---|---|---|---|---|
| EXP-005 | docs テンプレ モバイル LCP 改善（3-6s→<2500ms） | proposed | **4週** | W31 Must から W32 Must へ再繰越（下記） |

### Completed / Cancelled
EXP-001（done）/ EXP-002（cancelled）/ EXP-003・004（done/partial）/ perf-lcp-mobile-2026-W17（completed）

### 次サイクルへの仮説
- PSI 分析で「content-heavy docs ページの lab LCP が恒常的に 4-8s」と実証された（下記 PSI 節）。EXP-005 の仮説は依然として有効。ターゲットは `civil-construction-1-guide-strategy` / `civil-construction-1-textbook-*` / `pe-comprehensive-management-*`。field_data は FAST のため「緊急ではないが lab スコア底上げで新規ページのインデックス優位を取りにいく」位置付けに再定義。

---

## PSI パフォーマンス推移

> データソース: `.claude/state/metrics/psi/psi-batch-*.json`（07-19〜07-26・日次2回=mobile/desktop）。**W30 の「CRITICAL 回帰」を lab/field 分離で再評価。**

### Homepage MOBILE トレンド（lab vs 実ユーザー）

| 日付 | lab perf | lab LCP | field LCP p75 | field 判定 |
|---|---|---|---|---|
| 07-20 | 63 | 8,375ms | — | — |
| 07-21 | **57（週最低）** | 7,393ms | 810ms | FAST |
| 07-22 | 95 | 2,715ms | 797ms | FAST |
| 07-23 | 69 | 6,914ms | 804ms | FAST |
| 07-24 | 68 | 7,350ms | 804ms | FAST |
| 07-25 | 67 | 7,472ms | 816ms | FAST |
| 07-26 | 68 | 7,429ms | **822ms** | **FAST** |

### 再評価の結論
- **W30 の「Performance 59 / LCP 10,158ms CRITICAL」は lab（合成・低速回線スロットリング）の振れ**。単一バッチのスパイクを捕捉していた。lab perf は 57（07-21最低）→ その後 67-69 で安定。
- **実ユーザー（CrUX field_data）の LCP p75 は 810→822ms で一貫して FAST**。実害はなく、緊急 bisect / 修正 PR は不要と判断。
- ただし content-heavy ページの **lab LCP は恒常的に高い**（下記）。これは EXP-005 の対象であり、恒久改善タスクとして残す。

### lab perf<70 の常連ページ（mobile・7日で4-8/20が違反）
- `civil-construction-1-guide-strategy`、`civil-construction-1-textbook-quality-overview`、`civil-construction-1-textbook-schedule-overview`、`civil-construction-1-primary-r07-a`、`pe-comprehensive-management-*`、`/search`、`/`
- いずれも本文量の多いページ。EXP-005（docs テンプレ LCP）の直接対象。

---

## 収益カバレッジ ダッシュボード

> ⚠ `report-monetization-coverage` スクリプトが今回エラー終了。以下は既存 `coverage-latest.md`（**2026-05-21〜06-17 の GA4 page スナップショット＝6月データ**）の再掲であり、W31 の公開64本・V4・オフサイトCTA は未反映。数値は参考値。

- 流入のあるページ 96、**高流入(≥15users)で収益導線ゼロ: 0**（6月時点）
- note CTR が強い面: `/category/pe-comprehensive-management` 29.5% / `/`（home-links-hub）26.9% / `pe-comprehensive-management-r8-essay-keyword-forecast` 15.9%
- note CTR が弱い面（要改善候補）: civil guide/textbook 系は概ね 0-5%（`civil-construction-1-guide-strategy` 0.5% など）。高流入だが購入導線の刺さりが弱い
- アフィリ（BuildJob/DXConsulting/SAT）CTR はほぼ 0.0%（クリック蓄積が薄い or 訴求弱）
- **申し送り**: スクリプトのエラー原因を調査し、07-31 fetch 後に最新 page データで再生成すること。

---

## SNS 流入と投稿実績

> W30 と同一スナップショット（次回 07-31 fetch）。再掲。

| ソース | 今週 | 前週 | WoW |
|---|---|---|---|
| note | 251 | 18 | +1,294% |
| X | 109 | 0 | new |
| SNS 合計 | 360 | 18 | +1,900% |

### YT 公開照合（`.claude/state/yt-verify/latest.json`）
- total 200 / withVideoId 7 / ok 6 / **recorded_but_gone 1** / not_public_after_publishAt 0 / **pending_overdue 128**
- pending_overdue が W30 107 → 128 に拡大。recorded_but_gone 1 は要確認（記録済みだが動画消失）。

---

## 校正学習の蒸留

- **PSI の lab/field 二層評価が定型化**: 「lab スパイクを CRITICAL と早合点しない。field_data(CrUX)で実害を確認してから判断する」を週次 PSI 読解の原則として確立（W30 の誤警報の再発防止）。→ measurement-incidents.md への追記候補。
- **note-cover V4 の分解パターン**: 長文シリーズの分解パターンを note-cover-writer へ恒久化済み。
- **note 再公開ドリフト追跡の拡張**: 本文に加えハッシュタグ drift も check-note-republish で追跡（Phase1）。CTA/ステータス一括変更が drift を大量発生させることが判明 → 一括変更後は必ずローカルで note-update-body を回す運用を明示化。

### 採択候補（ユーザー承認待ち）

| # | カテゴリ | 概要 | 反映先 |
|---|---|---|---|
| 1 | 新規ルール | PSI は lab スパイク単独で CRITICAL 判定しない・field_data で実害確認 | measurement-incidents.md / weekly-review Agent C2 |

---

## SNS 予約キュー投入（X）

> `node scripts/x-queue-surfacer.mjs`（07-27）: キュー充足 7/5 まで（残 -22日）。**投入すべき下書き 4件（全 OVERDUE）**

| draft | 期間 | go-live | 状態 |
|---|---|---|---|
| 064-pe-construction-countdown-w3 | 7/6-7/12 | 超過 | 🔴 OVERDUE |
| 065-pe-comprehensive-countdown-w3 | 7/6-7/12 | 超過 | 🔴 OVERDUE |
| 066-pe-construction-countdown-w4 | 7/13-7/20 | 超過 | 🔴 OVERDUE |
| 067-pe-comprehensive-countdown-w4 | 7/13-7/19 | 超過 | 🔴 OVERDUE |

### 判断（重要）
- これらは **試験直前カウントダウン** 下書きだが、対象試験日（7月中旬〜下旬）は **既に経過済み**。今から投入すると「終わった試験へのカウントダウン」を配信することになり逆効果。
- **投入ではなく退役（draft のアーカイブ or 削除）が適切**。x-queue-surfacer は go-live 日付のみで DUE 判定するため、試験日経過を検知できていない。
- 次期（次の受験期）に向けた新規カウントダウン下書きの作成に切り替える。

---

## ドキュメント棚卸し（handoff 抽出→削除候補）

> `node scripts/check-doc-lifecycle.mjs --json`: active handoff **2件**（W30 の 11件から縮小＝棚卸し実施済み）。

| handoff | 経過 | tracked(todo) | 完了シグナル | 推奨 |
|---|---|---|---|---|
| 2026-07-25-affiliate-visible-impressions.md | 1d | なし | orphan | backlog へタスク抽出後に判断（fresh） |
| 2026-07-25-site-owned-note-link-images.md | 1d | なし | orphan | backlog へタスク抽出後に判断（fresh） |

- 2件とも 07-25 作成の新しい handoff。削除は時期尚早。次ローカルセッションで `/doc-declutter` に通し、backlog へタスク抽出できるか判定する（tracked=なし=抽出漏れ注意）。

---

## その他サーフェス（次アクション期限）

- **競合再スキャン DUE**: `check-competitor-scan-due` → Brain チャネルが due:true（lastScan=null）。次セッションで `/competitor-review`（Brain は手動 WebSearch）。
- **GSC UI 取得**: `check-gsc-ui-due` → due:false（07-23 取得から2日）。月次まで待機。
- **note 再公開ドリフト**: 本文 drift 約30本（建設部門・総監・経験記述の CTA/ステータス統一由来）＋ タグ drift 1本。**要ローカル反映**（`note-update-body --commit` / `note-sync-tags --commit`）。クラウド週次では反映不可。

---

## 課題・ブロッカー

1. **EXP-005 4週放置（最優先の運用課題）**: 実験文化が形骸化。PSI 分析で対象ページ（content-heavy docs）と仮説の妥当性は再確認済み。W32 で必ず start する。
2. **X countdown の陳腐化**: 064-067 が「終わった試験へのカウントダウン」。x-queue-surfacer が試験日経過を検知しない設計上の穴。退役＋次期用の新規作成へ切替。
3. **収益カバレッジ再生成の失敗**: `report-monetization-coverage` がエラー終了。最新 page データで再生成できず、6月データのまま。スクリプト修正が必要。
4. **note 本文 drift 約30本の未反映**: 今週の一括変更（CTA/ステータス）が live に未反映。ローカルでまとめて反映が必要。
5. **YT pending_overdue 128件**: 滞留拡大。recorded_but_gone 1件も要確認。

---

## 学び

- **lab と field の分離が最大の学び**: W30 で「CRITICAL 回帰」と警報を上げた LCP 10,158ms は lab スパイクで、実ユーザー体験（field p75 822ms）は一貫して FAST だった。合成計測の単発スパイクで緊急対応を発火させると、存在しない問題に工数を割く。field_data 確認を必須ステップにする。
- **一括変更は drift を大量生産する**: CTA/運営者ステータスの横断一括変更が note 本文 drift を約30本発生させた。一括変更のたびに live 反映バッチをセットで計画する運用が必要。
- **W31 は「仕込みの週」**: 64本公開・V4カバー・競合基盤・GSC自動化・オフサイトCTA と施策が集中したが、これらの計測結果は 07-31 fetch 以降に現れる。効果判定は W32 レビューで行う前提。

---

## 来週への申し送り（W32）

1. **[Must] EXP-005 start**: `/nsm-experiment start EXP-005`。4週放置の終止符。対象 = content-heavy docs（civil guide/textbook・pe-management）。field は FAST なので「lab 底上げ＝新規ページのインデックス優位取り」に位置付けを再定義して実行。
2. **[Must] 07-31 fetch 後に NSM/収益効果を判定**: W31 の 64本公開・V4・オフサイトCTA の流入/CTR 効果を最新 GA4/GSC で計測。W31 は数値未反映のため、W32 が実質の効果判定回。
3. **[Must] X countdown 064-067 を退役**: 投入せず draft をアーカイブ/削除。次期受験カウントダウンの新規作成へ切替。x-queue-surfacer に試験日経過チェックの追加を検討（backlog）。
4. **[Should] note 本文 drift 約30本を live 反映**: ローカルで `note-update-body --commit` / `note-sync-tags --commit` をバッチ実行。
5. **[Should] report-monetization-coverage のエラー修正**: 最新 page データで再生成できるようにし、civil guide 系の低 note CTR（0-5%）改善の起点にする。
6. **[Should] /doc-declutter**: 07-25 の handoff 2件を backlog 抽出→判定。
7. **[Could] 競合レビュー（Brain）**: `/competitor-review` で Brain チャネルの新規販売者を手動 WebSearch。
8. **[Could] YT pending_overdue 128件の棚卸し** ＋ recorded_but_gone 1件の確認。
