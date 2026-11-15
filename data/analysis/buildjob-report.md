# BuildJob アフィリ クリック/EPC レポート

生成時のスナップショット期間: 面別=2026-10-01〜2026-10-31 / ページ別=2026-10-10〜2026-11-06

> 生成: `npm run report-buildjob-affiliate`（オフライン集計）。GA4 クリックが真実源（分子）、
> A8 成果（`data/a8/report-log.json` の単月の期間から導く月×案件）は `/a8-report` が自動取込（`a8-ui:fetch` → `a8-ui:normalize`）。計測は本番のみ発火＝デプロイ後に蓄積。

## プログラム別クリック（affiliate_cta_click）

| プログラム | クリック(GA4) | A8 承認 | 確定報酬(円) | 実測 EPC(月次で窓を揃え済み) |
|---|--:|--:|--:|--:|
| buildjob | 15 | - | - | - |
| kensetsu-jobs | 10 | - | - | - |
| dx-consulting | 2 | - | - | - |

## BuildJob 面別クリック内訳

| 面 | ラベル | クリック |
|---|---|--:|
| PC サイドバー（ピクセル源） | `BuildJob-sidebar` | 1 |
| 記事末 300×250 バナー | `BuildJob-endbanner` | 0 |
| 本文中間ネイティブカード＋MDX inline | `ビルドジョブ` | 14 |
| 本文中間テキスト（2026-07-28 以降 未使用） | `BuildJob-midtext` | 0 |
| カテゴリ hub 小バナー | `BuildJob-hubcareer` | 0 |

## 面別 表示回数と CTR

| 面 | 表示 | クリック | CTR |
|---|--:|--:|--:|
| `建設JOBs` | 11,301 | 10 | 0.09% |
| `ビルドジョブ` | 9,008 | 14 | 0.16% |
| `BuildJob-endbanner` | 1,802 | 0 | 0.00% |
| `KensetsuJobs-endbanner` | 1,691 | 0 | 0.00% |
| `ハイクラス DX・コンサル転職` | 1,085 | 2 | 0.18% |
| `BuildJob-sidebar` | 1,067 | 1 | 0.09% |
| `KensetsuJobs-sidebar` | 253 | 0 | 0.00% |
| `DXConsulting-sidebar` | 185 | 0 | 0.00% |
| `DXConsulting-endbanner` | 142 | 0 | 0.00% |
| `コンストワーク` | 27 | 0 | 0.00% |
| `建築転職` | 7 | 0 | 0.00% |

_表示イベントを持つ面 11 件・表示合計 26,568 を実集計。表示イベントが 0 の面は行に出ない（＝計測されていない面は「CTR 0%」ではなく不在として扱う）。_

## affiliate クリック上位ページ（page 別・全プログラム）

| ページ | クリック |
|---|--:|
| / | 5 |
| /exam/civil-construction-2/guide/r08-secondary-answers | 5 |
| /exam/civil-construction-2/secondary/r08 | 2 |
| /exam/pe-first-stage/guide/overview | 2 |
| /tools/kakomon-quiz/pe-first-stage | 2 |
| /exam/civil-construction-2/guide/secondary-grading-and-partial-credit | 1 |
| /exam/civil-construction-2/secondary/r05 | 1 |
| /exam/civil-construction-2/secondary/r07 | 1 |
| /exam/concrete-diagnostician/textbook/deterioration | 1 |
| /exam/pe-comprehensive-management | 1 |
| /exam/pe-comprehensive-management/past-exams/r06-secondary | 1 |
| /exam/pe-first-stage/guide/water-supply-subject | 1 |
| /exam/pe-first-stage/primary/r02-water-supply | 1 |
| /exam/pe-first-stage/primary/r07-basic | 1 |
| /exam/pe-first-stage/primary/r07-construction | 1 |
| /practice/owner-safety-responsibility | 1 |
| /practice/road-work-approval-vs-road-use-permit | 1 |
| /practice/subbase-subgrade-control | 1 |

## 注記

- **2026-07-28 以降、キャンペーン中（〜08-31）は civil セグメント全ページが BuildJob 100%**（高意図 36 slug 限定をやめた。GA4 実測でその 36 slug は流入上位に 1 つも入らず、実流入の学習系ページが 50/50 A/B のまま低 EPC 側に半分流れていたため）。2026-09-08 から通常条件の BuildJob。2026-10-07 17:00 から 2級の学習ページ・資格トップは建設JOBs（EXP-017）。今の配置は配置ルール（台帳 config.affiliate-placements）。
- 期間中は高意図面が A/B 母集団から抜けるため、**建設JOBs vs BuildJob の EPC 比較は低意図面・hub のみで解釈**する。
- 推定 EPC は A8 の月次の成果（`data/a8/report-log.json` の単月の期間）に成果が入ってから有効。A8 は API 無しのため `/a8-report`（Playwright・要ローカルログイン）で取り込む。
- **EPC の分母は GA4 のラベル別クリック**（A8 の `clicks` は口座横断＝stats47 分を含むので使わない。真実源: affiliate-operations.md §6.5）。分子は A8 の確定報酬で、GA4 窓に重なる月（2026-10）に限定して合算する。窓外として除外した月: 2026-05, 2026-06, 2026-07, 2026-08, 2026-09, 2026-11。分母も同じ月の窓で取得済み（`--month`）のため、**分子と分母の期間は揃っている**。
- 面別内訳には GA4 の `event_label` カスタムディメンション登録が必要（未登録なら `(not set)` に集約）。

