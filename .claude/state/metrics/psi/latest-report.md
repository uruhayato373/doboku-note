# PSI 計測レポート — 2026-06-06

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **50件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 96 | 100 | 593 | 0.035 |
| /search | desktop | 100 | 94 | 96 | 92 | 750 | 0.035 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 410 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 97 | 96 | 96 | 100 | 1190 | 0.035 |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 96 | 96 | 100 | 1062 | 0.035 |
| /docs/civil-construction-1-primary-r07-a | desktop | 86 | 96 | 96 | 100 | 1403 | 0.2⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 86 | 96 | 92 | 100 | 2177 | 0.035 |
| /docs/civil-construction-1-secondary-r07 | desktop | 97 | 96 | 96 | 100 | 1184 | 0.035 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 100 | 842 | 0.035 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 80 | 96 | 96 | 100 | 2588⚠ | 0.035 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 95 | 96 | 96 | 100 | 1518 | 0.035 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 98 | 96 | 96 | 100 | 1030 | 0.035 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 96 | 96 | 100 | 994 | 0.035 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 98 | 96 | 96 | 100 | 1170 | 0.035 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 82 | 96 | 96 | 100 | 1217 | 0.175⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 99 | 96 | 96 | 100 | 635 | 0.056 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 96 | 96 | 100 | 689 | 0.035 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 100 | 855 | 0.035 |
| /docs/pe-comprehensive-management-agile | desktop | 96 | 96 | 96 | 100 | 1319 | 0.052 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 94 | 96 | 100 | 786 | 0.035 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 94 | 96 | 100 | 945 | 0.035 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 94 | 96 | 100 | 923 | 0.035 |
| / | mobile | 77 | 92 | 96 | 100 | 4856⚠ | 0.009 |
| /search | mobile | 90 | 91 | 96 | 92 | 3470⚠ | 0.009 |
| /category | mobile | 98 | 98 | 96 | 83⚠ | 1529 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 82 | 93 | 96 | 100 | 4382⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 66⚠ | 93 | 96 | 100 | 2551⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 68⚠ | 93 | 96 | 100 | 7428⚠ | 0.04 |
| /docs/civil-construction-1-primary-h26-a | mobile | 63⚠ | 92 | 96 | 100 | 7062⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 94 | 93 | 96 | 100 | 3001⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 63⚠ | 93 | 96 | 100 | 8235⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 70 | 93 | 96 | 100 | 6855⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 94 | 93 | 96 | 100 | 2658⚠ | 0.01 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 68⚠ | 92 | 96 | 100 | 6468⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 71 | 93 | 96 | 100 | 5960⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 73 | 93 | 96 | 100 | 6478⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 94 | 93 | 96 | 100 | 3076⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 96 | 93 | 96 | 100 | 2715⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 62⚠ | 92 | 96 | 100 | 6855⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 72 | 93 | 96 | 100 | 5813⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 70 | 93 | 96 | 100 | 6336⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 59⚠ | 91 | 96 | 100 | 7276⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 95 | 91 | 96 | 100 | 2860⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 60⚠ | 91 | 96 | 100 | 9826⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.2 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **LCP** = 2588ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.175 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 4856ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2603ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 3470ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 4382ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 2794ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7428ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 2982ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 7062ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3028ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 3001ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 8235ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3119ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6855ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2678ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 2658ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 2115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 6468ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3429ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5960ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2679ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6478ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2520ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 3076ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2715ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 6855ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2840ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 5813ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2671ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6336ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2694ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 7276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2727ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **TBT** = 355ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 2860ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 9826ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 4618ms (閾値: ≤1800ms)