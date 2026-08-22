# キャリアファネル基線レポート

生成: 2026-08-21T06:36:48.601Z

> [!warning]
> GA4 と GSC は取得遅延が違うため**窓が一致しない**。出所を跨いで CTR や EPC を割らないこと。
> GA4 2026-07-16〜2026-08-12 ／ GSC 2026-07-13〜2026-08-10

## 実検査の内訳

_「異常 0 件」と「1 件も検査していない」を区別するための欄（CLAUDE.md §9）。_

| 対象 | 件数 |
|---|---|
| docMetaIndexTotal | 1093 |
| careerArticles | 39 |
| siteMdxScanned | 1117 |
| extraLinkSourcesScanned | 1 |
| gscRowsTotal | 176 |
| gscRowsMatchedCareer | 11 |
| ga4LabelRowsMatched | 14 |
| ga4PlacementRowsMatched | 12 |
| careerArticlesInGa4Top | 1 |
| noteCareerArticles | 11 |

## WARN

- 窓が不一致（GA4 2026-07-16〜2026-08-12 / GSC 2026-07-13〜2026-08-10）。取得元の遅延差なので異常ではないが、出所を跨いで CTR/EPC を割らないこと
- by-placement の (not set): 表示 0 / クリック 9（全クリックの 47%）。窓の始端 2026-07-16 が cta_placement の作成日 2026-07-25 より 9 日前。GA4 は作成日より前へ遡及しないため**仕様どおり**で、配線欠落ではない。判定は 2026-07-25 以降の窓で行う

## 漏斗

### 1. 高意図 query（GSC 窓）

表示 7 ／ クリック 0

語彙: 転職・辞めたい・やめたい・年収・市場価値・評判・口コミ・エージェント・求人・ホワイト・公務員・発注者支援

| query | 表示 | クリック | 順位 |
|---|---|---|---|
| ビルドジョブ 口コミ | 2 | 0 | 23.5 |
| ビルドジョブ 評判 | 2 | 0 | 25.0 |
| 施工管理job 評判 | 2 | 0 | 80.0 |
| 施工管理 転職エージェント | 1 | 0 | 99.0 |

### 2. キャリアページの流入（GA4 窓）

GA4 上位ページに入った career 記事: 1 / 39 本

### 3. 柱ごとの検索と内部リンク

_被リンクは literal リンクの本数であり、実際の遷移ではない。回遊の実測ではなく構造の proxy。_

| 柱 | 記事 | GSC 表示 | GSC クリック | 被リンク |
|---|---|---|---|---|
| career-path | 17 | 0 | 0 | 66 |
| market-value | 8 | 1 | 0 | 33 |
| service-choice | 5 | 9 | 0 | 8 |
| application | 5 | 3 | 0 | 14 |
| quit | 4 | 1 | 0 | 7 |

### 4. affiliate CTA（GA4 窓）

表示 7370 ／ クリック 19 ／ CTR 0.26%

| placement | 表示 | クリック | CTR |
|---|---|---|---|
| sidebar | 4056 | 4 | 0.10% |
| article-end | 975 | 0 | 0.00% |
| article-mid | 967 | 4 | 0.41% |
| article-inline | 703 | 2 | 0.28% |
| category-sidebar | 589 | 0 | 0.00% |
| category-mobile | 61 | 0 | 0.00% |
| article-end-mobile | 17 | 0 | 0.00% |
| (not set) | 0 | 9 | — |
| category-career-section | 2 | 0 | 0.00% |

| label | 表示 | クリック |
|---|---|---|
| BuildJob-sidebar | 2153 | 5 |
| DXConsulting-sidebar | 2098 | 2 |
| ビルドジョブ | 1183 | 6 |
| BuildJob-endbanner | 623 | 0 |
| ハイクラス DX・コンサル転職 | 499 | 6 |
| KensetsuJobs-sidebar | 455 | 0 |
| DXConsulting-endbanner | 352 | 0 |
| 建設JOBs | 4 | 0 |
| BuildJob-hubcareer | 2 | 0 |
| BuildJob-midtext | 1 | 0 |

### 5. A8 成果

窓内（2026-07）: 発生 0 ／ 確定 0 ／ 確定報酬 ¥0
累計: 発生 1 ／ 確定 0 ／ 確定報酬 ¥0

