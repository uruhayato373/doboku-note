# PSI 計測レポート — 2026-07-04

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **49件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 613 | 0.013 |
| /search | desktop | 76 | 100 | 96 | 92 | 459 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 435 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 88 | 96 | 96 | 100 | 2334 | 0.013 |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 96 | 96 | 100 | 1016 | 0.013 |
| /docs/civil-construction-1-primary-r07-a | desktop | 84 | 96 | 96 | 100 | 1001 | 0.228⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 94 | 96 | 96 | 100 | 1604 | 0.013 |
| /docs/civil-construction-1-secondary-r07 | desktop | 94 | 96 | 96 | 100 | 863 | 0.013 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 100 | 681 | 0.013 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 86 | 96 | 96 | 100 | 2471 | 0.013 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 99 | 96 | 96 | 100 | 837 | 0.013 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 93 | 96 | 96 | 100 | 1681 | 0.013 |
| /docs/pe-comprehensive-management-exam-index | desktop | 94 | 96 | 96 | 100 | 753 | 0.013 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 96 | 96 | 100 | 647 | 0.013 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 80 | 96 | 96 | 100 | 818 | 0.158⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 95 | 96 | 96 | 100 | 435 | 0.033 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 626 | 0.013 |
| /docs/pe-comprehensive-management-followership | desktop | 97 | 96 | 96 | 100 | 737 | 0.013 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 96 | 96 | 100 | 859 | 0.013 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 94 | 94 | 96 | 100 | 1641 | 0.013 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 94 | 96 | 100 | 979 | 0.013 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 97 | 94 | 96 | 100 | 1213 | 0.013 |
| / | mobile | 97 | 96 | 96 | 100 | 2489 | 0.009 |
| /search | mobile | 78 | 96 | 96 | 92 | 4260⚠ | 0 |
| /category | mobile | 98 | 98 | 96 | 83⚠ | 1380 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 75 | 93 | 96 | 100 | 4969⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 96 | 93 | 96 | 100 | 2551⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 68⚠ | 93 | 96 | 100 | 6755⚠ | 0.029 |
| /docs/civil-construction-1-primary-h26-a | mobile | 68⚠ | 92 | 96 | 100 | 5955⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 75 | 93 | 96 | 100 | 4898⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 67⚠ | 93 | 96 | 100 | 6246⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 69⚠ | 93 | 96 | 100 | 5577⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 65⚠ | 93 | 96 | 100 | 6826⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 96 | 92 | 96 | 100 | 2701⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 73 | 93 | 96 | 100 | 4972⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 72 | 93 | 96 | 100 | 5129⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 75 | 93 | 96 | 100 | 5026⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 96 | 93 | 96 | 100 | 2701⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 45⚠ | 92 | 96 | 100 | 5204⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 65⚠ | 93 | 96 | 100 | 6376⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 99 | 93 | 96 | 100 | 2112 | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 77 | 91 | 96 | 100 | 4885⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 72 | 91 | 96 | 100 | 5010⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 73 | 91 | 96 | 100 | 4942⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.228 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **TBT** = 306ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 4260ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2959ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 4969ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2830ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6755ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3296ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5955ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2870ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4898ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2808ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 6246ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3165ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 5577ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2714ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 6826ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3163ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 2701ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4972ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2836ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 5129ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2698ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 5026ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2921ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2701ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 45 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 5204ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2811ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **TBT** = 1646ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6376ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2692ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4885ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2633ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 5010ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2697ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4942ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2688ms (閾値: ≤1800ms)