# 週次レビュー 2026-W28

作成日: 2026-07-13
対象期間: 2026-07-06 〜 2026-07-12
前週: [2026-W26-review.md](./2026-W26-review.md)（W27 は試験ピーク低リスク週のためレビュー省略・W28 に統合）

---

## サマリー

- **計画達成率**: W28 専用の計画ファイルは無し（最新計画は W27=weekly.md）。実態は計画外の**大規模品質トラック集中週**。
- **主な成果**:
  1. **1級土木 一次過去問の公式正答肢突合を恒久運用化**——「本文の別問題化け」検出→原典 PDF 照合の運用を確立し、r03/r06/r07/h26/h27/h28 系で多数の正答・マーク矛盾・化けを是正（港則法 No.61 の転記ミスを e-Gov 条文で単一性確認まで）。
  2. **コンクリート主任技師（cce）H26/H27/H29/H30 の年度別過去問を全転記**（各 30〜49 問・8 分野・図クロップ計 12 点超）。
  3. **品質採点トラックを不合格 75 → 27 まで純化**（misfit の Evaluator 誤適用を是正して再採点、civil-1 secondary・pe-first-stage・concrete-chief を合格化）。
  4. **design-system SSOT 統合リファクタ**（UIトークン/カード/ナビ/Hero/スタイル文書を共通化）。
- **NSM（Organic Search users）**: 923 → **1,354（+431 / +46.7%）**。試験直前ピークの追い風で大幅増。
- **要注意**: X カウントダウン予約キューに **OVERDUE 4 件**（064/065/066/067）。次のローカルセッションで投入必須。

---

## 計画 vs 実績

W28 専用の計画ファイルは存在しない（`docs/reviews/weekly/` に W28.md なし・weekly.md は W27 のまま）。以下は最新計画 W27（`docs/todo/weekly.md`）タスクの追跡。

| タスク（W27 計画） | 分類 | 状態 | メモ |
|---|---|---|---|
| 建設部門CTA修復 PR #329 → 本番反映 | 導線 | ✅ 完了 | 2026-07-02 に origin/main 反映済（前週内） |
| X countdown W3（064/065）予約投入 | SNS | 🔴 未達 | go-live 超過で OVERDUE 化。066/067 も追加で滞留（下記 §SNS 予約キュー） |
| AdSense 再申請完遂 | 外部承認 | ⏳ 進行中 | 外部承認待ち・当週内の状態変化は未確認 |
| 完全パック ¥9,800 直前妥当性判断 | ユーザー判断 | ⏸ 保留 | 「試験後に量で評価」方針どおり後ろ倒し |
| 総監 直前ヒーロー live 反映 / 一次→二次ブリッジ磁石 公開 | 導線 | ⏳ 未確認 | ローカル/note 実機依存タスク・クラウドから状態未確認 |

> **所感**: W28 は W27 計画の「刈り取り＋監視（低リスク）」テーマから外れ、**一次過去問の正答忠実性と cce 転記という品質・コンテンツ補正に大きく舵を切った週**だった。試験直前〜直後の窓を品質確定に充てたのは妥当だが、計画に無い大規模作業のため plan トラッキングは形骸化している。W29 は正式に計画化する。

---

## 成果ハイライト

1. **過去問の「本文別問題化け」検出→原典照合フローの恒久化**（commit `64d26bce`）。加えて方法論の重大修正「workorder 極性は信用不可・公式 PDF 必須」を確立（`f2983058`）。同種パターンが複数年度で再現したため運用ルールへ昇格。
2. **civil-1 primary 全 22 年度の公式正答肢（JCTC 正答肢 PDF 由来）を記録**（`9fc72255`）し、以降の是正の真実源を整備。r03-a/r06-a/r06-b/r07-a/r07-b・h26/h27/h28 で計数十件の誤キー・化けを是正。
3. **cce（コンクリート主任技師）H26〜H30 転記完遂**——平成26/27（各 30 問）・H29/H30（49 問）を 8 分野記事へ、図センサスは 604 → 616 図に更新。
4. **品質トラック大掃除**：不合格 75 → 27。ルーブリック不適合（misfit）を正しい Evaluator で再採点し 8+9 本を合格化、civil-1 secondary を全合格化。
5. **design-system SSOT 統合**（`6ff5fd30`）でトークン/カード/ナビ/Hero の重複を共通化。

---

## 開発活動

