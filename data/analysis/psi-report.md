# PSI 計測レポート — 2026-11-05

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **23件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 641 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 274 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 245 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 752 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 98 | 100 | 100 | 100 | 841 | 0.016 |
| /exam/civil-construction-1/primary/r07-a | desktop | 87 | 100 | 100 | 100 | 685 | 0.25⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 97 | 100 | 100 | 100 | 364 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 99 | 96 | 100 | 100 | 827 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 866 | 0.048 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 100 | 100 | 100 | 781 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 810 | 0.05 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 910 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 98 | 100 | 100 | 100 | 1081 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 851 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 90 | 100 | 100 | 100 | 328 | 0.177⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 356 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 99 | 100 | 100 | 100 | 366 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 99 | 100 | 100 | 100 | 763 | 0.043 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 641 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 711 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 721 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 741 | 0.004 |
| / | mobile | 96 | 100 | 100 | 100 | 2851⚠ | 0.006 |
| /search | mobile | 96 | 100 | 100 | 66⚠ | 1996 | 0 |
| /exam | mobile | 100 | 100 | 100 | 100 | 905 | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 81 | 100 | 100 | 100 | 5144⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 79 | 100 | 100 | 100 | 5477⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 99 | 100 | 100 | 100 | 1351 | 0.014 |
| /exam/civil-construction-1/primary/h26-a | mobile | 92 | 100 | 100 | 100 | 2085 | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 100 | 96 | 100 | 100 | 1051 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 78 | 100 | 100 | 100 | 5945⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 77 | 100 | 100 | 100 | 5616⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 82 | 100 | 100 | 100 | 4801⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 79 | 100 | 100 | 100 | 5579⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 80 | 100 | 100 | 100 | 5172⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 89 | 100 | 100 | 100 | 3376⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 94 | 100 | 100 | 100 | 2113 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 99 | 100 | 100 | 100 | 1351 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 100 | 100 | 100 | 100 | 1051 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 94 | 100 | 100 | 100 | 3151⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 83 | 100 | 100 | 100 | 4657⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 93 | 100 | 100 | 100 | 3226⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 94 | 100 | 100 | 100 | 3151⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 58⚠ | 100 | 100 | 100 | 5926⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.25 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.177 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 2851ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **FCP** = 1996ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5144ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5477ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 2085ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5945ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5616ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 4801ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5579ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5172ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 3376ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 2113ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 3151ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 4657ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 3151ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5926ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **TBT** = 745ms (閾値: ≤300ms)