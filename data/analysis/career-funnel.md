# キャリアファネル基線レポート

生成: 2026-10-31T02:45:27.727Z

> [!warning]
> GA4 と GSC は取得遅延が違うため**窓が一致しない**。出所を跨いで CTR や EPC を割らないこと。
> GA4 2026-10-03〜2026-10-30 ／ GSC 2026-09-30〜2026-10-27

## 実検査の内訳

_「異常 0 件」と「1 件も検査していない」を区別するための欄（CLAUDE.md §9）。_

| 対象 | 件数 |
|---|---|
| docMetaIndexTotal | 1461 |
| careerArticles | 45 |
| siteMdxScanned | 1501 |
| extraLinkSourcesScanned | 1 |
| gscRowsTotal | 3521 |
| gscRowsMatchedCareer | 75 |
| ga4LabelRowsMatched | 13 |
| ga4PlacementRowsMatched | 17 |
| careerArticlesInGa4Top | 26 |
| noteCareerArticles | 24 |

## WARN

- 入力欠落 1 件: afb（CI の fetch-metrics 供給を確認する）
- 窓が不一致（GA4 2026-10-03〜2026-10-30 / GSC 2026-09-30〜2026-10-27）。取得元の遅延差なので異常ではないが、出所を跨いで CTR/EPC を割らないこと
- ページ別のクリック 2 件がどの配置ルールにも当たらない（撤去前の面・ラベル未登録・ページ不明。unattributed.top を見る）

## 漏斗

### 1. 高意図 query（GSC 窓）

表示 324 ／ クリック 4

語彙: 転職・辞めたい・やめたい・年収・市場価値・評判・口コミ・エージェント・求人・ホワイト・公務員・発注者支援

| query | 表示 | クリック | 順位 |
|---|---|---|---|
| 土木公務員 資格 | 32 | 2 | 7.8 |
| 公務員 土木 資格 おすすめ | 17 | 0 | 7.9 |
| 公務員 土木職 資格 | 14 | 0 | 7.6 |
| 転職エージェント 施工管理 | 13 | 0 | 70.8 |
| rccm 受験資格 公務員 | 13 | 0 | 6.8 |
| 施工管理 転職エージェント おすすめ | 11 | 0 | 70.7 |
| rccm 公務員 | 11 | 0 | 9.5 |
| 土木 公務員 資格 | 11 | 0 | 11.5 |
| 建設 転職エージェント 比較（サブkw：おすすめ） | 10 | 0 | 24.0 |
| 公務員 土木 資格 | 10 | 0 | 8.2 |
| 施工管理 転職エージェント | 9 | 0 | 53.1 |
| ビルドジョブ 評判 | 8 | 0 | 24.1 |
| 土木施工管理技士 年収 | 7 | 0 | 5.7 |
| 技術士 実務経験 公務員 | 5 | 1 | 8.6 |
| 施工管理 転職エージェント おすすめ | 5 | 0 | 71.6 |

### 2. キャリアページの流入（GA4 窓）

GA4 上位ページに入った career 記事: 26 / 45 本

### 3. 柱ごとの検索と内部リンク

_被リンクは literal リンクの本数であり、実際の遷移ではない。回遊の実測ではなく構造の proxy。_

| 柱 | 記事 | GSC 表示 | GSC クリック | 被リンク |
|---|---|---|---|---|
| career-path | 21 | 135 | 0 | 62 |
| market-value | 9 | 23 | 0 | 40 |
| service-choice | 5 | 95 | 0 | 9 |
| quit | 5 | 4 | 0 | 14 |
| application | 5 | 0 | 0 | 13 |

### 4. affiliate CTA（GA4 窓）

表示 24808 ／ クリック 24 ／ CTR 0.10%

| placement | 表示 | クリック | CTR |
|---|---|---|---|
| article-inline | 12544 | 10 | 0.08% |
| article-mid | 6555 | 8 | 0.12% |
| article-end | 3253 | 0 | 0.00% |
| category-sidebar | 1130 | 1 | 0.09% |
| standards-list-end | 518 | 0 | 0.00% |
| category-mobile | 264 | 0 | 0.00% |
| tool-end | 247 | 2 | 0.81% |
| tool-inline | 119 | 0 | 0.00% |
| standards-end | 112 | 0 | 0.00% |
| home-section | 52 | 3 | 5.77% |
| topic-end | 11 | 0 | 0.00% |
| sidebar | 3 | 0 | 0.00% |

