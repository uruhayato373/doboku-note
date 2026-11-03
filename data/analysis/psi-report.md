# PSI 計測レポート — 2026-11-03

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **22件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 100 | 100 | 669 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 282 | 0.004 |
| /exam | desktop | 94 | 100 | 100 | 100 | 257 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 98 | 100 | 100 | 100 | 830 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 756 | 0.016 |
| /exam/civil-construction-1/primary/r07-a | desktop | 87 | 100 | 100 | 100 | 706 | 0.25⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 98 | 100 | 100 | 100 | 904 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 96 | 100 | 100 | 741 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 95 | 100 | 100 | 100 | 665 | 0.044 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 99 | 100 | 100 | 100 | 749 | 0.016 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 97 | 100 | 100 | 100 | 649 | 0.05 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 98 | 100 | 100 | 100 | 609 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 100 | 100 | 100 | 781 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 569 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 337 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 335 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 281 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 703 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 661 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 788 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 99 | 100 | 100 | 100 | 762 | 0.013 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 770 | 0.004 |
| / | mobile | 75 | 100 | 100 | 100 | 5635⚠ | 0 |
| /search | mobile | 97 | 100 | 100 | 66⚠ | 963 | 0.006 |
| /exam | mobile | 99 | 100 | 100 | 100 | 905 | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 74 | 100 | 100 | 100 | 6151⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 65⚠ | 100 | 100 | 100 | 7201⚠ | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 95 | 100 | 100 | 100 | 1974 | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 98 | 100 | 100 | 100 | 1201 | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 100 | 96 | 100 | 100 | 1051 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 89 | 100 | 100 | 100 | 3376⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 80 | 100 | 100 | 100 | 4579⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 79 | 100 | 100 | 100 | 5736⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 79 | 100 | 100 | 100 | 5462⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 86 | 100 | 100 | 100 | 4170⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 79 | 100 | 100 | 100 | 5601⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 99 | 100 | 100 | 100 | 1201 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 99 | 100 | 100 | 100 | 1201 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 99 | 100 | 100 | 100 | 1051 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 79 | 100 | 100 | 100 | 5267⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 79 | 100 | 100 | 100 | 5155⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 78 | 100 | 100 | 100 | 5601⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 79 | 100 | 100 | 100 | 5354⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 94 | 100 | 100 | 100 | 3151⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.25 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5635ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 6151ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 1810ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 1986ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **TBT** = 317ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 1974ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 3376ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 4579ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5736ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5462ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4170ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5601ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5267ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5155ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5601ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 5354ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 3151ms (閾値: ≤2500ms)