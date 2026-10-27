# PSI 計測レポート — 2026-10-28

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **51件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 86 | 100 | 100 | 100 | 785 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 598 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 449 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 681 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 901 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 87 | 100 | 100 | 100 | 730 | 0.25⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 100 | 100 | 100 | 746 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 100 | 100 | 100 | 782 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 1001 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 99 | 100 | 100 | 100 | 861 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 97 | 100 | 100 | 100 | 864 | 0.05 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 1020 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 100 | 100 | 100 | 961 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 721 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 570 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 98 | 100 | 100 | 100 | 683 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 99 | 100 | 100 | 100 | 903 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 764 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 782 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 100 | 100 | 100 | 1044 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 772 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 100 | 100 | 100 | 881 | 0.004 |
| / | mobile | 67⚠ | 100 | 100 | 100 | 6751⚠ | 0 |
| /search | mobile | 79 | 100 | 100 | 66⚠ | 4518⚠ | 0.006 |
| /exam | mobile | 70 | 100 | 100 | 100 | 5459⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 66⚠ | 100 | 100 | 100 | 6751⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 65⚠ | 100 | 100 | 100 | 7876⚠ | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 70 | 100 | 100 | 100 | 5952⚠ | 0.014 |
| /exam/civil-construction-1/primary/h26-a | mobile | 72 | 100 | 100 | 100 | 5934⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 97 | 100 | 100 | 100 | 2251 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 65⚠ | 100 | 100 | 100 | 8251⚠ | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 73 | 100 | 100 | 100 | 5524⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 67⚠ | 100 | 100 | 100 | 7051⚠ | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 72 | 100 | 100 | 100 | 5709⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 76 | 100 | 100 | 100 | 3505⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 73 | 100 | 100 | 100 | 5359⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 94 | 100 | 100 | 100 | 2851⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 73 | 100 | 100 | 100 | 5325⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 74 | 100 | 100 | 100 | 5485⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 71 | 100 | 100 | 100 | 5350⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 68⚠ | 100 | 100 | 100 | 6826⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 72 | 100 | 100 | 100 | 5610⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 88 | 100 | 100 | 100 | 3826⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 70 | 100 | 100 | 100 | 2719⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **TBT** = 312ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.25 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 6751ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3005ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4518ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2939ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 5459ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 3169ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 6751ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3238ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 7876ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3374ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5952ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3549ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5934ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3238ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 8251ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3542ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5524ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3264ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 7051ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3323ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5709ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3322ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 3505ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **TBT** = 527ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5359ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3143ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 2851ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 1821ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5325ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3281ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 5485ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3109ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5350ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3212ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 6826ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3152ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5610ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3193ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 3826ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 2719ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **TBT** = 1308ms (閾値: ≤300ms)