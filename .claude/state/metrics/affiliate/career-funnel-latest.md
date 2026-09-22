# キャリアファネル基線レポート

生成: 2026-09-22T08:39:08.143Z

> [!warning]
> GA4 と GSC は取得遅延が違うため**窓が一致しない**。出所を跨いで CTR や EPC を割らないこと。
> GA4 2026-08-20〜2026-09-16 ／ GSC 2026-08-18〜2026-09-14

## 実検査の内訳

_「異常 0 件」と「1 件も検査していない」を区別するための欄（CLAUDE.md §9）。_

| 対象 | 件数 |
|---|---|
| docMetaIndexTotal | 1255 |
| careerArticles | 39 |
| siteMdxScanned | 1274 |
| extraLinkSourcesScanned | 1 |
| gscRowsTotal | 890 |
| gscRowsMatchedCareer | 7 |
| ga4LabelRowsMatched | 15 |
| ga4PlacementRowsMatched | 10 |
| careerArticlesInGa4Top | 0 |
| noteCareerArticles | 19 |

## WARN

- 窓が不一致（GA4 2026-08-20〜2026-09-16 / GSC 2026-08-18〜2026-09-14）。取得元の遅延差なので異常ではないが、出所を跨いで CTR/EPC を割らないこと
- GA4 page スナップショットは上位 100 ページのみで、career 記事は 1 本も入っていない。users/sessions は「0」ではなく「観測範囲外」なので断定に使わない

## 漏斗

### 1. 高意図 query（GSC 窓）

表示 33 ／ クリック 0

語彙: 転職・辞めたい・やめたい・年収・市場価値・評判・口コミ・エージェント・求人・ホワイト・公務員・発注者支援

| query | 表示 | クリック | 順位 |
|---|---|---|---|
| 技術士転職 | 7 | 0 | 72.9 |
| 技術 士 年収 | 3 | 0 | 77.7 |
| 技術士 年収 | 3 | 0 | 73.0 |
| 技術士総合技術監理部門年収 | 3 | 0 | 29.3 |
| ビルドジョブ 口コミ | 2 | 0 | 20.0 |
| 土木施工管理 年収 | 2 | 0 | 96.0 |
| 技術士 総合技術監理部門 年収 | 2 | 0 | 30.0 |
| 施工管理job 評判 | 1 | 0 | 68.0 |
| 施工管理 転職エージェント | 1 | 0 | 18.0 |
| 1級土木施工管理技士年収 | 1 | 0 | 70.0 |
| 一級土木施工管理技士 年収 | 1 | 0 | 61.0 |
| 土木施工管理技士 年収 | 1 | 0 | 69.0 |
| 施工管理 転職 理由 | 1 | 0 | 18.0 |
| 公務員 土木職 資格 | 1 | 0 | 9.0 |
| 技術士 転職 | 1 | 0 | 63.0 |

### 2. キャリアページの流入（GA4 窓）

GA4 上位ページに入った career 記事: 0 / 39 本

### 3. 柱ごとの検索と内部リンク

_被リンクは literal リンクの本数であり、実際の遷移ではない。回遊の実測ではなく構造の proxy。_

| 柱 | 記事 | GSC 表示 | GSC クリック | 被リンク |
|---|---|---|---|---|
| career-path | 17 | 9 | 0 | 48 |
| market-value | 8 | 0 | 0 | 29 |
| service-choice | 5 | 2 | 0 | 2 |
| application | 5 | 0 | 0 | 9 |
| quit | 4 | 0 | 0 | 4 |

### 4. affiliate CTA（GA4 窓）

表示 23154 ／ クリック 11 ／ CTR 0.05%

| placement | 表示 | クリック | CTR |
|---|---|---|---|
| sidebar | 12673 | 0 | 0.00% |
| article-inline | 3546 | 7 | 0.20% |
| article-end | 3413 | 0 | 0.00% |
| article-mid | 2671 | 3 | 0.11% |
| category-sidebar | 773 | 1 | 0.13% |
| category-mobile | 76 | 0 | 0.00% |
| category-career-section | 2 | 0 | 0.00% |

| label | 表示 | クリック |
|---|---|---|
| BuildJob-sidebar | 7355 | 0 |
| ビルドジョブ | 3728 | 4 |
| DXConsulting-sidebar | 3219 | 0 |
| KensetsuJobs-sidebar | 2852 | 1 |
| BuildJob-endbanner | 1996 | 0 |
| 建設JOBs | 1405 | 5 |
| ハイクラス DX・コンサル転職 | 1084 | 1 |
| DXConsulting-endbanner | 750 | 0 |
| KensetsuJobs-endbanner | 667 | 0 |
| GKS-sidebar | 96 | 0 |
| BuildJob-hubcareer | 2 | 0 |

