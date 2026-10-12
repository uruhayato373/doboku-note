# PSI 計測レポート — 2026-10-12

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **50件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 87 | 100 | 100 | 100 | 721 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 461 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 531 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 61⚠ | 100 | 100 | 100 | 1369 | 0.012 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 886 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 87 | 100 | 100 | 100 | 822 | 0.224⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 100 | 100 | 100 | 890 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 100 | 100 | 100 | 741 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 901 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 99 | 100 | 100 | 100 | 894 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 98 | 100 | 100 | 100 | 885 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 98 | 100 | 100 | 100 | 765 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 96 | 100 | 100 | 100 | 813 | 0.048 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 781 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 742 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 702 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 787 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 96 | 100 | 100 | 100 | 841 | 0.043 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 810 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 100 | 100 | 100 | 888 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 98 | 100 | 100 | 100 | 1059 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 802 | 0.004 |
| / | mobile | 63⚠ | 100 | 100 | 100 | 8402⚠ | 0 |
| /search | mobile | 71 | 100 | 100 | 66⚠ | 5702⚠ | 0.006 |
| /exam | mobile | 78 | 100 | 100 | 100 | 4425⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 74 | 100 | 100 | 100 | 5216⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 72 | 100 | 100 | 100 | 5659⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 70 | 100 | 100 | 100 | 5903⚠ | 0.014 |
| /exam/civil-construction-1/primary/h26-a | mobile | 71 | 100 | 100 | 100 | 6088⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 95 | 100 | 100 | 100 | 2251 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 78 | 100 | 100 | 100 | 4127⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 73 | 100 | 100 | 100 | 5491⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 73 | 100 | 100 | 100 | 5469⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 71 | 100 | 100 | 100 | 5740⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 70 | 100 | 100 | 100 | 5287⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 71 | 100 | 100 | 100 | 5529⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 95 | 100 | 100 | 100 | 2701⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 78 | 100 | 100 | 100 | 3316⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 96 | 100 | 100 | 100 | 2551⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 91 | 100 | 100 | 100 | 3301⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 68⚠ | 100 | 100 | 100 | 5496⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 74 | 100 | 100 | 100 | 5508⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 61⚠ | 100 | 100 | 100 | 5500⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 99 | 100 | 100 | 100 | 1756 | 0.006 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **TBT** = 303ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **TBT** = 1476ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.224 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8402ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3196ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5702ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3082ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4425ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 3321ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5216ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3089ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5659ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3298ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5903ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3616ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 6088ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3236ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 4127ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 1853ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **TBT** = 320ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5491ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3259ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5469ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3257ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5740ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3498ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5287ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3190ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5529ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3124ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 2701ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 1821ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 3316ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 1851ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **TBT** = 525ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 3301ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5496ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3206ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5508ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3102ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 5500ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3300ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **TBT** = 460ms (閾値: ≤300ms)