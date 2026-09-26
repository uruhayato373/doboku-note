# キャリアファネル基線レポート

生成: 2026-09-26T05:07:04.240Z

> [!warning]
> GA4 と GSC は取得遅延が違うため**窓が一致しない**。出所を跨いで CTR や EPC を割らないこと。
> GA4 2026-08-27〜2026-09-23 ／ GSC 2026-08-25〜2026-09-21

## 実検査の内訳

_「異常 0 件」と「1 件も検査していない」を区別するための欄（CLAUDE.md §9）。_

| 対象 | 件数 |
|---|---|
| docMetaIndexTotal | 1261 |
| careerArticles | 43 |
| siteMdxScanned | 1280 |
| extraLinkSourcesScanned | 1 |
| gscRowsTotal | 1050 |
| gscRowsMatchedCareer | 6 |
| ga4LabelRowsMatched | 15 |
| ga4PlacementRowsMatched | 9 |
| careerArticlesInGa4Top | 9 |
| noteCareerArticles | 24 |

## WARN

- 入力欠落 1 件: afb（CI の fetch-metrics 供給を確認する）
- 窓が不一致（GA4 2026-08-27〜2026-09-23 / GSC 2026-08-25〜2026-09-21）。取得元の遅延差なので異常ではないが、出所を跨いで CTR/EPC を割らないこと

## 漏斗

### 1. 高意図 query（GSC 窓）

表示 44 ／ クリック 1

語彙: 転職・辞めたい・やめたい・年収・市場価値・評判・口コミ・エージェント・求人・ホワイト・公務員・発注者支援

| query | 表示 | クリック | 順位 |
|---|---|---|---|
| 技術士転職 | 7 | 0 | 72.9 |
| 土木公務員 資格 | 5 | 0 | 10.8 |
| 技術 士 年収 | 3 | 0 | 77.7 |
| 技術士 年収 | 3 | 0 | 73.0 |
| 技術士総合技術監理部門年収 | 3 | 0 | 29.3 |
| 土木施工管理 年収 | 2 | 0 | 96.0 |
| 公務員 土木職 資格 | 2 | 0 | 9.5 |
| 技術士 総合技術監理部門 年収 | 2 | 0 | 30.0 |
| rccm 受験資格 公務員 | 1 | 1 | 15.0 |
| 施工管理job 評判 | 1 | 0 | 68.0 |
| 施工管理 転職エージェント | 1 | 0 | 18.0 |
| 1級土木施工管理技士年収 | 1 | 0 | 70.0 |
| 1級土木施工管理技士補 年収 | 1 | 0 | 86.0 |
| 一級土木施工管理技士 年収 | 1 | 0 | 61.0 |
| 土木施工管理技士 年収 | 1 | 0 | 69.0 |

### 2. キャリアページの流入（GA4 窓）

GA4 上位ページに入った career 記事: 9 / 43 本

### 3. 柱ごとの検索と内部リンク

_被リンクは literal リンクの本数であり、実際の遷移ではない。回遊の実測ではなく構造の proxy。_

| 柱 | 記事 | GSC 表示 | GSC クリック | 被リンク |
|---|---|---|---|---|
| career-path | 19 | 9 | 0 | 44 |
| market-value | 9 | 0 | 0 | 29 |
| service-choice | 5 | 0 | 0 | 2 |
| quit | 5 | 0 | 0 | 4 |
| application | 5 | 0 | 0 | 9 |

### 4. affiliate CTA（GA4 窓）

表示 23416 ／ クリック 13 ／ CTR 0.06%

| placement | 表示 | クリック | CTR |
|---|---|---|---|
| sidebar | 12916 | 2 | 0.02% |
| article-inline | 3723 | 7 | 0.19% |
| article-end | 3328 | 0 | 0.00% |
| article-mid | 2678 | 4 | 0.15% |
| category-sidebar | 695 | 0 | 0.00% |
| category-mobile | 76 | 0 | 0.00% |

| label | 表示 | クリック |
|---|---|---|
| BuildJob-sidebar | 7514 | 1 |
| ビルドジョブ | 3855 | 4 |
| DXConsulting-sidebar | 3292 | 1 |
| KensetsuJobs-sidebar | 2785 | 0 |
| BuildJob-endbanner | 1932 | 0 |
| 建設JOBs | 1405 | 5 |
| ハイクラス DX・コンサル転職 | 1141 | 2 |
| DXConsulting-endbanner | 729 | 0 |
| KensetsuJobs-endbanner | 667 | 0 |
| GKS-sidebar | 96 | 0 |

### 5. A8 成果

