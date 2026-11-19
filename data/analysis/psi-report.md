# PSI 計測レポート — 2026-11-19

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **25件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 76 | 100 | 96 | 100 | 661 | 0 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 281 | 0 |
| /exam | desktop | 100 | 100 | 100 | 100 | 245 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 92 | 100 | 100 | 100 | 1746 | 0 |
| /exam/civil-construction-1/guide/four-management | desktop | 90 | 100 | 100 | 100 | 1519 | 0 |
| /exam/civil-construction-1/primary/r07-a | desktop | 86 | 100 | 100 | 100 | 702 | 0.214⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 82 | 100 | 100 | 100 | 1229 | 0 |
| /exam/civil-construction-1/secondary/r07 | desktop | 92 | 100 | 100 | 100 | 1117 | 0.005 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 87 | 100 | 100 | 100 | 1401 | 0.008 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 96 | 100 | 100 | 100 | 1121 | 0 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 98 | 100 | 81⚠ | 100 | 1002 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 97 | 100 | 100 | 100 | 1054 | 0.001 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 94 | 100 | 100 | 100 | 1624 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 897 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 91 | 100 | 100 | 100 | 954 | 0.17⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 93 | 100 | 81⚠ | 100 | 381 | 0.036 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 73⚠ | 100 | 282 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 94 | 100 | 81⚠ | 100 | 1089 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 921 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 100 | 100 | 100 | 881 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 94 | 100 | 100 | 100 | 1530 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 100 | 100 | 100 | 921 | 0 |
| / | mobile | 74 | 100 | 96 | 100 | 5569⚠ | 0 |
| /search | mobile | 95 | 100 | 100 | 66⚠ | 1965 | 0 |
| /exam | mobile | 98 | 100 | 100 | 100 | 910 | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 95 | 100 | 100 | 100 | 1202 | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 84 | 100 | 100 | 100 | 2045 | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 62⚠ | 100 | 100 | 100 | 6676⚠ | 0.031 |
| /exam/civil-construction-1/primary/h26-a | mobile | 96 | 100 | 92 | 100 | 1351 | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 99 | 96 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 85 | 100 | 100 | 100 | 2332 | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 94 | 100 | 100 | 100 | 1366 | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 98 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 97 | 100 | 81⚠ | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 95 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 97 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 98 | 100 | 100 | 100 | 1351 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 96 | 100 | 100 | 100 | 1501 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 85 | 100 | 100 | 100 | 1573 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 98 | 100 | 92 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 97 | 100 | 81⚠ | 100 | 1704 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 95 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 93 | 100 | 100 | 100 | 1816 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 94 | 100 | 100 | 100 | 1819 | 0 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **TBT** = 593ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.214 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **TBT** = 343ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.17 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (desktop): **Best Practices** = 73 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/` (mobile): **LCP** = 5569ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **FCP** = 1965ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 2045ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **TBT** = 409ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 6676ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 2166ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **TBT** = 373ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 2332ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **TBT** = 313ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **TBT** = 380ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 1816ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 1819ms (閾値: ≤1800ms)