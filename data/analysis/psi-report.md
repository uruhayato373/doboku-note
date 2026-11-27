# PSI 計測レポート — 2026-11-27

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **46件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 89 | 97 | 100 | 100 | 561 | 0.206⚠ |
| /search | desktop | 86 | 100 | 81⚠ | 69⚠ | 1229 | 0.206⚠ |
| /exam | desktop | 89 | 100 | 81⚠ | 100 | 245 | 0.206⚠ |
| /exam/civil-construction-1/guide/strategy | desktop | 75 | 96 | 81⚠ | 100 | 1625 | 0.206⚠ |
| /exam/civil-construction-1/guide/four-management | desktop | 86 | 97 | 100 | 100 | 1141 | 0.206⚠ |
| /exam/civil-construction-1/primary/r07-a | desktop | 87 | 93 | 100 | 100 | 801 | 0.206⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 86 | 97 | 100 | 100 | 1101 | 0.21⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 83 | 93 | 100 | 100 | 1534 | 0.206⚠ |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 64⚠ | 97 | 100 | 100 | 1241 | 0.206⚠ |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 75 | 97 | 100 | 100 | 1061 | 0.206⚠ |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 85 | 97 | 81⚠ | 100 | 941 | 0.206⚠ |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 81 | 96 | 100 | 100 | 1852 | 0.211⚠ |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 88 | 97 | 100 | 100 | 908 | 0.206⚠ |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 89 | 97 | 100 | 100 | 871 | 0.206⚠ |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 74 | 97 | 81⚠ | 100 | 908 | 0.344⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 88 | 93 | 81⚠ | 100 | 365 | 0.223⚠ |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 89 | 100 | 100 | 100 | 301 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 85 | 96 | 92 | 100 | 1344 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 89 | 97 | 100 | 100 | 881 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 87 | 100 | 100 | 100 | 1101 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 88 | 96 | 100 | 100 | 861 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 88 | 96 | 100 | 100 | 967 | 0.206⚠ |
| / | mobile | 72 | 100 | 81⚠ | 100 | 6192⚠ | 0 |
| /search | mobile | 60⚠ | 100 | 100 | 66⚠ | 4722⚠ | 0.483⚠ |
| /exam | mobile | 71 | 100 | 81⚠ | 100 | 905 | 0.483⚠ |
| /exam/civil-construction-1/guide/strategy | mobile | 97 | 100 | 100 | 100 | 1201 | 0.02 |
| /exam/civil-construction-1/guide/four-management | mobile | 88 | 100 | 100 | 100 | 2118 | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 88 | 100 | 100 | 100 | 3376⚠ | 0.051 |
| /exam/civil-construction-1/primary/h26-a | mobile | 94 | 100 | 100 | 100 | 1351 | 0.017 |
| /exam/civil-construction-1/secondary/r07 | mobile | 97 | 93 | 100 | 100 | 1201 | 0.018 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 90 | 100 | 100 | 100 | 1536 | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 92 | 100 | 100 | 100 | 1811 | 0.019 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 88 | 100 | 81⚠ | 100 | 1201 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 93 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 93 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 94 | 100 | 100 | 100 | 1201 | 0.018 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 95 | 100 | 100 | 100 | 1351 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 92 | 97 | 100 | 100 | 1501 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 93 | 100 | 100 | 100 | 1051 | 0.017 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 99 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 98 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 91 | 100 | 81⚠ | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 92 | 100 | 100 | 100 | 1051 | 0.001 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 93 | 100 | 100 | 100 | 1051 | 0.004 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/search` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/search` (desktop): **SEO** = 69 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.21 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **TBT** = 478ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **CLS** = 0.211 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.344 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (desktop): **CLS** = 0.223 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/` (mobile): **LCP** = 6192ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4722ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.483 (閾値: ≤0.1)
- `https://doboku-note.com/exam` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam` (mobile): **CLS** = 0.483 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 2118ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 3376ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **TBT** = 356ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 1811ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **TBT** = 401ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **Best Practices** = 81 (閾値: ≥85)