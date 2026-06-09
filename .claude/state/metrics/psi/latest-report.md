# PSI 計測レポート — 2026-06-09

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **51件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 96 | 96 | 100 | 649 | 0.011 |
| /search | desktop | 100 | 94 | 96 | 92 | 733 | 0.011 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 426 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 97 | 96 | 96 | 100 | 1165 | 0.011 |
| /docs/civil-construction-1-guide-four-management | desktop | 94 | 96 | 96 | 100 | 1061 | 0.025 |
| /docs/civil-construction-1-primary-r07-a | desktop | 82 | 96 | 96 | 100 | 1463 | 0.176⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 74 | 96 | 96 | 100 | 2644⚠ | 0.018 |
| /docs/civil-construction-1-secondary-r07 | desktop | 94 | 96 | 96 | 100 | 1075 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 100 | 803 | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 83 | 96 | 96 | 100 | 2927⚠ | 0.011 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 91 | 96 | 96 | 100 | 1899 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 98 | 96 | 96 | 100 | 1003 | 0.011 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 96 | 96 | 100 | 855 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 91 | 96 | 96 | 100 | 1360 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 83 | 96 | 96 | 100 | 1149 | 0.152⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 96 | 96 | 100 | 646 | 0.032 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 648 | 0.011 |
| /docs/pe-comprehensive-management-followership | desktop | 98 | 96 | 96 | 100 | 1087 | 0.011 |
| /docs/pe-comprehensive-management-agile | desktop | 96 | 96 | 96 | 100 | 1391 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 94 | 96 | 100 | 847 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 98 | 94 | 96 | 100 | 1080 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 94 | 96 | 100 | 858 | 0.011 |
| / | mobile | 77 | 92 | 96 | 100 | 4825⚠ | 0.009 |
| /search | mobile | 90 | 91 | 96 | 92 | 3421⚠ | 0.009 |
| /category | mobile | 77 | 98 | 96 | 83⚠ | 4168⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 72 | 93 | 96 | 100 | 5884⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 64⚠ | 93 | 96 | 100 | 7351⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 76 | 93 | 96 | 100 | 5854⚠ | 0.009 |
| /docs/civil-construction-1-primary-h26-a | mobile | 70 | 92 | 96 | 100 | 5963⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 76 | 93 | 96 | 100 | 3806⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 68⚠ | 93 | 96 | 100 | 7303⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 66⚠ | 93 | 96 | 100 | 7501⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 68⚠ | 93 | 96 | 100 | 6424⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 78 | 92 | 96 | 100 | 4881⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 99 | 93 | 96 | 100 | 1951 | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 73 | 93 | 96 | 100 | 6320⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 51⚠ | 93 | 96 | 100 | 6901⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 72 | 93 | 96 | 100 | 6103⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 91 | 95 | 96 | 100 | 3067⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 70 | 93 | 96 | 100 | 5889⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 84 | 93 | 96 | 100 | 4308⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 67⚠ | 91 | 96 | 100 | 6283⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 72 | 91 | 96 | 100 | 5894⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 92 | 91 | 96 | 100 | 3376⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.176 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **LCP** = 2644ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **LCP** = 2927ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 4825ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2660ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 3421ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 4168ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2995ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 5884ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2619ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 7351ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2980ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5854ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5963ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2856ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 3806ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **TBT** = 451ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7303ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3123ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 7501ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2801ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 6424ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3317ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 4881ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 2115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6320ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2536ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 51 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6901ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3376ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 526ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6103ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2704ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 3067ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2467ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 5889ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2691ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 4308ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6283ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2708ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 5894ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2667ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 3376ms (閾値: ≤2500ms)