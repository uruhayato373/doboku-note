# PSI 計測レポート — 2026-10-29

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **65件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 100 | 100 | 621 | 0.004 |
| /search | desktop | 99 | 100 | 100 | 66⚠ | 462 | 0.004 |
| /exam | desktop | 97 | 100 | 100 | 100 | 424 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 98 | 100 | 100 | 100 | 969 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 98 | 100 | 100 | 100 | 1004 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 86 | 100 | 100 | 100 | 706 | 0.251⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 80 | 100 | 100 | 100 | 676 | 0.007 |
| /exam/civil-construction-1/secondary/r07 | desktop | 95 | 100 | 100 | 100 | 916 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 97 | 100 | 100 | 100 | 1215 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 97 | 100 | 100 | 100 | 1252 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 95 | 100 | 100 | 100 | 1352 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 97 | 100 | 100 | 100 | 947 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 93 | 100 | 100 | 100 | 1278 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 902 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 92 | 100 | 100 | 100 | 536 | 0.177⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 535 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 99 | 100 | 100 | 100 | 564 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 784 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 98 | 100 | 100 | 100 | 950 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 98 | 100 | 100 | 100 | 1157 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 98 | 100 | 100 | 100 | 1176 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 94 | 100 | 100 | 100 | 969 | 0.004 |
| / | mobile | 69⚠ | 100 | 100 | 100 | 5869⚠ | 0 |
| /search | mobile | 69⚠ | 100 | 100 | 66⚠ | 5411⚠ | 0 |
| /exam | mobile | 99 | 100 | 100 | 100 | 1549 | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 78 | 100 | 100 | 100 | 5471⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 66⚠ | 100 | 100 | 100 | 6752⚠ | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 66⚠ | 100 | 100 | 100 | 6752⚠ | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 66⚠ | 100 | 100 | 100 | 7277⚠ | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 69⚠ | 100 | 100 | 100 | 6076⚠ | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 65⚠ | 100 | 100 | 100 | 6457⚠ | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 86 | 100 | 100 | 100 | 3826⚠ | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 68⚠ | 100 | 100 | 100 | 6527⚠ | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 64⚠ | 100 | 100 | 100 | 6752⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 69⚠ | 100 | 100 | 100 | 6076⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 69⚠ | 100 | 100 | 100 | 6527⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 69⚠ | 100 | 100 | 100 | 6151⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 67⚠ | 100 | 100 | 100 | 6226⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 66⚠ | 100 | 100 | 100 | 6301⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 66⚠ | 100 | 100 | 100 | 6226⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 68⚠ | 100 | 100 | 100 | 6002⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 68⚠ | 100 | 100 | 100 | 6302⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 65⚠ | 100 | 100 | 100 | 6151⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 69⚠ | 100 | 100 | 100 | 6002⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.251 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **TBT** = 450ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.177 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 5869ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3049ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5411ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3301ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5471ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 6752ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3405ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 6752ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3532ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 7277ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3402ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 6076ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3227ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 6457ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3622ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 3826ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 1840ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 6527ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3231ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 6752ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3458ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 6076ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3237ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 6527ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3085ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 6151ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3256ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 6226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3448ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 6301ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3324ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 6226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3344ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 6002ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3393ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 6302ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3230ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 6151ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3360ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 6002ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3189ms (閾値: ≤1800ms)