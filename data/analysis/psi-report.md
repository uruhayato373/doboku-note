# PSI 計測レポート — 2026-10-13

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **43件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 521 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 539 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 531 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 767 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 100 | 100 | 100 | 100 | 761 | 0.016 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 100 | 100 | 100 | 881 | 0.224⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 100 | 100 | 100 | 871 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 99 | 100 | 100 | 100 | 698 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 863 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 99 | 100 | 100 | 100 | 830 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 841 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 98 | 100 | 100 | 100 | 698 | 0.063 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 100 | 100 | 100 | 841 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 644 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 99 | 100 | 100 | 100 | 882 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 98 | 100 | 100 | 100 | 663 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 706 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 781 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 839 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 800 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 769 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 100 | 100 | 100 | 833 | 0.004 |
| / | mobile | 94 | 100 | 100 | 100 | 3001⚠ | 0.006 |
| /search | mobile | 98 | 100 | 100 | 66⚠ | 2116 | 0.006 |
| /exam | mobile | 65⚠ | 100 | 100 | 100 | 6563⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 92 | 100 | 100 | 100 | 3226⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 67⚠ | 100 | 100 | 100 | 6902⚠ | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 71 | 100 | 100 | 100 | 5754⚠ | 0.014 |
| /exam/civil-construction-1/primary/h26-a | mobile | 69⚠ | 100 | 100 | 100 | 6147⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 75 | 100 | 100 | 100 | 5205⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 72 | 100 | 100 | 100 | 5581⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 72 | 100 | 100 | 100 | 5619⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 70 | 100 | 100 | 100 | 5707⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 72 | 100 | 100 | 100 | 5694⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 91 | 100 | 100 | 100 | 3301⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 73 | 100 | 100 | 100 | 5558⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 96 | 100 | 100 | 100 | 2401 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 97 | 100 | 100 | 100 | 2401 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 74 | 100 | 100 | 100 | 5244⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 74 | 100 | 100 | 100 | 5232⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 69⚠ | 100 | 100 | 100 | 5208⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 91 | 100 | 100 | 100 | 3302⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 74 | 100 | 100 | 100 | 5222⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 74 | 100 | 100 | 100 | 5255⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.224 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 3001ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam` (mobile): **LCP** = 6563ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 3324ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 6902ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3389ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5754ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3534ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 6147ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3332ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 5205ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3086ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5581ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3430ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5619ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3381ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5707ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3456ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5694ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3336ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 3301ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5558ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3141ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 1824ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 1823ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 5244ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3256ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5232ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3249ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5208ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3325ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 3302ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 5222ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3193ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5255ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3204ms (閾値: ≤1800ms)