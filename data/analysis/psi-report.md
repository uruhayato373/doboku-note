# PSI 計測レポート — 2026-10-27

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **47件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 621 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 373 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 410 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 98 | 100 | 100 | 100 | 1151 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 952 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 86 | 100 | 100 | 100 | 861 | 0.25⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 100 | 100 | 100 | 718 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 100 | 100 | 100 | 762 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 825 | 0.048 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 97 | 100 | 100 | 100 | 772 | 0.016 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 98 | 100 | 100 | 100 | 1165 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 84 | 100 | 100 | 100 | 1046 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 100 | 100 | 100 | 776 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 891 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 91 | 100 | 100 | 100 | 722 | 0.177⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 702 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 99 | 100 | 100 | 100 | 783 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 813 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 664 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 100 | 100 | 100 | 998 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 789 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 772 | 0.004 |
| / | mobile | 70 | 100 | 100 | 100 | 5852⚠ | 0 |
| /search | mobile | 79 | 100 | 100 | 66⚠ | 4404⚠ | 0.006 |
| /exam | mobile | 75 | 100 | 100 | 100 | 4615⚠ | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 74 | 100 | 100 | 100 | 5202⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 67⚠ | 100 | 100 | 100 | 6601⚠ | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 93 | 100 | 100 | 100 | 3001⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 69⚠ | 100 | 100 | 100 | 6159⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 97 | 100 | 100 | 100 | 2251 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 71 | 100 | 100 | 100 | 5847⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 66⚠ | 100 | 100 | 100 | 5749⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 71 | 100 | 100 | 100 | 5553⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 87 | 100 | 100 | 100 | 3976⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 68⚠ | 100 | 100 | 100 | 6793⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 83 | 100 | 100 | 100 | 4576⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 64⚠ | 100 | 100 | 100 | 6826⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 93 | 100 | 100 | 100 | 3077⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 97 | 100 | 100 | 100 | 2401 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 67⚠ | 100 | 100 | 100 | 6451⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 74 | 100 | 100 | 100 | 5273⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 73 | 100 | 100 | 100 | 5366⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 91 | 100 | 100 | 100 | 3301⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 92 | 100 | 100 | 100 | 3301⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.25 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **TBT** = 323ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.177 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5852ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3069ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4404ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2938ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4615ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 3121ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5202ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3164ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 6601ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3322ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 3001ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 1951ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 6159ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3469ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5847ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3547ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5749ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3538ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5553ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3438ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 3976ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 6793ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3170ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 4576ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 6826ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3490ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 3077ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 1832ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 6451ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3189ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5273ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3260ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5366ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3322ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 3301ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 3301ms (閾値: ≤2500ms)