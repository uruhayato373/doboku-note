# PSI 計測レポート — 2026-10-15

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **61件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 661 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 491 | 0.004 |
| /exam | desktop | 99 | 100 | 100 | 100 | 587 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 628 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 82 | 100 | 100 | 100 | 750 | 0.016 |
| /exam/civil-construction-1/primary/r07-a | desktop | 70 | 100 | 100 | 100 | 881 | 0.226⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 70 | 100 | 100 | 100 | 968 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 100 | 100 | 100 | 769 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 77 | 100 | 100 | 100 | 793 | 0.048 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 100 | 100 | 100 | 803 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 501 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 98 | 100 | 100 | 100 | 936 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 98 | 100 | 100 | 100 | 801 | 0.048 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 96 | 100 | 100 | 100 | 1234 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 90 | 100 | 100 | 100 | 805 | 0.177⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 559 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 702 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 99 | 100 | 100 | 100 | 938 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 802 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 98 | 100 | 100 | 100 | 811 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 99 | 100 | 100 | 100 | 882 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 100 | 100 | 100 | 841 | 0.004 |
| / | mobile | 64⚠ | 100 | 100 | 100 | 6751⚠ | 0 |
| /search | mobile | 65⚠ | 100 | 100 | 66⚠ | 6615⚠ | 0 |
| /exam | mobile | 79 | 100 | 100 | 100 | 4240⚠ | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 88 | 100 | 100 | 100 | 3755⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 67⚠ | 100 | 100 | 100 | 6754⚠ | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 64⚠ | 100 | 100 | 100 | 7429⚠ | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 62⚠ | 100 | 100 | 100 | 7129⚠ | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 64⚠ | 100 | 100 | 100 | 6753⚠ | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 64⚠ | 100 | 100 | 100 | 8178⚠ | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 62⚠ | 100 | 100 | 100 | 7501⚠ | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 73 | 100 | 100 | 100 | 4741⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 72 | 100 | 100 | 100 | 7579⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 71 | 100 | 100 | 100 | 5571⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 88 | 100 | 100 | 100 | 3004⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 73 | 100 | 100 | 100 | 5349⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 73 | 100 | 100 | 100 | 5373⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 59⚠ | 100 | 100 | 100 | 7201⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 74 | 100 | 100 | 100 | 5232⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 65⚠ | 100 | 100 | 100 | 7201⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 66⚠ | 100 | 100 | 100 | 7128⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 66⚠ | 100 | 100 | 100 | 6979⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 74 | 100 | 100 | 100 | 5245⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (desktop): **TBT** = 382ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.226 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **TBT** = 406ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **TBT** = 915ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **TBT** = 512ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.177 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 6751ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3190ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 6615ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3412ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4240ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2871ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 3755ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 6754ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3391ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 7429ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3667ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 7129ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3322ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 6753ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3239ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 8178ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3539ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 7501ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3299ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 4741ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3351ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 7579ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5571ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3264ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 3004ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 5349ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3276ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5373ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3244ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3503ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5232ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3266ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3171ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 7128ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3245ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 6979ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3325ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5245ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3158ms (閾値: ≤1800ms)