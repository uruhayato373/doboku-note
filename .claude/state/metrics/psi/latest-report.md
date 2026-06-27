# PSI 計測レポート — 2026-06-27

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **47件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 486 | 0.013 |
| /search | desktop | 76 | 100 | 96 | 92 | 285 | 0.766⚠ |
| /category | desktop | 97 | 98 | 96 | 83⚠ | 443 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 99 | 96 | 96 | 100 | 760 | 0.013 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 96 | 96 | 100 | 918 | 0.013 |
| /docs/civil-construction-1-primary-r07-a | desktop | 87 | 96 | 96 | 100 | 1042 | 0.227⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 80 | 96 | 96 | 100 | 1035 | 0.021 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 96 | 96 | 100 | 818 | 0.013 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 65⚠ | 96 | 96 | 100 | 814 | 0.095 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 96 | 96 | 96 | 100 | 1412 | 0.013 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 99 | 96 | 96 | 100 | 872 | 0.013 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 92 | 96 | 96 | 100 | 1783 | 0.013 |
| /docs/pe-comprehensive-management-exam-index | desktop | 93 | 96 | 96 | 100 | 994 | 0.064 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 96 | 96 | 100 | 621 | 0.013 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 92 | 96 | 96 | 100 | 1002 | 0.158⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 98 | 96 | 96 | 100 | 594 | 0.013 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 629 | 0.013 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 100 | 862 | 0.013 |
| /docs/pe-comprehensive-management-agile | desktop | 95 | 96 | 96 | 100 | 990 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 90 | 94 | 96 | 100 | 886 | 0.013 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 97 | 94 | 96 | 100 | 879 | 0.013 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 94 | 94 | 96 | 100 | 1341 | 0.013 |
| / | mobile | 80 | 96 | 96 | 100 | 4376⚠ | 0.009 |
| /search | mobile | 80 | 96 | 96 | 92 | 4108⚠ | 0 |
| /category | mobile | 100 | 98 | 96 | 83⚠ | 1524 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 61⚠ | 93 | 96 | 100 | 8976⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 66⚠ | 93 | 96 | 100 | 6151⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 72 | 93 | 96 | 100 | 6080⚠ | 0.029 |
| /docs/civil-construction-1-primary-h26-a | mobile | 67⚠ | 92 | 96 | 100 | 5880⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 99 | 93 | 96 | 100 | 2101 | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 69⚠ | 93 | 96 | 100 | 4876⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 74 | 93 | 96 | 100 | 5343⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 70 | 93 | 96 | 100 | 5202⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 75 | 92 | 96 | 100 | 5125⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 76 | 93 | 96 | 100 | 4804⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 98 | 93 | 96 | 100 | 2326 | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 98 | 93 | 96 | 100 | 2264 | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 77 | 93 | 96 | 100 | 4888⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 66⚠ | 92 | 96 | 100 | 2220 | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 76 | 93 | 96 | 100 | 4622⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 98 | 93 | 96 | 100 | 2326 | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 70 | 91 | 96 | 100 | 4538⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 78 | 91 | 96 | 100 | 4659⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 78 | 91 | 96 | 100 | 4651⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.227 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **TBT** = 421ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 1142ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 4376ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2499ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 4108ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3001ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 8976ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 4447ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6151ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3062ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6080ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 2935ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5880ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2946ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 4876ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **TBT** = 479ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 5343ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2700ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5202ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 2995ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5125ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2823ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4804ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2633ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4888ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2622ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **TBT** = 3153ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4622ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2682ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4538ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2711ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **TBT** = 363ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4659ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2673ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4651ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2742ms (閾値: ≤1800ms)