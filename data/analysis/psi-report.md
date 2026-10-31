# PSI 計測レポート — 2026-11-01

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **23件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 701 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 287 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 245 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 99 | 100 | 100 | 100 | 762 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 883 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 86 | 100 | 100 | 100 | 753 | 0.25⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 100 | 100 | 100 | 874 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 99 | 100 | 100 | 100 | 824 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 98 | 100 | 100 | 100 | 761 | 0.048 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 100 | 100 | 100 | 627 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 98 | 100 | 100 | 100 | 785 | 0.05 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 872 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 100 | 100 | 100 | 715 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 794 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 327 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 335 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 285 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 98 | 100 | 100 | 100 | 784 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 704 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 721 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 616 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 723 | 0.004 |
| / | mobile | 79 | 100 | 100 | 100 | 5401⚠ | 0.006 |
| /search | mobile | 100 | 100 | 100 | 66⚠ | 931 | 0.006 |
| /exam | mobile | 100 | 100 | 100 | 100 | 905 | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 73 | 100 | 100 | 100 | 6901⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 68⚠ | 100 | 100 | 100 | 7426⚠ | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 99 | 100 | 100 | 100 | 1201 | 0.014 |
| /exam/civil-construction-1/primary/h26-a | mobile | 93 | 100 | 100 | 100 | 1965 | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 98 | 100 | 100 | 100 | 1051 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 78 | 100 | 100 | 100 | 5849⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 80 | 100 | 100 | 100 | 5312⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 78 | 100 | 100 | 100 | 5599⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 93 | 100 | 100 | 100 | 3226⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 79 | 100 | 100 | 100 | 5355⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 60⚠ | 100 | 100 | 100 | 3606⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 100 | 100 | 100 | 100 | 1201 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 100 | 100 | 100 | 100 | 1201 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 100 | 100 | 100 | 100 | 1051 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 85 | 100 | 100 | 100 | 4245⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 81 | 100 | 100 | 100 | 5068⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 84 | 100 | 100 | 100 | 4645⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 93 | 100 | 100 | 100 | 3151⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 73 | 100 | 100 | 100 | 6976⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.25 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5401ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 6901ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 1809ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 7426ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 2152ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 1965ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5849ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5312ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5599ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5355ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 3606ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **TBT** = 2238ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 4245ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5068ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 4645ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 3151ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 6976ms (閾値: ≤2500ms)