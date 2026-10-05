# PSI 計測レポート — 2026-10-06

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **56件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 733 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 456 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 531 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 763 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 929 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 84 | 100 | 100 | 100 | 1292 | 0.222⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 92 | 100 | 100 | 100 | 863 | 0.162⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 55⚠ | 100 | 100 | 100 | 1666 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 861 | 0.048 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 100 | 100 | 100 | 792 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 73 | 100 | 100 | 100 | 723 | 0.05 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 821 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 100 | 100 | 100 | 741 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 810 | 0.05 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 98 | 100 | 100 | 100 | 780 | 0.018 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 863 | 0.018 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 72 | 100 | 100 | 100 | 870 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 98 | 100 | 100 | 100 | 938 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 98 | 100 | 100 | 100 | 741 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 97 | 100 | 100 | 100 | 831 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 774 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 98 | 100 | 100 | 100 | 1117 | 0.004 |
| / | mobile | 57⚠ | 100 | 100 | 100 | 8123⚠ | 0 |
| /search | mobile | 60⚠ | 100 | 100 | 66⚠ | 7666⚠ | 0 |
| /exam | mobile | 79 | 100 | 100 | 100 | 4249⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 63⚠ | 100 | 100 | 100 | 8776⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 72 | 100 | 100 | 100 | 5813⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 61⚠ | 100 | 100 | 100 | 9226⚠ | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 70 | 100 | 100 | 100 | 5918⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 91 | 100 | 100 | 100 | 3301⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 70 | 100 | 100 | 100 | 5798⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 73 | 100 | 100 | 100 | 5250⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 72 | 100 | 100 | 100 | 5732⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 71 | 100 | 100 | 100 | 5511⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 46⚠ | 100 | 100 | 100 | 8476⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 79 | 100 | 100 | 100 | 5514⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 82 | 100 | 100 | 100 | 4740⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 72 | 100 | 100 | 100 | 5297⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 92 | 100 | 100 | 100 | 3226⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 62⚠ | 100 | 100 | 100 | 8326⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 92 | 100 | 100 | 100 | 3226⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 72 | 100 | 100 | 100 | 5496⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 71 | 100 | 100 | 100 | 5213⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 72 | 100 | 100 | 100 | 5383⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.222 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.162 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (desktop): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (desktop): **TBT** = 3056ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **TBT** = 614ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (desktop): **TBT** = 791ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8123ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3408ms (閾値: ≤1800ms)
- `https://doboku-note.com/` (mobile): **TBT** = 344ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 7666ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3344ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4249ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 3124ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 8776ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3376ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5813ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3250ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 9226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3662ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5918ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3296ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 3301ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5798ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3518ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5250ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3140ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5732ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3351ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5511ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3453ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **Performance** = 46 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 8476ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3542ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **TBT** = 716ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5514ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4740ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 1826ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5297ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3292ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 8326ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3544ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5496ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3283ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 5213ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3246ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5383ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3254ms (閾値: ≤1800ms)