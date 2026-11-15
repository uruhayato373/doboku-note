# キャリアファネル基線レポート

生成: 2026-11-15T00:38:08.638Z

> [!warning]
> GA4 と GSC は取得遅延が違うため**窓が一致しない**。出所を跨いで CTR や EPC を割らないこと。
> GA4 2026-10-18〜2026-11-14 ／ GSC 2026-10-15〜2026-11-11

## 実検査の内訳

_「異常 0 件」と「1 件も検査していない」を区別するための欄（CLAUDE.md §9）。_

| 対象 | 件数 |
|---|---|
| docMetaIndexTotal | 1589 |
| careerArticles | 46 |
| siteMdxScanned | 1629 |
| extraLinkSourcesScanned | 1 |
| gscRowsTotal | 4368 |
| gscRowsMatchedCareer | 108 |
| ga4LabelRowsMatched | 15 |
| ga4PlacementRowsMatched | 18 |
| careerArticlesInGa4Top | 27 |
| noteCareerArticles | 24 |

## WARN

- 入力欠落 1 件: afb（CI の fetch-metrics 供給を確認する）
- 窓が不一致（GA4 2026-10-18〜2026-11-14 / GSC 2026-10-15〜2026-11-11）。取得元の遅延差なので異常ではないが、出所を跨いで CTR/EPC を割らないこと
- ページ別のクリック 5 件がどの配置ルールにも当たらない（撤去前の面・ラベル未登録・ページ不明。unattributed.top を見る）

## 漏斗

### 1. 高意図 query（GSC 窓）

表示 456 ／ クリック 9

語彙: 転職・辞めたい・やめたい・年収・市場価値・評判・口コミ・エージェント・求人・ホワイト・公務員・発注者支援

| query | 表示 | クリック | 順位 |
|---|---|---|---|
| rccm 受験資格 公務員 | 21 | 1 | 6.1 |
| 公務員 土木職 資格 | 20 | 0 | 7.8 |
| 土木公務員 資格 | 17 | 1 | 6.8 |
| ビルドジョブ 評判 | 17 | 0 | 26.2 |
| 技術士 実務経験 公務員 | 16 | 2 | 10.6 |
| 公務員 土木 転職 後悔 | 16 | 0 | 7.2 |
| 転職エージェント 施工管理 | 16 | 0 | 73.2 |
| 公務員 土木 資格 おすすめ | 15 | 1 | 6.3 |
| 土木 公務員 資格 | 14 | 1 | 6.8 |
| 公務員 土木 年収 | 14 | 0 | 14.4 |
| 施工管理 転職エージェント おすすめ | 14 | 0 | 73.9 |
| 土木公務員 年収 | 12 | 0 | 1.8 |
| 公務員 土木 資格 | 12 | 0 | 8.0 |
| 土木 公務員 年収 | 11 | 1 | 4.1 |
| rccm 公務員 | 11 | 1 | 7.7 |

### 2. キャリアページの流入（GA4 窓）

GA4 上位ページに入った career 記事: 27 / 46 本

### 3. 柱ごとの検索と内部リンク

_被リンクは literal リンクの本数であり、実際の遷移ではない。回遊の実測ではなく構造の proxy。_

| 柱 | 記事 | GSC 表示 | GSC クリック | 被リンク |
|---|---|---|---|---|
| career-path | 21 | 133 | 0 | 65 |
| market-value | 10 | 73 | 1 | 44 |
| service-choice | 5 | 118 | 0 | 10 |
| quit | 5 | 22 | 0 | 14 |
| application | 5 | 9 | 0 | 13 |

### 4. affiliate CTA（GA4 窓）

表示 24450 ／ クリック 24 ／ CTR 0.10%

| placement | 表示 | クリック | CTR |
|---|---|---|---|
| article-mid | 10268 | 10 | 0.10% |
| article-inline | 9970 | 9 | 0.09% |
| category-sidebar | 1401 | 1 | 0.07% |
| article-end | 837 | 0 | 0.00% |
| standards-list-end | 576 | 0 | 0.00% |
| category-mobile | 526 | 1 | 0.19% |
| tool-end | 471 | 1 | 0.21% |
| standards-end | 223 | 0 | 0.00% |
| tool-inline | 91 | 0 | 0.00% |
| home-section | 70 | 2 | 2.86% |
| topic-end | 15 | 0 | 0.00% |
| standards-inline | 2 | 0 | 0.00% |

