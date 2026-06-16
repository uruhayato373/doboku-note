# PSI 計測レポート — 2026-06-16

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **47件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 96 | 100 | 592 | 0.011 |
| /search | desktop | 99 | 94 | 96 | 92 | 1042 | 0.011 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 449 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 97 | 96 | 96 | 100 | 1165 | 0.011 |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 96 | 96 | 100 | 1065 | 0.011 |
| /docs/civil-construction-1-primary-r07-a | desktop | 86 | 96 | 96 | 100 | 1454 | 0.176⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 96 | 96 | 96 | 100 | 1217 | 0.011 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 96 | 96 | 100 | 947 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 98 | 96 | 96 | 100 | 989 | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 96 | 96 | 96 | 100 | 1176 | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 98 | 96 | 96 | 100 | 1035 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 94 | 96 | 96 | 100 | 1590 | 0.011 |
| /docs/pe-comprehensive-management-exam-index | desktop | 95 | 96 | 96 | 100 | 791 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 98 | 96 | 96 | 100 | 935 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 93 | 96 | 96 | 100 | 922 | 0.152⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 99 | 96 | 96 | 100 | 613 | 0.032 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 687 | 0.011 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 100 | 915 | 0.011 |
| /docs/pe-comprehensive-management-agile | desktop | 97 | 96 | 96 | 100 | 1252 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 94 | 96 | 100 | 761 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 94 | 96 | 100 | 969 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 94 | 94 | 96 | 100 | 899 | 0.011 |
| / | mobile | 64⚠ | 92 | 96 | 100 | 5789⚠ | 0 |
| /search | mobile | 72 | 91 | 96 | 92 | 5582⚠ | 0 |
| /category | mobile | 100 | 98 | 96 | 83⚠ | 1055 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 67⚠ | 93 | 96 | 100 | 6901⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 89 | 93 | 96 | 100 | 2476 | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 67⚠ | 93 | 96 | 100 | 7502⚠ | 0.04 |
| /docs/civil-construction-1-primary-h26-a | mobile | 56⚠ | 92 | 96 | 100 | 7201⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 55⚠ | 93 | 96 | 100 | 7126⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 65⚠ | 93 | 96 | 100 | 8776⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 70 | 93 | 96 | 100 | 6709⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 62⚠ | 93 | 96 | 100 | 5977⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 71 | 92 | 96 | 100 | 6562⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 73 | 93 | 96 | 100 | 5884⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 67⚠ | 93 | 96 | 100 | 6494⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 71 | 93 | 96 | 100 | 6108⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 70 | 93 | 96 | 100 | 6331⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 99 | 92 | 96 | 100 | 1846 | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 98 | 93 | 96 | 100 | 2125 | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 71 | 93 | 96 | 100 | 6411⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 91 | 91 | 96 | 100 | 3344⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 100 | 91 | 96 | 100 | 1214 | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 98 | 91 | 96 | 100 | 1968 | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.176 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 5789ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2888ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 5582ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2618ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6901ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2623ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 359ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7502ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3323ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3133ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 380ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 7126ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 3248ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **TBT** = 399ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 8776ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3127ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6709ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2677ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5977ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3059ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **TBT** = 374ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 6562ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2877ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5884ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2507ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6494ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2711ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6108ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3019ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6331ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2993ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6411ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2673ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 3344ms (閾値: ≤2500ms)