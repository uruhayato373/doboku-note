---
title: GSC 管理 SSOT（index coverage / performance / hygiene）
---

# GSC 管理 SSOT

Google Search Console の継続管理（インデックス被覆・検索パフォーマンス・衛生）の**分業・閾値・cadence・判断マトリクス・観測ログ**の真実源。計測は CI/CD 供給が正（ローカル creds 不要・会社 PC はプロキシ遮断＝[measurement-incidents.md](measurement-incidents.md) 2026-06-05）。

> [!note]
> 2026-06-19 のトラフィック減調査で「サイトの約半分が未 index（原因はドメイン権威性）」が真因と判明。だが当時 index coverage を継続追跡する担当が無く、診断は memory の一回限り手順に留まっていた。本 doc + `gsc-index-auditor` + `index-coverage.yml`（月次）+ `/gsc-review` でこれを恒久構造化した。

## 管理対象と定義

| 領域 | 定義 | 主指標 |
|---|---|---|
| **Coverage** | sitemap 申告 URL のうち Google が index した割合 | `indexed_ratio = indexed / sitemap_urls` |
| **Performance** | index 済みページの検索成績 | impressions / clicks / CTR / position |
| **Hygiene** | sitemap の無効・重複申告 | 404 / redirect / canonical 不一致 |

## 分業表（誰が何を担当するか）

| 担当 | 種別 | 責務 | 入力 → 出力 |
|---|---|---|---|
| `index-coverage.yml` | CI（月次・JST 11:00 毎月1日） | 全 sitemap URL の URL Inspection + 履歴追記 | API/sitemap → `url-inspection/*.json` + `index-coverage-history.json`（develop） |
| `fetch-metrics.yml` | CI（週次・金 JST 6:00） | GSC query/date/page/page×query + GA4 | API → `.claude/state/metrics/{gsc,ga4}/` |
| `gsc-index-auditor` | Evaluator（sonnet） | coverage 分類・indexed_ratio・履歴差分・原因バケット・hygiene URL surface | url-inspection + history → 診断テキスト（audit-only） |
| `metrics-analyzer` | Evaluator（sonnet） | index 済みページの performance 8 パターン（SNS-Source-Shift＋page×query の Cannibalization/Content-Decay 含む） | gsc/ga4（`gsc-page-query-*` 含む）→ `improvements/*.md` |
| `performance-auditor` | Evaluator（sonnet） | CWV / PSI | psi → improvements |
| `/gsc-review` | Skill（月次） | CI データ確認 → gsc-index-auditor 起動 → 観測ログ追記 | — |
| `/weekly-improve` | Skill（週次） | metrics-analyzer 起動（performance） | — |
| 機械履歴 | `index-coverage-history.json` | indexed_ratio の時系列 | CI が append |
| 人間判断履歴 | 本 doc「観測・判断ログ」 | 何を打ち手にしたかの意思決定記録 | `/gsc-review` がユーザーと追記 |

> [!important]
> Coverage（gsc-index-auditor）と Performance（metrics-analyzer）は**守備範囲が直交**。前者は「載っているか」、後者は「載っているページがどう成績を出すか」。混同しない。

## 閾値

| 指標 | 警戒 | 目標 |
|---|---|---|
| `indexed_ratio` | < 60% | ≥ 80% |
| `discovered_not_indexed` 割合 | > 20% | ≤ 20% |
| hygiene（404 / redirect） | > 0 | 0 |
| 未検査差分（`inspected < sitemap_urls`） | sitemap > 1,900（quota 上限） | — |

## cadence

- **月次**: `index-coverage.yml`（CI・毎月1日 JST 11:00）→ 翌日以降に `/gsc-review` を実行 → 本 doc 観測ログへ判断追記
- **週次**: `fetch-metrics.yml`（CI・金 JST 6:00）→ `/weekly-improve`（performance 側）

## 判断マトリクス（原因バケット → 打ち手）

URL Inspection の `coverage_state` と `page_fetch_state` から真因を切り分ける（推測ではなく実データで）。memory `reference_gsc_diagnosis_toolkit` の判定ロジックを本 doc に移植・SSOT 化。

