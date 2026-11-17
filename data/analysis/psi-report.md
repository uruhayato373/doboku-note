# PSI 計測レポート — 2026-11-17

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **31件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 94 | 100 | 96 | 100 | 621 | 0 |
| /search | desktop | 90 | 100 | 100 | 66⚠ | 281 | 0 |
| /exam | desktop | 100 | 100 | 100 | 100 | 245 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 90 | 100 | 100 | 100 | 1736 | 0.001 |
| /exam/civil-construction-1/guide/four-management | desktop | 95 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/primary/r07-a | desktop | 76 | 100 | 81⚠ | 100 | 701 | 0.214⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 97 | 100 | 100 | 100 | 1130 | 0 |
| /exam/civil-construction-1/secondary/r07 | desktop | 94 | 100 | 100 | 100 | 1241 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 97 | 100 | 100 | 100 | 1181 | 0.008 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 89 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 98 | 100 | 100 | 100 | 1061 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 98 | 100 | 100 | 100 | 1041 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 89 | 100 | 81⚠ | 100 | 793 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 934 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 90 | 100 | 100 | 100 | 949 | 0.17⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 92 | 100 | 100 | 100 | 387 | 0.036 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 281 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 98 | 100 | 100 | 100 | 1080 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 921 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 98 | 100 | 100 | 100 | 901 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 98 | 100 | 100 | 100 | 992 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 87 | 100 | 81⚠ | 100 | 1018 | 0 |
| / | mobile | 77 | 100 | 96 | 100 | 5209⚠ | 0 |
| /search | mobile | 97 | 100 | 100 | 66⚠ | 1052 | 0 |
| /exam | mobile | 88 | 100 | 100 | 100 | 2009 | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 97 | 100 | 100 | 100 | 1202 | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 80 | 100 | 100 | 100 | 2079 | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 68⚠ | 100 | 100 | 100 | 6751⚠ | 0.031 |
| /exam/civil-construction-1/primary/h26-a | mobile | 92 | 100 | 100 | 100 | 1850 | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 89 | 96 | 81⚠ | 100 | 2133 | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 99 | 100 | 100 | 100 | 1501 | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 64⚠ | 100 | 81⚠ | 100 | 2312 | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 91 | 100 | 81⚠ | 100 | 1969 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 89 | 100 | 81⚠ | 100 | 1867 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 97 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 93 | 100 | 100 | 100 | 1921 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 96 | 100 | 100 | 100 | 1351 | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 91 | 100 | 100 | 100 | 2113 | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 96 | 100 | 92 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 80 | 100 | 81⚠ | 100 | 1827 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 98 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 94 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 89 | 100 | 100 | 100 | 1823 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 96 | 100 | 100 | 100 | 1051 | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.214 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.17 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/` (mobile): **LCP** = 5209ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2009ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 2079ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **TBT** = 535ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 6751ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 2423ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 1850ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 2133ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 2312ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **TBT** = 1182ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 1969ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 1867ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 1921ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 2113ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 1827ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **TBT** = 530ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 1823ms (閾値: ≤1800ms)