- **コミット数**: 118（no-merges）／ 128（merge 含む）
- **主な変更クラスタ**:
  - `fix(civil-1)`: 一次過去問 公式正答肢是正（最大クラスタ）
  - `feat(cce)` / `feat(content)`: コンクリート主任技師 年度別過去問転記
  - `score(quality)` / `fix(quality)`: ルーブリック再採点・合格化
  - `refactor(design-system)`: UI トークン共通化
  - `chore(figures)` / `chore(indexes)`: 図センサス・静的インデックス再生成
- 変更規模は生成物（インデックス JSON・census・図バイナリ）を含むため行数は参考値。

---

## コンテンツ実績

| カテゴリ | 今週の動き |
|---|---|
| コンクリート主任技師（cce） | H26/H27/H29/H30 年度別過去問を新規転記（8 分野・図 12 点超） |
| 1級土木 primary（一次過去問） | 複数年度で正答・マーク・本文化けを公式原典照合で是正（新規追加ではなく忠実性補正） |
| 1級土木 secondary（二次解説） | 参考資料節追加・4 列超表の箇条書き化・ArticleImage 移行で全合格化 |
| pe-first-stage / concrete-chief / civil-2 | RelatedKeywords 軸是正で合格化 |
| pe-comprehensive（総監） | h28-30-secondary を sibling 整合で合格化（authoring 撤回） |

- 既存 MDX の変更: 71 本（品質是正が中心）。
- **note 公開状態ドリフト**: 本レビューはクラウド実行のため `verify-note-status` のライブ照合は未実施（creds/実機依存）。次ローカルセッションで確認推奨。

---

## NSM（オーガニック検索流入）

> 取得元: `.claude/state/weekly-metrics/2026-W28.json`（CI `fetch-metrics.yml` 供給・クリーンな 7 日 WoW）。GA4 期間 this=2026-07-02〜07-08 / prev=2026-06-25〜07-01。GSC は 3 日遅延のため this=06-30〜07-06。

### GA4 チャネル別 WoW

| チャネル | 今週 users | 前週 users | 増減 | 増減% |
|---|--:|--:|--:|--:|
| **Organic Search（★NSM）** | **1,354** | **923** | **+431** | **+46.7%** |
| Direct | 170 | 185 | -15 | -8.1% |
| Organic Social | 93 | 6 | +87 | +1450% |
| Referral | 62 | 55 | +7 | +12.7% |
| AI Assistant | 26 | 21 | +5 | +23.8% |

### GSC WoW

| 指標 | 今週 | 前週 | 増減 |
|---|--:|--:|--:|
| clicks | 56 | 39 | +17（+43.6%） |
| impressions | 1,028 | 1,012 | +16 |
| CTR | 5.45% | 3.85% | +1.6pt |
| 平均掲載順位 | 18.9 | 26.6 | **-7.7（改善）** |

- トップクエリ: 「総合技術監理 キーワード集 2026」(4 clicks / pos 7.2)、「総合技術監理 キーワード集 解説」(2 clicks / CTR 40%)。総監キーワード集が指名検索で刈れている。

### NSM トレンドの洞察

- Organic Search +46.7% は**技術士二次試験の直前ピーク**（7/13 前後）が主要因。試験後は反落を織り込むべき。
- **平均順位が 26.6 → 18.9 と大きく改善**——W26〜W28 の品質是正（正答忠実性・RelatedKeywords 追加・seoTitle 整合実験の効果）が効いている可能性。試験後も順位が定着するか W30 で確認。
- **Organic Social が 6 → 93 users と急伸**。IG/note 経由の伸び。ただし utm タグ付き SNS 流入（下記）は横ばいで、Organic Social の中身の source 内訳は次週要確認。

---

## 実験の進捗

> 取得元: `.claude/state/experiments.json`

### Running（0 件）
- なし

### Measuring（0 件）
- なし

### 今週 close（0 件・当週内の close なし）
- 直近 close 済み: EXP-001（統合ハウスキーピング / done）、EXP-003（seoTitle 検索意図整合 5件 / done）、EXP-004（primary seoTitle suffix 重複一括解消 / done）、EXP-002（Group1 復活 / cancelled=70日 published:false 放置で判定不能）。

### 次サイクルへの仮説
- **EXP-005（proposed）**: docs テンプレのモバイル LCP 改善（content-heavy ページ 3-6s → <2.5s）。root モバイル LCP が 7.35s と悪い（下記 PSI）ため、試験ピーク明け W29-W30 で **start 候補**。EXP-005 を正式に start して baseline を固定するのを推奨。
- EXP-002 の学び「paused 実験は再開条件・期限を明示しないと無期限滞留」を EXP-005 起票時に反映（開始時に measure 期限を明記）。

---

