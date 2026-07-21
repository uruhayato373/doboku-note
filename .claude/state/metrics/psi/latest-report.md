# PSI 計測レポート — 2026-07-21

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **55件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 95 | 100 | 96 | 100 | 535 | 0.017 |
| /search | desktop | 76 | 100 | 96 | 66⚠ | 409 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 425 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 99 | 100 | 96 | 100 | 854 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 96 | 96 | 100 | 688 | 0.022 |
| /docs/civil-construction-1-primary-r07-a | desktop | 83 | 100 | 96 | 100 | 855 | 0.246⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 99 | 98 | 96 | 100 | 882 | 0.015 |
| /docs/civil-construction-1-secondary-r07 | desktop | 83 | 100 | 96 | 100 | 681 | 0.116⚠ |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 100 | 96 | 100 | 585 | 0.036 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 96 | 96 | 100 | 733 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 78 | 100 | 96 | 100 | 757 | 0.133⚠ |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 78 | 100 | 96 | 100 | 705 | 0.204⚠ |
| /docs/pe-comprehensive-management-exam-index | desktop | 97 | 100 | 96 | 100 | 601 | 0.015 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 96 | 100 | 682 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 84 | 100 | 96 | 100 | 689 | 0.168⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 100 | 96 | 100 | 681 | 0.015 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 98 | 100 | 96 | 100 | 522 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 95 | 100 | 96 | 100 | 741 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 100 | 96 | 100 | 841 | 0.03 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 98 | 96 | 100 | 797 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 96 | 98 | 96 | 100 | 841 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 98 | 96 | 100 | 460 | 0.015 |
| / | mobile | 57⚠ | 96 | 96 | 100 | 7393⚠ | 0 |
| /search | mobile | 80 | 96 | 96 | 66⚠ | 4045⚠ | 0 |
| /category | mobile | 74 | 98 | 96 | 91 | 4328⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 69⚠ | 96 | 96 | 100 | 4847⚠ | 0.011 |
| /docs/civil-construction-1-guide-four-management | mobile | 65⚠ | 93 | 96 | 100 | 5701⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 70 | 96 | 96 | 100 | 5525⚠ | 0.032 |
| /docs/civil-construction-1-primary-h26-a | mobile | 72 | 95 | 92 | 100 | 5452⚠ | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 77 | 96 | 96 | 100 | 4519⚠ | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 69⚠ | 96 | 96 | 100 | 4988⚠ | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 97 | 93 | 96 | 100 | 2185 | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 70 | 96 | 96 | 100 | 4991⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 68⚠ | 96 | 96 | 100 | 5345⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-index | mobile | 76 | 96 | 96 | 100 | 4693⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 72 | 96 | 96 | 100 | 5093⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 71 | 96 | 96 | 100 | 4977⚠ | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 74 | 96 | 96 | 100 | 4862⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 78 | 96 | 96 | 100 | 4538⚠ | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 97 | 96 | 96 | 100 | 2326 | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 77 | 96 | 96 | 100 | 4876⚠ | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 76 | 95 | 96 | 100 | 4784⚠ | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 77 | 95 | 96 | 100 | 4574⚠ | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 98 | 95 | 96 | 100 | 2038 | 0.011 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.246 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **CLS** = 0.116 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 312ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): **CLS** = 0.133 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): **TBT** = 373ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (desktop): **CLS** = 0.204 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.168 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7393ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3023ms (閾値: ≤1800ms)
- `https://doboku-note.com/` (mobile): **TBT** = 322ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4045ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3064ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **LCP** = 4328ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2867ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 4847ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3047ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5701ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3292ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5525ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3434ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5452ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2987ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4519ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2947ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 4988ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3347ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 1820ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 4991ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3324ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5345ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3306ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4693ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2958ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 5093ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 3130ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4977ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3140ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4862ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3223ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4538ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2783ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 4876ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2777ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4784ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2975ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4574ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2816ms (閾値: ≤1800ms)