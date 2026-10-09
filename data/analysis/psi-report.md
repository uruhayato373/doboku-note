# PSI 計測レポート — 2026-10-09

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **58件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 98 | 100 | 100 | 100 | 772 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 556 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 449 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 741 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 98 | 100 | 100 | 100 | 751 | 0.016 |
| /exam/civil-construction-1/primary/r07-a | desktop | 99 | 100 | 100 | 100 | 869 | 0.004 |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 100 | 100 | 100 | 942 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 94 | 100 | 100 | 100 | 841 | 0.009 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 88 | 100 | 100 | 100 | 972 | 0.051 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 96 | 100 | 100 | 100 | 648 | 0.048 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 915 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 97 | 100 | 100 | 100 | 821 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 100 | 100 | 100 | 770 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 91 | 100 | 100 | 100 | 840 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 66⚠ | 100 | 100 | 100 | 876 | 0.177⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 883 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 97 | 100 | 100 | 100 | 682 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 97 | 100 | 100 | 100 | 784 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 91 | 100 | 100 | 100 | 801 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 761 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 99 | 100 | 100 | 100 | 776 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 812 | 0.004 |
| / | mobile | 92 | 100 | 100 | 100 | 3226⚠ | 0.006 |
| /search | mobile | 67⚠ | 100 | 100 | 66⚠ | 5680⚠ | 0.006 |
| /exam | mobile | 79 | 100 | 100 | 100 | 4351⚠ | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 74 | 100 | 100 | 100 | 5385⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 71 | 100 | 100 | 100 | 5517⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 67⚠ | 100 | 100 | 100 | 5251⚠ | 0.014 |
| /exam/civil-construction-1/primary/h26-a | mobile | 71 | 100 | 100 | 100 | 6014⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 97 | 100 | 100 | 100 | 2476 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 76 | 100 | 100 | 100 | 4426⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 61⚠ | 100 | 100 | 100 | 8701⚠ | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 69⚠ | 100 | 100 | 100 | 5543⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 72 | 100 | 100 | 100 | 5552⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 75 | 100 | 100 | 100 | 5103⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 74 | 100 | 100 | 100 | 5266⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 72 | 100 | 100 | 100 | 5396⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 68⚠ | 100 | 100 | 100 | 5540⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 61⚠ | 100 | 100 | 100 | 5473⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 68⚠ | 100 | 100 | 100 | 5287⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 73 | 100 | 100 | 100 | 5341⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 74 | 100 | 100 | 100 | 5329⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 91 | 100 | 100 | 100 | 3302⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 65⚠ | 100 | 100 | 100 | 5512⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.177 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **TBT** = 606ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5680ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3020ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **TBT** = 302ms (閾値: ≤300ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4351ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2946ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5385ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3096ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5517ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3421ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5251ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3631ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 6014ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3227ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 4426ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 1852ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **TBT** = 310ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 8701ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3135ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5543ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3446ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5552ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3389ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5103ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3071ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5266ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3077ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 5396ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3258ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5540ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3294ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 5473ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3377ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **TBT** = 464ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5287ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3179ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **TBT** = 309ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5341ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3105ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5329ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3079ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 3302ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5512ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3334ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **TBT** = 321ms (閾値: ≤300ms)