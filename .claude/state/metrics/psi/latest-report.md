# PSI 計測レポート — 2026-08-08

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **42件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 96 | 96 | 100 | 792 | 0.015 |
| /search | desktop | 76 | 100 | 92 | 66⚠ | 490 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 408 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 100 | 96 | 100 | 619 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 94 | 96 | 96 | 100 | 931 | 0.021 |
| /docs/civil-construction-1-primary-r07-a | desktop | 88 | 96 | 96 | 100 | 801 | 0.231⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 99 | 98 | 96 | 100 | 916 | 0.015 |
| /docs/civil-construction-1-secondary-r07 | desktop | 100 | 96 | 96 | 100 | 632 | 0.015 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 100 | 846 | 0.015 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 96 | 96 | 100 | 628 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 99 | 100 | 96 | 100 | 815 | 0.015 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 100 | 96 | 100 | 764 | 0.015 |
| /docs/pe-comprehensive-management-exam-index | desktop | 100 | 100 | 96 | 100 | 633 | 0.015 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 100 | 96 | 100 | 795 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 92 | 100 | 96 | 100 | 803 | 0.157⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 100 | 96 | 100 | 588 | 0.015 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 510 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 100 | 100 | 96 | 100 | 730 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 100 | 100 | 96 | 100 | 766 | 0.029 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 98 | 96 | 100 | 665 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 100 | 98 | 96 | 100 | 695 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 98 | 96 | 100 | 659 | 0.015 |
| / | mobile | 88 | 92 | 96 | 100 | 3772⚠ | 0.011 |
| /search | mobile | 76 | 96 | 96 | 66⚠ | 1810 | 0.61⚠ |
| /category | mobile | 78 | 98 | 96 | 91 | 4285⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 74 | 93 | 96 | 100 | 4750⚠ | 0.011 |
| /docs/civil-construction-1-guide-four-management | mobile | 73 | 93 | 96 | 100 | 5291⚠ | 0.011 |
| /docs/civil-construction-1-primary-r07-a | mobile | 67⚠ | 93 | 96 | 100 | 4876⚠ | 0.032 |
| /docs/civil-construction-1-primary-h26-a | mobile | 70 | 95 | 96 | 100 | 5642⚠ | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 97 | 93 | 96 | 100 | 2251 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 95 | 93 | 96 | 100 | 2776⚠ | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 75 | 93 | 96 | 100 | 4785⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 69⚠ | 93 | 96 | 100 | 5288⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 66⚠ | 92 | 96 | 100 | 5516⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-index | mobile | 98 | 93 | 96 | 100 | 2251 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 94 | 93 | 96 | 100 | 2928⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 96 | 96 | 96 | 100 | 2626⚠ | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 96 | 96 | 96 | 100 | 2551⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 72 | 92 | 96 | 100 | 4734⚠ | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 77 | 96 | 96 | 100 | 4609⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 98 | 96 | 96 | 100 | 1951 | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 98 | 95 | 96 | 100 | 2041 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 78 | 95 | 96 | 100 | 4542⚠ | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 71 | 95 | 96 | 100 | 4729⚠ | 0.011 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.231 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.157 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 3772ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- `https://doboku-note.com/category` (mobile): **LCP** = 4285ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 3127ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 4750ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2995ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5291ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3272ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 4876ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3490ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 312ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5642ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3265ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 2776ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 1822ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4785ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3143ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5288ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3165ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5516ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3325ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2928ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 1827ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 1824ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4734ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 3007ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4609ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2853ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4542ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2852ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4729ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 3020ms (閾値: ≤1800ms)