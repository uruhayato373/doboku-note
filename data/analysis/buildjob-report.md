# BuildJob アフィリ クリック/EPC レポート

生成時のスナップショット期間: 面別=2026-09-01〜2026-09-30 / ページ別=2026-09-12〜2026-10-09

> 生成: `npm run report-buildjob-affiliate`（オフライン集計）。GA4 クリックが真実源（分子）、
> A8 成果（`data/a8/report-log.json` の単月の期間から導く月×案件）は `/a8-report` が自動取込（`a8-ui:fetch` → `a8-ui:normalize`）。計測は本番のみ発火＝デプロイ後に蓄積。

## プログラム別クリック（affiliate_cta_click）

| プログラム | クリック(GA4) | A8 承認 | 確定報酬(円) | 実測 EPC(月次で窓を揃え済み) |
|---|--:|--:|--:|--:|
| buildjob | 7 | - | - | - |
| kensetsu-jobs | 5 | - | - | - |
| dx-consulting | 4 | - | - | - |

## BuildJob 面別クリック内訳

| 面 | ラベル | クリック |
|---|---|--:|
| PC サイドバー（ピクセル源） | `BuildJob-sidebar` | 1 |
| 記事末 300×250 バナー | `BuildJob-endbanner` | 0 |
| 本文中間ネイティブカード＋MDX inline | `ビルドジョブ` | 6 |
| 本文中間テキスト（2026-07-28 以降 未使用） | `BuildJob-midtext` | 0 |
| カテゴリ hub 小バナー | `BuildJob-hubcareer` | 0 |

## 面別 表示回数と CTR

| 面 | 表示 | クリック | CTR |
|---|--:|--:|--:|
| `BuildJob-sidebar` | 7,904 | 1 | 0.01% |
| `ビルドジョブ` | 6,056 | 6 | 0.10% |
| `DXConsulting-sidebar` | 3,089 | 1 | 0.03% |
| `BuildJob-endbanner` | 2,769 | 0 | 0.00% |
| `KensetsuJobs-sidebar` | 2,716 | 0 | 0.00% |
| `建設JOBs` | 1,405 | 5 | 0.36% |
| `ハイクラス DX・コンサル転職` | 1,127 | 3 | 0.27% |
| `DXConsulting-endbanner` | 725 | 0 | 0.00% |
| `KensetsuJobs-endbanner` | 667 | 0 | 0.00% |
| `GKS-sidebar` | 96 | 0 | 0.00% |

_表示イベントを持つ面 10 件・表示合計 26,554 を実集計。表示イベントが 0 の面は行に出ない（＝計測されていない面は「CTR 0%」ではなく不在として扱う）。_

## affiliate クリック上位ページ（page 別・全プログラム）

| ページ | クリック |
|---|--:|
| /exam/civil-construction-1/secondary/r07 | 4 |
| /exam/civil-construction-2/secondary/r07 | 2 |
| /exam/pe-comprehensive-management/past-exams/r08-primary | 2 |
| /exam/civil-construction-1/secondary/r03 | 1 |
| /exam/civil-construction-1/secondary/r05 | 1 |
| /exam/civil-construction-2/secondary/r04 | 1 |
| /exam/pe-comprehensive-management/guide/course-selection-guide | 1 |
| /exam/pe-comprehensive-management/guide/frequent-topics | 1 |
| /exam/pe-comprehensive-management/keywords/personal-info-protection | 1 |
| /exam/pe-construction/guide/career | 1 |

## 注記

- **2026-07-28 以降、キャンペーン中（〜08-31）は civil セグメント全ページが BuildJob 100%**（高意図 36 slug 限定をやめた。GA4 実測でその 36 slug は流入上位に 1 つも入らず、実流入の学習系ページが 50/50 A/B のまま低 EPC 側に半分流れていたため）。2026-09-08 から通常条件の BuildJob。2026-10-07 17:00 から 2級の学習ページ・資格トップは建設JOBs（EXP-017）。今の配置は配置ルール（台帳 config.affiliate-placements）。
- 期間中は高意図面が A/B 母集団から抜けるため、**建設JOBs vs BuildJob の EPC 比較は低意図面・hub のみで解釈**する。
- 推定 EPC は A8 の月次の成果（`data/a8/report-log.json` の単月の期間）に成果が入ってから有効。A8 は API 無しのため `/a8-report`（Playwright・要ローカルログイン）で取り込む。
- **EPC の分母は GA4 のラベル別クリック**（A8 の `clicks` は口座横断＝stats47 分を含むので使わない。真実源: affiliate-operations.md §6.5）。分子は A8 の確定報酬で、GA4 窓に重なる月（2026-09）に限定して合算する。窓外として除外した月: 2026-05, 2026-06, 2026-07, 2026-08, 2026-10。分母も同じ月の窓で取得済み（`--month`）のため、**分子と分母の期間は揃っている**。
- 面別内訳には GA4 の `event_label` カスタムディメンション登録が必要（未登録なら `(not set)` に集約）。