| 観測 | 真因 | 打ち手 |
|---|---|---|
| `検出-未登録` 多 + `page_fetch=SUCCESSFUL` | **ドメイン権威性**（技術問題なし。Google が登録価値を低く判定） | 外部被リンク獲得・独自データ資産・薄いページの統合／**量の抑制**（低権威ドメインへの大量追加は index 率を下げる）。内部リンク追加・title 調整では動かない |
| `page_fetch` が SUCCESSFUL 以外 | **技術**（fetch 失敗 / robots / 5xx / SSR 破壊） | 最優先で修正。SSR は curl で `<main>` + 主要キーワード確認（[measurement-incidents.md](measurement-incidents.md) W16 BAILOUT） |
| `404` / `redirect` / canonical 不一致 | **hygiene**（sitemap が無効/重複を申告） | 該当 URL を sitemap から除外 or 正リダイレクト。`docs/todo/` に起票 |
| `代替ページ(canonical)` | 重複判定 | canonical 統合の意図と一致するか確認 |
| index 済みなのに 90 日 imp=0 | 戦略資産集中の根拠 | 低価値ロングテールは強化対象外 |

### 補助ツール（深掘り時）

- 母集合生成: `node .claude/scripts/list-sitemap-urls.mjs`（公開 sitemap → 全 URL・creds 不要）
- URL Inspection: `npm run inspect-url -- --file <list>`（2,000 URL/日/property 上限）
- 集計→履歴: `node .claude/scripts/append-coverage-history.mjs --batch <path> --date <YYYY-MM-DD> --sitemap-count N`
- 既存分析: `.claude/scripts/{analyze-gsc-coverage,analyze-hubs,build-noindex-candidates}.mjs`

## データの所在

| 種別 | パス |
|---|---|
| URL Inspection 生データ | `.claude/state/metrics/url-inspection/inspection-batch-*.json` |
| indexed_ratio 時系列 | `.claude/state/metrics/gsc/index-coverage-history.json` |
| GSC query/page/date | `.claude/state/metrics/gsc/gsc-*.json` |
| 改善候補（performance） | `.claude/state/improvements/*.md` |

## 観測・判断ログ（append-only・人間の意思決定記録）

> 数値は `index-coverage-history.json` を正とする。ここには「何を観測し、何を打ち手に決めたか」を記す。

### 2026-04-27（初回計測）

- batch: `inspection-batch-2026-04-27*.json`（756 件）
- 送信して登録 **407（54%）** / 検出-未登録 **219（29%）** / クロール済み未登録 17 / redirect 48 / 404 20 / other 45
- 診断: `page_fetch=SUCCESSFUL` 多数 → 技術問題なし＝**ドメイン権威性**が主因
- 判断: 内部施策は天井（2026-04 GSC pivot）。独自データ + 外部被リンクへ集中。noindex 判断は受験期ピーク後（2026-08 以降）

### 2026-06-19（トラフィック減の再調査）

- published 1,012 / sitemap 1,030。GSC clicks ≈ 5/日（横ばい）、impressions 3 週で約 −30%、平均順位 約23→37（ブレンド悪化）。GA4 organic 760/週は GSC クリックの約20倍＝大半 Bing/Yahoo
- 診断: 4 月以降 +256 ページ追加。**低権威ドメインへの量追加は index 率を下げる方向**（discovered-not-indexed を増やす仮説）。スクレープドーザ等の定義ロングテール個別 SEO は換金性ゼロで誤差
- 判断: ①量の追加を止める（`no-new-keyword-pages` と整合）②独自データ + 被リンクで権威性 ③hygiene 即修正。本管理システム（gsc-index-auditor + 月次 CI + /gsc-review）を新設して継続追跡へ
- 残課題: 「+256 ページで index 率が実際に下がったか」は最新 URL Inspection で確定予定（`index-coverage.yml` 実行後に `/gsc-review`）→ **2026-06-22 に決着。No（下がっていない）**

### 2026-06-22（残課題の決着 + 流入減の再診断）

