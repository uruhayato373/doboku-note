# PSI 計測レポート — 2026-05-29

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **90件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 92 | 96 | 100 | 550 | 0.025 |
| /search | desktop | 98 | 94 | 96 | 92 | 1032 | 0.025 |
| /category | desktop | 98 | 98 | 96 | 83⚠ | 339 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 89 | 87⚠ | 96 | 92 | 1681 | 0.025 |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 87⚠ | 96 | 92 | 1075 | 0.025 |
| /docs/civil-construction-1-primary-r07-a | desktop | 89 | 87⚠ | 96 | 92 | 1592 | 0.025 |
| /docs/civil-construction-1-primary-h26-a | desktop | 97 | 87⚠ | 96 | 92 | 1217 | 0.025 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 87⚠ | 96 | 92 | 949 | 0.025 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 77 | 87⚠ | 96 | 92 | 714 | 0.075 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 96 | 87⚠ | 96 | 92 | 1173 | 0.025 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 73 | 87⚠ | 96 | 92 | 2662⚠ | 0.139⚠ |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 82 | 86⚠ | 96 | 92 | 3033⚠ | 0.025 |
| /docs/pe-comprehensive-management-exam-index | desktop | 90 | 87⚠ | 96 | 92 | 2023 | 0.025 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 94 | 87⚠ | 96 | 92 | 1111 | 0.025 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 93 | 87⚠ | 96 | 92 | 1016 | 0.14⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 87⚠ | 96 | 92 | 588 | 0.025 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 92 | 96 | 100 | 603 | 0.025 |
| /docs/pe-comprehensive-management-followership | desktop | 98 | 87⚠ | 96 | 92 | 994 | 0.025 |
| /docs/pe-comprehensive-management-agile | desktop | 96 | 87⚠ | 96 | 92 | 1278 | 0.042 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 85⚠ | 96 | 92 | 838 | 0.025 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 91 | 96 | 100 | 960 | 0.025 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 91 | 96 | 100 | 960 | 0.025 |
| / | mobile | 90 | 83⚠ | 96 | 92 | 2599⚠ | 0.009 |
| /search | mobile | 71 | 91 | 96 | 92 | 5281⚠ | 0 |
| /category | mobile | 78 | 98 | 96 | 83⚠ | 4242⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 60⚠ | 84⚠ | 96 | 92 | 7501⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 63⚠ | 84⚠ | 96 | 92 | 6697⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 69⚠ | 84⚠ | 96 | 92 | 7503⚠ | 0.04 |
| /docs/civil-construction-1-primary-h26-a | mobile | 74 | 83⚠ | 96 | 92 | 5208⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 100 | 84⚠ | 96 | 92 | 1501 | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 64⚠ | 84⚠ | 96 | 92 | 8626⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 70 | 84⚠ | 96 | 92 | 6785⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 67⚠ | 84⚠ | 96 | 92 | 6891⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 74 | 95 | 96 | 100 | 5530⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 68⚠ | 84⚠ | 96 | 92 | 6260⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 71 | 84⚠ | 96 | 92 | 6626⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 69⚠ | 84⚠ | 96 | 92 | 6562⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 77 | 96 | 96 | 100 | 5069⚠ | 0 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 97 | 83⚠ | 96 | 92 | 2120 | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 69⚠ | 84⚠ | 96 | 92 | 6117⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 70 | 84⚠ | 77⚠ | 92 | 6418⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 71 | 82⚠ | 96 | 92 | 6407⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 65⚠ | 82⚠ | 96 | 92 | 7213⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 70 | 82⚠ | 96 | 92 | 6718⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 451ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **LCP** = 2662ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **CLS** = 0.139 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **Accessibility** = 86 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **LCP** = 3033ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.14 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **Accessibility** = 85 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **LCP** = 2599ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 5281ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2677ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 4242ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2619ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 7501ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2927ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6697ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2639ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7503ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 2959ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5208ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2798ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 8626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3140ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6785ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2655ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 6891ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3273ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 5530ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 2905ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6260ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2731ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2649ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6562ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2890ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 5069ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2588ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6117ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2698ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Best Practices** = 77 (閾値: ≥85)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6418ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2679ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6407ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2630ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 7213ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2818ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 6718ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2666ms (閾値: ≤1800ms)