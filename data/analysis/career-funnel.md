# キャリアファネル基線レポート

生成: 2026-10-15T23:27:09.265Z

> [!warning]
> GA4 と GSC は取得遅延が違うため**窓が一致しない**。出所を跨いで CTR や EPC を割らないこと。
> GA4 2026-09-17〜2026-10-14 ／ GSC 2026-09-15〜2026-10-12

## 実検査の内訳

_「異常 0 件」と「1 件も検査していない」を区別するための欄（CLAUDE.md §9）。_

| 対象 | 件数 |
|---|---|
| docMetaIndexTotal | 1408 |
| careerArticles | 45 |
| siteMdxScanned | 1448 |
| extraLinkSourcesScanned | 1 |
| gscRowsTotal | 1382 |
| gscRowsMatchedCareer | 46 |
| ga4LabelRowsMatched | 14 |
| ga4PlacementRowsMatched | 16 |
| careerArticlesInGa4Top | 26 |
| noteCareerArticles | 24 |

## WARN

- 入力欠落 1 件: afb（CI の fetch-metrics 供給を確認する）
- 窓が不一致（GA4 2026-09-17〜2026-10-14 / GSC 2026-09-15〜2026-10-12）。取得元の遅延差なので異常ではないが、出所を跨いで CTR/EPC を割らないこと

## 漏斗

### 1. 高意図 query（GSC 窓）

表示 168 ／ クリック 4

語彙: 転職・辞めたい・やめたい・年収・市場価値・評判・口コミ・エージェント・求人・ホワイト・公務員・発注者支援

| query | 表示 | クリック | 順位 |
|---|---|---|---|
| 土木公務員 資格 | 19 | 1 | 9.3 |
| 施工管理から転職 | 16 | 0 | 20.4 |
| 公務員 土木 資格 おすすめ | 16 | 0 | 8.8 |
| 土木施工管理技士 年収 | 14 | 0 | 5.8 |
| 公務員 土木職 資格 | 12 | 0 | 7.8 |
| 施工管理 転職エージェント | 9 | 0 | 28.3 |
| 土木施工管理技士年収 | 8 | 0 | 6.3 |
| rccm 公務員 | 7 | 0 | 10.7 |
| 土木 公務員 資格 | 6 | 0 | 14.7 |
| 技術士 実務経験 公務員 | 5 | 1 | 8.6 |
| 公務員 土木 資格 | 5 | 0 | 9.0 |
| rccm 受験資格 公務員 | 4 | 1 | 10.5 |
| 施工管理が転職エージェントを活用する方法 | 3 | 0 | 8.0 |
| 施工管理 から 転職 | 3 | 0 | 18.3 |
| 施工管理 公務員 | 3 | 0 | 13.7 |

### 2. キャリアページの流入（GA4 窓）

GA4 上位ページに入った career 記事: 26 / 45 本

### 3. 柱ごとの検索と内部リンク

_被リンクは literal リンクの本数であり、実際の遷移ではない。回遊の実測ではなく構造の proxy。_

| 柱 | 記事 | GSC 表示 | GSC クリック | 被リンク |
|---|---|---|---|---|
| career-path | 21 | 104 | 1 | 61 |
| market-value | 9 | 37 | 0 | 40 |
| service-choice | 5 | 23 | 0 | 9 |
| quit | 5 | 2 | 0 | 14 |
| application | 5 | 0 | 0 | 13 |

### 4. affiliate CTA（GA4 窓）

表示 19355 ／ クリック 20 ／ CTR 0.10%

| placement | 表示 | クリック | CTR |
|---|---|---|---|
| article-inline | 6333 | 9 | 0.14% |
| article-end | 4204 | 0 | 0.00% |
| sidebar | 4191 | 2 | 0.05% |
| article-mid | 3598 | 5 | 0.14% |
| category-sidebar | 688 | 0 | 0.00% |
| category-mobile | 122 | 0 | 0.00% |
| standards-list-end | 122 | 0 | 0.00% |
| tool-end | 56 | 2 | 3.57% |
| tool-inline | 29 | 0 | 0.00% |
| home-section | 9 | 2 | 22.22% |
| standards-end | 3 | 0 | 0.00% |

