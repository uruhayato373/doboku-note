# PSI 計測レポート — 2026-06-21

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **55件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 96 | 100 | 458 | 0.011 |
| /search | desktop | 96 | 94 | 96 | 92 | 1084 | 0 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 407 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 88 | 96 | 96 | 100 | 2249 | 0.011 |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 96 | 96 | 100 | 1010 | 0.025 |
| /docs/civil-construction-1-primary-r07-a | desktop | 77 | 96 | 96 | 100 | 1143 | 0.172⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 98 | 96 | 96 | 100 | 981 | 0.019 |
| /docs/civil-construction-1-secondary-r07 | desktop | 97 | 96 | 96 | 100 | 1202 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 98 | 96 | 96 | 100 | 850 | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 96 | 96 | 96 | 100 | 1323 | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 100 | 96 | 96 | 100 | 661 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 96 | 96 | 100 | 578 | 0.011 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 96 | 96 | 100 | 861 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 96 | 96 | 100 | 862 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 92 | 96 | 96 | 100 | 924 | 0.152⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 96 | 96 | 100 | 631 | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 97 | 96 | 96 | 100 | 672 | 0.011 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 100 | 995 | 0.011 |
| /docs/pe-comprehensive-management-agile | desktop | 100 | 96 | 96 | 100 | 799 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 98 | 94 | 96 | 100 | 870 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 94 | 96 | 100 | 872 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 94 | 96 | 100 | 713 | 0.011 |
| / | mobile | 96 | 92 | 96 | 100 | 2708⚠ | 0.009 |
| /search | mobile | 91 | 91 | 96 | 92 | 3470⚠ | 0 |
| /category | mobile | 100 | 98 | 96 | 83⚠ | 905 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 98 | 93 | 96 | 100 | 2251 | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 93 | 93 | 96 | 100 | 3226⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 68⚠ | 93 | 96 | 100 | 7577⚠ | 0.04 |
| /docs/civil-construction-1-primary-h26-a | mobile | 94 | 92 | 96 | 100 | 3076⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 61⚠ | 93 | 96 | 100 | 7201⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 67⚠ | 93 | 96 | 100 | 7387⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 57⚠ | 93 | 96 | 100 | 7726⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 64⚠ | 93 | 96 | 100 | 6042⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 70 | 92 | 96 | 100 | 6847⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 97 | 93 | 96 | 100 | 2551⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 64⚠ | 93 | 96 | 100 | 7276⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 68⚠ | 93 | 96 | 100 | 6342⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 70 | 93 | 96 | 100 | 6253⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 65⚠ | 92 | 96 | 100 | 6210⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 67⚠ | 93 | 96 | 100 | 6901⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 66⚠ | 93 | 96 | 100 | 6493⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 66⚠ | 91 | 96 | 100 | 7126⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 71 | 91 | 96 | 100 | 6039⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 69⚠ | 91 | 96 | 100 | 6131⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.172 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 304ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 2708ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 3470ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7577ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3104ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 3076ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2869ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7387ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3202ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 7726ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3036ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 332ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 6042ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3027ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **TBT** = 324ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 6847ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2950ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 7276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2539ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6342ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2986ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6253ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2953ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 6210ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2735ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **TBT** = 304ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6901ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2631ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6493ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2736ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 7126ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2679ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 6039ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2547ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 6131ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2700ms (閾値: ≤1800ms)