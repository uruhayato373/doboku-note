# PSI 計測レポート — 2026-11-16

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **10件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 702 | 0 |
| /search | desktop | 94 | 100 | 100 | 66⚠ | 306 | 0 |
| /exam | desktop | 100 | 100 | 100 | 100 | 245 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 93 | 100 | 100 | 100 | 1757 | 0 |
| /exam/civil-construction-1/guide/four-management | desktop | 94 | 100 | 100 | 100 | 1652 | 0 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 100 | 100 | 100 | 956 | 0.213⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 91 | 100 | 100 | 100 | 1961 | 0 |
| /exam/civil-construction-1/secondary/r07 | desktop | 95 | 100 | 100 | 100 | 1472 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 96 | 100 | 100 | 100 | 1436 | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 100 | 100 | 100 | 353 | 0 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 94 | 100 | 100 | 100 | 1651 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 98 | 100 | 100 | 100 | 1061 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 100 | 100 | 100 | 281 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 286 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 99 | 100 | 100 | 100 | 841 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 370 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 282 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 766 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 996 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 93 | 100 | 100 | 100 | 1494 | 0.017 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 94 | 100 | 100 | 100 | 1561 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 98 | 100 | 100 | 100 | 1082 | 0 |
| / | mobile | 94 | 100 | 100 | 100 | 2926⚠ | 0 |
| /search | mobile | 97 | 100 | 100 | 66⚠ | 1970 | 0 |
| /exam | mobile | 100 | 100 | 100 | 100 | 905 | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 95 | 100 | 100 | 100 | 1823 | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 100 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 77 | 100 | 100 | 100 | 5618⚠ | 0.031 |
| /exam/civil-construction-1/primary/h26-a | mobile | 81 | 100 | 100 | 100 | 3276⚠ | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 86 | 96 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 99 | 100 | 100 | 100 | 1351 | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 100 | 100 | 100 | 100 | 1351 | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 100 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 99 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 100 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 100 | 100 | 100 | 100 | 1351 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 100 | 100 | 100 | 100 | 1351 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 99 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 98 | 100 | 100 | 100 | 1707 | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.213 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 2926ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **FCP** = 1970ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 1823ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5618ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 3276ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3276ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **TBT** = 470ms (閾値: ≤300ms)