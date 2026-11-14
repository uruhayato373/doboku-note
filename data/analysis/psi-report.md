# PSI 計測レポート — 2026-11-15

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **24件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 721 | 0 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 281 | 0 |
| /exam | desktop | 100 | 100 | 100 | 100 | 245 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 741 | 0 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 608 | 0 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 100 | 100 | 100 | 841 | 0.22⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 100 | 100 | 100 | 100 | 349 | 0 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 100 | 100 | 100 | 661 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 943 | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 100 | 100 | 100 | 792 | 0 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 741 | 0.046 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 89 | 100 | 100 | 100 | 608 | 0.059 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 100 | 100 | 100 | 701 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 98 | 100 | 100 | 100 | 793 | 0.02 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 92 | 100 | 100 | 100 | 324 | 0.173⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 73 | 100 | 100 | 100 | 335 | 0.037 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 281 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 99 | 100 | 100 | 100 | 1009 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 881 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 97 | 100 | 100 | 100 | 757 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 741 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 100 | 100 | 100 | 771 | 0 |
| / | mobile | 73 | 100 | 96 | 100 | 6751⚠ | 0 |
| /search | mobile | 100 | 100 | 100 | 66⚠ | 1051 | 0 |
| /exam | mobile | 100 | 100 | 100 | 100 | 905 | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 84 | 100 | 100 | 100 | 4498⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 79 | 100 | 100 | 100 | 5698⚠ | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 93 | 100 | 100 | 100 | 2181 | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 96 | 100 | 100 | 100 | 1351 | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 70 | 96 | 100 | 100 | 1051 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 81 | 100 | 100 | 100 | 5176⚠ | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 88 | 100 | 100 | 100 | 3826⚠ | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 79 | 100 | 100 | 100 | 5503⚠ | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 78 | 100 | 100 | 100 | 5717⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 81 | 100 | 100 | 100 | 5077⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 63⚠ | 100 | 100 | 100 | 7126⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 98 | 100 | 100 | 100 | 1351 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 100 | 100 | 100 | 100 | 1351 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 94 | 100 | 100 | 100 | 3151⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 80 | 100 | 100 | 100 | 5186⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 94 | 100 | 100 | 100 | 3151⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 79 | 100 | 100 | 100 | 5159⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 93 | 100 | 100 | 100 | 3226⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.22 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.173 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (desktop): **TBT** = 763ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 6751ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 4498ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5698ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 2181ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **TBT** = 3886ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5176ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 3826ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5503ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5717ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5077ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 7126ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 1880ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **TBT** = 404ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 3151ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5186ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 3151ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 5159ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)