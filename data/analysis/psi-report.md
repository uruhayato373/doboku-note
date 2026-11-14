# PSI 計測レポート — 2026-11-14

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **20件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 766 | 0 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 293 | 0 |
| /exam | desktop | 92 | 100 | 100 | 100 | 245 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 99 | 100 | 100 | 100 | 781 | 0 |
| /exam/civil-construction-1/guide/four-management | desktop | 93 | 100 | 100 | 100 | 624 | 0.012 |
| /exam/civil-construction-1/primary/r07-a | desktop | 87 | 100 | 100 | 100 | 841 | 0.222⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 100 | 100 | 100 | 100 | 326 | 0 |
| /exam/civil-construction-1/secondary/r07 | desktop | 99 | 100 | 100 | 100 | 821 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 98 | 100 | 100 | 100 | 704 | 0.044 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 99 | 100 | 100 | 100 | 643 | 0.012 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 841 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 97 | 100 | 100 | 100 | 668 | 0.059 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 100 | 100 | 100 | 701 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 1018 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 91 | 100 | 100 | 100 | 339 | 0.173⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 396 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 281 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 95 | 100 | 100 | 100 | 823 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 681 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 750 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 704 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 741 | 0 |
| / | mobile | 78 | 100 | 100 | 100 | 5805⚠ | 0 |
| /search | mobile | 99 | 100 | 100 | 66⚠ | 1051 | 0 |
| /exam | mobile | 97 | 100 | 100 | 100 | 1980 | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 77 | 100 | 100 | 100 | 5527⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 77 | 100 | 100 | 100 | 5661⚠ | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 99 | 100 | 100 | 100 | 1351 | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 98 | 100 | 100 | 100 | 1351 | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 100 | 96 | 100 | 100 | 1051 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 87 | 100 | 100 | 100 | 3976⚠ | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 79 | 100 | 100 | 100 | 5553⚠ | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 79 | 100 | 100 | 100 | 5496⚠ | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 79 | 100 | 100 | 100 | 5515⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 93 | 100 | 100 | 100 | 3226⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 76 | 100 | 100 | 100 | 5681⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 100 | 100 | 100 | 100 | 1351 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 94 | 100 | 100 | 100 | 2112 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 76 | 100 | 100 | 100 | 5342⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 79 | 100 | 100 | 100 | 5250⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 80 | 100 | 100 | 100 | 5310⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 81 | 100 | 100 | 100 | 5060⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 90 | 100 | 100 | 100 | 3601⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.222 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.173 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5805ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam` (mobile): **FCP** = 1980ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5527ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5661ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 3976ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5553ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5496ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5515ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5681ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 2112ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5342ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5250ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5310ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 5060ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 3601ms (閾値: ≤2500ms)