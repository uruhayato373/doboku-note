# PSI 計測レポート — 2026-10-07

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **49件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 766 | 0.004 |
| /search | desktop | 93 | 100 | 100 | 66⚠ | 493 | 0.004 |
| /exam | desktop | 96 | 100 | 100 | 100 | 531 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 667 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 922 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 98 | 100 | 100 | 100 | 999 | 0.004 |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 100 | 100 | 100 | 943 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 98 | 100 | 100 | 100 | 1054 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 967 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 99 | 100 | 100 | 100 | 901 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 98 | 100 | 100 | 100 | 764 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 839 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 100 | 100 | 100 | 760 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 624 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 803 | 0.018 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 742 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 772 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 99 | 100 | 100 | 100 | 814 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 95 | 100 | 100 | 100 | 1564 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 808 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 779 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 819 | 0.004 |
| / | mobile | 95 | 100 | 100 | 100 | 2851⚠ | 0.006 |
| /search | mobile | 61⚠ | 100 | 100 | 66⚠ | 7738⚠ | 0 |
| /exam | mobile | 99 | 100 | 100 | 100 | 1810 | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 63⚠ | 100 | 100 | 100 | 4947⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 66⚠ | 100 | 100 | 100 | 8851⚠ | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 83 | 100 | 100 | 100 | 3752⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 66⚠ | 100 | 100 | 100 | 6100⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 73 | 100 | 100 | 100 | 5467⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 70 | 100 | 100 | 100 | 5415⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 74 | 100 | 100 | 100 | 3901⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 73 | 100 | 100 | 100 | 5419⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 71 | 100 | 100 | 100 | 5462⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 83 | 100 | 100 | 100 | 4651⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 82 | 100 | 100 | 100 | 4801⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 58⚠ | 100 | 100 | 100 | 8851⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 67⚠ | 100 | 100 | 100 | 5270⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 74 | 100 | 100 | 100 | 5245⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 69⚠ | 100 | 100 | 100 | 5288⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 66⚠ | 100 | 100 | 100 | 5491⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 70 | 100 | 100 | 100 | 5426⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 91 | 100 | 100 | 100 | 3301⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 92 | 100 | 100 | 100 | 3226⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **LCP** = 2851ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 7738ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3300ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 4947ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **TBT** = 720ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 8851ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3384ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 3752ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 1952ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 6100ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3424ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 5467ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3102ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5415ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3498ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 3901ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 1861ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **TBT** = 464ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5419ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3258ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5462ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3270ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4651ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 4801ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 8851ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3383ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **TBT** = 309ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5270ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3344ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 5245ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3254ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5288ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3234ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5491ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3270ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5426ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3285ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 3301ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)