| label | 表示 | クリック |
|---|---|---|
| 建設JOBs | 11268 | 10 |
| ビルドジョブ | 7897 | 11 |
| KensetsuJobs-endbanner | 1691 | 0 |
| BuildJob-endbanner | 1450 | 0 |
| ハイクラス DX・コンサル転職 | 993 | 2 |
| BuildJob-sidebar | 972 | 1 |
| KensetsuJobs-sidebar | 253 | 0 |
| DXConsulting-sidebar | 172 | 0 |
| DXConsulting-endbanner | 112 | 0 |

配置ルール別（2026-10-03〜2026-10-30・ページ別からルールを一意に決めた数字）

| ルール | 案件 | 面 | 表示 | クリック | 分けられない表示/クリック |
|---|---|---|---|---|---|
| PL-0001 | buildjob | article-mid | 208 | 0 | 1812/0 |
| PL-0002 | dx-consulting | article-mid | 874 | 2 | 0/0 |
| PL-0003 | buildjob | article-inline | 623 | 0 | 1271/0 |
| PL-0004 | buildjob | article-end | 364 | 0 | 477/0 |
| PL-0005 | dx-consulting | article-end | 94 | 0 | 0/0 |
| PL-0006 | buildjob | category-sidebar | 2 | 0 | 324/0 |
| PL-0007 | buildjob | category-mobile | 0 | 0 | 105/0 |
| PL-0008 | dx-consulting | category-sidebar | 81 | 0 | 0/0 |
| PL-0009 | dx-consulting | category-mobile | 7 | 0 | 0/0 |
| PL-0010 | buildjob | career-tool | 0 | 0 | 0/0 |
| PL-0013 | buildjob | article-mid | 0 | 4 | 1812/0 |
| PL-0014 | buildjob | article-inline | 0 | 0 | 1257/0 |
| PL-0015 | buildjob | article-end | 0 | 0 | 477/0 |
| PL-0016 | buildjob | category-sidebar | 0 | 0 | 324/0 |
| PL-0017 | buildjob | category-mobile | 0 | 0 | 105/0 |
| PL-0018 | buildjob | article-mid | 0 | 0 | 0/0 |
| PL-0019 | buildjob | article-inline | 0 | 0 | 14/0 |
| PL-0020 | kensetsu-jobs | article-mid | 652 | 0 | 0/0 |
| PL-0021 | kensetsu-jobs | article-inline | 10443 | 10 | 0/0 |
| PL-0022 | kensetsu-jobs | article-end | 1667 | 0 | 0/0 |
| PL-0023 | kensetsu-jobs | category-sidebar | 41 | 0 | 0/0 |
| PL-0024 | kensetsu-jobs | category-mobile | 21 | 0 | 0/0 |
| PL-0025 | buildjob | article-mid | 1642 | 2 | 0/0 |
| PL-0026 | buildjob | article-end | 475 | 0 | 0/0 |
| PL-0027 | buildjob | category-sidebar | 4 | 0 | 0/0 |
| PL-0028 | buildjob | category-mobile | 0 | 0 | 0/0 |
| PL-0029 | buildjob | article-mid | 396 | 0 | 164/0 |
| PL-0030 | buildjob | category-sidebar | 1 | 0 | 0/0 |
| PL-0031 | buildjob | category-mobile | 0 | 0 | 0/0 |
| PL-0032 | buildjob | standards-end | 95 | 0 | 0/0 |
| PL-0033 | buildjob | home-section | 27 | 2 | 0/0 |
| PL-0034 | buildjob | tool-inline | 119 | 0 | 0/0 |
| PL-0035 | buildjob | standards-list-end | 496 | 0 | 0/0 |
| PL-0036 | buildjob | topic-end | 2 | 0 | 0/0 |
| PL-0037 | buildjob | tool-end | 173 | 2 | 0/0 |
| PL-0038 | buildjob | article-mid | 132 | 0 | 175/0 |
| PL-0039 | buildjob | article-end | 102 | 0 | 0/0 |
| PL-0040 | buildjob | category-sidebar | 0 | 0 | 3/0 |
| PL-0041 | buildjob | category-mobile | 0 | 0 | 1/0 |
| PL-0042 | buildjob | article-mid | 10 | 0 | 0/0 |
| PL-0043 | buildjob | laws-list-end | 0 | 0 | 0/0 |
| PL-0044 | buildjob | article-inline | 0 | 0 | 1256/0 |
| PL-0045 | buildjob | article-mid | 0 | 0 | 164/0 |
| PL-0046 | dx-consulting | article-inline | 0 | 0 | 0/0 |
| PL-0047 | dx-consulting | article-mid | 2 | 0 | 0/0 |
| PL-0048 | dx-consulting | category-sidebar | 0 | 0 | 0/0 |
| PL-0049 | dx-consulting | category-mobile | 0 | 0 | 0/0 |
| PL-0050 | buildjob | article-mid | 0 | 0 | 175/0 |
| PL-0051 | kenchiku-tenshoku | article-mid | 0 | 0 | 0/0 |
| PL-0052 | buildjob | category-sidebar | 0 | 0 | 3/0 |
| PL-0053 | kenchiku-tenshoku | category-sidebar | 0 | 0 | 0/0 |
| PL-0054 | buildjob | category-mobile | 0 | 0 | 1/0 |
| PL-0055 | kenchiku-tenshoku | category-mobile | 0 | 0 | 0/0 |

