# PSI 計測レポート — 2026-06-05

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **60件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 96 | 96 | 100 | 622 | 0.035 |
| /search | desktop | 85 | 94 | 96 | 92 | 1119 | 0.035 |
| /category | desktop | 94 | 98 | 96 | 83⚠ | 490 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 86 | 96 | 96 | 100 | 1092 | 0.035 |
| /docs/civil-construction-1-guide-four-management | desktop | 95 | 96 | 96 | 100 | 1509 | 0.035 |
| /docs/civil-construction-1-primary-r07-a | desktop | 95 | 96 | 96 | 100 | 1521 | 0.035 |
| /docs/civil-construction-1-primary-h26-a | desktop | 94 | 96 | 96 | 100 | 1025 | 0.035 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 96 | 96 | 100 | 661 | 0.035 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 100 | 801 | 0.035 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 98 | 96 | 96 | 100 | 762 | 0.035 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 88 | 96 | 92 | 100 | 2244 | 0.035 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 69⚠ | 96 | 96 | 100 | 2093 | 0.204⚠ |
| /docs/pe-comprehensive-management-exam-index | desktop | 95 | 96 | 96 | 100 | 1501 | 0.035 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 73 | 96 | 96 | 100 | 912 | 0.035 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 97 | 96 | 96 | 100 | 1244 | 0.035 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 94 | 96 | 96 | 100 | 515 | 0.056 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 692 | 0.035 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 100 | 932 | 0.035 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 96 | 96 | 100 | 987 | 0.052 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 94 | 96 | 100 | 883 | 0.035 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 68⚠ | 94 | 96 | 100 | 855 | 0.035 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 94 | 96 | 100 | 778 | 0.035 |
| / | mobile | 67⚠ | 92 | 96 | 100 | 5281⚠ | 0 |
| /search | mobile | 90 | 91 | 96 | 92 | 3470⚠ | 0.009 |
| /category | mobile | 99 | 98 | 96 | 83⚠ | 2112 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 71 | 93 | 96 | 100 | 6102⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 66⚠ | 93 | 96 | 100 | 7351⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 68⚠ | 93 | 96 | 100 | 7578⚠ | 0.04 |
| /docs/civil-construction-1-primary-h26-a | mobile | 66⚠ | 92 | 96 | 100 | 5542⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 68⚠ | 93 | 96 | 100 | 6109⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 67⚠ | 93 | 96 | 100 | 6713⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 71 | 93 | 96 | 100 | 5079⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 68⚠ | 93 | 96 | 100 | 6491⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 66⚠ | 92 | 96 | 100 | 6531⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 73 | 93 | 92 | 100 | 5803⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 72 | 93 | 96 | 100 | 6411⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 66⚠ | 93 | 96 | 100 | 6826⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 95 | 93 | 96 | 100 | 2926⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 93 | 92 | 96 | 100 | 3183⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 73 | 93 | 96 | 100 | 5796⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 69⚠ | 93 | 96 | 100 | 6341⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 69⚠ | 91 | 96 | 100 | 6358⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 67⚠ | 91 | 96 | 100 | 6119⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 86 | 91 | 96 | 100 | 2644⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **TBT** = 307ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **CLS** = 0.204 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **TBT** = 642ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): **TBT** = 1531ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 5281ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2981ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 3470ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6102ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2611ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 7351ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2953ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7578ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 2975ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5542ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2876ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 336ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6109ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2703ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 6713ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3212ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 5079ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 373ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 6491ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3240ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 6531ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3473ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5803ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2567ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6411ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2737ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6826ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3084ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 3183ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 5796ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2643ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6341ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2764ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6358ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2685ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 6119ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 3104ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 2644ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 414ms (閾値: ≤300ms)