# BuildJob アフィリ クリック/EPC レポート

生成時のスナップショット期間: 面別=2026-07-16〜2026-08-12 / ページ別=2026-07-16〜2026-08-12

> 生成: `npm run report-buildjob-affiliate`（オフライン集計）。GA4 クリックが真実源（分子）、
> A8 成果（`a8-results.json`）は `/a8-report` が自動取込（`a8-ui:fetch` → `a8-ui:normalize`）。計測は本番のみ発火＝デプロイ後に蓄積。

## プログラム別クリック（affiliate_cta_click）

| プログラム | クリック(GA4) | A8 承認 | 確定報酬(円) | 推定 EPC(概算・期間ズレあり) |
|---|--:|--:|--:|--:|
| buildjob | 11 | - | - | - |
| dx-consulting | 8 | - | - | - |

## BuildJob 面別クリック内訳

| 面 | ラベル | クリック |
|---|---|--:|
| PC サイドバー（ピクセル源） | `BuildJob-sidebar` | 5 |
| 記事末 300×250 バナー | `BuildJob-endbanner` | 0 |
| 本文中間ネイティブカード＋MDX inline | `ビルドジョブ` | 6 |
| 本文中間テキスト（2026-07-28 以降 未使用） | `BuildJob-midtext` | 0 |
| カテゴリ hub 小バナー | `BuildJob-hubcareer` | 0 |

## 面別 表示回数と CTR

> [!warning] CTR は算出できない（分子と分母で窓が違う）
> 表示イベントの本番反映は **2026-07-25** で、このスナップショットの開始日は **2026-07-16**。
> 分母（表示）は実装日以降ぶんしか無いのに分子（クリック）は期間全体ぶんあるため、比を取ると CTR を過大評価する。
> 下表の CTR 欄は **上限**（クリックが全て表示計測期間に落ちたと仮定した最大値）。実測 CTR を得るには
> `npm run fetch-ga4-cta-clicks -- --by-label --days 27`（または `--month YYYY-MM`）で窓を 2026-07-25 以降に揃えて取り直す（GA4 API＝CI/CD 供給）。

| 面 | 表示 | クリック | CTR の上限 |
|---|--:|--:|--:|
| `BuildJob-sidebar` | 2,153 | 5 | ≤ 0.23% |
| `DXConsulting-sidebar` | 2,098 | 2 | ≤ 0.10% |
| `ビルドジョブ` | 1,183 | 6 | ≤ 0.51% |
| `BuildJob-endbanner` | 623 | 0 | ≤ 0.00% |
| `ハイクラス DX・コンサル転職` | 499 | 6 | ≤ 1.20% |
| `KensetsuJobs-sidebar` | 455 | 0 | ≤ 0.00% |
| `DXConsulting-endbanner` | 352 | 0 | ≤ 0.00% |
| `建設JOBs` | 4 | 0 | ≤ 0.00% |
| `BuildJob-hubcareer` | 2 | 0 | ≤ 0.00% |
| `BuildJob-midtext` | 1 | 0 | ≤ 0.00% |

_表示イベントを持つ面 10 件・表示合計 7,370 を実集計。表示イベントが 0 の面は行に出ない（＝計測されていない面は「CTR 0%」ではなく不在として扱う）。_

## affiliate クリック上位ページ（page 別・全プログラム）

| ページ | クリック |
|---|--:|
| /docs/civil-construction-1-guide-public-servant | 4 |
| /docs/civil-construction-2-secondary-r07 | 3 |
| /docs/pe-comprehensive-management-r08-primary | 3 |
| /docs/pe-comprehensive-management-exam-index | 2 |
| / | 1 |
| /category/pe-comprehensive-management | 1 |
| /docs/civil-construction-1-primary-r07-b | 1 |
| /docs/civil-construction-1-textbook-construction-mgmt-overview | 1 |
| /docs/civil-construction-2-guide-exam-overview | 1 |
| /docs/civil-construction-2-secondary-experience-writing-guide | 1 |
| /docs/pe-comprehensive-management-nonconformity-rate | 1 |

## 注記

- **2026-07-28 以降、キャンペーン中（〜08-31）は civil セグメント全ページが BuildJob 100%**（高意図 36 slug 限定をやめた。GA4 実測でその 36 slug は流入上位に 1 つも入らず、実流入の学習系ページが 50/50 A/B のまま低 EPC 側に半分流れていたため）。9/1 以降は `isCampaignActive()`=false で slug ハッシュ A/B へ自動復帰するが、GKS(457) < 建設JOBs(709) と逆転するため復帰後の arm 設計は要見直し。
- 期間中は高意図面が A/B 母集団から抜けるため、**建設JOBs vs BuildJob の EPC 比較は低意図面・hub のみで解釈**する。
- 推定 EPC は `a8-results.json` に成果が入ってから有効。A8 は API 無しのため `/a8-report`（Playwright・要ローカルログイン）で取り込む。
- **EPC の分母は GA4 のラベル別クリック**（A8 の `clicks` は口座横断＝stats47 分を含むので使わない。真実源: affiliate-operations.md §6.5）。分子は A8 の確定報酬で、GA4 窓に重なる月（2026-07, 2026-08）に限定して合算する。窓外として除外した月: 2026-05, 2026-06。**月全体の報酬 ÷ 2026-07-16〜2026-08-12のクリック**というズレが残るため EPC は概算。揃えるには `npm run fetch-ga4-cta-clicks -- --by-label --month YYYY-MM` で月次窓を取り直す。
- 面別内訳には GA4 の `event_label` カスタムディメンション登録が必要（未登録なら `(not set)` に集約）。

