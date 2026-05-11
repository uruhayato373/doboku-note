# PSI 計測レポート — 2026-05-11

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **70件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 92 | 92 | 690 | 0.02 |
| /search | desktop | 89 | 94 | 96 | 83⚠ | 1298 | 0.02 |
| /category | desktop | 98 | 98 | 96 | 75⚠ | 441 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 98 | 100 | 96 | 92 | 690 | 0.02 |
| /docs/civil-construction-1-guide-four-management | desktop | 100 | 100 | 96 | 92 | 581 | 0.02 |
| /docs/civil-construction-1-primary-r07-a | desktop | 92 | 100 | 96 | 92 | 1023 | 0.151⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 100 | 100 | 96 | 92 | 535 | 0.02 |
| /docs/civil-construction-1-secondary-r07 | desktop | 94 | 100 | 96 | 92 | 571 | 0.02 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 98 | 100 | 96 | 92 | 786 | 0.069 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 99 | 100 | 96 | 92 | 802 | 0.02 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 95 | 100 | 96 | 92 | 678 | 0.02 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 86 | 100 | 96 | 92 | 708 | 0.188⚠ |
| /docs/pe-comprehensive-management-exam-index | desktop | 100 | 96 | 96 | 92 | 575 | 0.02 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 98 | 96 | 92 | 629 | 0.02 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 83 | 100 | 96 | 92 | 583 | 0.16⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 94 | 100 | 96 | 92 | 558 | 0.041 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 100 | 96 | 92 | 589 | 0.02 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 100 | 96 | 92 | 584 | 0.02 |
| /docs/pe-comprehensive-management-agile | desktop | 66⚠ | 100 | 96 | 92 | 1374 | 0.02 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 98 | 96 | 92 | 677 | 0.02 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 100 | 98 | 96 | 92 | 629 | 0.02 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 98 | 96 | 92 | 609 | 0.02 |
| / | mobile | 64⚠ | 96 | 96 | 92 | 7795⚠ | 0 |
| /search | mobile | 86 | 92 | 96 | 83⚠ | 3772⚠ | 0 |
| /category | mobile | 65⚠ | 98 | 96 | 75⚠ | 7177⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 65⚠ | 96 | 96 | 92 | 5793⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 57⚠ | 96 | 96 | 92 | 9580⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 70 | 96 | 96 | 92 | 5372⚠ | 0.009 |
| /docs/civil-construction-1-primary-h26-a | mobile | 61⚠ | 96 | 96 | 92 | 7731⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 63⚠ | 96 | 96 | 92 | 9051⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 80 | 96 | 96 | 92 | 4576⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 64⚠ | 96 | 96 | 92 | 7662⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 51⚠ | 96 | 96 | 92 | 10897⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 62⚠ | 96 | 96 | 92 | 9964⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 63⚠ | 93 | 96 | 92 | 8886⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 55⚠ | 95 | 96 | 92 | 9582⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 90 | 96 | 96 | 92 | 2476 | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 68⚠ | 96 | 96 | 92 | 5851⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 63⚠ | 96 | 96 | 92 | 9078⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 63⚠ | 96 | 96 | 92 | 9321⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 63⚠ | 96 | 96 | 92 | 8995⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 65⚠ | 95 | 96 | 92 | 7880⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 66⚠ | 95 | 96 | 92 | 7222⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 63⚠ | 95 | 96 | 92 | 8898⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.151 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **CLS** = 0.188 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.16 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **TBT** = 539ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7795ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 4785ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 3772ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 7177ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 4565ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 5793ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3025ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **TBT** = 303ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 9580ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 5633ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5372ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 375ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 7731ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 4140ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 9051ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 4664ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 4576ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 7662ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3189ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 51 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 10897ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 5739ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **TBT** = 354ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 9964ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 5296ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 8886ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 4640ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 9582ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 4744ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 314ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 5851ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3294ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 9078ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 4532ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 9321ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 4761ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 8995ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 4641ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 7880ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 3863ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 7222ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 3090ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 8898ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 4721ms (閾値: ≤1800ms)