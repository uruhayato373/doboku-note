# PSI 計測レポート — 2026-11-12

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **17件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 621 | 0.004 |
| /search | desktop | 97 | 100 | 100 | 66⚠ | 277 | 0.004 |
| /exam | desktop | 97 | 100 | 100 | 100 | 261 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 741 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 751 | 0.016 |
| /exam/civil-construction-1/primary/r07-a | desktop | 100 | 100 | 100 | 100 | 821 | 0.02 |
| /exam/civil-construction-1/primary/h26-a | desktop | 100 | 100 | 100 | 100 | 331 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 99 | 96 | 100 | 100 | 822 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 98 | 100 | 100 | 100 | 663 | 0.048 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 100 | 100 | 100 | 781 | 0.016 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 98 | 100 | 100 | 100 | 607 | 0.05 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 721 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 98 | 100 | 100 | 100 | 833 | 0.048 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 584 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 321 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 96 | 100 | 100 | 100 | 366 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 281 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 721 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 98 | 100 | 100 | 100 | 812 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 701 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 95 | 100 | 100 | 100 | 669 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 735 | 0.004 |
| / | mobile | 96 | 100 | 96 | 100 | 2626⚠ | 0.006 |
| /search | mobile | 99 | 100 | 100 | 66⚠ | 955 | 0.006 |
| /exam | mobile | 96 | 100 | 100 | 100 | 905 | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 80 | 100 | 100 | 100 | 5202⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 79 | 100 | 100 | 100 | 5521⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 100 | 100 | 100 | 100 | 1351 | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 100 | 100 | 100 | 100 | 1351 | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 99 | 96 | 100 | 100 | 1051 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 85 | 100 | 100 | 100 | 4426⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 79 | 100 | 100 | 100 | 5566⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 78 | 100 | 100 | 100 | 5693⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 78 | 100 | 100 | 100 | 5532⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 80 | 100 | 100 | 100 | 5186⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 79 | 100 | 100 | 100 | 5421⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 89 | 100 | 100 | 100 | 2468 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 99 | 100 | 100 | 100 | 1351 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 100 | 100 | 100 | 100 | 1051 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 79 | 100 | 100 | 100 | 5319⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 78 | 100 | 100 | 100 | 5294⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 77 | 100 | 100 | 100 | 5445⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 78 | 100 | 100 | 100 | 5253⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 93 | 100 | 100 | 100 | 3226⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5202ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5521ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 4426ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5566ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5693ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5532ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5186ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5421ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 2468ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5319ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5294ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5445ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 5253ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)