# PSI 計測レポート — 2026-10-10

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **57件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 84 | 100 | 100 | 100 | 641 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 497 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 420 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 689 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 77 | 100 | 100 | 100 | 705 | 0.016 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 100 | 100 | 100 | 773 | 0.224⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 98 | 100 | 100 | 100 | 864 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 77 | 100 | 100 | 100 | 917 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 785 | 0.048 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 100 | 100 | 100 | 781 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 944 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 71 | 100 | 100 | 100 | 712 | 0.066 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 100 | 100 | 100 | 868 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 893 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 91 | 100 | 100 | 100 | 803 | 0.177⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 642 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 99 | 100 | 100 | 100 | 750 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 98 | 100 | 100 | 100 | 1126 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 801 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 801 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 99 | 100 | 100 | 100 | 776 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 98 | 100 | 100 | 100 | 824 | 0.004 |
| / | mobile | 93 | 100 | 100 | 100 | 3001⚠ | 0.006 |
| /search | mobile | 97 | 100 | 100 | 66⚠ | 1670 | 0.006 |
| /exam | mobile | 64⚠ | 100 | 100 | 100 | 8008⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 66⚠ | 100 | 100 | 100 | 8626⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 71 | 100 | 100 | 100 | 5493⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 64⚠ | 100 | 100 | 100 | 9601⚠ | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 63⚠ | 100 | 100 | 100 | 10052⚠ | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 69⚠ | 100 | 100 | 100 | 5361⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 70 | 100 | 100 | 100 | 6153⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 72 | 100 | 100 | 100 | 5557⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 72 | 100 | 100 | 100 | 5731⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 73 | 100 | 100 | 100 | 5429⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 69⚠ | 100 | 100 | 100 | 5287⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 60⚠ | 100 | 100 | 100 | 8927⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 66⚠ | 100 | 100 | 100 | 5526⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 73 | 100 | 100 | 100 | 5251⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 98 | 100 | 100 | 100 | 2326 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 99 | 100 | 100 | 100 | 2026 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 63⚠ | 100 | 100 | 100 | 5518⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 64⚠ | 100 | 100 | 100 | 8777⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 92 | 100 | 100 | 100 | 3301⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 58⚠ | 100 | 100 | 100 | 8926⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **TBT** = 366ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (desktop): **TBT** = 527ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.224 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (desktop): **TBT** = 480ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **TBT** = 730ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.177 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 3001ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam` (mobile): **LCP** = 8008ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 3369ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 8626ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3104ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5493ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3299ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 9601ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3664ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 10052ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3351ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 5361ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3238ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 6153ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3582ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5557ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3379ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5731ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3317ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5429ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3446ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5287ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3250ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 8927ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3198ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 5526ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3381ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5251ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3325ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5518ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3239ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **TBT** = 403ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 8777ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3213ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 3301ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 8926ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3222ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **TBT** = 321ms (閾値: ≤300ms)