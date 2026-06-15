# PSI 計測レポート — 2026-06-15

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **55件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 96 | 96 | 100 | 610 | 0.011 |
| /search | desktop | 65⚠ | 94 | 96 | 92 | 1215 | 0.011 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 419 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 86 | 96 | 96 | 100 | 2275 | 0.011 |
| /docs/civil-construction-1-guide-four-management | desktop | 96 | 96 | 96 | 100 | 991 | 0.025 |
| /docs/civil-construction-1-primary-r07-a | desktop | 83 | 96 | 96 | 100 | 1261 | 0.176⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 94 | 96 | 96 | 100 | 1097 | 0.018 |
| /docs/civil-construction-1-secondary-r07 | desktop | 97 | 96 | 96 | 100 | 1049 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 92 | 96 | 96 | 100 | 802 | 0.061 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 96 | 96 | 96 | 100 | 1333 | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 96 | 96 | 96 | 100 | 930 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 91 | 96 | 96 | 100 | 1941 | 0.011 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 96 | 96 | 100 | 952 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 96 | 96 | 100 | 847 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 86 | 96 | 96 | 100 | 994 | 0.152⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 96 | 96 | 96 | 100 | 614 | 0.032 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 96 | 96 | 100 | 843 | 0.011 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 100 | 833 | 0.011 |
| /docs/pe-comprehensive-management-agile | desktop | 94 | 96 | 96 | 100 | 1079 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 94 | 96 | 100 | 831 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 94 | 96 | 100 | 884 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 94 | 96 | 100 | 842 | 0.011 |
| / | mobile | 76 | 92 | 96 | 100 | 4955⚠ | 0.009 |
| /search | mobile | 86 | 91 | 96 | 92 | 3470⚠ | 0 |
| /category | mobile | 98 | 98 | 96 | 83⚠ | 1529 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 73 | 93 | 96 | 100 | 5881⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 68⚠ | 93 | 96 | 100 | 6558⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 67⚠ | 93 | 77⚠ | 100 | 7578⚠ | 0.04 |
| /docs/civil-construction-1-primary-h26-a | mobile | 71 | 92 | 96 | 100 | 6028⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 65⚠ | 93 | 96 | 100 | 6199⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 66⚠ | 93 | 96 | 100 | 7237⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 96 | 93 | 96 | 100 | 2701⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 70 | 93 | 96 | 100 | 6481⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 64⚠ | 92 | 96 | 100 | 7426⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 72 | 93 | 96 | 100 | 5882⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 67⚠ | 93 | 96 | 100 | 7201⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 88 | 93 | 96 | 100 | 3826⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 65⚠ | 93 | 96 | 100 | 5674⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 97 | 92 | 96 | 100 | 2565⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 71 | 93 | 96 | 100 | 5813⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 69⚠ | 93 | 96 | 100 | 6411⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 68⚠ | 91 | 96 | 100 | 6357⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 61⚠ | 91 | 96 | 100 | 9670⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 93 | 91 | 96 | 100 | 3226⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/search` (desktop): **TBT** = 1242ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.176 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 4955ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2675ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 3470ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 5881ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2548ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6558ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2982ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Best Practices** = 77 (閾値: ≥85)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7578ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3269ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6028ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2887ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6199ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2905ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7237ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3219ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 2701ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 6481ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3021ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 7426ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2853ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5882ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2528ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2531ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 3826ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 5674ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2877ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **TBT** = 336ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 2565ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 5813ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2710ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6411ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2700ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6357ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2785ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 9670ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 4598ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)