## PSI パフォーマンス推移

> 取得元: `.claude/state/metrics/psi/psi-batch-*.json`（psi-audit.yml 日次 commit）+ W28.json PSI。

### root（`doboku-note.com` モバイル）

| 指標 | 値 | 判定 |
|---|--:|---|
| Performance | 69 | 要改善 |
| LCP | 7.35s | 🔴 悪化域（目標 <2.5s） |
| TBT | 28ms | 良 |
| CLS | 0.009 | 良 |
| SEO | 100 | 良 |

### 今週の変動
- 日次バッチはランごとに perf 68〜100・LCP 0.5〜6.7s と**大きくばらつく**（計測環境・キャッシュ状態依存のノイズが大きい）。方向としては**モバイル LCP が慢性的に遅い**のが継続課題。
- CLS/TBT は安定して良好。ボトルネックは LCP（ヒーロー画像/フォント/初期レンダリング）。

### 洞察
- LCP はコンテンツ品質と独立の技術課題。EXP-005 として構造化し、単発の勘ではなく前後計測で潰すのが妥当。

---

## 収益カバレッジ ダッシュボード

> 取得元: `.claude/state/metrics/monetization/coverage-latest.md`（流入 2026-05-21〜06-17・やや古い。次 fetch で更新）

- 流入のあるページ: **96** ／ 高流入（≥15 users）で**収益導線ゼロ: 0**（要対応ギャップなし）。
- 上位ページはすべて note CTA / アフィリのいずれかを保有。
- **軽微ギャップ**: `concrete-chief-engineer-textbook-mix-design`(38u)・`concrete-chief-engineer-guide-overview`(37u) に **note CTA が未配置**（アフィリ BuildJob のみ）。cce は今週大量転記して流入増が見込まれるため、cce 向け note 商品が出た段階で CTA 配線を検討。
- note CTR が 0% の高流入ページ（civil-1 textbook-leveling 102u・schedule-charts 61u・primary-r07-b 59u 等）は、経験記述 CTA の訴求文/位置の見直し余地あり（試験後の改善候補）。

---

## SNS 流入と投稿実績

> 取得元: W28.json `sns`（utm タグ付き・Japan）+ `.claude/state/yt-verify/latest.json`

### source 別 WoW（utm タグ付き流入）

| source | 今週 users | 前週 users | 増減 |
|---|--:|--:|--:|
| note | 14 | 13 | +1 |
| x | 1 | 2 | -1 |
| **合計** | **15** | **15** | **±0** |

- utm タグ付き SNS 流入は横ばい。一方 GA4 の Organic Social は 6→93 と急伸しており、**utm 未付与の IG/note 流入が計測から漏れている可能性**（次週 source 内訳を要確認）。

### YouTube 公開照合

- total 200 / withVideoId 7 / ok 6 / **recorded_but_gone 1**（`r03-pack-01-q1` = 公開済み記録だが動画消失）/ **pending_overdue 86**。
- ★ `recorded_but_gone` 1 件と pending_overdue 86 件は要確認（下記申し送り）。

---

## SNS 予約キュー投入（X）

> 取得元: `node scripts/x-queue-surfacer.mjs`（2026-07-13 実行）

キュー充足: **7/5 まで（残り -8 日 = 既に穴）**

| draft | 期間 | go-live | 状態 |
|---|---|---|---|
| 064-pe-construction-countdown-w3 | 7/6-7/12 | 超過 | 🔴 OVERDUE |
| 065-pe-comprehensive-countdown-w3 | 7/6-7/12 | 超過 | 🔴 OVERDUE |
| 066-pe-construction-countdown-w4 | 7/13-7/20 | 本日 | 🔴 OVERDUE |
| 067-pe-comprehensive-countdown-w4 | 7/13-7/19 | 本日 | 🔴 OVERDUE |

- W27 計画の「X countdown W3 投入」が実行されず、W4 分も含め 4 件滞留。**技術士二次のカウントダウン投稿窓を逃しつつある**（試験直前の最重要投稿）。
- 投入は要ローカル（`.local/playwright-x-profile` のある Mac）。手順: `x-schedule-guard --queue` 緑確認 → `publish-x` → `x-sync-status` で偽成功検証。

---

## 校正学習の蒸留

> クラウド実行のため `/distill-proofread-learnings` サブエージェントはフル起動せず、当週 commit から確定済みの学びを surface。