- batch: `inspection-batch-2026-06-19T13-26-17.json`（1,030 件）を `append-coverage-history.mjs` で履歴へ反映（4/27 以降止まっていた履歴を是正）
- 送信して登録 **840（index_ratio 81.6%）** / クロール済み-未登録 144 / 検出-未登録 39 / redirect **0** / 404 **0** / other 7。page_fetch は 986 SUCCESSFUL（43 は UNSPECIFIED＝直近追加の新規ページで本登録待ち）
- 決着: +256 ページ後も index 率は **54% → 82%** に改善。**「ドメイン権威性の壁で半分未 index」という 4/27〜6/19 の前提は失効**。`indexed_ratio` は目標 80% を達成、hygiene は 0
- 流入減（impr 3 週で −30% / 平均順位 23→37）の真因再診断: ①順位悪化の大半は新規ページ（pos 80-90）による **blended 平均の希釈アーティファクト**で、価値ページ（scraper pos 9.1 / keyword-2026 pos 7.2）は安定 ②本損失は **CTR 欠落**（上位表示なのに near-zero click。break-even-point pos 5.4 で CTR 0.5%、primary-r07-a pos 7.1 で 0 click 等）
- 追検証（同日・現物照合）: ①空 description 仮説は**外れ**（YAML 折りたたみで本文あり）。pos 7-10 の CTR 1.4-2.5% はその順位帯で標準値＝スニペット書換の上積みは数クリック。タイトルは 5/17 リライトで実クエリ整合済 ②過去問 56 本中 **23 本が crawled-not-indexed** だが、robots=ALLOWED / indexing=ALLOWED / canonical 一致 / fetch=SUCCESSFUL ＝**技術バグ無し**。本文も 8-13 万字で薄くない。旧年度（h26-r05）中心の低需要ページを Google が価値判断で未登録にしているだけで、on-page で強制 index 不可。在庫高需要の r07 は index 済
- 判断（確定）: 在庫下の技術・on-page SEO レバーは**全数健全/最適化済み**。GSC 流入を実質的に動かせるのは**ドメイン権威性（独自データ + 外部被リンク）のみ**で、これは code 編集でなく継続プログラム。個別ページの seoTitle/description 微修正の量産はしない（換金性ゼロ・上積み誤差）。実行タスクは `docs/todo/backlog.md`「SEO 権威性トラック」へ起票。GSC 数値悪化を見ても on-page を増やさない（[[hub-strengthening-approach]]・2026-04 pivot と整合）

### 2026-07-02（月次・/gsc-review — index 率の揺り戻し）

- batch: `inspection-batch-2026-07-01T05-04-05.json`（1,051 件）
- 送信して登録 **784（index_ratio 74.6%）** / クロール済み-未登録 240 / 検出-未登録 25 / 代替canonical 2 / redirect **0** / 404 **0**
- 前回差分（6/19→7/1）: indexed 840→784（**−56**）、index_ratio 81.6%→**74.6%**、クロール済み-未登録 144→240。**駆動要因＝既存 indexed 126 本が「クロール済み-未登録」へ回帰**（新規 URL の登録待ちは僅か 8 本＝登録待ちバックログではない）
- 回帰の分布: **総監キーワード 97 / civil-1 guide・過去問 21 / civil-2 3 / concrete 3 / pe-construction 1 / category 1**（サンプル: guide-career-salary / guide-four-management / primary-h30-a / secondary-*-past-problems ほか）
- 診断: hygiene 0（404/redirect ゼロ・page_fetch 健全）＝技術問題なし。原因バケット＝**ドメイン権威性/index selection**（Google が既存ページの登録価値を再評価し demote）。6/22 の「82% 達成・権威性の壁失効」は**部分的に揺り戻し**＝index 選択は低権威ドメインで volatile。6/22 で観測した「低需要ページの未登録」が総監キーワード群にも広がった形
- 判断（推奨・様子見＋権威性トラック継続）: ①on-page 微修正はしない（マトリクス：権威性バケットは title/内部リンクで動かない・6/22 確定判断を踏襲）②hygiene タスクなし（404/redirect=0）③打ち手は独自データ + 外部被リンク（`docs/todo/backlog.md`「SEO 権威性トラック」）④**7月は受験期の需要変動が交絡＝単月で結論しない。8月 再測定で回帰が継続・拡大するなら総監キーワード薄ページの統合を検討**（[[no-new-keyword-pages]] と整合＝新規作成でなく既存の統合）

