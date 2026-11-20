# PSI 計測レポート — 2026-11-20

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **18件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 100 | 661 | 0 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 281 | 0 |
| /exam | desktop | 97 | 100 | 100 | 100 | 245 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 90 | 100 | 100 | 100 | 2016 | 0 |
| /exam/civil-construction-1/guide/four-management | desktop | 97 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/primary/r07-a | desktop | 87 | 100 | 100 | 100 | 1112 | 0.213⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 97 | 100 | 81⚠ | 100 | 1163 | 0 |
| /exam/civil-construction-1/secondary/r07 | desktop | 91 | 100 | 100 | 100 | 1689 | 0.005 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 78 | 100 | 81⚠ | 100 | 1210 | 0.008 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 97 | 100 | 100 | 100 | 1217 | 0 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 98 | 100 | 100 | 100 | 1121 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 91 | 100 | 81⚠ | 100 | 1657 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 97 | 100 | 100 | 100 | 1187 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 98 | 100 | 100 | 100 | 1084 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 90 | 100 | 100 | 100 | 951 | 0.17⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 95 | 100 | 100 | 100 | 503 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 78 | 100 | 81⚠ | 100 | 351 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 97 | 100 | 100 | 100 | 1209 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 98 | 100 | 100 | 100 | 1112 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 98 | 100 | 100 | 100 | 961 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 99 | 100 | 100 | 100 | 861 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 92 | 100 | 100 | 100 | 861 | 0.008 |
| / | mobile | 67⚠ | 100 | 100 | 100 | 5486⚠ | 0 |
| /search | mobile | 96 | 100 | 100 | 66⚠ | 1051 | 0 |
| /exam | mobile | 94 | 100 | 100 | 100 | 1978 | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 98 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 96 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 76 | 100 | 100 | 100 | 5656⚠ | 0.031 |
| /exam/civil-construction-1/primary/h26-a | mobile | 96 | 100 | 100 | 100 | 1351 | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 97 | 96 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 98 | 100 | 100 | 100 | 1501 | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 98 | 100 | 100 | 100 | 1351 | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 90 | 100 | 81⚠ | 100 | 1201 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 98 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 97 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 98 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 96 | 100 | 100 | 100 | 1351 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 96 | 100 | 100 | 100 | 1501 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 99 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 89 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 98 | 100 | 81⚠ | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 99 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 99 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 99 | 100 | 100 | 100 | 1051 | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.213 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **TBT** = 442ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.17 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (desktop): **TBT** = 512ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 5486ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3061ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam` (mobile): **FCP** = 1978ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5656ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **TBT** = 370ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Best Practices** = 81 (閾値: ≥85)