クリックの出どころ（A8 の発生日と突き合わせる）

| 日付 | ページ | 案件 | 面 | ルール | クリック |
|---|---|---|---|---|---|
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
| 2026-10-17 | /exam/civil-construction-2/secondary/r05 | kensetsu-jobs | article-inline | PL-0021 | 1 |
| 2026-10-16 | /practice/road-work-approval-vs-road-use-permit | buildjob | article-mid | PL-0025 | 1 |
| 2026-10-16 | /practice/subbase-subgrade-control | buildjob | article-mid | PL-0025 | 1 |
| 2026-10-14 | / | buildjob | home-section | PL-0033 | 1 |
| 2026-10-14 | /exam/civil-construction-2/guide/secondary-grading-and-partial-credit | kensetsu-jobs | article-inline | PL-0021 | 1 |
| 2026-10-14 | /exam/pe-first-stage/guide/overview | buildjob | article-mid | PL-0013 | 1 |
| 2026-10-14 | /tools/kakomon-quiz/pe-first-stage | buildjob | tool-end | PL-0037 | 2 |
| 2026-10-13 | / | buildjob | home-section | PL-0033 | 1 |
| 2026-10-13 | /exam/concrete-diagnostician/textbook/deterioration | buildjob | article-mid | PL-0013 | 1 |
| 2026-10-03 | /exam/pe-comprehensive-management/past-exams/r08-primary | dx-consulting | article-mid | PL-0002 | 1 |

### 5. A8 成果

成果の出どころ（A8 の成果別・1 成果 1 行。ページはクリックしたページ）

| クリック | 案件 | 状態 | 発生額 | ページ | 候補ルール |
|---|---|---|---|---|---|
| 2026-10-05 10:37 | buildjob | キャンセル | ¥13534 | （不明・ページの URL を渡す前） | — |

窓内（2026-10）: 発生 1 ／ 確定 0 ／ 確定報酬 ¥0
累計: 発生 2 ／ 確定 0 ／ 確定報酬 ¥0

_A8 管理画面のクリックは口座共用（stats47 と同居）のため分母に使わない。分母は GA4。_

### 6. afb 成果（公式 API）

afb: 未取得（fetch-afb-outcomes.mjs --commit が未実行、または fetch-metrics.yml が止まっている）

## 起票時基線からのずれ（±30% 超）

- affiliate 表示: 起票時 7370 → 今回 24808（337%）
- 高意図 query 表示: 起票時 7 → 今回 324（4629%）

## 記事台帳

