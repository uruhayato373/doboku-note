# BuildJob アフィリ クリック/EPC レポート

生成時のスナップショット期間: 面別=2026-06-11〜2026-07-08 / ページ別=2026-06-11〜2026-07-08

> 生成: `npm run report-buildjob-affiliate`（オフライン集計）。GA4 クリックが真実源（分子）、
> A8 成果は月次手動スナップショット（`a8-results.json`）。計測は本番のみ発火＝デプロイ後に蓄積。

## プログラム別クリック（affiliate_cta_click）

> [!warning]
> GA4 の面別ラベルが全て `(not set)`。event_label カスタムディメンション（イベントスコープ）が
> 未登録のため面別内訳を出せません。GA4 管理画面で登録後、`npm run fetch-ga4-cta-clicks -- --by-label`
> を再取得してください。以下はページ別のみ有効です。

_プログラム別に分類できるクリックがまだありません（面別ラベル未登録 or クリック 0）。_

## BuildJob 面別クリック内訳

_BuildJob 面別クリックはまだ計測されていません（デプロイ後に蓄積 / 面別ラベル未登録）。_

## affiliate クリック上位ページ（page 別・全プログラム）

| ページ | クリック |
|---|--:|
| / | 6 |
| /category/pe-comprehensive-management | 2 |
| /docs/civil-construction-1-guide-exam-overview | 1 |
| /docs/civil-construction-1-primary-h30-a | 1 |
| /docs/civil-construction-1-primary-r07-b | 1 |
| /docs/civil-construction-1-textbook-explosives-act | 1 |
| /docs/civil-construction-2-guide-study-plan | 1 |
| /docs/civil-construction-2-secondary-r07 | 1 |
| /docs/pe-comprehensive-management-r04-primary | 1 |

## 注記

- 高意図 31 slug は 〜2026-08-31 の間 BuildJob 100%（`HIGH_INTENT_CAREER_SLUGS`）。9/1 以降は slug ハッシュ A/B へ自動復帰。
- 期間中は高意図面が A/B 母集団から抜けるため、**建設JOBs vs BuildJob の EPC 比較は低意図面・hub のみで解釈**する。
- 推定 EPC は `a8-results.json` に月次成果を手入力してから有効（A8 は API 無し）。
- 面別内訳には GA4 の `event_label` カスタムディメンション登録が必要（未登録なら `(not set)` に集約）。