_A8 管理画面のクリックは口座共用（stats47 と同居）のため分母に使わない。分母は GA4。_

## 記事台帳

| slug | 柱 | 公開 | GSC 表示 | クリック | 順位 | 被リンク | CTA |
|---|---|---|---|---|---|---|---|
| civil-construction-1-guide-buildjob-review | service-choice | ○ | 6 | 0 | 42.8 | 1 | 1 |
| civil-construction-2-guide-resume | application | ○ | 3 | 0 | 85 | 2 | 1 |
| civil-construction-1-guide-career-agent-comparison | service-choice | ○ | 2 | 0 | 58.5 | 3 | 1 |
| civil-construction-1-guide-allowance | market-value | ○ | 1 | 0 | 133 | 1 | 1 |
| civil-construction-1-guide-career-consultation-before-quit | quit | ○ | 1 | 0 | 34 | 0 | 1 |
| civil-construction-2-guide-career-agent-comparison | service-choice | ○ | 1 | 0 | 22 | 1 | 1 |
| civil-construction-1-guide-age-career | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-career | career-path | ○ | 0 | 0 | — | 17 | 1 |
| civil-construction-1-guide-career-agents | service-choice | ○ | 0 | 0 | — | 2 | 0 |
| civil-construction-1-guide-career-cases | market-value | ○ | 0 | 0 | — | 0 | 2 |
| civil-construction-1-guide-career-path | career-path | ○ | 0 | 0 | — | 11 | 0 |
| civil-construction-1-guide-career-salary | market-value | ○ | 0 | 0 | — | 3 | 0 |
| civil-construction-1-guide-company-types | career-path | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-consultant | career-path | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-dx-jobs | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-future | career-path | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-grade-comparison | market-value | ○ | 0 | 0 | — | 2 | 0 |
| civil-construction-1-guide-hatchu-shien | career-path | ○ | 0 | 0 | — | 8 | 1 |
| civil-construction-1-guide-interview | application | ○ | 0 | 0 | — | 4 | 1 |
| civil-construction-1-guide-market-value | market-value | ○ | 0 | 0 | — | 10 | 1 |
| civil-construction-1-guide-public-servant | career-path | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-quit-honne | quit | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-quit-or-stay | quit | ○ | 0 | 0 | — | 5 | 1 |
| civil-construction-1-guide-resume | application | ○ | 0 | 0 | — | 6 | 1 |
| civil-construction-1-guide-salary-by-role | market-value | ○ | 0 | 0 | — | 2 | 1 |
| civil-construction-1-guide-salary-up | market-value | ○ | 0 | 0 | — | 11 | 1 |
| civil-construction-1-guide-timing | application | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-white-company | application | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-women | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-public-servant-merit | career-path | ○ | 0 | 0 | — | 5 | 0 |
| civil-construction-2-guide-buildjob-review | service-choice | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-career | career-path | ○ | 0 | 0 | — | 14 | 1 |
| civil-construction-2-guide-career-change | career-path | ○ | 0 | 0 | — | 3 | 1 |
| civil-construction-2-guide-haken-seishain | career-path | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-job-reality | career-path | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-quit-or-stay | quit | ○ | 0 | 0 | — | 2 | 1 |
| civil-construction-2-guide-salary | market-value | ○ | 0 | 0 | — | 4 | 1 |
| civil-construction-2-guide-young-career | career-path | ○ | 0 | 0 | — | 2 | 1 |
| pe-construction-guide-career | career-path | ○ | 0 | 0 | — | 0 | 1 |

## note 側キャリア記事

| utmCampaign | 状態 | 価格 | noteId |
|---|---|---|---|
| civil-career-1kyu-value | published | free | n6c68d022a56a |
| civil-career-agent-comparison | published | free | ne49853deac96 |
| civil-career-agent-howto | published | free | n5a823955985c |
| civil-career-before-quit | published | free | n7a81ebf1cdc5 |
| civil-career-buildjob-review | published | free | na0f42fd52a51 |
| civil-career-failure-lessons | published | free | n96f94252c128 |
| civil-career-hatchusha-view | published | free | n85d4b322898b |
| civil-career-public-vs-private | published | free | n8b03a7de0c6b |
| civil-career-salary-difference | published | free | nfbff7b1469b6 |
| civil-career-timing | published | free | n401905648243 |
| civil-career-white-company | published | free | ne7284dacf78b |