| slug | 柱 | 公開 | GSC 表示 | クリック | 順位 | 被リンク | CTA |
|---|---|---|---|---|---|---|---|
| civil-construction-2-guide-career-agent-comparison | service-choice | ○ | 57 | 0 | 58 | 1 | 1 |
| civil-construction-1-guide-company-types | career-path | ○ | 51 | 0 | 32.6 | 1 | 1 |
| civil-construction-1-guide-future | career-path | ○ | 28 | 0 | 10.7 | 1 | 1 |
| civil-construction-1-guide-consultant | career-path | ○ | 21 | 0 | 30.3 | 2 | 1 |
| civil-construction-1-guide-career-agent-comparison | service-choice | ○ | 16 | 0 | 68.5 | 4 | 1 |
| civil-construction-1-guide-buildjob-review | service-choice | ○ | 12 | 0 | 21.2 | 1 | 1 |
| civil-construction-2-guide-salary | market-value | ○ | 12 | 0 | 7 | 4 | 1 |
| civil-construction-1-guide-career-agents | service-choice | ○ | 10 | 0 | 74.3 | 2 | 0 |
| civil-construction-1-guide-hatchu-shien | career-path | ○ | 9 | 0 | 19 | 9 | 1 |
| civil-construction-1-guide-grade-comparison | market-value | ○ | 8 | 0 | 40.2 | 2 | 0 |
| civil-construction-1-guide-public-servant | career-path | ○ | 7 | 0 | 21.8 | 4 | 1 |
| civil-construction-1-guide-women | career-path | ○ | 5 | 0 | 86.3 | 3 | 1 |
| civil-construction-1-guide-age-career | career-path | ○ | 3 | 0 | 36 | 0 | 1 |
| pe-construction-fukugyou-dokuritsu | career-path | ○ | 3 | 0 | 29.3 | 0 | 0 |
| civil-construction-1-guide-public-servant-or-private | career-path | ○ | 2 | 0 | 15 | 0 | 1 |
| civil-construction-1-guide-quit-public-engineer | quit | ○ | 2 | 0 | 9.5 | 3 | 1 |
| civil-construction-1-guide-salary-by-role | market-value | ○ | 2 | 0 | 49.5 | 2 | 1 |
| civil-construction-2-guide-haken-seishain | career-path | ○ | 2 | 0 | 10 | 1 | 1 |
| civil-construction-2-guide-quit-or-stay | quit | ○ | 2 | 0 | 36.5 | 2 | 1 |
| civil-construction-1-guide-allowance | market-value | ○ | 1 | 0 | 31 | 0 | 1 |
| civil-construction-1-guide-career-path | career-path | ○ | 1 | 0 | 29 | 11 | 1 |
| civil-construction-1-guide-public-engineer-exam-study | career-path | ○ | 1 | 0 | 1 | 3 | 1 |
| civil-construction-2-guide-career-change | career-path | ○ | 1 | 0 | 73 | 2 | 1 |
| civil-construction-2-guide-job-reality | career-path | ○ | 1 | 0 | 54 | 1 | 1 |
| civil-construction-1-guide-career | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-career-cases | market-value | ○ | 0 | 0 | — | 1 | 2 |
| civil-construction-1-guide-career-consultation-before-quit | quit | ○ | 0 | 0 | — | 2 | 1 |
| civil-construction-1-guide-career-salary | market-value | ○ | 0 | 0 | — | 3 | 0 |
| civil-construction-1-guide-dx-jobs | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-interview | application | ○ | 0 | 0 | — | 3 | 1 |
| civil-construction-1-guide-market-value | market-value | ○ | 0 | 0 | — | 14 | 1 |
| civil-construction-1-guide-public-engineer-salary-table | market-value | ○ | 0 | 0 | — | 3 | 1 |
| civil-construction-1-guide-quit-honne | quit | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-quit-or-stay | quit | ○ | 0 | 0 | — | 7 | 1 |
| civil-construction-1-guide-resume | application | ○ | 0 | 0 | — | 6 | 1 |
| civil-construction-1-guide-salary-up | market-value | ○ | 0 | 0 | — | 11 | 1 |
| civil-construction-1-guide-timing | application | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-white-company | application | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-public-servant-merit | career-path | ○ | 0 | 0 | — | 7 | 0 |
| civil-construction-2-guide-buildjob-review | service-choice | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-career | career-path | ○ | 0 | 0 | — | 10 | 1 |
| civil-construction-2-guide-resume | application | ○ | 0 | 0 | — | 2 | 1 |
| civil-construction-2-guide-young-career | career-path | ○ | 0 | 0 | — | 2 | 1 |
| pe-construction-guide-career | career-path | ○ | 0 | 0 | — | 3 | 1 |
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

