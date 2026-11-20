# キャリアファネル基線レポート

生成: 2026-11-20T01:58:53.250Z

> [!warning]
> GA4 と GSC は取得遅延が違うため**窓が一致しない**。出所を跨いで CTR や EPC を割らないこと。
> GA4 2026-10-23〜2026-11-19 ／ GSC 2026-10-20〜2026-11-16

## 実検査の内訳

_「異常 0 件」と「1 件も検査していない」を区別するための欄（CLAUDE.md §9）。_

| 対象 | 件数 |
|---|---|
| docMetaIndexTotal | 1596 |
| careerArticles | 46 |
| siteMdxScanned | 1636 |
| extraLinkSourcesScanned | 1 |
| gscRowsTotal | 5253 |
| gscRowsMatchedCareer | 170 |
| ga4LabelRowsMatched | 22 |
| ga4PlacementRowsMatched | 44 |
| careerArticlesInGa4Top | 27 |
| noteCareerArticles | 24 |

## WARN

- 入力欠落 1 件: afb（CI の fetch-metrics 供給を確認する）
- 窓が不一致（GA4 2026-10-23〜2026-11-19 / GSC 2026-10-20〜2026-11-16）。取得元の遅延差なので異常ではないが、出所を跨いで CTR/EPC を割らないこと
- ページ別のクリック 8 件がどの配置ルールにも当たらない（撤去前の面・ラベル未登録・ページ不明。unattributed.top を見る）

## 漏斗

### 1. 高意図 query（GSC 窓）

表示 591 ／ クリック 13

語彙: 転職・辞めたい・やめたい・年収・市場価値・評判・口コミ・エージェント・求人・ホワイト・公務員・発注者支援

| query | 表示 | クリック | 順位 |
|---|---|---|---|
| 公務員 土木 年収 | 35 | 0 | 13.9 |
| 公務員 土木職 資格 | 30 | 0 | 7.7 |
| 土木 公務員 年収 | 28 | 1 | 4.5 |
| rccm 受験資格 公務員 | 23 | 1 | 6.8 |
| 公務員 土木 転職 後悔 | 21 | 0 | 6.7 |
| 技術士 実務経験 公務員 | 20 | 2 | 10.4 |
| 土木公務員 年収 | 19 | 0 | 2.5 |
| 土木公務員 資格 | 19 | 0 | 6.5 |
| 公務員 土木 資格 おすすめ | 18 | 2 | 6.4 |
| ビルドジョブ 評判 | 17 | 0 | 25.5 |
| 土木 公務員 資格 | 15 | 1 | 6.6 |
| 転職エージェント 施工管理 | 11 | 0 | 73.5 |
| 施工管理 転職エージェント おすすめ | 10 | 0 | 75.8 |
| 公務員 土木 資格 | 10 | 0 | 7.9 |
| 建設 転職エージェント 比較（サブkw：おすすめ） | 9 | 0 | 24.3 |

### 2. キャリアページの流入（GA4 窓）

GA4 上位ページに入った career 記事: 27 / 46 本

### 3. 柱ごとの検索と内部リンク

_被リンクは literal リンクの本数であり、実際の遷移ではない。回遊の実測ではなく構造の proxy。_

| 柱 | 記事 | GSC 表示 | GSC クリック | 被リンク |
|---|---|---|---|---|
| career-path | 21 | 202 | 1 | 65 |
| market-value | 10 | 188 | 4 | 44 |
| service-choice | 5 | 99 | 0 | 10 |
| quit | 5 | 40 | 0 | 14 |
| application | 5 | 10 | 0 | 13 |

### 4. affiliate CTA（GA4 窓）

表示 49430 ／ クリック 33 ／ CTR 0.07%

