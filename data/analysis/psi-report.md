# PSI 計測レポート — 2026-10-26

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **40件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 100 | 100 | 701 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 521 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 573 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 99 | 100 | 100 | 100 | 861 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 93 | 100 | 100 | 100 | 903 | 0.016 |
| /exam/civil-construction-1/primary/r07-a | desktop | 87 | 100 | 100 | 100 | 801 | 0.25⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 100 | 100 | 100 | 1003 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 86 | 100 | 100 | 100 | 891 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 941 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 99 | 100 | 100 | 100 | 672 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 761 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 902 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 100 | 100 | 100 | 905 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 861 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 802 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 593 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 99 | 100 | 100 | 100 | 902 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 99 | 100 | 100 | 100 | 912 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 681 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 811 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 793 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 98 | 100 | 100 | 100 | 1078 | 0.004 |
| / | mobile | 96 | 100 | 100 | 100 | 2626⚠ | 0.006 |
| /search | mobile | 99 | 100 | 100 | 66⚠ | 1951 | 0.006 |
| /exam | mobile | 98 | 100 | 100 | 100 | 2263 | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 68⚠ | 100 | 100 | 100 | 6301⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 86 | 100 | 100 | 100 | 4051⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 64⚠ | 100 | 100 | 100 | 6826⚠ | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 53⚠ | 100 | 100 | 100 | 7276⚠ | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 72 | 100 | 100 | 100 | 5793⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 83 | 100 | 100 | 100 | 4276⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 72 | 100 | 100 | 100 | 5542⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 72 | 100 | 100 | 100 | 5551⚠ | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 87 | 100 | 100 | 100 | 3901⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 80 | 100 | 100 | 100 | 5364⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 72 | 100 | 100 | 100 | 5648⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 98 | 100 | 100 | 100 | 2101 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 74 | 100 | 100 | 100 | 5302⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 96 | 100 | 100 | 100 | 2551⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 90 | 100 | 100 | 100 | 3451⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 72 | 100 | 100 | 100 | 5388⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 88 | 100 | 100 | 100 | 3751⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 74 | 100 | 100 | 100 | 5324⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 74 | 100 | 100 | 100 | 5382⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.25 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 6301ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3170ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 4051ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 1848ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 6826ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3661ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 7276ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3434ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **TBT** = 524ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 5793ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3144ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 4276ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 1858ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5542ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3460ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3287ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 3901ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5364ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5648ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3164ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 1823ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5302ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3237ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 3451ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5388ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3311ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 3751ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 5324ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3161ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5382ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3089ms (閾値: ≤1800ms)