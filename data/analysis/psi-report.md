# PSI 計測レポート — 2026-10-04

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **52件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 100 | 100 | 662 | 0.004 |
| /search | desktop | 99 | 100 | 100 | 66⚠ | 462 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 435 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 729 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 841 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 100 | 100 | 100 | 881 | 0.222⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 92 | 100 | 100 | 100 | 849 | 0.162⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 98 | 100 | 100 | 100 | 1063 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 69⚠ | 100 | 100 | 100 | 795 | 0.044 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 71 | 100 | 100 | 100 | 892 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 759 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 736 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 98 | 100 | 100 | 100 | 801 | 0.05 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 96 | 100 | 100 | 100 | 642 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 99 | 100 | 100 | 100 | 862 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 862 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 99 | 100 | 100 | 100 | 892 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 96 | 100 | 100 | 100 | 773 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 781 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 98 | 100 | 100 | 100 | 805 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 98 | 100 | 100 | 100 | 1054 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 100 | 100 | 100 | 886 | 0.004 |
| / | mobile | 75 | 100 | 100 | 100 | 5340⚠ | 0.006 |
| /search | mobile | 99 | 100 | 100 | 66⚠ | 1965 | 0.006 |
| /exam | mobile | 99 | 100 | 100 | 100 | 1659 | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 71 | 100 | 100 | 100 | 5131⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 70 | 100 | 100 | 100 | 5630⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 71 | 100 | 100 | 100 | 5690⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 95 | 100 | 100 | 100 | 2701⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 83 | 100 | 100 | 100 | 4625⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 70 | 100 | 100 | 100 | 5894⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 69⚠ | 100 | 100 | 100 | 4482⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 72 | 100 | 100 | 100 | 5737⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 69⚠ | 100 | 100 | 100 | 5744⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 72 | 100 | 100 | 100 | 5180⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 74 | 100 | 100 | 100 | 5317⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 67⚠ | 100 | 100 | 100 | 5308⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 63⚠ | 100 | 100 | 100 | 8551⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 84 | 100 | 100 | 100 | 4354⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 54⚠ | 100 | 100 | 100 | 8776⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 85 | 100 | 100 | 100 | 4278⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 69⚠ | 100 | 100 | 100 | 5378⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 73 | 100 | 100 | 100 | 5177⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 70 | 100 | 100 | 100 | 5371⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.222 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.162 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **TBT** = 1293ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **TBT** = 799ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 5340ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2942ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5131ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3202ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5630ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3337ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5690ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3532ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 2701ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 1826ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 4625ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5894ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3436ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 4482ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3247ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **TBT** = 351ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5737ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3255ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5744ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3370ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5180ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3187ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5317ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3103ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 5308ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3347ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 8551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3302ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 4354ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 8776ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3498ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **TBT** = 433ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 4278ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5378ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3241ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 5177ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3176ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5371ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3188ms (閾値: ≤1800ms)