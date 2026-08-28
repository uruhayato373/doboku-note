# BuildJob アフィリ クリック/EPC レポート

生成時のスナップショット期間: 面別=2026-07-28〜2026-08-24 / ページ別=2026-07-28〜2026-08-24

> 生成: `npm run report-buildjob-affiliate`（オフライン集計）。GA4 クリックが真実源（分子）、
> A8 成果（`a8-results.json`）は `/a8-report` が自動取込（`a8-ui:fetch` → `a8-ui:normalize`）。計測は本番のみ発火＝デプロイ後に蓄積。

## プログラム別クリック（affiliate_cta_click）

| プログラム | クリック(GA4) | A8 承認 | 確定報酬(円) | 推定 EPC(概算・期間ズレあり) |
|---|--:|--:|--:|--:|
| buildjob | 7 | - | - | - |
| kensetsu-jobs | 1 | - | - | - |
| dx-consulting | 6 | - | - | - |

## BuildJob 面別クリック内訳

| 面 | ラベル | クリック |
|---|---|--:|
| PC サイドバー（ピクセル源） | `BuildJob-sidebar` | 5 |
| 記事末 300×250 バナー | `BuildJob-endbanner` | 0 |
| 本文中間ネイティブカード＋MDX inline | `ビルドジョブ` | 2 |
| 本文中間テキスト（2026-07-28 以降 未使用） | `BuildJob-midtext` | 0 |
| カテゴリ hub 小バナー | `BuildJob-hubcareer` | 0 |

## 面別 表示回数と CTR

| 面 | 表示 | クリック | CTR |
|---|--:|--:|--:|
| `BuildJob-sidebar` | 4,083 | 5 | 0.12% |
| `DXConsulting-sidebar` | 2,614 | 0 | 0.00% |
| `ビルドジョブ` | 2,245 | 2 | 0.09% |
| `BuildJob-endbanner` | 1,323 | 0 | 0.00% |
| `ハイクラス DX・コンサル転職` | 792 | 5 | 0.63% |
| `DXConsulting-endbanner` | 611 | 1 | 0.16% |
| `KensetsuJobs-sidebar` | 481 | 1 | 0.21% |
| `BuildJob-hubcareer` | 5 | 0 | 0.00% |
| `建設JOBs` | 1 | 0 | 0.00% |

_表示イベントを持つ面 9 件・表示合計 12,155 を実集計。表示イベントが 0 の面は行に出ない（＝計測されていない面は「CTR 0%」ではなく不在として扱う）。_

## affiliate クリック上位ページ（page 別・全プログラム）

| ページ | クリック |
|---|--:|
| /docs/civil-construction-2-secondary-r07 | 2 |
| /docs/pe-comprehensive-management-exam-index | 2 |
| / | 1 |
| /category/civil-construction-2 | 1 |
| /docs/civil-construction-1-primary-r07-b | 1 |
| /docs/civil-construction-1-textbook-construction-mgmt-overview | 1 |
| /docs/civil-construction-2-guide-exam-overview | 1 |
| /docs/civil-construction-2-secondary-experience-writing-guide | 1 |
| /docs/civil-construction-2-secondary-r04 | 1 |
| /docs/pe-comprehensive-management-nonconformity-rate | 1 |
| /docs/pe-comprehensive-management-process-costing | 1 |
| /docs/pe-comprehensive-management-r08-primary | 1 |

## 注記

- **2026-07-28 以降、キャンペーン中（〜08-31）は civil セグメント全ページが BuildJob 100%**（高意図 36 slug 限定をやめた。GA4 実測でその 36 slug は流入上位に 1 つも入らず、実流入の学習系ページが 50/50 A/B のまま低 EPC 側に半分流れていたため）。9/1 以降は `isCampaignActive()`=false で slug ハッシュ A/B へ自動復帰するが、GKS(457) < 建設JOBs(709) と逆転するため復帰後の arm 設計は要見直し。
- 期間中は高意図面が A/B 母集団から抜けるため、**建設JOBs vs BuildJob の EPC 比較は低意図面・hub のみで解釈**する。
- 推定 EPC は `a8-results.json` に成果が入ってから有効。A8 は API 無しのため `/a8-report`（Playwright・要ローカルログイン）で取り込む。
- **EPC の分母は GA4 のラベル別クリック**（A8 の `clicks` は口座横断＝stats47 分を含むので使わない。真実源: affiliate-operations.md §6.5）。分子は A8 の確定報酬で、GA4 窓に重なる月（2026-07, 2026-08）に限定して合算する。窓外として除外した月: 2026-05, 2026-06。**月全体の報酬 ÷ 2026-07-28〜2026-08-24のクリック**というズレが残るため EPC は概算。揃えるには `npm run fetch-ga4-cta-clicks -- --by-label --month YYYY-MM` で月次窓を取り直す。
- 面別内訳には GA4 の `event_label` カスタムディメンション登録が必要（未登録なら `(not set)` に集約）。

