# PSI 計測レポート — 2026-06-11

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **54件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 96 | 100 | 531 | 0.011 |
| /search | desktop | 98 | 94 | 96 | 92 | 1073 | 0.011 |
| /category | desktop | 94 | 98 | 96 | 83⚠ | 439 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 96 | 96 | 96 | 100 | 1354 | 0.011 |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 96 | 96 | 100 | 1195 | 0.011 |
| /docs/civil-construction-1-primary-r07-a | desktop | 89 | 96 | 96 | 100 | 1222 | 0.176⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 84 | 96 | 96 | 100 | 2540⚠ | 0.011 |
| /docs/civil-construction-1-secondary-r07 | desktop | 87 | 96 | 96 | 100 | 2304 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 100 | 682 | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 87 | 93 | 88 | 100 | 1177 | 0 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 94 | 96 | 96 | 100 | 1575 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 94 | 95 | 96 | 100 | 1627 | 0 |
| /docs/pe-comprehensive-management-exam-index | desktop | 70 | 96 | 96 | 100 | 955 | 0.03 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 96 | 96 | 100 | 453 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 91 | 96 | 96 | 100 | 862 | 0.152⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 96 | 96 | 100 | 633 | 0.032 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 93 | 96 | 96 | 100 | 672 | 0.011 |
| /docs/pe-comprehensive-management-followership | desktop | 96 | 96 | 96 | 100 | 715 | 0.011 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 96 | 96 | 100 | 1097 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 97 | 94 | 96 | 100 | 951 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 94 | 96 | 100 | 881 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 96 | 94 | 96 | 100 | 890 | 0.011 |
| / | mobile | 96 | 92 | 96 | 100 | 2708⚠ | 0.009 |
| /search | mobile | 98 | 91 | 96 | 92 | 2414 | 0.009 |
| /category | mobile | 74 | 98 | 96 | 83⚠ | 4204⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 57⚠ | 93 | 96 | 100 | 6751⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 70 | 93 | 96 | 100 | 6478⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 65⚠ | 93 | 96 | 100 | 8326⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 85 | 92 | 96 | 100 | 2326 | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 70 | 93 | 96 | 100 | 6106⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 68⚠ | 93 | 96 | 100 | 7969⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 70 | 93 | 96 | 100 | 6704⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 70 | 93 | 96 | 100 | 6252⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 70 | 92 | 96 | 100 | 6767⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 73 | 93 | 96 | 100 | 5871⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 99 | 93 | 96 | 100 | 1951 | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 95 | 93 | 96 | 100 | 2637⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 91 | 93 | 96 | 92 | 2926⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 93 | 92 | 96 | 100 | 3027⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 51⚠ | 93 | 96 | 100 | 6976⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 68⚠ | 93 | 96 | 100 | 7051⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 61⚠ | 91 | 96 | 100 | 5844⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 60⚠ | 91 | 96 | 100 | 6988⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 62⚠ | 91 | 96 | 100 | 6215⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.176 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **LCP** = 2540ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **TBT** = 881ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 2708ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 4204ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2579ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **TBT** = 314ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6751ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2902ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **TBT** = 410ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6478ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3007ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 8326ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3233ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 506ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6106ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2856ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7969ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3120ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6704ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2696ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 6252ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 2975ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 6767ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2792ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5871ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2498ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 2637ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 3027ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 51 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6976ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 3047ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **TBT** = 585ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 7051ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2710ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 5844ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2767ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **TBT** = 494ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 6988ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 3149ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 6215ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2744ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 394ms (閾値: ≤300ms)