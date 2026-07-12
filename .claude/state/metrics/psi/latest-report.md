# PSI 計測レポート — 2026-07-12

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **35件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 98 | 100 | 96 | 100 | 1113 | 0.013 |
| /search | desktop | 48⚠ | 100 | 96 | 92 | 450 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 449 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 99 | 100 | 96 | 100 | 692 | 0.013 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 100 | 96 | 100 | 937 | 0.013 |
| /docs/civil-construction-1-primary-r07-a | desktop | 81 | 100 | 96 | 100 | 938 | 0.221⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 97 | 98 | 96 | 100 | 1208 | 0.013 |
| /docs/civil-construction-1-secondary-r07 | desktop | 57⚠ | 100 | 96 | 100 | 1703 | 0.098 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 100 | 100 | 96 | 100 | 701 | 0.013 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 100 | 96 | 100 | 688 | 0.013 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 93 | 100 | 96 | 100 | 884 | 0.013 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 95 | 100 | 96 | 100 | 714 | 0.013 |
| /docs/pe-comprehensive-management-exam-index | desktop | 95 | 100 | 96 | 100 | 793 | 0.064 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 96 | 100 | 801 | 0.013 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 100 | 100 | 96 | 100 | 715 | 0.013 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 89 | 100 | 96 | 100 | 417 | 0.032 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 100 | 100 | 100 | 637 | 0.013 |
| /docs/pe-comprehensive-management-followership | desktop | 91 | 100 | 96 | 100 | 581 | 0.013 |
| /docs/pe-comprehensive-management-agile | desktop | 100 | 100 | 96 | 100 | 808 | 0.027 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 98 | 96 | 100 | 733 | 0.013 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 97 | 98 | 96 | 100 | 750 | 0.013 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 98 | 96 | 100 | 670 | 0.013 |
| / | mobile | 69⚠ | 96 | 96 | 100 | 7375⚠ | 0.009 |
| /search | mobile | 77 | 96 | 96 | 92 | 1659 | 0.606⚠ |
| /category | mobile | 99 | 98 | 96 | 83⚠ | 1810 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 98 | 96 | 96 | 100 | 2401 | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 71 | 96 | 96 | 100 | 5195⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 67⚠ | 96 | 96 | 100 | 6265⚠ | 0.03 |
| /docs/civil-construction-1-primary-h26-a | mobile | 69⚠ | 95 | 96 | 100 | 5949⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 99 | 96 | 96 | 100 | 1951 | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 72 | 96 | 96 | 100 | 5420⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 74 | 96 | 96 | 100 | 4903⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 67⚠ | 96 | 96 | 100 | 3834⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 96 | 96 | 96 | 100 | 2626⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 97 | 96 | 96 | 100 | 2476 | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 95 | 96 | 96 | 100 | 2782⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 98 | 96 | 96 | 100 | 2251 | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 73 | 96 | 96 | 100 | 5201⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 99 | 96 | 96 | 100 | 1961 | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 76 | 96 | 96 | 100 | 4897⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 72 | 96 | 96 | 100 | 5280⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 98 | 95 | 96 | 100 | 2251 | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 99 | 95 | 96 | 100 | 2035 | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 99 | 95 | 96 | 100 | 2036 | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **Performance** = 48 (閾値: ≥70)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/search` (desktop): **TBT** = 949ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.221 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 4761ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7375ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2564ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.606 (閾値: ≤0.1)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5195ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2984ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6265ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3297ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5949ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2847ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5420ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3127ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4903ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2691ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 3834ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **TBT** = 851ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2782ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 5201ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3014ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4897ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2535ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5280ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2539ms (閾値: ≤1800ms)