### 5. A8 成果

窓内（2026-08）: 発生 0 ／ 確定 0 ／ 確定報酬 ¥0
累計: 発生 1 ／ 確定 0 ／ 確定報酬 ¥0

_A8 管理画面のクリックは口座共用（stats47 と同居）のため分母に使わない。分母は GA4。_

## 起票時基線からのずれ（±30% 超）

- affiliate 表示: 起票時 7370 → 今回 23154（314%）
- affiliate クリック: 起票時 19 → 今回 11（58%）
- 高意図 query 表示: 起票時 10 → 今回 33（330%）

## 記事台帳

| slug | 柱 | 公開 | GSC 表示 | クリック | 順位 | 被リンク | CTA |
|---|---|---|---|---|---|---|---|
| civil-construction-1-guide-company-types | career-path | ○ | 8 | 0 | 65.2 | 0 | 1 |
| civil-construction-1-guide-buildjob-review | service-choice | ○ | 2 | 0 | 20 | 0 | 1 |
| civil-construction-1-guide-age-career | career-path | ○ | 1 | 0 | 63 | 0 | 1 |
| civil-construction-1-guide-allowance | market-value | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-career | career-path | ○ | 0 | 0 | — | 13 | 1 |
| civil-construction-1-guide-career-agent-comparison | service-choice | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-career-agents | service-choice | ○ | 0 | 0 | — | 1 | 0 |
| civil-construction-1-guide-career-cases | market-value | ○ | 0 | 0 | — | 0 | 2 |
| civil-construction-1-guide-career-consultation-before-quit | quit | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-career-path | career-path | ○ | 0 | 0 | — | 10 | 0 |
| civil-construction-1-guide-career-salary | market-value | ○ | 0 | 0 | — | 3 | 0 |
| civil-construction-1-guide-consultant | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-dx-jobs | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-future | career-path | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-grade-comparison | market-value | ○ | 0 | 0 | — | 2 | 0 |
| civil-construction-1-guide-hatchu-shien | career-path | ○ | 0 | 0 | — | 7 | 1 |
| civil-construction-1-guide-interview | application | ○ | 0 | 0 | — | 3 | 1 |
| civil-construction-1-guide-market-value | market-value | ○ | 0 | 0 | — | 8 | 1 |
| civil-construction-1-guide-public-servant | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-quit-honne | quit | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-quit-or-stay | quit | ○ | 0 | 0 | — | 3 | 1 |
| civil-construction-1-guide-resume | application | ○ | 0 | 0 | — | 4 | 1 |
| civil-construction-1-guide-salary-by-role | market-value | ○ | 0 | 0 | — | 2 | 1 |
| civil-construction-1-guide-salary-up | market-value | ○ | 0 | 0 | — | 10 | 1 |
| civil-construction-1-guide-timing | application | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-white-company | application | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-women | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-public-servant-merit | career-path | ○ | 0 | 0 | — | 5 | 0 |
| civil-construction-2-guide-buildjob-review | service-choice | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-2-guide-career | career-path | ○ | 0 | 0 | — | 9 | 1 |
| civil-construction-2-guide-career-agent-comparison | service-choice | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-2-guide-career-change | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-2-guide-haken-seishain | career-path | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-job-reality | career-path | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-quit-or-stay | quit | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-resume | application | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-salary | market-value | ○ | 0 | 0 | — | 4 | 1 |
| civil-construction-2-guide-young-career | career-path | ○ | 0 | 0 | — | 1 | 1 |
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
| civil-career-family-time | published | free | n45e5ec2f687e |
| civil-career-hatchusha-view | published | free | n85d4b322898b |
| civil-career-local-work | published | free | n01a775d6c669 |
| civil-career-offer-comparison | published | free | nf17ae9b9f3f7 |
| civil-career-pe-experience | published | free | ne747e39c0ba4 |
| civil-career-public-vs-private | published | free | n8b03a7de0c6b |
| civil-career-public-work-history | published | free | n433cce5f118f |
| civil-career-salary-difference | published | free | nfbff7b1469b6 |
| civil-career-support-role | published | free | n266f0cdd99ef |
| civil-career-timing | published | free | n401905648243 |
| civil-career-white-company | published | free | ne7284dacf78b |
| civil-career-work-history | published | free | ne990d6bf4ce1 |
| civil-career-young-next-role | published | free | ncb066fce826b |