| label | 表示 | クリック |
|---|---|---|
| ビルドジョブ | 7825 | 14 |
| BuildJob-sidebar | 3856 | 1 |
| BuildJob-endbanner | 3145 | 0 |
| 建設JOBs | 1425 | 1 |
| DXConsulting-sidebar | 1094 | 1 |
| ハイクラス DX・コンサル転職 | 900 | 3 |
| KensetsuJobs-endbanner | 609 | 0 |
| DXConsulting-endbanner | 450 | 0 |
| KensetsuJobs-sidebar | 51 | 0 |

配置ルール別（2026-09-17〜2026-10-14・ページ別からルールを一意に決めた数字）

| ルール | 案件 | 面 | 表示 | クリック | 分けられない表示/クリック |
|---|---|---|---|---|---|
| PL-0001 | buildjob | article-mid | 739 | 0 | 1089/0 |
| PL-0002 | dx-consulting | article-mid | 807 | 3 | 0/0 |
| PL-0003 | buildjob | article-inline | 1973 | 8 | 2972/0 |
| PL-0004 | buildjob | article-end | 1321 | 0 | 1427/0 |
| PL-0005 | dx-consulting | article-end | 404 | 0 | 0/0 |
| PL-0006 | buildjob | category-sidebar | 15 | 0 | 133/0 |
| PL-0007 | buildjob | category-mobile | 2 | 0 | 61/0 |
| PL-0008 | dx-consulting | category-sidebar | 117 | 0 | 0/0 |
| PL-0009 | dx-consulting | category-mobile | 0 | 0 | 0/0 |
| PL-0010 | buildjob | career-tool | 0 | 0 | 0/0 |
| PL-0011 | buildjob | sidebar | 3193 | 1 | 0/0 |
| PL-0012 | dx-consulting | sidebar | 821 | 1 | 0/0 |
| PL-0013 | buildjob | article-mid | 0 | 2 | 1089/0 |
| PL-0014 | buildjob | article-inline | 0 | 0 | 2962/0 |
| PL-0015 | buildjob | article-end | 0 | 0 | 1427/0 |
| PL-0016 | buildjob | category-sidebar | 0 | 0 | 133/0 |
| PL-0017 | buildjob | category-mobile | 0 | 0 | 61/0 |
| PL-0018 | buildjob | article-mid | 0 | 0 | 0/0 |
| PL-0019 | buildjob | article-inline | 0 | 0 | 10/0 |
| PL-0020 | kensetsu-jobs | article-mid | 138 | 0 | 0/0 |
| PL-0021 | kensetsu-jobs | article-inline | 1251 | 1 | 0/0 |
| PL-0022 | kensetsu-jobs | article-end | 604 | 0 | 0/0 |
| PL-0023 | kensetsu-jobs | category-sidebar | 6 | 0 | 0/0 |
| PL-0024 | kensetsu-jobs | category-mobile | 0 | 0 | 0/0 |
| PL-0025 | buildjob | article-mid | 395 | 0 | 0/0 |
| PL-0026 | buildjob | article-end | 233 | 0 | 0/0 |
| PL-0027 | buildjob | category-sidebar | 0 | 0 | 0/0 |
| PL-0028 | buildjob | category-mobile | 0 | 0 | 0/0 |
| PL-0029 | buildjob | article-mid | 125 | 0 | 0/0 |
| PL-0030 | buildjob | category-sidebar | 0 | 0 | 0/0 |
| PL-0031 | buildjob | category-mobile | 0 | 0 | 0/0 |
| PL-0032 | buildjob | standards-end | 1 | 0 | 0/0 |
| PL-0033 | buildjob | home-section | 7 | 2 | 0/0 |
| PL-0034 | buildjob | tool-inline | 29 | 0 | 0/0 |
| PL-0035 | buildjob | standards-list-end | 120 | 0 | 0/0 |
| PL-0036 | buildjob | topic-end | 0 | 0 | 0/0 |
| PL-0037 | buildjob | tool-end | 30 | 2 | 0/0 |
| PL-0038 | buildjob | article-mid | 66 | 0 | 0/0 |
| PL-0039 | buildjob | article-end | 54 | 0 | 0/0 |
| PL-0040 | buildjob | category-sidebar | 0 | 0 | 0/0 |
| PL-0041 | buildjob | category-mobile | 1 | 0 | 0/0 |

