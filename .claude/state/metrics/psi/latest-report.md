# PSI 計測レポート — 2026-05-30

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **91件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 92 | 96 | 100 | 675 | 0.03 |
| /search | desktop | 100 | 94 | 96 | 92 | 746 | 0.03 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 449 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 97 | 87⚠ | 96 | 92 | 1145 | 0.03 |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 87⚠ | 96 | 92 | 1039 | 0.03 |
| /docs/civil-construction-1-primary-r07-a | desktop | 82 | 87⚠ | 96 | 92 | 1095 | 0.165⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 97 | 87⚠ | 96 | 92 | 1100 | 0.03 |
| /docs/civil-construction-1-secondary-r07 | desktop | 97 | 87⚠ | 96 | 92 | 973 | 0.03 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 93 | 87⚠ | 96 | 92 | 782 | 0.08 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 87 | 87⚠ | 96 | 92 | 2345 | 0.03 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 90 | 87⚠ | 96 | 92 | 2105 | 0.03 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 88 | 86⚠ | 96 | 92 | 2229 | 0.03 |
| /docs/pe-comprehensive-management-exam-index | desktop | 95 | 87⚠ | 96 | 92 | 1513 | 0.03 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 98 | 87⚠ | 96 | 92 | 1070 | 0.03 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 90 | 87⚠ | 96 | 92 | 979 | 0.17⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 71 | 87⚠ | 96 | 92 | 798 | 0.03 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 92 | 96 | 100 | 691 | 0.03 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 87⚠ | 96 | 92 | 831 | 0.03 |
| /docs/pe-comprehensive-management-agile | desktop | 93 | 87⚠ | 96 | 92 | 1445 | 0.099 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 85⚠ | 96 | 92 | 841 | 0.03 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 91 | 96 | 100 | 936 | 0.03 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 95 | 91 | 96 | 100 | 875 | 0.03 |
| / | mobile | 95 | 83⚠ | 96 | 92 | 2942⚠ | 0.009 |
| /search | mobile | 77 | 91 | 96 | 92 | 4174⚠ | 0 |
| /category | mobile | 100 | 98 | 96 | 83⚠ | 1522 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 66⚠ | 84⚠ | 96 | 92 | 6802⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 68⚠ | 84⚠ | 96 | 92 | 6783⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 57⚠ | 84⚠ | 96 | 92 | 5778⚠ | 0.009 |
| /docs/civil-construction-1-primary-h26-a | mobile | 68⚠ | 83⚠ | 96 | 92 | 6569⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 73 | 84⚠ | 96 | 92 | 4636⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 67⚠ | 84⚠ | 96 | 92 | 8636⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 70 | 84⚠ | 96 | 92 | 6993⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 62⚠ | 84⚠ | 96 | 92 | 8545⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 64⚠ | 83⚠ | 96 | 92 | 6936⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 94 | 84⚠ | 96 | 92 | 2568⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 71 | 84⚠ | 96 | 92 | 6847⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 97 | 84⚠ | 96 | 92 | 2401 | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 69⚠ | 84⚠ | 96 | 92 | 6561⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 70 | 83⚠ | 96 | 92 | 6422⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 70 | 84⚠ | 96 | 92 | 6258⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 69⚠ | 84⚠ | 96 | 92 | 7010⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 68⚠ | 82⚠ | 96 | 92 | 6513⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 69⚠ | 82⚠ | 96 | 92 | 6801⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 69⚠ | 82⚠ | 96 | 92 | 6283⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.165 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **Accessibility** = 86 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.17 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **TBT** = 758ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **Accessibility** = 85 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **LCP** = 2942ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 4174ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2999ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6802ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2725ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6783ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2984ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5778ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 887ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6569ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2904ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4636ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **TBT** = 373ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 8636ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3093ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6993ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2668ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 8545ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3440ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 6936ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3497ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 2568ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6847ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2649ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6561ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2695ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 6422ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2734ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6258ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2750ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 7010ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2675ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6513ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2769ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 6801ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2784ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 6283ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2673ms (閾値: ≤1800ms)