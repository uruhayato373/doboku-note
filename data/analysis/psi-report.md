# PSI 計測レポート — 2026-11-18

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **20件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 100 | 100 | 761 | 0 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 281 | 0 |
| /exam | desktop | 99 | 100 | 100 | 100 | 245 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 91 | 100 | 100 | 100 | 1909 | 0 |
| /exam/civil-construction-1/guide/four-management | desktop | 91 | 100 | 100 | 100 | 1675 | 0 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 100 | 100 | 100 | 841 | 0.213⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 74 | 100 | 100 | 100 | 1559 | 0 |
| /exam/civil-construction-1/secondary/r07 | desktop | 93 | 100 | 100 | 100 | 1580 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 96 | 100 | 100 | 100 | 1021 | 0.008 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 98 | 100 | 100 | 100 | 1141 | 0 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 85 | 100 | 100 | 100 | 1041 | 0.233⚠ |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 69⚠ | 100 | 100 | 100 | 1079 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 96 | 100 | 100 | 100 | 1381 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 931 | 0.018 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 98 | 100 | 100 | 100 | 952 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 361 | 0.036 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 281 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 93 | 100 | 100 | 100 | 1175 | 0.011 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 93 | 100 | 92 | 100 | 881 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 86 | 100 | 81⚠ | 100 | 921 | 0.008 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 99 | 100 | 100 | 100 | 800 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 93 | 100 | 100 | 100 | 1683 | 0 |
| / | mobile | 69⚠ | 100 | 96 | 100 | 6180⚠ | 0 |
| /search | mobile | 90 | 100 | 81⚠ | 66⚠ | 1051 | 0 |
| /exam | mobile | 99 | 100 | 100 | 100 | 906 | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 93 | 100 | 100 | 100 | 1888 | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 97 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 65⚠ | 100 | 81⚠ | 100 | 5559⚠ | 0.031 |
| /exam/civil-construction-1/primary/h26-a | mobile | 91 | 100 | 81⚠ | 100 | 2110 | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 97 | 96 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 98 | 100 | 100 | 100 | 1501 | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 98 | 100 | 100 | 100 | 1351 | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 98 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 97 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 97 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 95 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 95 | 100 | 100 | 100 | 1351 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 97 | 100 | 100 | 100 | 1501 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 99 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 99 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 93 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 94 | 100 | 100 | 100 | 1051 | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.213 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **TBT** = 463ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **CLS** = 0.233 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **TBT** = 945ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 6180ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 1809ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **TBT** = 351ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 1888ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5559ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **TBT** = 311ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 2110ms (閾値: ≤1800ms)