| label | 表示 | クリック |
|---|---|---|
| 建設JOBs | 9548 | 8 |
| ビルドジョブ | 9150 | 12 |
| BuildJob-sidebar | 1546 | 2 |
| コンストワーク | 1520 | 0 |
| ハイクラス DX・コンサル転職 | 1314 | 2 |
| KensetsuJobs-endbanner | 688 | 0 |
| DXConsulting-sidebar | 224 | 0 |
| KensetsuJobs-sidebar | 184 | 0 |
| BuildJob-endbanner | 149 | 0 |
| 建築転職 | 125 | 0 |
| RsgKensetsu-sidebar | 2 | 0 |

配置ルール別（2026-10-18〜2026-11-14・ページ別からルールを一意に決めた数字）

| ルール | 案件 | 面 | 表示 | クリック | 分けられない表示/クリック |
|---|---|---|---|---|---|
| PL-0002 | dx-consulting | article-mid | 1109 | 1 | 0/0 |
| PL-0008 | dx-consulting | category-sidebar | 48 | 0 | 0/0 |
| PL-0009 | dx-consulting | category-mobile | 12 | 0 | 0/0 |
| PL-0010 | buildjob | career-tool | 0 | 0 | 0/0 |
| PL-0013 | buildjob | article-mid | 3189 | 7 | 0/0 |
| PL-0014 | buildjob | article-inline | 0 | 0 | 612/0 |
| PL-0016 | buildjob | category-sidebar | 521 | 0 | 0/0 |
| PL-0017 | buildjob | category-mobile | 260 | 0 | 0/0 |
| PL-0018 | buildjob | article-mid | 0 | 0 | 0/0 |
| PL-0019 | buildjob | article-inline | 12 | 0 | 0/0 |
| PL-0020 | kensetsu-jobs | article-mid | 515 | 0 | 0/0 |
| PL-0021 | kensetsu-jobs | article-inline | 8906 | 8 | 0/0 |
| PL-0022 | kensetsu-jobs | article-end | 674 | 0 | 0/0 |
| PL-0023 | kensetsu-jobs | category-sidebar | 32 | 0 | 0/0 |
| PL-0024 | kensetsu-jobs | category-mobile | 20 | 0 | 0/0 |
| PL-0025 | buildjob | article-mid | 1969 | 1 | 0/0 |
| PL-0026 | buildjob | article-end | 129 | 0 | 0/0 |
| PL-0027 | buildjob | category-sidebar | 4 | 0 | 0/0 |
| PL-0028 | buildjob | category-mobile | 1 | 0 | 0/0 |
| PL-0029 | buildjob | article-mid | 263 | 0 | 200/0 |
| PL-0030 | buildjob | category-sidebar | 1 | 0 | 0/0 |
| PL-0031 | buildjob | category-mobile | 0 | 0 | 0/0 |
| PL-0033 | buildjob | home-section | 32 | 1 | 0/0 |
| PL-0034 | buildjob | tool-inline | 89 | 0 | 0/0 |
| PL-0036 | buildjob | topic-end | 2 | 0 | 0/0 |
| PL-0037 | buildjob | tool-end | 327 | 1 | 0/0 |
| PL-0038 | buildjob | article-mid | 112 | 0 | 251/0 |
| PL-0039 | buildjob | article-end | 19 | 0 | 0/0 |
| PL-0040 | buildjob | category-sidebar | 0 | 0 | 8/0 |
| PL-0041 | buildjob | category-mobile | 0 | 0 | 0/0 |
| PL-0042 | buildjob | article-mid | 31 | 0 | 0/0 |
| PL-0043 | buildjob | laws-list-end | 0 | 0 | 0/0 |
| PL-0044 | buildjob | article-inline | 0 | 0 | 612/0 |
| PL-0045 | buildjob | article-mid | 0 | 0 | 200/0 |
| PL-0046 | dx-consulting | article-inline | 1 | 0 | 0/0 |
| PL-0047 | dx-consulting | article-mid | 66 | 0 | 0/0 |
| PL-0048 | dx-consulting | category-sidebar | 0 | 0 | 0/0 |
| PL-0049 | dx-consulting | category-mobile | 0 | 0 | 0/0 |
| PL-0050 | buildjob | article-mid | 0 | 0 | 251/0 |
| PL-0051 | kenchiku-tenshoku | article-mid | 125 | 0 | 0/0 |
| PL-0052 | buildjob | category-sidebar | 0 | 0 | 8/0 |
| PL-0053 | kenchiku-tenshoku | category-sidebar | 0 | 0 | 0/0 |
| PL-0054 | buildjob | category-mobile | 0 | 0 | 0/0 |
| PL-0055 | kenchiku-tenshoku | category-mobile | 0 | 0 | 0/0 |
| PL-0056 | buildjob | standards-sidebar | 0 | 0 | 0/0 |
| PL-0057 | rsg-kensetsu | standards-sidebar-2 | 0 | 0 | 0/0 |
| PL-0058 | kensetsu-jobs | standards-sidebar-3 | 0 | 0 | 0/0 |
| PL-0059 | buildjob | standards-end | 198 | 0 | 0/0 |
| PL-0060 | buildjob | standards-list-sidebar | 0 | 0 | 0/0 |
| PL-0061 | dainishinsotsu-agent-neo | standards-list-sidebar-2 | 0 | 0 | 0/0 |
| PL-0062 | rsg-kensetsu | standards-list-sidebar-3 | 0 | 0 | 0/0 |
| PL-0063 | dainishinsotsu-agent-neo | standards-list-end | 0 | 0 | 0/0 |
| PL-0064 | rsg-kensetsu | standards-inline | 2 | 0 | 0/0 |