| placement | 表示 | クリック | CTR |
|---|---|---|---|
| article-mid | 9788 | 9 | 0.09% |
| article-inline | 7839 | 8 | 0.10% |
| article-banner | 4849 | 3 | 0.06% |
| article-rail | 4184 | 1 | 0.02% |
| article-rail-2 | 3750 | 2 | 0.05% |
| article-banner-2 | 3748 | 1 | 0.03% |
| article-rail-3 | 3021 | 0 | 0.00% |
| article-banner-3 | 2833 | 3 | 0.11% |
| article-rail-4 | 1759 | 0 | 0.00% |
| category-sidebar | 1694 | 1 | 0.06% |
| article-banner-end | 1086 | 0 | 0.00% |
| category-mobile | 725 | 1 | 0.14% |
| standards-rail-fill | 639 | 0 | 0.00% |
| tool-end | 638 | 2 | 0.31% |
| standards-list-end | 573 | 0 | 0.00% |
| standards-rail | 295 | 0 | 0.00% |
| standards-end | 256 | 0 | 0.00% |
| article-rail-fill | 253 | 0 | 0.00% |
| category-rail-fill | 237 | 0 | 0.00% |
| standards-inline | 219 | 0 | 0.00% |
| standards-rail-2 | 219 | 0 | 0.00% |
| standards-list-rail | 211 | 0 | 0.00% |
| standards-rail-3 | 200 | 0 | 0.00% |
| standards-inline-2 | 126 | 0 | 0.00% |
| standards-inline-3 | 86 | 0 | 0.00% |
| home-section | 80 | 2 | 2.50% |
| standards-list-rail-2 | 53 | 0 | 0.00% |
| tool-inline | 48 | 0 | 0.00% |
| topic-end | 16 | 0 | 0.00% |
| standards-list-sidebar | 2 | 0 | 0.00% |
| article-end | 1 | 0 | 0.00% |
| standards-list-sidebar-2 | 1 | 0 | 0.00% |
| standards-list-sidebar-3 | 1 | 0 | 0.00% |

| label | 表示 | クリック |
|---|---|---|
| BuildJob-sidebar | 12251 | 6 |
| ビルドジョブ | 8430 | 12 |
| 建設JOBs | 7290 | 7 |
| RsgKensetsu-sidebar | 6422 | 5 |
| DainishinsotsuNeo-sidebar | 5953 | 1 |
| KensetsuJobs-sidebar | 2104 | 0 |
| Constwork-sidebar | 1936 | 0 |
| コンストワーク | 1754 | 0 |
| ハイクラス DX・コンサル転職 | 1208 | 2 |
| DXConsulting-sidebar | 865 | 0 |
| MyVisionAgent-sidebar | 444 | 0 |
| NewMA-sidebar | 381 | 0 |

配置ルール別（2026-10-23〜2026-11-19・ページ別からルールを一意に決めた数字）

