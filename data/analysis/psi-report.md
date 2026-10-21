# PSI 計測レポート — 2026-10-22

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **49件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 96 | 100 | 100 | 100 | 701 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 532 | 0.004 |
| /exam | desktop | 93 | 100 | 100 | 100 | 625 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 99 | 100 | 100 | 100 | 863 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 821 | 0.016 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 100 | 100 | 100 | 881 | 0.224⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 92 | 100 | 100 | 100 | 953 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 95 | 100 | 100 | 100 | 761 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 824 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 100 | 100 | 100 | 629 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 881 | 0.024 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 97 | 100 | 100 | 100 | 710 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 100 | 100 | 100 | 761 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 93 | 100 | 100 | 100 | 644 | 0.05 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 92 | 100 | 100 | 100 | 803 | 0.177⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 602 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 662 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 98 | 100 | 100 | 100 | 795 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 98 | 100 | 100 | 100 | 741 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 801 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 783 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 100 | 100 | 100 | 839 | 0.004 |
| / | mobile | 71 | 100 | 100 | 100 | 5651⚠ | 0.006 |
| /search | mobile | 72 | 100 | 100 | 66⚠ | 4709⚠ | 0.006 |
| /exam | mobile | 73 | 100 | 100 | 100 | 4533⚠ | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 52⚠ | 100 | 100 | 100 | 6752⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 72 | 100 | 100 | 100 | 5674⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 70 | 100 | 100 | 100 | 6004⚠ | 0.014 |
| /exam/civil-construction-1/primary/h26-a | mobile | 71 | 100 | 100 | 100 | 6156⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 73 | 100 | 100 | 100 | 5434⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 70 | 100 | 100 | 100 | 6022⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 71 | 100 | 100 | 100 | 5636⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 73 | 100 | 100 | 100 | 5594⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 72 | 100 | 100 | 100 | 5538⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 73 | 100 | 100 | 100 | 3948⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 72 | 100 | 100 | 100 | 5457⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 95 | 100 | 100 | 100 | 2701⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 72 | 100 | 100 | 100 | 5526⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 72 | 100 | 100 | 100 | 5395⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 74 | 100 | 100 | 100 | 5132⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 74 | 100 | 100 | 100 | 5270⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 91 | 100 | 100 | 100 | 3451⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 73 | 100 | 100 | 100 | 5336⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 72 | 100 | 100 | 100 | 5381⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.224 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.177 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5651ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3048ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4709ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3047ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4533ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 3045ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 6752ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3304ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **TBT** = 589ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5674ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3426ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 6004ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3567ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 6156ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3229ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 5434ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3191ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 6022ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3547ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5636ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3439ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5594ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3239ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5538ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3430ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 3948ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **TBT** = 532ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5457ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3183ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 2701ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 1827ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5526ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3310ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 5395ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3301ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5132ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3224ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5270ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3231ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 3451ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 5336ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3301ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5381ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3329ms (閾値: ≤1800ms)