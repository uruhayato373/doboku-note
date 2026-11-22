# PSI 計測レポート — 2026-11-22

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **21件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 100 | 641 | 0 |
| /search | desktop | 99 | 100 | 81⚠ | 66⚠ | 281 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 245 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 91 | 100 | 100 | 100 | 1900 | 0 |
| /exam/civil-construction-1/guide/four-management | desktop | 91 | 100 | 100 | 100 | 1627 | 0 |
| /exam/civil-construction-1/primary/r07-a | desktop | 73 | 100 | 100 | 100 | 703 | 0.215⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 75 | 100 | 81⚠ | 100 | 1023 | 0 |
| /exam/civil-construction-1/secondary/r07 | desktop | 98 | 100 | 100 | 100 | 903 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 95 | 100 | 100 | 100 | 1430 | 0.008 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 60⚠ | 100 | 100 | 100 | 2002 | 0 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 98 | 100 | 100 | 100 | 1068 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 945 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 100 | 100 | 100 | 849 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 98 | 100 | 100 | 100 | 1145 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 99 | 100 | 100 | 100 | 852 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 85 | 100 | 81⚠ | 100 | 383 | 0.036 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 286 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 92 | 100 | 81⚠ | 100 | 1371 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 965 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 95 | 100 | 81⚠ | 100 | 861 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 98 | 100 | 100 | 100 | 1099 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 98 | 100 | 100 | 100 | 1125 | 0 |
| / | mobile | 77 | 100 | 77⚠ | 100 | 5311⚠ | 0 |
| /search | mobile | 98 | 100 | 100 | 66⚠ | 1051 | 0 |
| /exam | mobile | 100 | 100 | 100 | 100 | 905 | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 100 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 98 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 77 | 100 | 100 | 100 | 5596⚠ | 0.031 |
| /exam/civil-construction-1/primary/h26-a | mobile | 95 | 100 | 81⚠ | 100 | 1351 | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 99 | 96 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 99 | 100 | 100 | 100 | 1501 | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 74 | 100 | 100 | 100 | 5343⚠ | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 100 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 79 | 100 | 81⚠ | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 98 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 100 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 97 | 100 | 100 | 100 | 1351 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 98 | 100 | 96 | 100 | 1501 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 93 | 100 | 81⚠ | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 99 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.215 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **TBT** = 356ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **TBT** = 487ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **TBT** = 1088ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (desktop): **TBT** = 330ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/` (mobile): **Best Practices** = 77 (閾値: ≥85)
- `https://doboku-note.com/` (mobile): **LCP** = 5311ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5596ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5343ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **TBT** = 563ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **Best Practices** = 81 (閾値: ≥85)