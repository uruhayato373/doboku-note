# 週次レビュー 2026-W29

作成日: 2026-07-17
対象期間: 2026-07-13 〜 2026-07-19（試験週）
前週: [2026-W28-review.md](./2026-W28-review.md)

---

## サマリー

- **計画達成率**: 3/7 タスク完了（43%）。試験週の低リスク刈り取り計画に対し、**note 収益展開・IG 論点パック量産・Kindle KDP 提出という追加ミッションが並行実行**された週。
- **主な成果**:
  1. **1級土木 note 収益展開（施策A〜C）本格始動** — 「出る順合格ノート」¥1,480 公開（施策C）、施策B（出題分析）を土木もくじ L2 収録（施策A公開準備中）。
  2. **IG 論点パック 122本を量産・30件予約投稿完了**（7/18〜8/1）。予約継続ドライバを正式スクリプト化し、以降の週次自動補充基盤が整備。
  3. **Kindle KDP 全 D 系（D-00/D-01/D-02/D-03）提出完了、E-01 LIVE 化**（ASIN=B0H8ZZMM7R）。B 系 b-reiwa も入稿済みで審査中。
  4. **ココナラ競合実測 1,073 件→価格是正・展開方針確定**。1級土木 経験記述添削パイプライン構築。
  5. **cce H24/H25 過去問転記**（+38問、計303問）。
- **NSM（Organic Search users）**: 1,354（W28）→ **1,112（W29, -242 / -17.9%）**。試験直前ピーク後の自然反落。試験日（7/19・7/20）後の W30 で反落幅の底を確認する。
- **要注意**: X カウントダウン 064/065/066/067 が **OVERDUE 継続**。YT pending_overdue が **107 件**に増加（6月から未対処）。

---

## 計画 vs 実績

計画ファイル: [2026-W29.md](./2026-W29.md)（weekly.md との2ファイル）

| タスク | 計画元 | 状態 | メモ |
|---|---|---|---|
| 解答速報骨組み（試験直後即出し準備） | weekly.md 🔴 | ✅ 完了 | `docs/note/技術士総監/R8解答速報/`・2d3c253c1 |
| note funnel live 監視・穴塞ぎ | weekly.md 🟡 | ✅ 完了 | audit-note-funnel 実行・Windows バグの誤検知を修正（PR #396） |
| AdSense 再申請完遂 | weekly.md 🟡 | ⏳ 進行中 | 外部承認待ち継続 |
| 週次レビュークラウドルーティン復旧 | W29.md 🔴 | ✅ 本日実行 | 本レビュー自体が復旧の証 |
| X countdown 064〜067 投入 | W29.md 🔴 | 🔴 OVERDUE | ローカル Mac Playwright 必須・次セッションで即実行 |
| YT 公開ドリフト是正 | W29.md 🔴 | 🔴 未達 | pending_overdue 107 件・要 YT Studio ローカル対応 |
| EXP-005 正式 start | W29.md 🟡 | ⏸ 未着手 | 試験週で後回し。W30 着手 |

> **所感**: 計画外の大ミッション（IG 量産・Kindle 提出・ kokona 実測）が並行し、刈り取り週の計画を大幅に超えた成果量。X/YT の SNS 整備タスクはローカルMac依存のため継続未達。

---

## 成果ハイライト

1. **1級土木 note 収益展開3施策の具体化**（`fcca165b`・`1cd104af`・`a5c56d02`）。施策C「出る順合格ノート ¥1,480」を公開し、施策B（出題分析・直前重点）を L2 もくじに収録。施策A（合格ラボ添削会員展開）は公開準備中。ローカル note 実公開は2026-07-14 に完了済み。
2. **IG 論点パック 122本量産・7/18〜8/1 予約投稿30件完了**（`75fd0b73`・`86da40d4`）。論点パック継続ドライバ（`dorun-lonten-pack-scheduler.mjs`）を正式スクリプト化し、バックグラウンド自動補充の基盤が整備された。
3. **Kindle KDP 全D系（D-00〜D-03）提出・E-01 LIVE 化**（`b1fa3e46`・`b303aab8`・`97aa082c`）。B-reiwa（総監択一令和）も KDP 入稿済みで審査中（`5f7ce16f`）。
4. **ココナラ競合実測1,073件→2層 SSOT 化**（`3b5a3fa1`）。価格を実測値で是正し、技術士展開は見送りを明示。経験記述添削パイプライン整備（`cad2cae1`）。
5. **MagazineHeroCta 新設・記事内 note 生リンクをカード置換**（`df68e548`・`50c49bfb`・`f0252b49`）。CTA キャラアバター派生（`13403aa3`）と合わせ、サイト内の note 誘導導線がカード化された。
6. **cce H24/H25 過去問転記**（`f12d9de6`）。+38問で計303問。