クリックの出どころ（A8 の発生日と突き合わせる）

| 日付 | ページ | 案件 | 面 | ルール | クリック |
|---|---|---|---|---|---|
| 2026-11-11 | / | buildjob | home-section | PL-0033 | 1 |
| 2026-11-11 | /exam/civil-construction-2/guide/r08-secondary-answers | buildjob | article-inline | — | 1 |
| 2026-11-11 | /exam/concrete-chief-engineer/guide/overview | buildjob | article-mid | PL-0013 | 1 |
| 2026-11-11 | /exam/pe-first-stage/primary/r01-retry-basic | buildjob | article-mid | PL-0013 | 1 |
| 2026-11-11 | /tools/kakomon-quiz/pe-first-stage | buildjob | tool-end | PL-0037 | 1 |
| 2026-11-06 | /exam/pe-first-stage/primary/r02-water-supply | buildjob | article-mid | PL-0013 | 1 |
| 2026-11-05 | / | buildjob | category-mobile | — | 1 |
| 2026-11-05 | /exam/pe-first-stage/primary/r07-basic | buildjob | article-mid | PL-0013 | 1 |
| 2026-11-04 | / | dx-consulting | article-mid | — | 1 |
| 2026-11-03 | /exam/pe-first-stage/guide/water-supply-subject | buildjob | article-mid | PL-0013 | 1 |
| 2026-11-02 | /practice/owner-safety-responsibility | buildjob | article-mid | PL-0025 | 1 |
| 2026-10-28 | / | buildjob | category-sidebar | — | 1 |
| 2026-10-27 | /exam/civil-construction-2/secondary/r08 | kensetsu-jobs | article-inline | PL-0021 | 1 |
| 2026-10-26 | /exam/civil-construction-2/secondary/r08 | kensetsu-jobs | article-inline | PL-0021 | 1 |
| 2026-10-25 | /exam/civil-construction-2/guide/r08-secondary-answers | kensetsu-jobs | article-inline | PL-0021 | 4 |
| 2026-10-25 | /exam/pe-comprehensive-management | buildjob | home-section | — | 1 |
| 2026-10-24 | /exam/pe-comprehensive-management/past-exams/r06-secondary | dx-consulting | article-mid | PL-0002 | 1 |
| 2026-10-24 | /exam/pe-first-stage/guide/overview | buildjob | article-mid | PL-0013 | 1 |
| 2026-10-23 | /exam/civil-construction-2/secondary/r07 | kensetsu-jobs | article-inline | PL-0021 | 1 |
| 2026-10-22 | /exam/pe-first-stage/primary/r07-construction | buildjob | article-mid | PL-0013 | 1 |
| 2026-10-21 | /exam/civil-construction-2/guide/r08-secondary-answers | kensetsu-jobs | article-inline | PL-0021 | 1 |

### 5. A8 成果

成果の出どころ（A8 の成果別・1 成果 1 行。ページはクリックしたページ）

| クリック | 案件 | 状態 | 発生額 | ページ | 候補ルール |
|---|---|---|---|---|---|
| 2026-10-05 10:37 | buildjob | キャンセル | ¥13534 | （不明・ページの URL を渡す前） | — |

窓内（2026-10・2026-11）: 発生 1 ／ 確定 0 ／ 確定報酬 ¥0
累計: 発生 2 ／ 確定 0 ／ 確定報酬 ¥0

_A8 管理画面のクリックは口座共用（stats47 と同居）のため分母に使わない。分母は GA4。_

### 6. afb 成果（公式 API）

afb: 未取得（fetch-afb-outcomes.mjs --commit が未実行、または fetch-metrics.yml が止まっている）

## 起票時基線からのずれ（±30% 超）

- affiliate 表示: 起票時 7370 → 今回 24450（332%）
- 高意図 query 表示: 起票時 7 → 今回 456（6514%）

## 記事台帳