窓内（2026-08）: 発生 0 ／ 確定 0 ／ 確定報酬 ¥0
累計: 発生 1 ／ 確定 0 ／ 確定報酬 ¥0

_A8 管理画面のクリックは口座共用（stats47 と同居）のため分母に使わない。分母は GA4。_

### 6. afb 成果（公式 API）

afb: 未取得（fetch-afb-outcomes.mjs --commit が未実行、または fetch-metrics.yml が止まっている）

## 起票時基線からのずれ（±30% 超）

- affiliate 表示: 起票時 7370 → 今回 23416（318%）
- affiliate クリック: 起票時 19 → 今回 13（68%）
- 高意図 query 表示: 起票時 10 → 今回 44（440%）

## 記事台帳

| slug | 柱 | 公開 | GSC 表示 | クリック | 順位 | 被リンク | CTA |
|---|---|---|---|---|---|---|---|
| civil-construction-1-guide-company-types | career-path | ○ | 8 | 0 | 65.2 | 0 | 1 |
| civil-construction-1-guide-age-career | career-path | ○ | 1 | 0 | 63 | 0 | 1 |
| civil-construction-1-guide-allowance | market-value | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-buildjob-review | service-choice | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-career | career-path | ○ | 0 | 0 | — | 13 | 1 |
| civil-construction-1-guide-career-agent-comparison | service-choice | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-career-agents | service-choice | ○ | 0 | 0 | — | 1 | 0 |
| civil-construction-1-guide-career-cases | market-value | ○ | 0 | 0 | — | 0 | 2 |
| civil-construction-1-guide-career-consultation-before-quit | quit | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-career-path | career-path | ○ | 0 | 0 | — | 10 | 1 |
| civil-construction-1-guide-career-salary | market-value | ○ | 0 | 0 | — | 3 | 0 |
| civil-construction-1-guide-consultant | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-dx-jobs | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-future | career-path | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-grade-comparison | market-value | ○ | 0 | 0 | — | 2 | 0 |
| civil-construction-1-guide-hatchu-shien | career-path | ○ | 0 | 0 | — | 6 | 1 |
| civil-construction-1-guide-interview | application | ○ | 0 | 0 | — | 3 | 1 |
| civil-construction-1-guide-market-value | market-value | ○ | 0 | 0 | — | 8 | 1 |
| civil-construction-1-guide-public-engineer-exam-study | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-public-engineer-salary-table | market-value | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-public-servant | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-quit-honne | quit | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-quit-or-stay | quit | ○ | 0 | 0 | — | 3 | 1 |
| civil-construction-1-guide-quit-public-engineer | quit | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-resume | application | ○ | 0 | 0 | — | 4 | 1 |
| civil-construction-1-guide-salary-by-role | market-value | ○ | 0 | 0 | — | 2 | 1 |
| civil-construction-1-guide-salary-up | market-value | ○ | 0 | 0 | — | 10 | 1 |
| civil-construction-1-guide-timing | application | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-white-company | application | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-women | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-public-servant-merit | career-path | ○ | 0 | 0 | — | 3 | 0 |
| civil-construction-2-guide-buildjob-review | service-choice | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-2-guide-career | career-path | ○ | 0 | 0 | — | 8 | 1 |
| civil-construction-2-guide-career-agent-comparison | service-choice | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-2-guide-career-change | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-2-guide-haken-seishain | career-path | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-job-reality | career-path | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-quit-or-stay | quit | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-resume | application | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-salary | market-value | ○ | 0 | 0 | — | 4 | 1 |
| civil-construction-2-guide-young-career | career-path | ○ | 0 | 0 | — | 1 | 1 |
| pe-construction-guide-career | career-path | ○ | 0 | 0 | — | 0 | 1 |
| rccm-guide-career-value | career-path | ○ | 0 | 0 | — | 0 | 1 |

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
| civil-career-public-exam | published | free | n74574220cc9d |
| civil-career-public-quit-inventory | published | free | n844dc3ac8383 |
| civil-career-public-vs-private | published | free | n8b03a7de0c6b |
| civil-career-public-work-history | published | free | n433cce5f118f |
| civil-career-rccm-next | published | free | n619606e67f94 |
| civil-career-salary-difference | published | free | nfbff7b1469b6 |
| civil-career-salary-table | published | free | n523e6403a937 |
| civil-career-support-role | published | free | n266f0cdd99ef |
| civil-career-timing | published | free | n401905648243 |
| civil-career-urgency | published | free | n394a24392863 |
| civil-career-white-company | published | free | ne7284dacf78b |
| civil-career-work-history | published | free | ne990d6bf4ce1 |
| civil-career-young-next-role | published | free | ncb066fce826b |

