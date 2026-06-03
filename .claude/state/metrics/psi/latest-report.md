# PSI 計測レポート — 2026-06-03

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **64件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 96 | 100 | 648 | 0.03 |
| /search | desktop | 100 | 94 | 96 | 92 | 751 | 0.03 |
| /category | desktop | 96 | 98 | 96 | 83⚠ | 436 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 98 | 96 | 96 | 100 | 1037 | 0.03 |
| /docs/civil-construction-1-guide-four-management | desktop | 87 | 96 | 96 | 100 | 2321 | 0.03 |
| /docs/civil-construction-1-primary-r07-a | desktop | 63⚠ | 96 | 96 | 100 | 1207 | 0.165⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 89 | 96 | 96 | 100 | 1069 | 0.037 |
| /docs/civil-construction-1-secondary-r07 | desktop | 94 | 96 | 96 | 100 | 682 | 0.03 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 76 | 96 | 96 | 100 | 708 | 0.08 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 99 | 96 | 96 | 100 | 856 | 0.03 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 95 | 96 | 96 | 100 | 1006 | 0.03 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 88 | 96 | 96 | 100 | 2342 | 0.03 |
| /docs/pe-comprehensive-management-exam-index | desktop | 94 | 96 | 96 | 100 | 939 | 0.03 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 93 | 96 | 96 | 100 | 1701 | 0.03 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 85 | 96 | 96 | 100 | 984 | 0.17⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 99 | 96 | 96 | 100 | 613 | 0.051 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 621 | 0.03 |
| /docs/pe-comprehensive-management-followership | desktop | 97 | 96 | 96 | 100 | 999 | 0.03 |
| /docs/pe-comprehensive-management-agile | desktop | 93 | 96 | 96 | 100 | 932 | 0.047 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 98 | 94 | 96 | 100 | 964 | 0.03 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 94 | 96 | 100 | 862 | 0.03 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 94 | 96 | 100 | 762 | 0.03 |
| / | mobile | 75 | 92 | 96 | 100 | 4902⚠ | 0.009 |
| /search | mobile | 89 | 91 | 96 | 92 | 3470⚠ | 0.009 |
| /category | mobile | 71 | 98 | 96 | 83⚠ | 4239⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 69⚠ | 93 | 96 | 100 | 5965⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 68⚠ | 93 | 96 | 100 | 6338⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 69⚠ | 93 | 96 | 100 | 7278⚠ | 0.04 |
| /docs/civil-construction-1-primary-h26-a | mobile | 59⚠ | 92 | 96 | 100 | 6915⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 69⚠ | 93 | 96 | 100 | 6190⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 57⚠ | 93 | 96 | 100 | 7013⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 69⚠ | 93 | 96 | 100 | 6637⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 68⚠ | 93 | 96 | 100 | 6527⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 66⚠ | 92 | 96 | 100 | 6525⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 62⚠ | 93 | 96 | 100 | 6676⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 93 | 93 | 96 | 100 | 3154⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 68⚠ | 93 | 96 | 100 | 6262⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 71 | 93 | 96 | 100 | 6110⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 93 | 92 | 96 | 100 | 3158⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 73 | 93 | 96 | 100 | 5741⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 68⚠ | 93 | 96 | 100 | 6345⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 66⚠ | 91 | 96 | 100 | 6912⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 96 | 91 | 96 | 100 | 2710⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 67⚠ | 91 | 96 | 100 | 6687⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.165 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 704ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 484ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.17 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 4902ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2569ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 3470ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 4239ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 3033ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **TBT** = 342ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 5965ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2775ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6338ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3027ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7278ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 2970ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6915ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3077ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 313ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6190ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2728ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7013ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3291ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **TBT** = 376ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6637ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2704ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 6527ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3309ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 6525ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3467ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6676ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2809ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 3154ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6262ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3071ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6110ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2751ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 3158ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 5741ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2654ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6345ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2764ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6912ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2676ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 2710ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 6687ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2774ms (閾値: ≤1800ms)