| slug | 柱 | 公開 | GSC 表示 | クリック | 順位 | 被リンク | CTA |
|---|---|---|---|---|---|---|---|
| civil-construction-2-guide-career-agent-comparison | service-choice | ○ | 54 | 0 | 57.5 | 1 | 1 |
| civil-construction-1-guide-public-engineer-salary-table | market-value | ○ | 45 | 1 | 6.7 | 3 | 1 |
| civil-construction-1-guide-company-types | career-path | ○ | 37 | 0 | 42 | 1 | 1 |
| civil-construction-1-guide-consultant | career-path | ○ | 31 | 0 | 31.3 | 2 | 1 |
| civil-construction-1-guide-career-agents | service-choice | ○ | 28 | 0 | 75.3 | 2 | 0 |
| civil-construction-1-guide-buildjob-review | service-choice | ○ | 24 | 0 | 46.1 | 1 | 1 |
| civil-construction-1-guide-future | career-path | ○ | 21 | 0 | 17.8 | 1 | 1 |
| civil-construction-1-guide-quit-public-engineer | quit | ○ | 19 | 0 | 9.5 | 3 | 1 |
| civil-construction-1-guide-grade-comparison | market-value | ○ | 13 | 0 | 37.3 | 2 | 0 |
| civil-construction-1-guide-career-agent-comparison | service-choice | ○ | 12 | 0 | 74.5 | 5 | 1 |
| civil-construction-1-guide-public-servant | career-path | ○ | 11 | 0 | 33.3 | 4 | 1 |
| civil-construction-1-guide-salary-by-role | market-value | ○ | 8 | 0 | 41.9 | 2 | 1 |
| civil-construction-1-guide-women | career-path | ○ | 8 | 0 | 88.3 | 3 | 1 |
| civil-construction-1-guide-public-servant-or-private | career-path | ○ | 7 | 0 | 36.3 | 0 | 1 |
| civil-construction-1-public-servant-merit | career-path | ○ | 7 | 0 | 30.1 | 7 | 0 |
| civil-construction-1-guide-allowance | market-value | ○ | 6 | 0 | 50.9 | 0 | 1 |
| civil-construction-1-guide-resume | application | ○ | 6 | 0 | 63.8 | 6 | 1 |
| civil-construction-1-guide-career-path | career-path | ○ | 4 | 0 | 71.8 | 12 | 1 |
| civil-construction-1-guide-age-career | career-path | ○ | 3 | 0 | 36 | 0 | 1 |
| civil-construction-2-guide-haken-seishain | career-path | ○ | 3 | 0 | 7 | 1 | 1 |
| civil-construction-2-guide-resume | application | ○ | 3 | 0 | 65.7 | 2 | 1 |
| civil-construction-2-guide-quit-or-stay | quit | ○ | 2 | 0 | 36.5 | 2 | 1 |
| civil-construction-1-guide-career-cases | market-value | ○ | 1 | 0 | 4 | 1 | 2 |
| civil-construction-1-guide-quit-or-stay | quit | ○ | 1 | 0 | 59 | 7 | 1 |
| civil-construction-2-guide-job-reality | career-path | ○ | 1 | 0 | 54 | 1 | 1 |
| civil-construction-1-guide-career | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-career-consultation-before-quit | quit | ○ | 0 | 0 | — | 2 | 1 |
| civil-construction-1-guide-career-salary | market-value | ○ | 0 | 0 | — | 3 | 0 |
| civil-construction-1-guide-dx-jobs | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-hatchu-shien | career-path | ○ | 0 | 0 | — | 9 | 1 |
| civil-construction-1-guide-interview | application | ○ | 0 | 0 | — | 3 | 1 |
| civil-construction-1-guide-market-value | market-value | ○ | 0 | 0 | — | 15 | 1 |
| civil-construction-1-guide-market-value-check | market-value | ○ | 0 | 0 | — | 3 | 2 |
| civil-construction-1-guide-public-engineer-exam-study | career-path | ○ | 0 | 0 | — | 3 | 1 |
| civil-construction-1-guide-quit-honne | quit | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-salary-up | market-value | ○ | 0 | 0 | — | 11 | 1 |
| civil-construction-1-guide-timing | application | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-white-company | application | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-buildjob-review | service-choice | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-career | career-path | ○ | 0 | 0 | — | 11 | 1 |
| civil-construction-2-guide-career-change | career-path | ○ | 0 | 0 | — | 2 | 1 |
| civil-construction-2-guide-salary | market-value | ○ | 0 | 0 | — | 4 | 1 |
| civil-construction-2-guide-young-career | career-path | ○ | 0 | 0 | — | 2 | 1 |
| pe-construction-fukugyou-dokuritsu | career-path | ○ | 0 | 0 | — | 0 | 0 |
| pe-construction-guide-career | career-path | ○ | 0 | 0 | — | 4 | 1 |
| rccm-guide-career-value | career-path | ○ | 0 | 0 | — | 2 | 1 |

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

