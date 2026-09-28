# キャリアファネル基線レポート

生成: 2026-09-28T05:21:03.008Z

> [!warning]
> GA4 と GSC は取得遅延が違うため**窓が一致しない**。出所を跨いで CTR や EPC を割らないこと。
> GA4 2026-08-01〜2026-08-31 ／ GSC 2026-08-28〜2026-09-24

## 実検査の内訳

_「異常 0 件」と「1 件も検査していない」を区別するための欄（CLAUDE.md §9）。_

| 対象 | 件数 |
|---|---|
| docMetaIndexTotal | 1261 |
| careerArticles | 43 |
| siteMdxScanned | 1280 |
| extraLinkSourcesScanned | 1 |
| gscRowsTotal | 1150 |
| gscRowsMatchedCareer | 5 |
| ga4LabelRowsMatched | 13 |
| ga4PlacementRowsMatched | 9 |
| careerArticlesInGa4Top | 0 |
| noteCareerArticles | 24 |

## WARN

- 入力欠落 1 件: afb（CI の fetch-metrics 供給を確認する）
- 窓が不一致（GA4 2026-08-01〜2026-08-31 / GSC 2026-08-28〜2026-09-24）。取得元の遅延差なので異常ではないが、出所を跨いで CTR/EPC を割らないこと
- GA4 の窓の終端が 28 日前。計測 CI の供給停止を疑う（fetch-metrics の直近 run を見る）
- GA4 page スナップショットは上位 10000 ページのみで、career 記事は 1 本も入っていない。users/sessions は「0」ではなく「観測範囲外」なので断定に使わない

## 漏斗

### 1. 高意図 query（GSC 窓）

表示 51 ／ クリック 1

語彙: 転職・辞めたい・やめたい・年収・市場価値・評判・口コミ・エージェント・求人・ホワイト・公務員・発注者支援

| query | 表示 | クリック | 順位 |
|---|---|---|---|
| 技術士転職 | 7 | 0 | 72.9 |
| 土木公務員 資格 | 6 | 0 | 11.3 |
| 公務員 土木職 資格 | 3 | 0 | 9.0 |
| 技術 士 年収 | 3 | 0 | 77.7 |
| 技術士 年収 | 3 | 0 | 73.0 |
| 技術士総合技術監理部門年収 | 3 | 0 | 29.3 |
| 土木施工管理 年収 | 2 | 0 | 96.0 |
| 公務員 土木 資格 おすすめ | 2 | 0 | 11.0 |
| 土木 公務員 資格 | 2 | 0 | 10.0 |
| 技術士 総合技術監理部門 年収 | 2 | 0 | 30.0 |
| rccm 受験資格 公務員 | 1 | 1 | 15.0 |
| 施工管理job 評判 | 1 | 0 | 68.0 |
| 施工管理 転職エージェント | 1 | 0 | 18.0 |
| 1級土木施工管理技士年収 | 1 | 0 | 70.0 |
| 1級土木施工管理技士補 年収 | 1 | 0 | 86.0 |

### 2. キャリアページの流入（GA4 窓）

GA4 上位ページに入った career 記事: 0 / 43 本

### 3. 柱ごとの検索と内部リンク

_被リンクは literal リンクの本数であり、実際の遷移ではない。回遊の実測ではなく構造の proxy。_

| 柱 | 記事 | GSC 表示 | GSC クリック | 被リンク |
|---|---|---|---|---|
| career-path | 19 | 8 | 0 | 44 |
| market-value | 9 | 0 | 0 | 29 |
| service-choice | 5 | 0 | 0 | 2 |
| quit | 5 | 0 | 0 | 4 |
| application | 5 | 0 | 0 | 9 |

### 4. affiliate CTA（GA4 窓）

表示 24832 ／ クリック 15 ／ CTR 0.06%

| placement | 表示 | クリック | CTR |
|---|---|---|---|
| sidebar | 13616 | 2 | 0.01% |
| article-inline | 4228 | 10 | 0.24% |
| article-end | 3483 | 0 | 0.00% |
| article-mid | 2759 | 3 | 0.11% |
| category-sidebar | 666 | 0 | 0.00% |
| category-mobile | 80 | 0 | 0.00% |

| label | 表示 | クリック |
|---|---|---|
| BuildJob-sidebar | 5573 | 4 |
| DXConsulting-sidebar | 2894 | 0 |
| ビルドジョブ | 2831 | 4 |
| BuildJob-endbanner | 1791 | 0 |
| ハイクラス DX・コンサル転職 | 1140 | 5 |
| DXConsulting-endbanner | 828 | 1 |
| KensetsuJobs-sidebar | 322 | 1 |
| BuildJob-hubcareer | 5 | 0 |

### 5. A8 成果

窓内（2026-08）: 発生 0 ／ 確定 0 ／ 確定報酬 ¥0
累計: 発生 1 ／ 確定 0 ／ 確定報酬 ¥0

_A8 管理画面のクリックは口座共用（stats47 と同居）のため分母に使わない。分母は GA4。_

### 6. afb 成果（公式 API）

afb: 未取得（fetch-afb-outcomes.mjs --commit が未実行、または fetch-metrics.yml が止まっている）

## 起票時基線からのずれ（±30% 超）

- affiliate 表示: 起票時 7370 → 今回 24832（337%）
- 高意図 query 表示: 起票時 10 → 今回 51（510%）

## 記事台帳

| slug | 柱 | 公開 | GSC 表示 | クリック | 順位 | 被リンク | CTA |
|---|---|---|---|---|---|---|---|
| civil-construction-1-guide-company-types | career-path | ○ | 7 | 0 | 60.4 | 0 | 1 |
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