---

## 開発活動

- **コミット数**: 197（7日間・no-merges）
- **主な変更クラスタ**:
  - `feat(note)` / `content(note)`: 1級土木 note 収益展開3施策（施策A〜C）
  - `feat(sns)` / `chore(sns)`: IG 論点パック量産・予約投稿・予約継続ドライバ正式化
  - `chore(kindle)`: Kindle KDP 全D系提出・E-01 LIVE・B-reiwa 入稿
  - `feat(coconala)`: 競合実測 SSOT 化・添削パイプライン
  - `feat(cta)`: MagazineHeroCta 新設・キャラアバター派生
  - `content(cce)`: H24/H25 過去問転記（+38問）
  - `docs(todo)`: 過去問カバレッジ残ギャップを backlog 化

---

## コンテンツ実績

| カテゴリ | 今週の動き |
|---|---|
| 1級土木 note 展開 | 施策C（出る順 ¥1,480）公開・施策B L2 収録・施策A準備中 |
| cce（コンクリート主任技師） | H24/H25 過去問転記（+38問、計303問） |
| IG 論点パック | 131本生成→適性フィルタ→122本確定・30件予約投稿（7/18〜8/1） |
| Kindle KDP | D-00/D-03 提出、E-01 LIVE（ASIN=B0H8ZZMM7R）、B-reiwa 入稿中 |
| MagazineHeroCta | 全資格対応の note ヒーロー CTA を新設・記事内生リンクをカード化 |

- **note 公開状態ドリフト**: クラウド実行のため `verify-note-status` ライブ照合は未実施。次ローカルセッションで確認推奨。
- **IG 公開状態ドリフト**: `verify-ig-status` はローカル Playwright 必須のためスキップ。

---

## NSM（オーガニック検索流入）

> 取得元: `.claude/state/weekly-metrics/2026-W29.json`（CI `fetch-metrics.yml` 2026-07-16T21:58Z 供給・**クリーンな7日 WoW**）。
> GA4 期間: this=2026-07-09〜07-15 / prev=2026-07-02〜07-08。
> GSC 期間: this=2026-07-07〜07-13 / prev=2026-06-30〜07-06（3日遅延考慮済み）。

### GA4 チャネル別 WoW

| チャネル | 前週 users | 今週 users | 増減 | 増減率 |
|---|---|---|---|---|
| **Organic Search（NSM）** | 1,354 | **1,112** | -242 | **-17.9%** |
| Direct | 170 | 259 | +89 | +52.4% |
| Referral | 62 | 77 | +15 | +24.2% |
| Organic Social | 93 | 27 | -66 | -71.0% |
| AI Assistant | 26 | 26 | 0 | 0.0% |

### GSC 週次（7日窓）

| 指標 | 前週 | 今週 | 増減 |
|---|---|---|---|
| Clicks | 56 | **74** | +18（+32.1%） |
| Impressions | 1,028 | 904 | -124（-12.1%） |
| CTR | 5.45% | **8.19%** | +2.74pp |

### GSC 上位クエリ（今週 7d）

| クエリ | Clicks | Impressions | CTR | 順位 |
|---|---|---|---|---|
| 総合技術監理 キーワード集 2026 | 9 | 18 | 50.0% | 7.0 |
| トライポッド理論 | 1 | 7 | 14.3% | 9.4 |
| スクレーパとは | 0 | 40 | 0.0% | 8.2 |

### NSM トレンドの洞察

- **NSM -17.9%（1,354→1,112）は試験直前ピーク（W28 +46.7%）の自然反落**。7/13 以降は試験直前・当日のため、流入の「ピーク後崩れ」は想定内。
- GSC clicks が +32.1% と増加しているのは CTR 8.2%（前週 5.5%）の改善が寄与。印象数は減少しているが、クリック率が高い「総合技術監理 キーワード集 2026」が高 CTR を維持（50%）。
- W30 で試験後の反落底（または新規学習者の流入増）を確認し、試験シーズン切れと品質是正効果を切り分ける。

---

## 実験の進捗

> `.claude/state/experiments.json` より。

### Running (0 件)

現在 running 状態の実験なし。

