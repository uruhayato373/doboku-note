# PSI 計測レポート — 2026-10-16

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **53件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 96 | 100 | 100 | 100 | 816 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 458 | 0.004 |
| /exam | desktop | 72 | 100 | 100 | 100 | 573 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 96 | 100 | 100 | 100 | 661 | 0.016 |
| /exam/civil-construction-1/guide/four-management | desktop | 100 | 100 | 100 | 100 | 801 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 100 | 100 | 100 | 793 | 0.224⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 95 | 100 | 100 | 100 | 1007 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 100 | 100 | 100 | 687 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 98 | 100 | 100 | 100 | 921 | 0.048 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 100 | 100 | 100 | 721 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 861 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 84 | 100 | 100 | 100 | 715 | 0.063 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 98 | 100 | 100 | 100 | 1080 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 681 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 786 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 662 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 623 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 96 | 100 | 100 | 100 | 1220 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 98 | 100 | 100 | 100 | 1104 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 772 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 776 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 706 | 0.004 |
| / | mobile | 82 | 100 | 100 | 100 | 4566⚠ | 0.006 |
| /search | mobile | 65⚠ | 100 | 100 | 66⚠ | 6310⚠ | 0 |
| /exam | mobile | 70 | 100 | 100 | 100 | 5582⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 79 | 100 | 100 | 100 | 4735⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 80 | 100 | 100 | 100 | 5027⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 63⚠ | 100 | 100 | 100 | 8252⚠ | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 88 | 100 | 100 | 100 | 3266⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 74 | 100 | 100 | 100 | 5402⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 71 | 100 | 100 | 100 | 5730⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 66⚠ | 100 | 100 | 100 | 7351⚠ | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 73 | 100 | 100 | 100 | 5456⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 67⚠ | 100 | 100 | 100 | 7577⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 74 | 100 | 100 | 100 | 5222⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 62⚠ | 100 | 100 | 100 | 5863⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 72 | 100 | 100 | 100 | 5660⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 73 | 100 | 100 | 100 | 5423⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 96 | 100 | 100 | 100 | 2326 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 83 | 100 | 100 | 100 | 4651⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 77 | 100 | 100 | 100 | 3703⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 64⚠ | 100 | 100 | 100 | 7277⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 50⚠ | 100 | 100 | 100 | 7201⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 74 | 100 | 100 | 100 | 5318⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam` (desktop): **TBT** = 853ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.224 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **TBT** = 344ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 4566ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 6310ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3021ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 5582ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 3280ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 4735ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5027ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 1831ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 8252ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3694ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 3266ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 1841ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 5402ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3097ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5730ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3477ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 7351ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3333ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5456ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3248ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 7577ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3232ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5222ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3188ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5863ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3249ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **TBT** = 338ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 5660ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3263ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5423ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3249ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 4651ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 3703ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **TBT** = 438ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 7277ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3158ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3669ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **TBT** = 565ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5318ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3173ms (閾値: ≤1800ms)