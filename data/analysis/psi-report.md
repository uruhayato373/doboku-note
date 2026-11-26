# PSI 計測レポート — 2026-11-26

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **54件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 88 | 96 | 100 | 100 | 847 | 0.206⚠ |
| /search | desktop | 86 | 100 | 100 | 69⚠ | 1082 | 0.206⚠ |
| /exam | desktop | 89 | 100 | 81⚠ | 100 | 245 | 0.206⚠ |
| /exam/civil-construction-1/guide/strategy | desktop | 78 | 96 | 81⚠ | 100 | 1560 | 0.206⚠ |
| /exam/civil-construction-1/guide/four-management | desktop | 87 | 97 | 100 | 100 | 1103 | 0.206⚠ |
| /exam/civil-construction-1/primary/r07-a | desktop | 78 | 93 | 100 | 100 | 685 | 0.421⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 50⚠ | 97 | 100 | 100 | 1302 | 0.206⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 87 | 97 | 100 | 100 | 945 | 0.206⚠ |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 87 | 97 | 100 | 100 | 941 | 0.206⚠ |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 69⚠ | 97 | 81⚠ | 100 | 2588⚠ | 0.206⚠ |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 74 | 97 | 100 | 100 | 926 | 0.44⚠ |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 87 | 96 | 81⚠ | 100 | 1021 | 0.211⚠ |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 88 | 97 | 100 | 100 | 856 | 0.206⚠ |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 84 | 97 | 100 | 100 | 1500 | 0.206⚠ |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 79 | 97 | 100 | 100 | 973 | 0.377⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 78 | 97 | 100 | 100 | 507 | 0.206⚠ |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 68⚠ | 100 | 81⚠ | 100 | 298 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 87 | 97 | 100 | 100 | 810 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 88 | 97 | 81⚠ | 100 | 881 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 67⚠ | 100 | 81⚠ | 100 | 901 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 87 | 97 | 100 | 100 | 1146 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 88 | 96 | 100 | 100 | 928 | 0.206⚠ |
| / | mobile | 71 | 96 | 100 | 100 | 6239⚠ | 0 |
| /search | mobile | 67⚠ | 100 | 100 | 66⚠ | 2873⚠ | 0.483⚠ |
| /exam | mobile | 74 | 100 | 100 | 100 | 1972 | 0.483⚠ |
| /exam/civil-construction-1/guide/strategy | mobile | 83 | 100 | 100 | 100 | 2001 | 0.02 |
| /exam/civil-construction-1/guide/four-management | mobile | 92 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 76 | 100 | 81⚠ | 100 | 5544⚠ | 0.031 |
| /exam/civil-construction-1/primary/h26-a | mobile | 93 | 100 | 100 | 100 | 1351 | 0.017 |
| /exam/civil-construction-1/secondary/r07 | mobile | 89 | 97 | 100 | 100 | 1201 | 0.018 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 96 | 100 | 100 | 100 | 1501 | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 98 | 100 | 100 | 100 | 1351 | 0.019 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 98 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 99 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 96 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 98 | 100 | 100 | 100 | 1201 | 0.018 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 90 | 100 | 100 | 100 | 2110 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 97 | 100 | 100 | 100 | 1501 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 99 | 100 | 100 | 100 | 1051 | 0.017 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 83 | 100 | 81⚠ | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 93 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 99 | 100 | 100 | 100 | 1051 | 0.018 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 99 | 100 | 100 | 100 | 1051 | 0.001 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 98 | 100 | 100 | 100 | 1051 | 0 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/search` (desktop): **SEO** = 69 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.421 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **TBT** = 1478ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **LCP** = 2588ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **CLS** = 0.44 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **CLS** = 0.211 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.377 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (desktop): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (desktop): **TBT** = 429ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (desktop): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (desktop): **TBT** = 448ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 6239ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 2873ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.483 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **FCP** = 2873ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **CLS** = 0.483 (閾値: ≤0.1)
- `https://doboku-note.com/exam` (mobile): **FCP** = 1972ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 2001ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **TBT** = 373ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5544ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **TBT** = 313ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 2110ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **TBT** = 537ms (閾値: ≤300ms)