### 2026-07-10（5/17 前後の急落の遡及 root cause 診断）

- 発端: ユーザーが GSC UI で「5/17 あたりからパフォーマンスが極端に下がった（それまでは順調に成長）」を観測。当時 W20 の週次レビューが欠落しており即時 RCA が無かったため遡及診断
- 突合方法: `gsc-page-2026-05-16`（4/15-5/13）と `gsc-page-2026-06-19`（5/19-6/16）の**同一 URL 集合**（before top200）を追跡（新規ページ混入による blended 希釈を排除）。中間窓 `gsc-page-2026-05-29`（4/28-5/26）で消失時期を挟み撃ち
- 観測（下落はサイト全面でなく**総監キーワード群に集中**）:
  - 総監キーワード（n=110）: clicks **103→38（−63%）**・impressions −15%・**24 本が検索結果から完全消失**・ほか 10 本が順位 5 以上悪化（human-error-probability 5.9→15.1 / digital-rights 8.9→28.3 / process-safety-mgmt 10.8→68 等）
  - 対照群は無傷〜改善: civil その他 clicks +47%・civil primary（5/16 ExamPoint 1,144 件削除の対象）clicks 2→7・impressions +27% ＝ **ExamPoint 削除は原因から除外**
  - GA4 週次はサイト全体で**一貫成長**（W20 673 → W26 1,801 sessions）＝下落は Google 検索のみ。W21 レビューの「セッション −51.7%」は取得窓欠損の**計算アーティファクト**（正: W20→W21 は 673→907 と増加）
  - 消失 24 本は 4/28-5/26 窓では表示あり（うち複数が pos 44〜79 に崩落済み）→ 5/19-6/16 窓でゼロ ＝ 消失時期は **5月中旬〜下旬**。7/2 の「クロール済み-未登録 回帰 126 本（総監 97）」の前段
- 外因の確定: **Google May 2026 core update が 5/21〜6/2 にロールアウト**（3月 update 完了 4/8 からわずか 6 週の異例の短間隔・ロールアウト前週から volatility 報告あり）。消失・順位崩落の時期と正確に一致。既存ログ（6/19・6/22・7/2）はこの外因に言及がなく「権威性 volatile」とだけ診断していた＝**demote の引き金はコアアップデートによる品質再評価**と特定
- 副因: 5/11 deploy（0e2acbdad）の **seoTitle 723 件一括変更**。旧「{title} ｜ 総合技術監理 キーワード集 2026」→新「{title} ｜ 技術士 総合技術監理部門 キーワード集」で **「2026」トークンを全ページから削除** → 「総監キーワード2026」（pos 6.6）等の年度系クエリがクエリレポートから消失。またコアアップデート直前に最大コーパスの全面書き換え＝再クロール churn を最大化。robots.txt AI ブロック（5/16）は Googlebot 非対象で無関係
- 診断（確定）: **主因＝May 2026 コアアップデート（5/21-6/2）が総監キーワード薄ページ群を品質再評価で demote**（順位崩落→index selection 除外の連鎖）。副因＝直前の 723 件 title 一括変更（年度クエリ喪失＋churn）。時期・対象の集中・対照群の無傷がすべて整合。この demote が 7月の AdSense「非インデックス 265 本」問題の源流
- 判断: ①打ち手は既に正しい方向で進行中（薄層 112 本フルリライト完遂＝コアアップデート demote への正攻法。次のコアアップデートで再評価される）② title の再変更はしない（年度クエリは hub keyword-2026 が捕捉・一括改変の反復はリスク）③**教訓: 大規模一括改変（数百件単位の title/本文）はコアアップデート時期と重なると被害を増幅する＝分割デプロイし、改変直後 2 週間は GSC 日次を監視**④GSC 日次データの 5/4-5/24 欠損と W20 レビュー欠落が RCA を 2 ヶ月遅らせた＝週次 PDCA の継続で再発防止
