# PSI 計測レポート — 2026-11-10

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **20件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 681 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 263 | 0.004 |
| /exam | desktop | 96 | 100 | 100 | 100 | 449 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 781 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 721 | 0.016 |
| /exam/civil-construction-1/primary/r07-a | desktop | 100 | 100 | 100 | 100 | 766 | 0.02 |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 100 | 100 | 100 | 944 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 99 | 96 | 100 | 100 | 833 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 100 | 100 | 100 | 100 | 781 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 99 | 100 | 100 | 100 | 889 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 644 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 701 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 100 | 100 | 100 | 843 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 701 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 91 | 100 | 100 | 100 | 321 | 0.177⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 355 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 281 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 99 | 100 | 100 | 100 | 847 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 98 | 100 | 100 | 100 | 1051 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 100 | 100 | 100 | 922 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 98 | 100 | 100 | 100 | 862 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 731 | 0.004 |
| / | mobile | 76 | 100 | 100 | 100 | 5405⚠ | 0.006 |
| /search | mobile | 96 | 100 | 100 | 66⚠ | 2138 | 0 |
| /exam | mobile | 97 | 100 | 100 | 100 | 1981 | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 79 | 100 | 100 | 100 | 5416⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 78 | 100 | 100 | 100 | 5751⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 99 | 100 | 100 | 100 | 1351 | 0.014 |
| /exam/civil-construction-1/primary/h26-a | mobile | 98 | 100 | 100 | 100 | 1351 | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 100 | 96 | 100 | 100 | 1051 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 70 | 100 | 100 | 100 | 6111⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 77 | 100 | 100 | 100 | 5786⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 88 | 100 | 100 | 100 | 3901⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 79 | 100 | 100 | 100 | 5497⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 79 | 100 | 100 | 100 | 5270⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 79 | 100 | 100 | 100 | 5535⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 99 | 100 | 100 | 100 | 1351 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 100 | 100 | 100 | 100 | 1351 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 100 | 100 | 100 | 100 | 1051 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 81 | 100 | 100 | 100 | 5152⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 93 | 100 | 100 | 100 | 3226⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 93 | 100 | 100 | 100 | 3226⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 94 | 100 | 100 | 100 | 3151⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 92 | 100 | 100 | 100 | 3301⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.177 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5405ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **FCP** = 2138ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 1981ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5416ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5751ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 6111ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 2157ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5786ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 3901ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5497ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5270ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5535ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5152ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 3151ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 3301ms (閾値: ≤2500ms)