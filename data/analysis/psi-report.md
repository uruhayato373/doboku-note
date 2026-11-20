# PSI 計測レポート — 2026-11-21

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **17件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 661 | 0 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 281 | 0 |
| /exam | desktop | 99 | 100 | 100 | 100 | 245 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 92 | 100 | 100 | 100 | 1826 | 0 |
| /exam/civil-construction-1/guide/four-management | desktop | 94 | 100 | 100 | 100 | 1607 | 0 |
| /exam/civil-construction-1/primary/r07-a | desktop | 63⚠ | 100 | 100 | 100 | 683 | 0.214⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 97 | 100 | 100 | 100 | 1162 | 0 |
| /exam/civil-construction-1/secondary/r07 | desktop | 82 | 100 | 100 | 100 | 1100 | 0.008 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 97 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 93 | 100 | 100 | 100 | 1161 | 0 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 98 | 100 | 100 | 100 | 1026 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 92 | 100 | 81⚠ | 100 | 1041 | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 98 | 100 | 100 | 100 | 855 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 876 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 87 | 100 | 100 | 100 | 1511 | 0.17⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 374 | 0.036 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 97 | 100 | 81⚠ | 100 | 281 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 97 | 100 | 81⚠ | 100 | 861 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 76 | 100 | 100 | 100 | 835 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 100 | 100 | 100 | 881 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 99 | 100 | 100 | 100 | 861 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 95 | 100 | 100 | 100 | 1156 | 0 |
| / | mobile | 77 | 100 | 96 | 100 | 5357⚠ | 0 |
| /search | mobile | 73 | 100 | 100 | 66⚠ | 4216⚠ | 0 |
| /exam | mobile | 99 | 100 | 100 | 100 | 905 | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 98 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 100 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 94 | 100 | 100 | 100 | 3001⚠ | 0.031 |
| /exam/civil-construction-1/primary/h26-a | mobile | 99 | 100 | 100 | 100 | 1351 | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 94 | 96 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 96 | 100 | 96 | 100 | 1501 | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 93 | 100 | 100 | 100 | 1351 | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 90 | 100 | 96 | 100 | 1201 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 99 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 97 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 88 | 100 | 77⚠ | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 97 | 100 | 100 | 100 | 1351 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 95 | 100 | 100 | 100 | 1501 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 97 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 95 | 100 | 92 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 98 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 98 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.214 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **TBT** = 682ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (desktop): **TBT** = 353ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.17 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (desktop): **TBT** = 546ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 5357ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4216ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 4216ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 3001ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **Best Practices** = 77 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **TBT** = 320ms (閾値: ≤300ms)