### Proposed

| ID | title | 状態 |
|---|---|---|
| EXP-005 | docs モバイル LCP 改善（root LCP 7.35s→目標 2.5s 以下） | proposed（W29 で start 予定だったが試験週で後回し） |

### 今週 close

なし。

### 次サイクルへの仮説

- EXP-005（docs モバイル LCP）は W30 に正式 start。baseline=W28 スナップショット LCP=7,352ms。Hero 画像 priority 指定・フォント preload・next/image 最適化が主な施策候補。

---

## PSI パフォーマンス推移

> 取得元: `.claude/state/weekly-metrics/2026-W29.json`（PSI モバイル、対象 URL: `https://doboku-note.com/`）。

### Core Web Vitals 前週比

| URL | Perf | LCP | TBT | 前週比 |
|---|---|---|---|---|
| / (mobile, W28) | 69 | 7,352ms | 28ms | — |
| / (mobile, W29) | **69** | **6,878ms** | 117ms | LCP -474ms（改善傾向） |

### 洞察

- Performance スコア 69 は High 違反（閾値 < 70）が継続。LCP 6.88s は Critical（閾値 > 2,500ms）。
- TBT が W28 の 28ms → W29 の 117ms に増加。何らかの JS コスト増の可能性があるため、次週で変化を確認する。
- EXP-005（LCP 改善）のベースラインとして W29 の 6,878ms を記録。

---

## 収益カバレッジ ダッシュボード

> `npm run report-monetization-coverage` はクラウド環境で実行が困難なため、W29 でのスキップを記録する。

- `ga4-page` 最新ファイル（2026-07-16 取得・28日窓）より、上位流入ページ:
  1. `/docs/civil-construction-1-guide-strategy`（497 users）— note CTA 未配置を要確認
  2. `/docs/civil-construction-1-secondary-experience-writing-guid`（207 users）— 経験記述ガイド
  3. `/docs/civil-construction-2-secondary-r07`（193 users）— R7 二次解説
  4. `/docs/pe-construction-competency-revision-r8`（149 users）— 建設部門コンピテンシー改訂
  5. `/docs/pe-comprehensive-management-keyword-2026`（132 users）— 総監キーワード 2026

- **ギャップ候補**: civil-construction-1-guide-strategy は流入 TOP で、note CTA（MagazineHeroCta）が張れているか次ローカルセッションで確認推奨。

---

## SNS 流入と投稿実績

> 取得元: `.claude/state/weekly-metrics/2026-W29.json` sns セクション（クリーンな7日 WoW）。

### Source 別 WoW

| source | 前週 users | 今週 users | 増減率 |
|---|---|---|---|
| note / referral | 14 | 18 | +28.6% |
| x / social | 1 | 0 | -100% |

- SNS 合計は微増（15 → 18）。Organic（1,112）との桁差は依然3桁で小さいが、note リファラルが安定推移。
- Organic Social（ga4 チャネル）が 93 → 27（-71.0%）と急落。IG または X からのサイト流入が前週比で大きく減少。試験週で投稿数が減った影響と見られる。

### YT 公開照合

> `.claude/state/yt-verify/latest.json`（2026-07-16T20:43:37）

| 状態 | 件数 |
|---|---|
| ok（公開確認済み） | 6 |
| recorded_but_gone | **1**（`r03-pack-01-q1`・動画削除の疑い） |
| not_public_after_publishAt | 0 |
| pending_overdue（期限超過・未公開） | **107** |

**★ YT ドリフト要対処**: pending_overdue 107 件。W29 計画での是正未達が継続。

---

## 校正学習の蒸留

> 今週は cce H24/H25 過去問転記・論点パック生成が主。MDX 校正は軽微。

### 今週の抽出結果

- 既存原則の適用: 複数件（論点パック適性フィルタ適用手順）
- 新規ルール候補: 0 件
- ユーザー嗜好: 1 件（IG カード生成で文字重なり問題→適性フィルタで 131→122 本に絞り込み）
- ワークフロー改善: 1 件（予約継続ドライバを正式スクリプト化）

### 採択候補（ユーザー承認待ち）

なし。

---

## SNS 予約キュー投入（X）

> `npm run x-queue-surfacer` 実行結果（2026-07-17）

キュー充足: 7/5 まで（残り -12 日）