| ルール | 案件 | 面 | 表示 | クリック | 分けられない表示/クリック |
|---|---|---|---|---|---|
| PL-0002 | dx-consulting | article-mid | 1017 | 1 | 0/0 |
| PL-0008 | dx-consulting | category-sidebar | 50 | 0 | 0/0 |
| PL-0009 | dx-consulting | category-mobile | 15 | 0 | 0/0 |
| PL-0010 | buildjob | career-tool | 0 | 0 | 0/0 |
| PL-0013 | buildjob | article-mid | 3215 | 6 | 0/0 |
| PL-0014 | buildjob | article-inline | 0 | 0 | 483/0 |
| PL-0016 | buildjob | category-sidebar | 701 | 0 | 0/0 |
| PL-0017 | buildjob | category-mobile | 372 | 0 | 0/0 |
| PL-0018 | buildjob | article-mid | 0 | 0 | 0/0 |
| PL-0019 | buildjob | article-inline | 9 | 0 | 0/0 |
| PL-0020 | kensetsu-jobs | article-mid | 296 | 0 | 0/0 |
| PL-0021 | kensetsu-jobs | article-inline | 6936 | 7 | 0/0 |
| PL-0023 | kensetsu-jobs | category-sidebar | 12 | 0 | 0/0 |
| PL-0024 | kensetsu-jobs | category-mobile | 13 | 0 | 0/0 |
| PL-0025 | buildjob | article-mid | 1659 | 1 | 0/0 |
| PL-0027 | buildjob | category-sidebar | 4 | 0 | 0/0 |
| PL-0028 | buildjob | category-mobile | 1 | 0 | 0/0 |
| PL-0029 | buildjob | article-mid | 168 | 0 | 179/0 |
| PL-0030 | buildjob | category-sidebar | 1 | 0 | 0/0 |
| PL-0031 | buildjob | category-mobile | 0 | 0 | 0/0 |
| PL-0033 | buildjob | home-section | 40 | 1 | 0/0 |
| PL-0034 | buildjob | tool-inline | 46 | 0 | 0/0 |
| PL-0036 | buildjob | topic-end | 1 | 0 | 0/0 |
| PL-0037 | buildjob | tool-end | 427 | 1 | 0/0 |
| PL-0038 | buildjob | article-mid | 91 | 0 | 246/0 |
| PL-0040 | buildjob | category-sidebar | 0 | 0 | 7/0 |
| PL-0041 | buildjob | category-mobile | 0 | 0 | 0/0 |
| PL-0042 | buildjob | article-mid | 33 | 0 | 0/0 |
| PL-0043 | buildjob | laws-list-end | 0 | 0 | 0/0 |
| PL-0044 | buildjob | article-inline | 0 | 0 | 483/0 |
| PL-0045 | buildjob | article-mid | 0 | 0 | 179/0 |
| PL-0046 | dx-consulting | article-inline | 1 | 0 | 0/0 |
| PL-0047 | dx-consulting | article-mid | 70 | 0 | 0/0 |
| PL-0048 | dx-consulting | category-sidebar | 0 | 0 | 0/0 |
| PL-0049 | dx-consulting | category-mobile | 0 | 0 | 0/0 |
| PL-0050 | buildjob | article-mid | 0 | 0 | 246/0 |
| PL-0051 | kenchiku-tenshoku | article-mid | 125 | 0 | 0/0 |
| PL-0052 | buildjob | category-sidebar | 0 | 0 | 7/0 |
| PL-0053 | kenchiku-tenshoku | category-sidebar | 0 | 0 | 0/0 |
| PL-0054 | buildjob | category-mobile | 0 | 0 | 0/0 |
| PL-0055 | kenchiku-tenshoku | category-mobile | 0 | 0 | 0/0 |
| PL-0056 | buildjob | standards-sidebar | 0 | 0 | 0/0 |
| PL-0057 | rsg-kensetsu | standards-sidebar-2 | 0 | 0 | 0/0 |
| PL-0058 | kensetsu-jobs | standards-sidebar-3 | 0 | 0 | 0/0 |
| PL-0059 | buildjob | standards-end | 186 | 0 | 0/0 |
| PL-0060 | buildjob | standards-list-sidebar | 0 | 0 | 0/0 |
| PL-0061 | dainishinsotsu-agent-neo | standards-list-sidebar-2 | 0 | 0 | 0/0 |
| PL-0062 | rsg-kensetsu | standards-list-sidebar-3 | 0 | 0 | 0/0 |
| PL-0063 | dainishinsotsu-agent-neo | standards-list-end | 131 | 0 | 0/0 |
| PL-0064 | rsg-kensetsu | standards-inline | 3 | 0 | 0/0 |
| PL-0065 | buildjob | standards-inline | 183 | 0 | 0/0 |
| PL-0066 | constwork | standards-inline-2 | 107 | 0 | 0/0 |
| PL-0067 | rsg-kensetsu | standards-inline-3 | 72 | 0 | 0/0 |
| PL-0068 | buildjob | standards-rail | 252 | 0 | 0/0 |
| PL-0069 | kensetsu-jobs | standards-end | 45 | 0 | 0/0 |
| PL-0070 | buildjob | standards-list-rail | 201 | 0 | 0/0 |
| PL-0071 | kensetsu-jobs | standards-rail-2 | 182 | 0 | 0/0 |
| PL-0072 | dainishinsotsu-agent-neo | standards-rail-3 | 172 | 0 | 0/0 |
| PL-0073 | dainishinsotsu-agent-neo | standards-list-rail-2 | 50 | 0 | 0/0 |
| PL-0074 | buildjob | article-banner | 383 | 0 | 0/0 |
| PL-0075 | constwork | article-banner-2 | 290 | 0 | 0/0 |
| PL-0076 | rsg-kensetsu | article-banner-3 | 164 | 0 | 0/0 |
| PL-0077 | buildjob | article-rail | 356 | 0 | 0/0 |
| PL-0078 | rsg-kensetsu | article-rail-2 | 329 | 0 | 0/0 |
| PL-0079 | dainishinsotsu-agent-neo | article-rail-3 | 271 | 0 | 0/0 |
| PL-0080 | kensetsu-jobs | article-rail-4 | 233 | 0 | 0/0 |
| PL-0083 | dainishinsotsu-agent-neo | article-banner-end | 98 | 0 | 0/0 |
| PL-0084 | buildjob | article-banner | 729 | 0 | 0/0 |
| PL-0085 | constwork | article-banner-2 | 581 | 0 | 0/0 |
| PL-0086 | rsg-kensetsu | article-banner-3 | 397 | 0 | 0/0 |
| PL-0087 | buildjob | article-rail | 767 | 0 | 0/0 |
| PL-0088 | rsg-kensetsu | article-rail-2 | 695 | 0 | 0/0 |
| PL-0089 | dainishinsotsu-agent-neo | article-rail-3 | 662 | 0 | 0/0 |
| PL-0090 | kensetsu-jobs | article-rail-4 | 127 | 0 | 0/0 |
| PL-0093 | dainishinsotsu-agent-neo | article-banner-end | 185 | 0 | 0/0 |
| PL-0094 | buildjob | article-banner | 204 | 0 | 0/0 |
| PL-0095 | dainishinsotsu-agent-neo | article-banner-2 | 164 | 0 | 0/0 |
| PL-0096 | constwork | article-banner-3 | 104 | 0 | 0/0 |
| PL-0097 | kensetsu-jobs | article-rail | 181 | 0 | 0/0 |
| PL-0098 | buildjob | article-rail-2 | 172 | 0 | 0/0 |
| PL-0099 | dainishinsotsu-agent-neo | article-rail-3 | 168 | 0 | 0/0 |
| PL-0100 | rsg-kensetsu | article-rail-4 | 143 | 0 | 0/0 |
| PL-0103 | rsg-kensetsu | article-banner-end | 58 | 0 | 0/0 |
| PL-0104 | buildjob | article-banner | 1 | 0 | 0/0 |
| PL-0105 | dainishinsotsu-agent-neo | article-banner-2 | 0 | 0 | 0/0 |
| PL-0106 | constwork | article-banner-3 | 0 | 0 | 0/0 |
| PL-0107 | buildjob | article-rail | 0 | 0 | 0/0 |
| PL-0108 | rsg-kensetsu | article-rail-2 | 0 | 0 | 0/0 |
| PL-0109 | dainishinsotsu-agent-neo | article-rail-3 | 0 | 0 | 0/0 |
| PL-0110 | kensetsu-jobs | article-rail-4 | 0 | 0 | 0/0 |
| PL-0113 | rsg-kensetsu | article-banner-end | 1 | 0 | 0/0 |
| PL-0114 | kenchiku-tenshoku | article-banner | 3 | 0 | 0/0 |
| PL-0115 | buildjob | article-banner-2 | 2 | 0 | 0/0 |
| PL-0116 | kenchiku-tenshoku | article-banner-3 | 1 | 0 | 0/0 |
| PL-0117 | kenchiku-tenshoku | article-rail | 4 | 0 | 0/0 |
| PL-0118 | buildjob | article-rail-2 | 3 | 0 | 0/0 |
| PL-0119 | rsg-kensetsu | article-rail-3 | 0 | 0 | 0/0 |
| PL-0123 | rsg-kensetsu | article-banner-end | 2 | 0 | 0/0 |
| PL-0124 | buildjob | article-banner | 150 | 0 | 0/0 |
| PL-0125 | constwork | article-banner-2 | 112 | 0 | 0/0 |
| PL-0126 | rsg-kensetsu | article-banner-3 | 91 | 2 | 0/0 |
| PL-0127 | buildjob | article-rail | 118 | 0 | 0/0 |
| PL-0128 | rsg-kensetsu | article-rail-2 | 115 | 0 | 0/0 |
| PL-0133 | buildjob | article-banner-end | 34 | 0 | 0/0 |
| PL-0134 | buildjob | article-banner | 69 | 0 | 0/0 |
| PL-0135 | rsg-kensetsu | article-banner-2 | 55 | 0 | 0/0 |
| PL-0136 | buildjob | article-banner-3 | 19 | 0 | 0/0 |
| PL-0137 | buildjob | article-rail | 61 | 0 | 0/0 |
| PL-0138 | rsg-kensetsu | article-rail-2 | 59 | 0 | 0/0 |
| PL-0139 | dainishinsotsu-agent-neo | article-rail-3 | 19 | 0 | 0/0 |
| PL-0140 | kensetsu-jobs | article-rail-4 | 8 | 0 | 0/0 |
| PL-0143 | constwork | article-banner-end | 25 | 0 | 0/0 |
| PL-0144 | buildjob | article-banner | 275 | 0 | 0/0 |
| PL-0145 | rsg-kensetsu | article-banner-2 | 126 | 0 | 0/0 |
| PL-0146 | buildjob | article-banner-3 | 33 | 0 | 0/0 |
| PL-0147 | buildjob | article-rail | 280 | 0 | 0/0 |
| PL-0148 | rsg-kensetsu | article-rail-2 | 236 | 1 | 0/0 |
| PL-0153 | constwork | article-banner-end | 86 | 0 | 0/0 |
| PL-0154 | buildjob | article-banner | 2138 | 2 | 0/0 |
| PL-0155 | dainishinsotsu-agent-neo | article-banner-2 | 1714 | 1 | 0/0 |
| PL-0156 | rsg-kensetsu | article-banner-3 | 1466 | 1 | 0/0 |
| PL-0157 | buildjob | article-rail | 1585 | 1 | 0/0 |
| PL-0158 | rsg-kensetsu | article-rail-2 | 1438 | 0 | 0/0 |
| PL-0159 | dainishinsotsu-agent-neo | article-rail-3 | 1311 | 0 | 0/0 |
| PL-0160 | kensetsu-jobs | article-rail-4 | 799 | 0 | 0/0 |
| PL-0163 | constwork | article-banner-end | 432 | 0 | 0/0 |
| PL-0164 | dx-consulting | article-rail | 330 | 0 | 0/0 |
| PL-0165 | myvision-agent | article-rail-2 | 278 | 0 | 0/0 |
| PL-0166 | newma | article-rail-3 | 261 | 0 | 0/0 |
| PL-0167 | samurai-job | article-rail-4 | 202 | 0 | 0/0 |
| PL-0170 | samurai-job | article-banner-end | 26 | 0 | 0/0 |
| PL-0171 | dx-consulting | article-banner | 202 | 0 | 0/0 |
| PL-0172 | myvision-agent | article-banner-2 | 101 | 0 | 0/0 |
| PL-0173 | newma | article-banner-3 | 66 | 0 | 0/0 |

