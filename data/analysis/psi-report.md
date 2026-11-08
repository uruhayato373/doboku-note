# PSI 計測レポート — 2026-11-09

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **20件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 701 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 261 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 245 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 743 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 100 | 100 | 100 | 100 | 741 | 0.016 |
| /exam/civil-construction-1/primary/r07-a | desktop | 86 | 100 | 100 | 100 | 781 | 0.25⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 100 | 100 | 100 | 100 | 326 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 96 | 100 | 100 | 822 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 100 | 100 | 100 | 100 | 703 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 94 | 100 | 100 | 100 | 741 | 0.016 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 608 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 97 | 100 | 100 | 100 | 869 | 0.063 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 100 | 100 | 100 | 701 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 765 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 92 | 100 | 100 | 100 | 321 | 0.177⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 360 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 281 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 755 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 744 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 100 | 100 | 100 | 643 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 724 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 760 | 0.004 |
| / | mobile | 79 | 100 | 100 | 100 | 5430⚠ | 0.006 |
| /search | mobile | 100 | 100 | 100 | 66⚠ | 926 | 0.006 |
| /exam | mobile | 100 | 100 | 100 | 100 | 905 | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 77 | 100 | 100 | 100 | 5504⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 78 | 100 | 100 | 100 | 5593⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 99 | 100 | 100 | 100 | 1351 | 0.014 |
| /exam/civil-construction-1/primary/h26-a | mobile | 98 | 100 | 100 | 100 | 1351 | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 91 | 96 | 100 | 100 | 1053 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 78 | 100 | 100 | 100 | 5866⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 79 | 100 | 100 | 100 | 5429⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 83 | 100 | 100 | 100 | 3676⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 79 | 100 | 100 | 100 | 5594⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 86 | 100 | 100 | 100 | 4248⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 79 | 100 | 100 | 100 | 5363⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 100 | 100 | 100 | 100 | 1351 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 100 | 100 | 100 | 100 | 1351 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 100 | 100 | 100 | 100 | 1051 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 81 | 100 | 100 | 100 | 5078⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 93 | 100 | 100 | 100 | 3226⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 80 | 100 | 100 | 100 | 5304⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 93 | 100 | 100 | 100 | 3151⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 93 | 100 | 100 | 100 | 3226⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.25 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.177 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5430ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5504ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5593ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **TBT** = 348ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5866ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5429ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 3676ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **TBT** = 313ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5594ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4248ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5363ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5078ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5304ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 3151ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)