# BuildJob アフィリ クリック/EPC レポート

生成時のスナップショット期間: 面別=2026-06-25〜2026-07-22 / ページ別=2026-06-25〜2026-07-22

> 生成: `npm run report-buildjob-affiliate`（オフライン集計）。GA4 クリックが真実源（分子）、
> A8 成果（`a8-results.json`）は `/a8-report` が自動取込（`a8-ui:fetch` → `a8-ui:normalize`）。計測は本番のみ発火＝デプロイ後に蓄積。

## プログラム別クリック（affiliate_cta_click）

| プログラム | クリック | A8 承認 | 確定報酬(円) | 推定 EPC(円/クリック) |
|---|--:|--:|--:|--:|
| buildjob | 7 | - | - | - |
| dx-consulting | 4 | - | - | - |

## BuildJob 面別クリック内訳

| 面 | ラベル | クリック |
|---|---|--:|
| PC サイドバー（ピクセル源） | `BuildJob-sidebar` | 1 |
| 記事末カード＋本文 inline（モバイル） | `ビルドジョブ` | 6 |
| 本文中間テキスト | `BuildJob-midtext` | 0 |
| カテゴリ hub 小バナー | `BuildJob-hubcareer` | 0 |

## affiliate クリック上位ページ（page 別・全プログラム）

| ページ | クリック |
|---|--:|
| /docs/civil-construction-1-guide-public-servant | 4 |
| / | 3 |
| /category/pe-comprehensive-management | 3 |
| /docs/pe-comprehensive-management-r08-primary | 3 |
| /docs/civil-construction-2-secondary-r07 | 2 |
| /docs/civil-construction-1-guide-exam-overview | 1 |
| /docs/civil-construction-1-secondary-construction-plan-past-problems | 1 |
| /docs/civil-construction-1-textbook-explosives-act | 1 |

## 注記

- 高意図 31 slug は 〜2026-08-31 の間 BuildJob 100%（`HIGH_INTENT_CAREER_SLUGS`）。9/1 以降は slug ハッシュ A/B へ自動復帰。
- 期間中は高意図面が A/B 母集団から抜けるため、**建設JOBs vs BuildJob の EPC 比較は低意図面・hub のみで解釈**する。
- 推定 EPC は `a8-results.json` に成果が入ってから有効。A8 は API 無しのため `/a8-report`（Playwright・要ローカルログイン）で取り込む。
- 面別内訳には GA4 の `event_label` カスタムディメンション登録が必要（未登録なら `(not set)` に集約）。