クリックの出どころ（A8 の発生日と突き合わせる）

| 日付 | ページ | 案件 | 面 | ルール | クリック |
|---|---|---|---|---|---|
| 2026-10-14 | / | buildjob | home-section | PL-0033 | 1 |
| 2026-10-14 | /exam/civil-construction-2/guide/secondary-grading-and-partial-credit | kensetsu-jobs | article-inline | PL-0021 | 1 |
| 2026-10-14 | /exam/pe-first-stage/guide/overview | buildjob | article-mid | PL-0013 | 1 |
| 2026-10-14 | /tools/kakomon-quiz/pe-first-stage | buildjob | tool-end | PL-0037 | 2 |
| 2026-10-13 | / | buildjob | home-section | PL-0033 | 1 |
| 2026-10-13 | /exam/concrete-diagnostician/textbook/deterioration | buildjob | article-mid | PL-0013 | 1 |
| 2026-10-03 | /exam/pe-comprehensive-management/past-exams/r08-primary | dx-consulting | article-mid | PL-0002 | 1 |
| 2026-10-02 | /exam/civil-construction-1/secondary/r03 | buildjob | article-inline | PL-0003 | 1 |
| 2026-10-02 | /exam/civil-construction-2/secondary/r04 | buildjob | article-inline | PL-0003 | 1 |
| 2026-10-01 | /exam/civil-construction-2/secondary/r07 | buildjob | article-inline | PL-0003 | 1 |
| 2026-09-28 | /exam/civil-construction-1/secondary/r05 | buildjob | article-inline | PL-0003 | 1 |
| 2026-09-28 | /exam/pe-comprehensive-management/guide/frequent-topics | dx-consulting | article-mid | PL-0002 | 1 |
| 2026-09-26 | /exam/civil-construction-1/secondary/r07 | buildjob | article-inline | PL-0003 | 1 |
| 2026-09-26 | /exam/civil-construction-2/secondary/r07 | buildjob | article-inline | PL-0003 | 1 |
| 2026-09-26 | /exam/pe-construction/guide/career | buildjob | article-inline | PL-0003 | 1 |
| 2026-09-25 | /exam/civil-construction-1/secondary/r07 | buildjob | article-inline | PL-0003 | 1 |
| 2026-09-23 | /exam/pe-comprehensive-management/keywords/personal-info-protection | dx-consulting | article-mid | PL-0002 | 1 |
| 2026-09-19 | /exam/civil-construction-1/secondary/r07 | buildjob | sidebar | PL-0011 | 1 |
| 2026-09-17 | /exam/pe-comprehensive-management/past-exams/r08-primary | dx-consulting | sidebar | PL-0012 | 1 |

### 5. A8 成果

成果の出どころ（A8 の成果別・1 成果 1 行。ページはクリックしたページ）

| クリック | 案件 | 状態 | 発生額 | ページ | 候補ルール |
|---|---|---|---|---|---|
| 2026-10-05 10:37 | buildjob | 未確定 | ¥13534 | （不明・ページの URL を渡す前） | — |

窓内（2026-09・2026-10）: 発生 1 ／ 確定 0 ／ 確定報酬 ¥0
累計: 発生 2 ／ 確定 0 ／ 確定報酬 ¥0

_A8 管理画面のクリックは口座共用（stats47 と同居）のため分母に使わない。分母は GA4。_

### 6. afb 成果（公式 API）

afb: 未取得（fetch-afb-outcomes.mjs --commit が未実行、または fetch-metrics.yml が止まっている）

## 起票時基線からのずれ（±30% 超）

- affiliate 表示: 起票時 7370 → 今回 19355（263%）
- 高意図 query 表示: 起票時 7 → 今回 168（2400%）

## 記事台帳

