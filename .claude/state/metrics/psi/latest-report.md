# PSI 計測レポート — 2026-05-17

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **66件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 92 | 686 | 0.02 |
| /search | desktop | 100 | 94 | 96 | 83⚠ | 776 | 0.02 |
| /category | desktop | 99 | 98 | 96 | 75⚠ | 443 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 98 | 100 | 96 | 92 | 650 | 0.02 |
| /docs/civil-construction-1-guide-four-management | desktop | 93 | 100 | 96 | 92 | 1003 | 0.02 |
| /docs/civil-construction-1-primary-r07-a | desktop | 86 | 100 | 96 | 92 | 941 | 0.18⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 93 | 100 | 96 | 92 | 559 | 0.02 |
| /docs/civil-construction-1-secondary-r07 | desktop | 64⚠ | 100 | 96 | 92 | 1260 | 0.02 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 97 | 100 | 96 | 92 | 772 | 0.069 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 44⚠ | 100 | 96 | 92 | 2404 | 0.02 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 99 | 100 | 96 | 92 | 738 | 0.02 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 99 | 100 | 96 | 92 | 647 | 0.02 |
| /docs/pe-comprehensive-management-exam-index | desktop | 100 | 96 | 96 | 92 | 710 | 0.02 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 100 | 96 | 92 | 726 | 0.02 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 82 | 100 | 96 | 92 | 540 | 0.16⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 96 | 100 | 96 | 92 | 617 | 0.041 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 100 | 96 | 92 | 845 | 0.02 |
| /docs/pe-comprehensive-management-followership | desktop | 96 | 100 | 96 | 92 | 1068 | 0.02 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 100 | 96 | 92 | 869 | 0.02 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 98 | 96 | 92 | 943 | 0.02 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 98 | 96 | 92 | 886 | 0.02 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 98 | 98 | 96 | 92 | 864 | 0.02 |
| / | mobile | 77 | 96 | 96 | 92 | 4847⚠ | 0.009 |
| /search | mobile | 86 | 92 | 96 | 83⚠ | 4138⚠ | 0 |
| /category | mobile | 73 | 98 | 96 | 75⚠ | 4278⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 72 | 96 | 96 | 92 | 5969⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 76 | 96 | 96 | 92 | 4330⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 54⚠ | 96 | 96 | 92 | 6901⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 64⚠ | 96 | 96 | 92 | 6387⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 68⚠ | 96 | 96 | 92 | 6184⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 68⚠ | 96 | 96 | 92 | 7306⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 71 | 96 | 96 | 92 | 6626⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 62⚠ | 96 | 96 | 92 | 5832⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 64⚠ | 96 | 96 | 92 | 6462⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 71 | 93 | 96 | 92 | 6115⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 67⚠ | 96 | 96 | 92 | 6126⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 71 | 96 | 96 | 92 | 6108⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 66⚠ | 96 | 96 | 92 | 6376⚠ | 0 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 70 | 96 | 96 | 92 | 5752⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 71 | 96 | 96 | 92 | 6044⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 70 | 96 | 96 | 92 | 6052⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 71 | 95 | 96 | 92 | 6275⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 71 | 95 | 96 | 92 | 6048⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 66⚠ | 95 | 96 | 92 | 5392⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.18 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 711ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **Performance** = 44 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **FCP** = 2282ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **TBT** = 691ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.16 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 4847ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2554ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4138ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 4278ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 3078ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 5969ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2700ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 4330ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 350ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6901ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3457ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 441ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6387ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3338ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6184ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2762ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7306ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3145ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2691ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 5832ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3506ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **TBT** = 330ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 6462ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3455ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6115ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2726ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6126ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2697ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6108ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2827ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6376ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3247ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 5752ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2690ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6044ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2738ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6052ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2758ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6275ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2683ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 6048ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2739ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 5392ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2820ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 348ms (閾値: ≤300ms)