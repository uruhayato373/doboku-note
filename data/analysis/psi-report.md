# PSI 計測レポート — 2026-10-23

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **49件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 701 | 0.004 |
| /search | desktop | 95 | 100 | 100 | 66⚠ | 468 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 584 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 98 | 100 | 100 | 100 | 865 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 925 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 84 | 100 | 100 | 100 | 801 | 0.251⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 94 | 100 | 100 | 100 | 922 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 100 | 100 | 100 | 772 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 97 | 100 | 100 | 100 | 817 | 0.048 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 99 | 100 | 100 | 100 | 801 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 861 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 81 | 100 | 100 | 100 | 724 | 0.063 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 100 | 100 | 100 | 762 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 98 | 100 | 100 | 100 | 664 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 90 | 100 | 100 | 100 | 842 | 0.177⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 622 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 94 | 100 | 100 | 100 | 903 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 773 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 98 | 100 | 100 | 100 | 881 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 812 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 97 | 100 | 100 | 100 | 1273 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 100 | 100 | 100 | 881 | 0.004 |
| / | mobile | 74 | 100 | 100 | 100 | 5479⚠ | 0.006 |
| /search | mobile | 98 | 100 | 100 | 66⚠ | 2251 | 0.006 |
| /exam | mobile | 67⚠ | 100 | 100 | 100 | 6941⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 74 | 100 | 100 | 100 | 5328⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 72 | 100 | 100 | 100 | 5659⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 44⚠ | 100 | 100 | 100 | 8176⚠ | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 49⚠ | 100 | 100 | 100 | 6755⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 97 | 100 | 100 | 100 | 2476 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 72 | 100 | 100 | 100 | 5176⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 73 | 100 | 100 | 100 | 5483⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 72 | 100 | 100 | 100 | 5523⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 72 | 100 | 100 | 100 | 4815⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 72 | 100 | 100 | 100 | 5368⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 75 | 100 | 100 | 100 | 3118⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 72 | 100 | 100 | 100 | 5519⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 70 | 100 | 100 | 100 | 5610⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 73 | 100 | 100 | 100 | 5334⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 71 | 100 | 100 | 100 | 5391⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 74 | 100 | 100 | 100 | 5210⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 74 | 100 | 100 | 100 | 5302⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 88 | 100 | 100 | 100 | 3751⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 72 | 100 | 100 | 100 | 5297⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.251 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **TBT** = 400ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.177 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5479ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2916ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam` (mobile): **LCP** = 6941ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 3287ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5328ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3073ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5659ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3405ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 44 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 8176ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3722ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **TBT** = 764ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 49 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 6755ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3823ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **TBT** = 621ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5176ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3608ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5483ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3235ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5523ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3393ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 4815ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3514ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5368ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3196ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 3118ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **TBT** = 688ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 5519ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3291ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5610ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3367ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 5334ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3146ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5391ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3336ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5210ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3237ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5302ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3260ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 3751ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5297ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3322ms (閾値: ≤1800ms)