# PSI 計測レポート — 2026-11-06

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **21件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 747 | 0.004 |
| /search | desktop | 99 | 100 | 100 | 66⚠ | 282 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 245 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 99 | 100 | 100 | 100 | 685 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 666 | 0.016 |
| /exam/civil-construction-1/primary/r07-a | desktop | 86 | 100 | 100 | 100 | 781 | 0.251⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 100 | 100 | 100 | 945 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 96 | 100 | 100 | 793 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 86 | 100 | 100 | 100 | 653 | 0.048 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 98 | 100 | 100 | 100 | 704 | 0.016 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 96 | 100 | 100 | 100 | 741 | 0.05 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 893 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 100 | 100 | 100 | 742 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 921 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 92 | 100 | 100 | 100 | 326 | 0.177⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 364 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 316 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 99 | 100 | 100 | 100 | 739 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 681 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 100 | 100 | 100 | 885 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 721 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 98 | 100 | 100 | 100 | 683 | 0.004 |
| / | mobile | 80 | 100 | 100 | 100 | 5212⚠ | 0 |
| /search | mobile | 94 | 100 | 100 | 66⚠ | 971 | 0.006 |
| /exam | mobile | 95 | 100 | 100 | 100 | 905 | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 72 | 100 | 100 | 100 | 6601⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 79 | 100 | 100 | 100 | 5584⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 99 | 100 | 100 | 100 | 1351 | 0.014 |
| /exam/civil-construction-1/primary/h26-a | mobile | 100 | 100 | 100 | 100 | 1351 | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 95 | 96 | 100 | 100 | 1811 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 81 | 100 | 100 | 100 | 4126⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 82 | 100 | 100 | 100 | 4591⚠ | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 79 | 100 | 100 | 100 | 5539⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 78 | 100 | 100 | 100 | 5539⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 81 | 100 | 100 | 100 | 5079⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 77 | 100 | 100 | 100 | 5484⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 100 | 100 | 100 | 100 | 1351 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 98 | 100 | 100 | 100 | 1351 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 97 | 100 | 100 | 100 | 1051 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 79 | 100 | 100 | 100 | 5146⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 93 | 100 | 100 | 100 | 3226⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 92 | 100 | 100 | 100 | 3226⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 84 | 100 | 100 | 100 | 4607⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 81 | 100 | 100 | 100 | 5060⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.251 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **TBT** = 328ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.177 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5212ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 6601ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 1814ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5584ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 1811ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 4126ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 4591ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5539ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5539ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5079ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5484ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5146ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 4607ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5060ms (閾値: ≤2500ms)