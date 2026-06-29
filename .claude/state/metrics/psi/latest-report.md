# PSI 計測レポート — 2026-06-29

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **45件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 422 | 0.013 |
| /search | desktop | 76 | 100 | 96 | 92 | 490 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 408 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 98 | 96 | 96 | 100 | 962 | 0.013 |
| /docs/civil-construction-1-guide-four-management | desktop | 97 | 96 | 96 | 100 | 1236 | 0.013 |
| /docs/civil-construction-1-primary-r07-a | desktop | 70 | 96 | 96 | 100 | 912 | 0.228⚠ |
| https://doboku-note.com/docs/civil-construction-1-primary-h26-a | desktop | ERROR | | | | | |
| /docs/civil-construction-1-secondary-r07 | desktop | 96 | 96 | 96 | 100 | 1297 | 0.013 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 89 | 96 | 96 | 100 | 595 | 0.095 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 86 | 96 | 96 | 100 | 2509⚠ | 0.013 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 97 | 96 | 96 | 100 | 1240 | 0.013 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 89 | 96 | 96 | 100 | 2187 | 0.013 |
| /docs/pe-comprehensive-management-exam-index | desktop | 77 | 96 | 96 | 100 | 2201 | 0.013 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 96 | 96 | 100 | 675 | 0.013 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 81 | 96 | 96 | 100 | 2245 | 0.158⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 99 | 96 | 96 | 100 | 537 | 0.033 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 98 | 96 | 96 | 100 | 570 | 0.013 |
| /docs/pe-comprehensive-management-followership | desktop | 89 | 96 | 96 | 100 | 1825 | 0.013 |
| /docs/pe-comprehensive-management-agile | desktop | 95 | 96 | 96 | 100 | 1459 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 97 | 94 | 96 | 100 | 1255 | 0.013 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 100 | 94 | 96 | 100 | 721 | 0.013 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 90 | 94 | 96 | 100 | 1852 | 0.013 |
| / | mobile | 80 | 96 | 96 | 100 | 4355⚠ | 0.009 |
| /search | mobile | 60⚠ | 96 | 96 | 92 | 8091⚠ | 0 |
| /category | mobile | 99 | 98 | 96 | 83⚠ | 1810 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 76 | 93 | 96 | 100 | 4803⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 75 | 93 | 96 | 100 | 5026⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 70 | 93 | 96 | 100 | 6228⚠ | 0.029 |
| /docs/civil-construction-1-primary-h26-a | mobile | 70 | 92 | 96 | 100 | 5799⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 75 | 93 | 96 | 100 | 5042⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 66⚠ | 93 | 96 | 100 | 6314⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 71 | 93 | 96 | 100 | 5515⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 62⚠ | 93 | 96 | 100 | 6301⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 99 | 92 | 96 | 100 | 2111 | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 97 | 93 | 96 | 100 | 2421 | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 75 | 93 | 96 | 100 | 5196⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 72 | 93 | 96 | 100 | 4917⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 78 | 93 | 96 | 100 | 1726 | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 98 | 92 | 96 | 100 | 2039 | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 74 | 93 | 96 | 100 | 4896⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 69⚠ | 93 | 96 | 100 | 5129⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 99 | 91 | 96 | 100 | 2052 | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 69⚠ | 91 | 96 | 100 | 5785⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 99 | 91 | 96 | 100 | 1673 | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.228 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 380ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **LCP** = 2509ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 4355ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2458ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **LCP** = 8091ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 4939ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 4803ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2600ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5026ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2806ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6228ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 2968ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5799ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2839ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 5042ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2737ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 6314ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3170ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 5515ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2850ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 6301ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3071ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 5196ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2572ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4917ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2691ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **TBT** = 964ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4896ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2683ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5129ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2715ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **TBT** = 313ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 5785ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2791ms (閾値: ≤1800ms)