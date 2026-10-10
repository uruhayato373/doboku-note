# PSI 計測レポート — 2026-10-11

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **64件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 742 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 534 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 490 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 97 | 100 | 100 | 100 | 833 | 0.016 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 908 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 78 | 100 | 100 | 100 | 801 | 0.227⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 100 | 100 | 100 | 944 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 83 | 100 | 100 | 100 | 821 | 0.009 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 84 | 100 | 100 | 100 | 725 | 0.048 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 79 | 100 | 100 | 100 | 689 | 0.048 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 97 | 100 | 100 | 100 | 753 | 0.05 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 97 | 100 | 100 | 100 | 871 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 100 | 100 | 100 | 687 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 781 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 82 | 100 | 100 | 100 | 851 | 0.177⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 97 | 100 | 100 | 100 | 663 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 97 | 100 | 100 | 100 | 784 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 762 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 97 | 100 | 100 | 100 | 829 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 100 | 100 | 100 | 801 | 0.05 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 763 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 100 | 100 | 100 | 841 | 0.004 |
| / | mobile | 75 | 100 | 100 | 100 | 5403⚠ | 0.006 |
| /search | mobile | 64⚠ | 100 | 100 | 66⚠ | 5701⚠ | 0.006 |
| /exam | mobile | 80 | 100 | 100 | 100 | 4372⚠ | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 67⚠ | 100 | 100 | 100 | 5154⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 72 | 100 | 100 | 100 | 5643⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 70 | 100 | 100 | 100 | 5260⚠ | 0.014 |
| /exam/civil-construction-1/primary/h26-a | mobile | 68⚠ | 100 | 100 | 100 | 6193⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 72 | 100 | 100 | 100 | 5311⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 69⚠ | 100 | 100 | 100 | 5326⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 67⚠ | 100 | 100 | 100 | 5302⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 72 | 100 | 100 | 100 | 5659⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 66⚠ | 100 | 100 | 100 | 5281⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 75 | 100 | 100 | 100 | 5126⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 68⚠ | 100 | 100 | 100 | 5401⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 81 | 100 | 100 | 100 | 2401 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 68⚠ | 100 | 100 | 100 | 5535⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 74 | 100 | 100 | 100 | 5212⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 92 | 100 | 100 | 100 | 3301⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 72 | 100 | 100 | 100 | 5387⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 67⚠ | 100 | 100 | 100 | 5505⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 48⚠ | 100 | 100 | 100 | 8701⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 73 | 100 | 100 | 100 | 5371⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.227 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (desktop): **TBT** = 372ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **TBT** = 364ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **TBT** = 458ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.177 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5403ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2933ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5701ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3038ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **TBT** = 382ms (閾値: ≤300ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4372ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2917ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5154ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3204ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **TBT** = 344ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5643ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3386ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5260ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3593ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 6193ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3329ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 5311ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3128ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5326ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3609ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5302ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3467ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5659ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3269ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5281ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3331ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **TBT** = 331ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5126ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3088ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5401ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3151ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 1908ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **TBT** = 625ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5535ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3305ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 5212ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3232ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 3301ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5387ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3253ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5505ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3325ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **Performance** = 48 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 8701ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3517ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **TBT** = 643ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5371ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3109ms (閾値: ≤1800ms)