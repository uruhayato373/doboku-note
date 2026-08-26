# PSI 計測レポート — 2026-08-26

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- 診断上のしきい値超過: **58件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **1件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 100 | 100 | 763 | 0.004 |
| /search | desktop | 78 | 100 | 100 | 66⚠ | 425 | 0.549⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 427 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 97 | 100 | 100 | 100 | 602 | 0.024 |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 96 | 100 | 100 | 670 | 0.004 |
| /docs/civil-construction-1-primary-r07-a | desktop | 72 | 96 | 100 | 100 | 841 | 0.226⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 96 | 98 | 100 | 100 | 1208 | 0.007 |
| /docs/civil-construction-1-secondary-r07 | desktop | 78 | 96 | 100 | 100 | 2645⚠ | 0.004 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 95 | 96 | 100 | 100 | 557 | 0.111⚠ |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 72 | 96 | 100 | 100 | 745 | 0.004 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 80 | 100 | 100 | 100 | 994 | 0.23⚠ |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 92 | 100 | 100 | 100 | 700 | 0.004 |
| /docs/pe-comprehensive-management-exam-index | desktop | 86 | 100 | 100 | 100 | 866 | 0.004 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 657 | 0.004 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 100 | 100 | 100 | 100 | 504 | 0.004 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 100 | 100 | 100 | 573 | 0.004 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 96 | 100 | 100 | 590 | 0.004 |
| /docs/pe-comprehensive-management-followership | desktop | 98 | 100 | 100 | 100 | 1026 | 0.004 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 100 | 100 | 100 | 751 | 0.004 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 98 | 100 | 100 | 792 | 0.004 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 98 | 100 | 100 | 741 | 0.004 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 98 | 100 | 100 | 786 | 0.004 |
| / | mobile | 62⚠ | 96 | 100 | 100 | 9436⚠ | 0 |
| /search | mobile | 65⚠ | 96 | 100 | 66⚠ | 7477⚠ | 0 |
| /category | mobile | 99 | 98 | 96 | 91 | 1514 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 75 | 93 | 100 | 100 | 4732⚠ | 0.006 |
| /docs/civil-construction-1-guide-four-management | mobile | 74 | 93 | 92 | 100 | 5209⚠ | 0.006 |
| /docs/civil-construction-1-primary-r07-a | mobile | 64⚠ | 93 | 100 | 100 | 7502⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 65⚠ | 95 | 100 | 100 | 8478⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 75 | 93 | 100 | 100 | 4647⚠ | 0.006 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 62⚠ | 93 | 100 | 100 | 8252⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 65⚠ | 93 | 100 | 100 | 4893⚠ | 0.006 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 73 | 93 | 100 | 100 | 5213⚠ | 0.006 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 72 | 92 | 100 | 100 | 5426⚠ | 0.006 |
| /docs/pe-comprehensive-management-exam-index | mobile | 53⚠ | 93 | 100 | 100 | 5829⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 61⚠ | 93 | 100 | 100 | 7951⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 74 | 96 | 100 | 100 | 4807⚠ | 0.006 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 74 | 96 | 100 | 100 | 4807⚠ | 0.006 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 75 | 92 | 100 | 100 | 4676⚠ | 0.006 |
| /docs/pe-comprehensive-management-followership | mobile | 90 | 96 | 100 | 100 | 2121 | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 77 | 96 | 100 | 100 | 4799⚠ | 0.006 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 97 | 95 | 100 | 100 | 2327 | 0.006 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 75 | 95 | 100 | 100 | 4761⚠ | 0.006 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 98 | 95 | 100 | 100 | 1887 | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.549 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.226 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 368ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **LCP** = 2645ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **CLS** = 0.111 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **TBT** = 746ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **TBT** = 315ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 9436ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3131ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 7477ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3081ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 4732ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3011ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5209ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3118ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7502ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3574ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 8478ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3250ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4647ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 3109ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 8252ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3488ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4893ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3179ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 380ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5213ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3275ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5426ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3254ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5829ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3265ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **TBT** = 605ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 7951ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 3198ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4807ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3245ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4807ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3110ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4676ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2989ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **TBT** = 345ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 4799ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2783ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4761ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2904ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。CrUX の供給が戻るのを待つか、judgment.primary_source を lab 中央値ベースへ変更して原則を書き換える。