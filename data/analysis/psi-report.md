# PSI 計測レポート — 2026-11-25

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **53件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 87 | 96 | 100 | 100 | 975 | 0.206⚠ |
| /search | desktop | 88 | 100 | 92 | 69⚠ | 1007 | 0.206⚠ |
| /exam | desktop | 69⚠ | 100 | 81⚠ | 100 | 245 | 0.206⚠ |
| /exam/civil-construction-1/guide/strategy | desktop | 71 | 96 | 81⚠ | 100 | 1938 | 0.206⚠ |
| /exam/civil-construction-1/guide/four-management | desktop | 84 | 97 | 77⚠ | 100 | 1041 | 0.206⚠ |
| /exam/civil-construction-1/primary/r07-a | desktop | 61⚠ | 93 | 100 | 100 | 762 | 0.214⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 68⚠ | 97 | 81⚠ | 100 | 1132 | 0.206⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 86 | 97 | 100 | 100 | 1029 | 0.206⚠ |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 87 | 96 | 100 | 100 | 1121 | 0.215⚠ |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 85 | 97 | 81⚠ | 100 | 1361 | 0.21⚠ |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 76 | 97 | 100 | 100 | 1006 | 0.233⚠ |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 86 | 96 | 100 | 100 | 1093 | 0.212⚠ |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 87 | 97 | 100 | 100 | 922 | 0.206⚠ |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 81 | 97 | 77⚠ | 100 | 1679 | 0.21⚠ |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 87 | 97 | 81⚠ | 100 | 1009 | 0.211⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 82 | 97 | 100 | 100 | 384 | 0.243⚠ |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 89 | 100 | 100 | 100 | 281 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 86 | 97 | 81⚠ | 100 | 868 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 88 | 97 | 100 | 100 | 1082 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 81 | 100 | 100 | 100 | 1860 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 89 | 96 | 100 | 100 | 869 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 89 | 96 | 100 | 100 | 881 | 0.206⚠ |
| / | mobile | 68⚠ | 97 | 100 | 100 | 6238⚠ | 0.012 |
| /search | mobile | 65⚠ | 100 | 100 | 66⚠ | 2928⚠ | 0.483⚠ |
| /exam | mobile | 74 | 100 | 100 | 100 | 1970 | 0.483⚠ |
| /exam/civil-construction-1/guide/strategy | mobile | 97 | 100 | 100 | 100 | 1201 | 0.02 |
| /exam/civil-construction-1/guide/four-management | mobile | 96 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 71 | 100 | 81⚠ | 100 | 5527⚠ | 0.049 |
| /exam/civil-construction-1/primary/h26-a | mobile | 83 | 100 | 81⚠ | 100 | 2114 | 0.017 |
| /exam/civil-construction-1/secondary/r07 | mobile | 93 | 97 | 100 | 100 | 1201 | 0.018 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 98 | 100 | 100 | 100 | 1501 | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 96 | 100 | 100 | 100 | 1351 | 0.019 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 88 | 100 | 92 | 100 | 1201 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 98 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 99 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 86 | 100 | 81⚠ | 100 | 1201 | 0.018 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 93 | 100 | 100 | 100 | 1351 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 97 | 100 | 100 | 100 | 1501 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 97 | 100 | 100 | 100 | 1051 | 0.017 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 87 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 98 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 99 | 100 | 100 | 100 | 1051 | 0.018 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 92 | 100 | 100 | 100 | 1051 | 0.001 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 94 | 100 | 100 | 100 | 1051 | 0 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/search` (desktop): **SEO** = 69 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam` (desktop): **TBT** = 490ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (desktop): **Best Practices** = 77 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.214 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **TBT** = 632ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **TBT** = 402ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **CLS** = 0.215 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **CLS** = 0.21 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **CLS** = 0.233 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **CLS** = 0.212 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (desktop): **Best Practices** = 77 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (desktop): **CLS** = 0.21 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.211 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (desktop): **CLS** = 0.243 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 6238ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 2928ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.483 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **FCP** = 2928ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **CLS** = 0.483 (閾値: ≤0.1)
- `https://doboku-note.com/exam` (mobile): **FCP** = 1970ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5527ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 2114ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **TBT** = 311ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **TBT** = 434ms (閾値: ≤300ms)