### 今週の抽出結果（commit 由来・既に適用済み）
- **新規ルール（適用済み）**: 「過去問は本文が別問題に化けるケースがある→正答肢だけでなく設問・全選択肢を公式原典 PDF と照合する」を恒久運用化（`64d26bce`）。複数年度で再現＝偶然でなくルール昇格。
- **方法論精緻化（適用済み）**: 「workorder（作業指示）の正答極性は信用不可・公式 PDF が唯一の真実源」（`f2983058`）。
- **精緻化**: past-exam-qa の宣言スコープを「全資格の過去問」に拡張（pe-first-stage 拒否バグ是正・`d45dcafd`）。

### 採択候補（ユーザー承認待ち）
| # | カテゴリ | 概要 | 反映先 |
|---|---|---|---|
| 1 | 新規ルール | 過去問「本文別問題化け」検出→原典照合を content 品質原則に明文化（既に運用 doc 化済み・原則集への追記可否） | `docs/reference/content-principles.md` or exam-content-policy.md |

- 次ローカルセッションで `/distill-proofread-learnings --since "7d"` をフル実行し、civil-1 primary の是正パターンから追加ルールが出ないか確認推奨。

---

## ドキュメント棚卸し（handoff 退避候補）

> 取得元: `node scripts/check-doc-lifecycle.mjs --json`

### active handoff 候補（2 件）
| handoff | 経過 | tracked(todo) | 完了シグナル | 推奨 |
|---|--:|---|---|---|
| 2026-07-10-civil1-primary-official-key-verification.md | 3d | なし | 8 commits（`9fc72255` 他） | 残作業（残 h29/h28-a 等）を backlog へ抽出→ARCHIVE |
| 2026-07-10-design-system-refactor.md | 3d | なし | orphan | 完了検証後 ARCHIVE |

- どちらも tracked=なし（backlog 抽出漏れの疑い）。次ローカルセッションで **`/doc-declutter`** を実行し、外部実体（PR/SHA/デプロイ）を検証してから抽出→退避。
- 経過 3 日でまだ新しいため即時退避は不要だが、civil-1 primary は残作業（残 h29/h28-a・pre-H30 系）があるため backlog への抽出は先に済ませておくと安全。

---

## 課題・ブロッカー

1. **X カウントダウン予約キューに穴（OVERDUE 4 件）**——技術士二次の直前投稿窓を逃しつつある。要ローカル即投入。
2. **モバイル root LCP 7.35s の慢性的な遅さ**——EXP-005 として構造化し前後計測で潰す。
3. **YouTube pending_overdue 86 件・recorded_but_gone 1 件**——予約公開のドリフト。公開状態の照合と穴埋めが必要（要ローカル）。
4. **Organic Social 急伸（+1450%）の source 内訳が不明**——utm 未付与で計測から実態が漏れている可能性。
5. **W28 に正式計画が無く plan トラッキングが形骸化**——W29 は正式に weekly-plan を生成する。

---

## 学び

- 過去問の忠実性は「正答肢の一致」だけでは担保できず、**設問文・全選択肢の原典照合が必須**（本文が別問題に化ける事故が複数年度で発生）。作業指示ファイルの極性は真実源にしない。
- 品質採点トラックの肥大は「Evaluator の誤適用（misfit）」が主因だった——正しい Evaluator で再採点するだけで不合格が 75→27 に純化。採点は「どの Evaluator で測るか」がまず正しくないと数字が汚れる。
- 試験直前ピークで NSM +46.7%・平均順位 -7.7 と、品質是正の SEO 効果が可視化された。ただしピーク要因の切り分けは試験後（W30）の反落幅で判定する。

---

## 来週への申し送り（W29 / 07-13〜07-19）

- 🔴 **最優先**: X countdown 064/065/066/067 をローカルで即投入（`x-schedule-guard --queue` → `publish-x` → `x-sync-status`）。二次直前窓を確保。
- 🔴 YouTube 公開ドリフト是正（recorded_but_gone 1・pending_overdue 86）をローカルで照合・穴埋め。
- 🟡 EXP-005（docs モバイル LCP 改善）を正式に **start** して baseline を固定。
- 🟡 `/doc-declutter` で 2 active handoff の残作業を backlog 抽出→退避。civil-1 primary 残（h29/h28-a・pre-H30）を backlog 化。
- 🟡 Organic Social 急伸の source 内訳確認（IG/note の utm 付与状況を点検）。
- 🟢 note 公開状態ドリフト（`verify-note-status`）をローカルで照合。
- 🟢 **試験後（W29 中盤以降）解禁タスク**: 解答速報・BK-09/10 R08予想生成・reference-materials 再公開・読み方ガイド横展開・1級二次仕込み（W27 メモの申し送り分）。
