# PSI 計測レポート — 2026-08-14

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **42件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 83 | 96 | 96 | 100 | 777 | 0.015 |
| /search | desktop | 76 | 100 | 96 | 66⚠ | 414 | 0.766⚠ |
| /category | desktop | 98 | 98 | 96 | 91 | 429 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 66⚠ | 100 | 96 | 100 | 1604 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 96 | 96 | 100 | 881 | 0.015 |
| /docs/civil-construction-1-primary-r07-a | desktop | 80 | 96 | 96 | 100 | 531 | 0.215⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 99 | 98 | 100 | 100 | 802 | 0.015 |
| /docs/civil-construction-1-secondary-r07 | desktop | 100 | 96 | 96 | 100 | 683 | 0.015 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 100 | 682 | 0.015 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 96 | 96 | 100 | 628 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 90 | 100 | 96 | 100 | 822 | 0.015 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 95 | 100 | 96 | 100 | 642 | 0.015 |
| /docs/pe-comprehensive-management-exam-index | desktop | 96 | 100 | 96 | 92 | 1061 | 0.015 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 96 | 100 | 521 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 100 | 100 | 100 | 100 | 681 | 0.015 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 100 | 96 | 100 | 532 | 0.015 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 564 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 100 | 100 | 96 | 100 | 701 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 100 | 92 | 100 | 947 | 0.029 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 98 | 96 | 100 | 381 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 100 | 98 | 96 | 100 | 715 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 95 | 98 | 96 | 100 | 787 | 0.015 |
| / | mobile | 69⚠ | 92 | 96 | 100 | 7240⚠ | 0.011 |
| /search | mobile | 77 | 96 | 96 | 66⚠ | 1810 | 0.61⚠ |
| /category | mobile | 80 | 98 | 96 | 91 | 4090⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 88 | 93 | 96 | 100 | 2484 | 0.011 |
| /docs/civil-construction-1-guide-four-management | mobile | 73 | 93 | 96 | 100 | 5152⚠ | 0.011 |
| /docs/civil-construction-1-primary-r07-a | mobile | 64⚠ | 93 | 96 | 100 | 7352⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 88 | 95 | 96 | 92 | 2412 | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 76 | 93 | 96 | 100 | 4699⚠ | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 65⚠ | 93 | 96 | 100 | 6451⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 85 | 93 | 96 | 100 | 2191 | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 92 | 93 | 96 | 100 | 2466 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 73 | 92 | 96 | 100 | 5267⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-index | mobile | 92 | 93 | 96 | 100 | 1962 | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 66⚠ | 93 | 96 | 100 | 6376⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 98 | 96 | 100 | 100 | 2188 | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 60⚠ | 96 | 96 | 100 | 9551⚠ | 0 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 66⚠ | 92 | 96 | 100 | 2170 | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 73 | 96 | 96 | 100 | 4723⚠ | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 72 | 96 | 96 | 100 | 2693⚠ | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 98 | 95 | 96 | 100 | 2251 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 77 | 95 | 96 | 100 | 4597⚠ | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 98 | 95 | 96 | 100 | 2108 | 0.011 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **TBT** = 369ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **TBT** = 556ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.215 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7240ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2784ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- `https://doboku-note.com/category` (mobile): **LCP** = 4090ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 3106ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5152ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3257ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7352ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3581ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 1827ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4699ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2956ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 6451ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3446ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 1830ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5267ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3232ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6376ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 3129ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 1825ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 9551ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 5121ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **TBT** = 4940ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4723ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2854ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 2693ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **TBT** = 1130ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4597ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2798ms (閾値: ≤1800ms)