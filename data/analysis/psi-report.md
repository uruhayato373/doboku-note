# PSI 計測レポート — 2026-11-08

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **20件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 621 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 258 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 245 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 821 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 100 | 100 | 100 | 100 | 642 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 86 | 100 | 100 | 100 | 902 | 0.25⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 100 | 100 | 100 | 841 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 96 | 100 | 100 | 666 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 860 | 0.048 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 99 | 100 | 100 | 100 | 921 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 861 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 904 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 98 | 100 | 100 | 100 | 1061 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 661 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 321 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 361 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 281 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 703 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 595 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 100 | 100 | 100 | 830 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 743 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 741 | 0.004 |
| / | mobile | 74 | 100 | 100 | 100 | 6451⚠ | 0 |
| /search | mobile | 100 | 100 | 100 | 66⚠ | 930 | 0.006 |
| /exam | mobile | 99 | 100 | 100 | 100 | 905 | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 81 | 100 | 100 | 100 | 5146⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 79 | 100 | 100 | 100 | 5552⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 99 | 100 | 100 | 100 | 1351 | 0.014 |
| /exam/civil-construction-1/primary/h26-a | mobile | 94 | 100 | 100 | 100 | 2008 | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 100 | 96 | 100 | 100 | 1051 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 69⚠ | 100 | 100 | 100 | 8176⚠ | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 78 | 100 | 100 | 100 | 5897⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 88 | 100 | 100 | 100 | 3901⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 88 | 100 | 100 | 100 | 3901⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 86 | 100 | 100 | 100 | 4188⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 84 | 100 | 100 | 100 | 4638⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 98 | 100 | 100 | 100 | 2251 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 100 | 100 | 100 | 100 | 1351 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 95 | 100 | 100 | 100 | 1757 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 81 | 100 | 100 | 100 | 5038⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 93 | 100 | 100 | 100 | 3226⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 94 | 100 | 100 | 100 | 3151⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 81 | 100 | 100 | 100 | 5056⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 93 | 100 | 100 | 100 | 3226⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.25 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 6451ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5146ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5552ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 2008ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 8176ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 2118ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5897ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 3901ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 3901ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4188ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 4638ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5038ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 3151ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 5056ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)