| draft | 期間 | go-live | 状態 |
|---|---|---|---|
| 064-pe-construction-countdown-w3 | 7/6-7/12 | OVERDUE | 🔴 投入必須 |
| 065-pe-comprehensive-countdown-w3 | 7/6-7/12 | OVERDUE | 🔴 投入必須 |
| 066-pe-construction-countdown-w4 | 7/13-7/20 | OVERDUE | 🔴 投入必須 |
| 067-pe-comprehensive-countdown-w4 | 7/13-7/19 | OVERDUE | 🔴 投入必須 |

投入手順（ローカル Mac 必須）:
1. `npm run x-schedule-guard -- --queue --max-per-day 2` で緑確認
2. `npx tsx .claude/skills/social/publish-x/publish-x.ts <NNN> --tweets 1-<本数>` で投入
3. `npm run x-sync-status` で偽成功検証

---

## ドキュメント棚卸し（handoff 抽出→削除候補）

> `node scripts/check-doc-lifecycle.mjs --json` 実行結果

### active handoff 候補（1 件）

| handoff | 経過 | tracked(todo) | 完了シグナル | 推奨 |
|---|---|---|---|---|
| 2026-07-14-category-ui-accordion-exammatrix.md | 3日 | なし（orphan） | PR #395/#397/#393 全 merged・本番デプロイ済 | `/doc-declutter` で削除判定 |

- このhandoff は「全PR merged・本番デプロイ済・残作業なし」と本文に明記されており、**削除候補**。次のローカルセッションで `/doc-declutter` を実行して削除を確認する。

---

## 課題・ブロッカー

1. **X countdown 064/065/066/067 が OVERDUE** — ローカル Mac の Playwright プロファイル必須。次のローカルセッションで最優先実行。
2. **YT pending_overdue 107 件** — 6月から未対処。YT Studio での一括公開設定が必要。`recorded_but_gone` 1件（`r03-pack-01-q1`）は動画削除の可能性を確認。
3. **AdSense 再申請** — 外部承認待ち継続。当方からのアクションなし。
4. **EXP-005 未着手** — 試験週で後回し。W30 で正式 start。
5. **PSI LCP 6.88s（Critical 継続）** — EXP-005 の対象。TBT も W28 比 4倍増（28ms→117ms）で要監視。
6. **civil-construction-1-guide-strategy に note CTA 未確認** — 流入 TOP にもかかわらず MagazineHeroCta 未配線の可能性。次ローカルセッションで確認。

---

## 学び

- **試験週でも収益・量産・KDP 提出の大ミッションが並行した** — 刈り取り週の計画は「触らない」が徹底されたのはコンテンツ・UI 系のみで、SNS/Kindle/ノート施策は積極的に推進された。試験週の計画を「UI/コンテンツ凍結」に絞り、SNS・Kindle・コンテンツ施策は別トラックとして明示したほうが計画精度が上がる。
- **IG 論点パック継続ドライバの正式スクリプト化** — 週次でパックを補充する運用が確立。次週以降は `dorun-lonten-pack-scheduler.mjs` の定期実行ルーティン化を検討。
- **KDP 入稿完了でロングテール収益チャネルが本格始動** — 告知記事・IG カルーセル連動が次のアクション。
- **NSM 反落は構造的な問題ではなく試験シーズン性** — W30 で底値を確認し、W31 以降の新規学習者流入トレンドに切り替わるか観測する。

---

## 来週への申し送り

1. **🔴 X countdown 064-067 OVERDUE を即投入**（ローカル Mac 最優先・ban evasion 厳守で週次小分け）
2. **🔴 YT pending_overdue 107 件の是正**（YT Studio でのスケジュール公開設定）
3. **🟡 EXP-005（docs モバイル LCP）正式 start**（baseline 6,878ms・W30 着手）
4. **🟡 技術士 R8 解答速報 note 公開**（試験当日 7/19 終了後に即出し。骨組み完成済み）
5. **🟡 /doc-declutter で handoff 削除**（2026-07-14-category-ui-accordion-exammatrix.md）
6. **🟢 civil-construction-1-guide-strategy への MagazineHeroCta 配線確認**（流入 TOP ページ）
7. **🟢 note 公開状態ドリフト照合**（`verify-note-status`・ローカルMac）
8. **🟢 W30 NSM 観測** — 試験後反落底を確認し、品質是正効果との切り分けを評価

---

*snapshot-weekly-metrics.mjs は @google-analytics/data パッケージ不在のため失敗（想定内）。W29 snapshot は CI（fetch-metrics.yml 2026-07-16T21:58Z）が生成済みのものを使用。*
