# PSI 計測レポート — 2026-07-11

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **45件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 95 | 100 | 96 | 100 | 879 | 0.013 |
| /search | desktop | 76 | 100 | 96 | 92 | 490 | 0.766⚠ |
| /category | desktop | 99 | 98 | 92 | 83⚠ | 449 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 100 | 96 | 100 | 689 | 0.013 |
| /docs/civil-construction-1-guide-four-management | desktop | 100 | 100 | 96 | 100 | 740 | 0.013 |
| /docs/civil-construction-1-primary-r07-a | desktop | 82 | 100 | 96 | 100 | 871 | 0.223⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 92 | 98 | 96 | 100 | 687 | 0.019 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 100 | 96 | 100 | 691 | 0.013 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 98 | 100 | 96 | 100 | 518 | 0.013 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 98 | 100 | 96 | 100 | 691 | 0.013 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 99 | 100 | 96 | 100 | 899 | 0.013 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 100 | 96 | 100 | 616 | 0.013 |
| /docs/pe-comprehensive-management-exam-index | desktop | 100 | 100 | 96 | 100 | 686 | 0.013 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 98 | 100 | 96 | 100 | 633 | 0.013 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 93 | 100 | 96 | 100 | 601 | 0.152⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 100 | 96 | 100 | 556 | 0.013 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 100 | 96 | 100 | 546 | 0.013 |
| /docs/pe-comprehensive-management-followership | desktop | 100 | 100 | 96 | 100 | 661 | 0.013 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 100 | 96 | 100 | 938 | 0.027 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 98 | 96 | 100 | 853 | 0.013 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 97 | 98 | 96 | 100 | 769 | 0.013 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 89 | 98 | 96 | 100 | 563 | 0.013 |
| / | mobile | 63⚠ | 96 | 96 | 100 | 6921⚠ | 0.009 |
| /search | mobile | 77 | 96 | 96 | 92 | 1659 | 0.606⚠ |
| /category | mobile | 100 | 98 | 96 | 83⚠ | 1810 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 76 | 96 | 96 | 100 | 4889⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 66⚠ | 96 | 96 | 100 | 5282⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 71 | 96 | 96 | 100 | 5721⚠ | 0.009 |
| /docs/civil-construction-1-primary-h26-a | mobile | 64⚠ | 95 | 96 | 100 | 5581⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 74 | 96 | 96 | 100 | 4979⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 73 | 96 | 96 | 100 | 5343⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 65⚠ | 96 | 96 | 100 | 6526⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 73 | 96 | 96 | 100 | 5198⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 71 | 96 | 96 | 100 | 5720⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 97 | 96 | 96 | 100 | 2476 | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 68⚠ | 96 | 96 | 100 | 6526⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 96 | 96 | 96 | 100 | 2626⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 74 | 96 | 96 | 100 | 5195⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 98 | 96 | 96 | 100 | 2261 | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 77 | 96 | 96 | 100 | 4814⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 99 | 96 | 96 | 100 | 2251 | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 98 | 95 | 96 | 100 | 2251 | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 98 | 95 | 96 | 100 | 2326 | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 69⚠ | 95 | 96 | 100 | 4907⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.223 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 6921ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2589ms (閾値: ≤1800ms)
- `https://doboku-note.com/` (mobile): **TBT** = 302ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.606 (閾値: ≤0.1)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 4889ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2781ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5282ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3035ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 346ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5721ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3276ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5581ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2928ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 350ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4979ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2671ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5343ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3101ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6526ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2877ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5198ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3015ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5720ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3108ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6526ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2555ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 5195ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2825ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4814ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2503ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4907ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2718ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 321ms (閾値: ≤300ms)