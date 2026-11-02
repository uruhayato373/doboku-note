# PSI 計測レポート — 2026-11-02

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **18件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 97 | 100 | 100 | 100 | 750 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 297 | 0.004 |
| /exam | desktop | 99 | 100 | 100 | 100 | 264 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 99 | 100 | 100 | 100 | 855 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 100 | 100 | 100 | 100 | 741 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 99 | 100 | 100 | 100 | 908 | 0.02 |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 100 | 100 | 100 | 903 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 99 | 100 | 100 | 100 | 827 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 901 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 99 | 100 | 100 | 100 | 824 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 98 | 100 | 100 | 100 | 1108 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 821 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 100 | 100 | 100 | 991 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 741 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 96 | 100 | 100 | 100 | 357 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 339 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 288 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 715 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 777 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 733 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 98 | 100 | 100 | 100 | 1055 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 741 | 0.004 |
| / | mobile | 79 | 100 | 100 | 100 | 5272⚠ | 0.006 |
| /search | mobile | 100 | 100 | 100 | 66⚠ | 997 | 0.006 |
| /exam | mobile | 100 | 100 | 100 | 100 | 906 | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 81 | 100 | 100 | 100 | 5064⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 79 | 100 | 100 | 100 | 5714⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 99 | 100 | 100 | 100 | 1201 | 0.014 |
| /exam/civil-construction-1/primary/h26-a | mobile | 100 | 100 | 100 | 100 | 1201 | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 100 | 100 | 100 | 100 | 1051 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 69⚠ | 100 | 100 | 100 | 5968⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 78 | 100 | 100 | 100 | 5695⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 79 | 100 | 100 | 100 | 5459⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 79 | 100 | 100 | 100 | 5444⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 86 | 100 | 100 | 100 | 4166⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 80 | 100 | 100 | 100 | 5277⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 100 | 100 | 100 | 100 | 1201 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 100 | 100 | 100 | 100 | 1201 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 100 | 100 | 100 | 100 | 1051 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 85 | 100 | 100 | 100 | 4458⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 94 | 100 | 100 | 100 | 3151⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 91 | 100 | 100 | 100 | 3526⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 94 | 100 | 100 | 100 | 3151⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 84 | 100 | 100 | 100 | 4640⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **LCP** = 5272ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5064ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5714ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5968ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 2256ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5695ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5459ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5444ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4166ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5277ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 4458ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 3151ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 3526ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 3151ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 4640ms (閾値: ≤2500ms)