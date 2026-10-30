# PSI 計測レポート — 2026-10-31

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **26件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 667 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 298 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 259 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 701 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 881 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 87 | 100 | 100 | 100 | 782 | 0.25⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 100 | 100 | 100 | 342 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 100 | 100 | 100 | 761 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 855 | 0.048 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 98 | 100 | 100 | 100 | 761 | 0.016 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 864 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 884 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 100 | 100 | 100 | 702 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 98 | 100 | 100 | 100 | 839 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 321 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 322 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 92 | 100 | 100 | 100 | 330 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 704 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 739 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 100 | 100 | 100 | 960 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 607 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 772 | 0.004 |
| / | mobile | 74 | 100 | 100 | 100 | 5660⚠ | 0 |
| /search | mobile | 96 | 100 | 100 | 66⚠ | 2016 | 0 |
| /exam | mobile | 93 | 100 | 100 | 100 | 905 | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 75 | 100 | 100 | 100 | 5926⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 70 | 100 | 100 | 100 | 6676⚠ | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 95 | 100 | 100 | 100 | 1975 | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 99 | 100 | 100 | 100 | 1201 | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 94 | 100 | 100 | 100 | 1813 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 71 | 100 | 100 | 100 | 7801⚠ | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 80 | 100 | 100 | 100 | 5352⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 72 | 100 | 100 | 100 | 7201⚠ | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 79 | 100 | 100 | 100 | 5661⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 81 | 100 | 100 | 100 | 5105⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 80 | 100 | 100 | 100 | 5252⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 93 | 100 | 100 | 100 | 1979 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 98 | 100 | 100 | 100 | 1201 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 100 | 100 | 100 | 100 | 1051 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 94 | 100 | 100 | 100 | 3151⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 80 | 100 | 100 | 100 | 5198⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 81 | 100 | 100 | 100 | 5091⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 81 | 100 | 100 | 100 | 5186⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 94 | 100 | 100 | 100 | 3151⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.25 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5660ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **FCP** = 2016ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **TBT** = 301ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5926ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 1811ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 6676ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 1917ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 1975ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 1813ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 7801ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 2084ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5352ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 1895ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5661ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5105ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5252ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 1979ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 3151ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5198ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5091ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 5186ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 3151ms (閾値: ≤2500ms)