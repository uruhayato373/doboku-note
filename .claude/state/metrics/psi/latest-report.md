# PSI 計測レポート — 2026-04-28

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **81件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 100 | 92 | 899 | 0.038 |
| /search | desktop | 90 | 94 | 100 | 83⚠ | 1281 | 0.025 |
| /category | desktop | 93 | 98 | 96 | 75⚠ | 742 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 91 | 100 | 100 | 92 | 1461 | 0.024 |
| /docs/civil-construction-1-guide-four-management | desktop | 88 | 100 | 100 | 92 | 1622 | 0.024 |
| /docs/civil-construction-1-primary-r07-a | desktop | 75 | 100 | 100 | 92 | 2351 | 0.177⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 79 | 100 | 100 | 92 | 2216 | 0.043 |
| /docs/civil-construction-1-secondary-r07 | desktop | 91 | 100 | 100 | 92 | 1621 | 0.024 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 81 | 100 | 100 | 92 | 2258 | 0.058 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 84 | 100 | 100 | 92 | 2131 | 0.029 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 75 | 100 | 100 | 92 | 2056 | 0.187⚠ |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 86 | 100 | 100 | 92 | 1845 | 0.058 |
| /docs/pe-comprehensive-management-exam-index | desktop | 92 | 96 | 96 | 92 | 1581 | 0.026 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 86 | 98 | 96 | 92 | 1521 | 0.054 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 89 | 100 | 96 | 92 | 1541 | 0.107⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 88 | 100 | 96 | 92 | 1761 | 0.081 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 93 | 100 | 96 | 92 | 1537 | 0.024 |
| /docs/pe-comprehensive-management-followership | desktop | 88 | 96 | 96 | 92 | 1381 | 0.156⚠ |
| /docs/pe-comprehensive-management-agile | desktop | 94 | 96 | 100 | 92 | 1461 | 0.05 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 90 | 94 | 100 | 92 | 1501 | 0.114⚠ |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 92 | 94 | 100 | 92 | 1404 | 0.025 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 94 | 94 | 100 | 92 | 1500 | 0.034 |
| / | mobile | 49⚠ | 96 | 100 | 92 | 7672⚠ | 0.009 |
| /search | mobile | 67⚠ | 92 | 100 | 83⚠ | 5915⚠ | 0 |
| /category | mobile | 69⚠ | 98 | 96 | 75⚠ | 5339⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 49⚠ | 96 | 100 | 92 | 11926⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 57⚠ | 96 | 100 | 92 | 11326⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 50⚠ | 96 | 100 | 92 | 15526⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 40⚠ | 96 | 100 | 92 | 14326⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 37⚠ | 96 | 100 | 92 | 9452⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 56⚠ | 96 | 100 | 92 | 11026⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 57⚠ | 96 | 100 | 92 | 11178⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 57⚠ | 96 | 100 | 92 | 12083⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 57⚠ | 96 | 100 | 92 | 11479⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 61⚠ | 93 | 100 | 92 | 7426⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 59⚠ | 95 | 100 | 92 | 8927⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 56⚠ | 96 | 100 | 92 | 13426⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 50⚠ | 96 | 96 | 92 | 11026⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 50⚠ | 96 | 100 | 92 | 11176⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 61⚠ | 96 | 100 | 92 | 7744⚠ | 0.092 |
| /docs/pe-comprehensive-management-agile | mobile | 58⚠ | 96 | 100 | 92 | 7495⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 62⚠ | 95 | 100 | 92 | 7952⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 54⚠ | 95 | 100 | 92 | 10202⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 63⚠ | 95 | 100 | 92 | 7127⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.177 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **CLS** = 0.187 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.107 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **CLS** = 0.156 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **CLS** = 0.114 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 49 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7672ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 6021ms (閾値: ≤1800ms)
- `https://doboku-note.com/` (mobile): **TBT** = 468ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5915ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 4602ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 5339ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 4222ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 49 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 11926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 9192ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **TBT** = 320ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 11326ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 8251ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 15526ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 12097ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 40 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 14326ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 12301ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 615ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 37 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 9452ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 7202ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **TBT** = 940ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 11026ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 8551ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 11178ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 8551ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 12083ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 8761ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 11479ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 8008ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 7426ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 5851ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 8927ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 6151ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 13426ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 9670ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 11026ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 8251ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **TBT** = 309ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 11176ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 7843ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **TBT** = 341ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 7744ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 5101ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 7495ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 5401ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 7952ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 5101ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 10202ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 7030ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 7127ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 4952ms (閾値: ≤1800ms)