| slug | 柱 | 公開 | GSC 表示 | クリック | 順位 | 被リンク | CTA |
|---|---|---|---|---|---|---|---|
| civil-construction-1-guide-company-types | career-path | ○ | 35 | 0 | 36.5 | 1 | 1 |
| civil-construction-1-guide-future | career-path | ○ | 25 | 0 | 10.4 | 1 | 1 |
| civil-construction-2-guide-salary | market-value | ○ | 24 | 0 | 6.8 | 4 | 1 |
| civil-construction-1-guide-hatchu-shien | career-path | ○ | 20 | 0 | 19.2 | 9 | 1 |
| civil-construction-2-guide-career-agent-comparison | service-choice | ○ | 18 | 0 | 24.3 | 1 | 1 |
| civil-construction-1-guide-grade-comparison | market-value | ○ | 7 | 0 | 47.4 | 2 | 0 |
| civil-construction-1-guide-consultant | career-path | ○ | 5 | 0 | 15.8 | 2 | 1 |
| civil-construction-1-guide-public-servant | career-path | ○ | 5 | 0 | 13.2 | 4 | 1 |
| civil-construction-2-guide-young-career | career-path | ○ | 5 | 0 | 24.3 | 2 | 1 |
| civil-construction-1-guide-allowance | market-value | ○ | 4 | 0 | 44 | 0 | 1 |
| civil-construction-1-guide-career-agents | service-choice | ○ | 4 | 0 | 44 | 2 | 0 |
| civil-construction-2-guide-career-change | career-path | ○ | 3 | 0 | 59.5 | 2 | 1 |
| pe-construction-fukugyou-dokuritsu | career-path | ○ | 3 | 0 | 29.3 | 0 | 0 |
| civil-construction-1-guide-career-salary | market-value | ○ | 2 | 0 | 76.5 | 3 | 0 |
| civil-construction-1-guide-quit-honne | quit | ○ | 2 | 0 | 63.5 | 0 | 1 |
| civil-construction-1-guide-career-agent-comparison | service-choice | ○ | 1 | 0 | 68 | 4 | 1 |
| civil-construction-1-guide-career-path | career-path | ○ | 1 | 0 | 9 | 11 | 1 |
| civil-construction-1-guide-public-engineer-exam-study | career-path | ○ | 1 | 0 | 1 | 3 | 1 |
| rccm-guide-career-value | career-path | ○ | 1 | 1 | 2 | 2 | 1 |
| civil-construction-1-guide-age-career | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-buildjob-review | service-choice | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-career | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-career-cases | market-value | ○ | 0 | 0 | — | 1 | 2 |
| civil-construction-1-guide-career-consultation-before-quit | quit | ○ | 0 | 0 | — | 2 | 1 |
| civil-construction-1-guide-dx-jobs | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-interview | application | ○ | 0 | 0 | — | 3 | 1 |
| civil-construction-1-guide-market-value | market-value | ○ | 0 | 0 | — | 14 | 1 |
| civil-construction-1-guide-public-engineer-salary-table | market-value | ○ | 0 | 0 | — | 3 | 1 |
| civil-construction-1-guide-public-servant-or-private | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-quit-or-stay | quit | ○ | 0 | 0 | — | 7 | 1 |
| civil-construction-1-guide-quit-public-engineer | quit | ○ | 0 | 0 | — | 3 | 1 |
| civil-construction-1-guide-resume | application | ○ | 0 | 0 | — | 6 | 1 |
| civil-construction-1-guide-salary-by-role | market-value | ○ | 0 | 0 | — | 2 | 1 |
| civil-construction-1-guide-salary-up | market-value | ○ | 0 | 0 | — | 11 | 1 |
| civil-construction-1-guide-timing | application | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-white-company | application | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-women | career-path | ○ | 0 | 0 | — | 3 | 1 |
| civil-construction-1-public-servant-merit | career-path | ○ | 0 | 0 | — | 7 | 0 |
| civil-construction-2-guide-buildjob-review | service-choice | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-career | career-path | ○ | 0 | 0 | — | 10 | 1 |
| civil-construction-2-guide-haken-seishain | career-path | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-job-reality | career-path | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-quit-or-stay | quit | ○ | 0 | 0 | — | 2 | 1 |
| civil-construction-2-guide-resume | application | ○ | 0 | 0 | — | 2 | 1 |
| pe-construction-guide-career | career-path | ○ | 0 | 0 | — | 2 | 1 |

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