クリックの出どころ（A8 の発生日と突き合わせる）

| 日付 | ページ | 案件 | 面 | ルール | クリック |
|---|---|---|---|---|---|
| 2026-11-19 | /exam/pe-construction/guide/koutou-shiken | rsg-kensetsu | article-rail-2 | PL-0148 | 1 |
| 2026-11-19 | /exam/pe-first-stage/primary/r07-basic | buildjob | article-rail | PL-0157 | 1 |
| 2026-11-18 | /exam/concrete-chief-engineer | buildjob | article-banner | — | 1 |
| 2026-11-18 | /exam/concrete-chief-engineer | rsg-kensetsu | article-rail-2 | — | 1 |
| 2026-11-17 | /exam/pe-first-stage/primary/r03-water-supply | dainishinsotsu-agent-neo | article-banner-2 | PL-0155 | 1 |
| 2026-11-17 | /exam/pe-first-stage/primary/r05-basic | buildjob | article-banner | PL-0154 | 1 |
| 2026-11-17 | /exam/pe-first-stage/primary/r05-construction | buildjob | article-banner | PL-0154 | 1 |
| 2026-11-16 | /exam/concrete-chief-engineer/primary/construction | rsg-kensetsu | article-banner-3 | PL-0126 | 2 |
| 2026-11-16 | /exam/pe-first-stage/primary/r06-basic | rsg-kensetsu | article-banner-3 | PL-0156 | 1 |
| 2026-11-12 | /exam/pe-first-stage/primary/r07-construction | buildjob | tool-end | — | 1 |
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

