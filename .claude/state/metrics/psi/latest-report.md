# PSI 計測レポート — 2026-05-31

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **90件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 92 | 96 | 100 | 559 | 0.03 |
| /search | desktop | 88 | 94 | 96 | 92 | 1069 | 0.03 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 427 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 97 | 87⚠ | 96 | 92 | 1167 | 0.03 |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 87⚠ | 96 | 92 | 1045 | 0.03 |
| /docs/civil-construction-1-primary-r07-a | desktop | 54⚠ | 87⚠ | 96 | 92 | 1532 | 0.161⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 62⚠ | 87⚠ | 96 | 92 | 1902 | 0.03 |
| /docs/civil-construction-1-secondary-r07 | desktop | 95 | 87⚠ | 96 | 92 | 1448 | 0.03 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 98 | 87⚠ | 96 | 92 | 844 | 0.03 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 97 | 87⚠ | 96 | 92 | 1166 | 0.03 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 84 | 87⚠ | 96 | 92 | 2937⚠ | 0.03 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 98 | 86⚠ | 96 | 92 | 1079 | 0.03 |
| /docs/pe-comprehensive-management-exam-index | desktop | 95 | 87⚠ | 96 | 92 | 1505 | 0.03 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 91 | 87⚠ | 96 | 92 | 1714 | 0.03 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 85 | 87⚠ | 96 | 92 | 914 | 0.17⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 88 | 87⚠ | 96 | 92 | 524 | 0.051 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 97 | 92 | 96 | 100 | 723 | 0.03 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 87⚠ | 96 | 92 | 873 | 0.03 |
| /docs/pe-comprehensive-management-agile | desktop | 94 | 87⚠ | 96 | 92 | 1356 | 0.099 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 85⚠ | 96 | 92 | 874 | 0.03 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 100 | 91 | 96 | 100 | 695 | 0.03 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 88 | 91 | 96 | 100 | 855 | 0.03 |
| / | mobile | 69⚠ | 83⚠ | 96 | 92 | 5733⚠ | 0 |
| /search | mobile | 74 | 91 | 96 | 92 | 4743⚠ | 0.009 |
| /category | mobile | 73 | 98 | 96 | 83⚠ | 4215⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 69⚠ | 84⚠ | 96 | 92 | 6259⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 68⚠ | 84⚠ | 96 | 92 | 6932⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 66⚠ | 84⚠ | 96 | 92 | 7728⚠ | 0.04 |
| /docs/civil-construction-1-primary-h26-a | mobile | 88 | 83⚠ | 96 | 92 | 2341 | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 89 | 84⚠ | 96 | 92 | 3676⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 75 | 84⚠ | 96 | 92 | 5077⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 84 | 84⚠ | 96 | 92 | 3227⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 64⚠ | 84⚠ | 96 | 92 | 7025⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 65⚠ | 83⚠ | 96 | 92 | 6990⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 95 | 84⚠ | 96 | 92 | 2926⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 95 | 84⚠ | 96 | 92 | 2851⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 68⚠ | 84⚠ | 96 | 92 | 6712⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 97 | 84⚠ | 96 | 92 | 2551⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 60⚠ | 83⚠ | 96 | 92 | 10276⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 67⚠ | 84⚠ | 96 | 92 | 6642⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 76 | 96 | 96 | 100 | 4984⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 70 | 82⚠ | 96 | 92 | 6571⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 70 | 82⚠ | 96 | 92 | 6046⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 95 | 82⚠ | 96 | 92 | 2860⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.161 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 2073ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **TBT** = 829ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **LCP** = 2937ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **Accessibility** = 86 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.17 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **Accessibility** = 85 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **LCP** = 5733ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2964ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 4743ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2824ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 4215ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2568ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **TBT** = 356ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6259ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2585ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6932ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3028ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7728ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 2997ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 360ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 3676ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5077ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 3227ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 7025ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3459ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 6990ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3451ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 2926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2851ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6712ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3026ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 10276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 4632ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6642ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2714ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 4984ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2430ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6571ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2771ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 6046ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2678ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 2860ms (閾値: ≤2500ms)