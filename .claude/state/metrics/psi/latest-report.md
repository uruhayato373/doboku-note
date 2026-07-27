# PSI 計測レポート — 2026-07-27

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **63件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 91 | 100 | 96 | 100 | 641 | 0.015 |
| /search | desktop | 76 | 100 | 96 | 66⚠ | 531 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 449 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 96 | 100 | 96 | 100 | 742 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 96 | 96 | 100 | 841 | 0.021 |
| /docs/civil-construction-1-primary-r07-a | desktop | 84 | 100 | 96 | 100 | 801 | 0.231⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 99 | 98 | 96 | 100 | 882 | 0.015 |
| /docs/civil-construction-1-secondary-r07 | desktop | 97 | 96 | 96 | 100 | 713 | 0.015 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 93 | 96 | 96 | 100 | 579 | 0.121⚠ |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 90 | 96 | 96 | 100 | 643 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 50⚠ | 100 | 96 | 100 | 1373 | 0.226⚠ |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 92 | 100 | 96 | 100 | 812 | 0.015 |
| /docs/pe-comprehensive-management-exam-index | desktop | 87 | 100 | 96 | 100 | 768 | 0.015 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 96 | 100 | 806 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 88 | 100 | 96 | 100 | 688 | 0.157⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 100 | 96 | 100 | 562 | 0.035 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 291 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 95 | 100 | 96 | 100 | 703 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 99 | 100 | 96 | 100 | 841 | 0.029 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 92 | 98 | 96 | 100 | 821 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 98 | 96 | 100 | 764 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 98 | 96 | 100 | 850 | 0.015 |
| / | mobile | 61⚠ | 96 | 96 | 100 | 7424⚠ | 0.011 |
| /search | mobile | 78 | 96 | 96 | 66⚠ | 4230⚠ | 0 |
| /category | mobile | 87 | 98 | 96 | 91 | 2112 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 66⚠ | 96 | 96 | 100 | 6001⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 71 | 93 | 96 | 100 | 4965⚠ | 0.011 |
| /docs/civil-construction-1-primary-r07-a | mobile | 58⚠ | 96 | 96 | 100 | 7501⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 68⚠ | 95 | 96 | 100 | 5452⚠ | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 75 | 93 | 96 | 100 | 4649⚠ | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 73 | 93 | 96 | 100 | 5031⚠ | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 74 | 93 | 96 | 100 | 4584⚠ | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 74 | 96 | 96 | 100 | 4838⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 54⚠ | 96 | 96 | 100 | 4689⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 71 | 96 | 96 | 100 | 4637⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 60⚠ | 96 | 96 | 100 | 6526⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 62⚠ | 96 | 96 | 100 | 6451⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 69⚠ | 96 | 96 | 100 | 4218⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 71 | 92 | 96 | 100 | 4757⚠ | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 71 | 96 | 96 | 100 | 4785⚠ | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 97 | 96 | 96 | 100 | 2326 | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 74 | 95 | 96 | 100 | 4931⚠ | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 78 | 95 | 96 | 100 | 4501⚠ | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 72 | 95 | 96 | 100 | 4749⚠ | 0.011 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.231 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **CLS** = 0.121 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): **CLS** = 0.226 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): **TBT** = 1788ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.157 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7424ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2898ms (閾値: ≤1800ms)
- `https://doboku-note.com/` (mobile): **TBT** = 306ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4230ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3092ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **TBT** = 453ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6001ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3125ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 4965ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3300ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7501ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3629ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 303ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5452ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3167ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4649ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 3034ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5031ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3401ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4584ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2891ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 4838ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3244ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 4689ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3490ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **TBT** = 750ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4637ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3009ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6526ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 3163ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 333ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6451ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3157ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4218ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3185ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **TBT** = 373ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4757ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2865ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4785ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2884ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4931ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2979ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4501ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2780ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4749ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2867ms (閾値: ≤1800ms)