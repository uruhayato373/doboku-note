# PSI 計測レポート — 2026-10-02

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **51件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 756 | 0.004 |
| /search | desktop | 94 | 100 | 100 | 66⚠ | 467 | 0.004 |
| /exam | desktop | 91 | 100 | 100 | 100 | 490 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 82 | 100 | 100 | 100 | 726 | 0.235⚠ |
| /exam/civil-construction-1/guide/four-management | desktop | 86 | 100 | 100 | 100 | 741 | 0.008 |
| /exam/civil-construction-1/primary/r07-a | desktop | 87 | 100 | 100 | 100 | 841 | 0.231⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 77 | 100 | 100 | 100 | 863 | 0.158⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 100 | 100 | 100 | 620 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 734 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 100 | 100 | 100 | 730 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 821 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 803 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 98 | 100 | 100 | 100 | 733 | 0.03 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 678 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 642 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 642 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 642 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 99 | 100 | 100 | 100 | 636 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 746 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 623 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 626 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 721 | 0.004 |
| / | mobile | 93 | 100 | 100 | 100 | 2630⚠ | 0.006 |
| /search | mobile | 66⚠ | 100 | 100 | 66⚠ | 5113⚠ | 0.006 |
| /exam | mobile | 79 | 100 | 100 | 100 | 4300⚠ | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 76 | 100 | 100 | 100 | 4869⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 71 | 100 | 100 | 100 | 5417⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 68⚠ | 100 | 100 | 100 | 5026⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 67⚠ | 100 | 100 | 100 | 5326⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 74 | 100 | 100 | 100 | 4945⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 73 | 100 | 100 | 100 | 5196⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 71 | 100 | 100 | 100 | 5459⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 72 | 100 | 100 | 100 | 5438⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 72 | 100 | 100 | 100 | 5430⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 98 | 100 | 100 | 100 | 1951 | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 72 | 100 | 100 | 100 | 5285⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 73 | 100 | 100 | 100 | 4975⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 75 | 100 | 100 | 100 | 4900⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 98 | 100 | 100 | 100 | 2252 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 73 | 100 | 100 | 100 | 4938⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 63⚠ | 100 | 100 | 100 | 8551⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 73 | 100 | 100 | 100 | 5230⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 74 | 100 | 100 | 100 | 4929⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 71 | 100 | 100 | 100 | 5272⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **CLS** = 0.235 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (desktop): **TBT** = 322ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.231 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **TBT** = 360ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 2630ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5113ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3340ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **TBT** = 363ms (閾値: ≤300ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4300ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2984ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 4869ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3077ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5417ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3429ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5026ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3621ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5326ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3322ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 4945ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3144ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5196ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3420ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5459ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3420ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5438ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3278ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5430ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3418ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5285ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3159ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4975ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3275ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 4900ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3227ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 4938ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3143ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 8551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3286ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5230ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3265ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 4929ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3278ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5272ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3310ms (閾値: ≤1800ms)