# PSI 計測レポート — 2026-11-23

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **24件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 95 | 100 | 81⚠ | 100 | 761 | 0 |
| /search | desktop | 93 | 100 | 100 | 69⚠ | 1740 | 0 |
| /exam | desktop | 100 | 100 | 100 | 100 | 245 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 87 | 100 | 81⚠ | 100 | 1441 | 0 |
| /exam/civil-construction-1/guide/four-management | desktop | 98 | 100 | 100 | 100 | 904 | 0 |
| /exam/civil-construction-1/primary/r07-a | desktop | 80 | 100 | 81⚠ | 100 | 761 | 0.215⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 98 | 100 | 100 | 100 | 1010 | 0 |
| /exam/civil-construction-1/secondary/r07 | desktop | 98 | 100 | 100 | 100 | 947 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 90 | 100 | 100 | 100 | 1121 | 0.008 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 95 | 100 | 100 | 100 | 1069 | 0 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 61⚠ | 100 | 81⚠ | 100 | 2141 | 0.233⚠ |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 97 | 100 | 100 | 100 | 1256 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 97 | 100 | 100 | 100 | 1105 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 97 | 100 | 81⚠ | 100 | 921 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 86 | 100 | 100 | 100 | 2474 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 374 | 0.036 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 99 | 100 | 100 | 100 | 295 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 92 | 100 | 81⚠ | 100 | 1000 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 881 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 97 | 100 | 100 | 100 | 1128 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 98 | 100 | 100 | 100 | 945 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 100 | 100 | 100 | 881 | 0 |
| / | mobile | 55⚠ | 100 | 100 | 100 | 6407⚠ | 0 |
| /search | mobile | 82 | 100 | 100 | 66⚠ | 4675⚠ | 0 |
| /exam | mobile | 100 | 100 | 100 | 100 | 905 | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 95 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 99 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 75 | 100 | 100 | 100 | 5594⚠ | 0.031 |
| /exam/civil-construction-1/primary/h26-a | mobile | 80 | 100 | 81⚠ | 100 | 1351 | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 99 | 96 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 95 | 100 | 100 | 100 | 1501 | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 93 | 100 | 81⚠ | 100 | 1351 | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 99 | 99 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 96 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 93 | 100 | 81⚠ | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 99 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 97 | 100 | 81⚠ | 100 | 1351 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 96 | 100 | 100 | 100 | 1501 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 97 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 81 | 100 | 100 | 100 | 4681⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 92 | 100 | 100 | 100 | 1828 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 99 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 99 | 100 | 100 | 100 | 1051 | 0 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/search` (desktop): **SEO** = 69 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.215 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **CLS** = 0.233 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **TBT** = 370ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 6407ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **TBT** = 547ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4675ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5594ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **TBT** = 607ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 4681ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 1828ms (閾値: ≤1800ms)