- affiliate 表示: 起票時 7370 → 今回 49430（671%）
- affiliate クリック: 起票時 19 → 今回 33（174%）
- 高意図 query 表示: 起票時 7 → 今回 591（8443%）

## 記事台帳

| slug | 柱 | 公開 | GSC 表示 | クリック | 順位 | 被リンク | CTA |
|---|---|---|---|---|---|---|---|
| civil-construction-1-guide-public-engineer-salary-table | market-value | ○ | 108 | 1 | 5.5 | 3 | 1 |
| civil-construction-1-guide-future | career-path | ○ | 49 | 1 | 15.8 | 1 | 1 |
| civil-construction-2-guide-career-agent-comparison | service-choice | ○ | 39 | 0 | 56.6 | 1 | 1 |
| civil-construction-1-guide-company-types | career-path | ○ | 35 | 0 | 33 | 1 | 1 |
| civil-construction-1-guide-consultant | career-path | ○ | 29 | 0 | 31.3 | 2 | 1 |
| civil-construction-1-guide-career-agents | service-choice | ○ | 28 | 0 | 75.3 | 2 | 0 |
| civil-construction-1-guide-quit-public-engineer | quit | ○ | 26 | 0 | 16.6 | 3 | 1 |
| civil-construction-1-guide-career-salary | market-value | ○ | 24 | 1 | 17.1 | 3 | 0 |
| civil-construction-1-guide-buildjob-review | service-choice | ○ | 23 | 0 | 46.9 | 1 | 1 |
| civil-construction-1-guide-salary-by-role | market-value | ○ | 23 | 2 | 35.4 | 2 | 1 |
| civil-construction-1-guide-career-path | career-path | ○ | 21 | 0 | 24.6 | 12 | 1 |
| civil-construction-1-guide-grade-comparison | market-value | ○ | 19 | 0 | 34.1 | 2 | 0 |
| civil-construction-1-public-servant-merit | career-path | ○ | 17 | 0 | 19 | 7 | 0 |
| civil-construction-1-guide-public-servant | career-path | ○ | 16 | 0 | 31.5 | 4 | 1 |
| civil-construction-1-guide-public-servant-or-private | career-path | ○ | 13 | 0 | 28.7 | 0 | 1 |
| civil-construction-1-guide-women | career-path | ○ | 12 | 0 | 69.2 | 3 | 1 |
| civil-construction-1-guide-career-agent-comparison | service-choice | ○ | 9 | 0 | 85 | 5 | 1 |
| civil-construction-1-guide-allowance | market-value | ○ | 8 | 0 | 45.1 | 0 | 1 |
| civil-construction-1-guide-quit-honne | quit | ○ | 8 | 0 | 65.5 | 0 | 1 |
| civil-construction-1-guide-resume | application | ○ | 6 | 0 | 63.8 | 6 | 1 |
| civil-construction-1-guide-market-value | market-value | ○ | 5 | 0 | 12 | 15 | 1 |
| civil-construction-2-guide-haken-seishain | career-path | ○ | 4 | 0 | 5.5 | 1 | 1 |
| civil-construction-2-guide-resume | application | ○ | 4 | 0 | 69.5 | 2 | 1 |
| civil-construction-1-guide-age-career | career-path | ○ | 3 | 0 | 10.3 | 0 | 1 |
| civil-construction-1-guide-quit-or-stay | quit | ○ | 3 | 0 | 62.3 | 7 | 1 |
| civil-construction-2-guide-quit-or-stay | quit | ○ | 3 | 0 | 30 | 2 | 1 |
| civil-construction-2-guide-job-reality | career-path | ○ | 2 | 0 | 55.5 | 1 | 1 |
| civil-construction-1-guide-career-cases | market-value | ○ | 1 | 0 | 4 | 1 | 2 |
| pe-construction-fukugyou-dokuritsu | career-path | ○ | 1 | 0 | 11 | 0 | 0 |
| civil-construction-1-guide-career | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-career-consultation-before-quit | quit | ○ | 0 | 0 | — | 2 | 1 |
| civil-construction-1-guide-dx-jobs | career-path | ○ | 0 | 0 | — | 0 | 1 |
| civil-construction-1-guide-hatchu-shien | career-path | ○ | 0 | 0 | — | 9 | 1 |
| civil-construction-1-guide-interview | application | ○ | 0 | 0 | — | 3 | 1 |
| civil-construction-1-guide-market-value-check | market-value | ○ | 0 | 0 | — | 3 | 2 |
| civil-construction-1-guide-public-engineer-exam-study | career-path | ○ | 0 | 0 | — | 3 | 1 |
| civil-construction-1-guide-salary-up | market-value | ○ | 0 | 0 | — | 11 | 1 |
| civil-construction-1-guide-timing | application | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-1-guide-white-company | application | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-buildjob-review | service-choice | ○ | 0 | 0 | — | 1 | 1 |
| civil-construction-2-guide-career | career-path | ○ | 0 | 0 | — | 11 | 1 |
| civil-construction-2-guide-career-change | career-path | ○ | 0 | 0 | — | 2 | 1 |
| civil-construction-2-guide-salary | market-value | ○ | 0 | 0 | — | 4 | 1 |
| civil-construction-2-guide-young-career | career-path | ○ | 0 | 0 | — | 2 | 1 |
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

