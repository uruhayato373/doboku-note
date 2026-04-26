# PSI 計測レポート — 2026-04-26

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **79件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 97 | 100 | 100 | 92 | 1046 | 0.038 |
| /search | desktop | 84 | 94 | 100 | 83⚠ | 1343 | 0.048 |
| /category | desktop | 96 | 98 | 96 | 75⚠ | 707 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 90 | 100 | 100 | 92 | 1733 | 0.024 |
| /docs/civil-construction-1-guide-four-management | desktop | 92 | 100 | 100 | 92 | 1551 | 0.024 |
| /docs/civil-construction-1-primary-r07-a | desktop | 78 | 100 | 100 | 92 | 2410 | 0.134⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 82 | 100 | 100 | 92 | 2101 | 0.03 |
| /docs/civil-construction-1-secondary-r07 | desktop | 91 | 100 | 100 | 92 | 1541 | 0.024 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 81 | 100 | 100 | 92 | 2280 | 0.064 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 84 | 100 | 100 | 92 | 2122 | 0.029 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 46⚠ | 100 | 100 | 92 | 1564 | 0.168⚠ |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 86 | 100 | 100 | 92 | 1903 | 0.058 |
| /docs/pe-comprehensive-management-exam-index | desktop | 92 | 96 | 100 | 92 | 1495 | 0.026 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 91 | 95 | 100 | 92 | 1701 | 0.054 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 89 | 100 | 100 | 92 | 1556 | 0.107⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 89 | 100 | 96 | 92 | 1508 | 0.054 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 84 | 100 | 100 | 92 | 1516 | 0.027 |
| /docs/pe-comprehensive-management-followership | desktop | 87 | 92 | 100 | 92 | 1501 | 0.156⚠ |
| /docs/pe-comprehensive-management-agile | desktop | 85 | 93 | 100 | 92 | 1521 | 0.048 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 92 | 91 | 100 | 92 | 1647 | 0.047 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 95 | 91 | 100 | 92 | 1341 | 0.025 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 95 | 91 | 100 | 92 | 1382 | 0.034 |
| / | mobile | 51⚠ | 96 | 100 | 92 | 8525⚠ | 0 |
| /search | mobile | 77 | 92 | 100 | 83⚠ | 5733⚠ | 0 |
| /category | mobile | 67⚠ | 98 | 96 | 75⚠ | 5733⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 48⚠ | 96 | 100 | 92 | 12226⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 54⚠ | 96 | 100 | 92 | 11926⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 52⚠ | 96 | 100 | 92 | 13791⚠ | 0.062 |
| /docs/civil-construction-1-primary-h26-a | mobile | 56⚠ | 96 | 100 | 92 | 12412⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 60⚠ | 96 | 100 | 92 | 7951⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 56⚠ | 96 | 100 | 92 | 12751⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 56⚠ | 96 | 100 | 92 | 12121⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 55⚠ | 96 | 100 | 92 | 13937⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 57⚠ | 96 | 100 | 92 | 12876⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 55⚠ | 93 | 100 | 92 | 11776⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 41⚠ | 91 | 100 | 92 | 11926⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 55⚠ | 96 | 100 | 92 | 13576⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 52⚠ | 96 | 96 | 92 | 13276⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 57⚠ | 96 | 100 | 92 | 11177⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 48⚠ | 93 | 100 | 92 | 7951⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 58⚠ | 93 | 100 | 92 | 11026⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 49⚠ | 91 | 100 | 92 | 10877⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 59⚠ | 91 | 100 | 92 | 10276⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 58⚠ | 91 | 100 | 92 | 9827⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.134 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **Performance** = 46 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **CLS** = 0.168 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **TBT** = 1615ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.107 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **CLS** = 0.156 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 51 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8525ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 5944ms (閾値: ≤1800ms)
- `https://doboku-note.com/` (mobile): **TBT** = 385ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5733ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 5733ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 4060ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 48 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 12226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 9142ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **TBT** = 370ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 11926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 8495ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 13791ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 6751ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 12412ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 10051ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 7951ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 6151ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 12751ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 8551ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 12121ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 8551ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 13937ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 9691ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 12876ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 8008ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 11776ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 7764ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 41 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 11926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 7801ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 672ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 13576ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 10102ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 13276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 10041ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 11177ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 7678ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 48 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 7951ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 5101ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **TBT** = 410ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 11026ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 7128ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 49 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 10877ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 6753ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **TBT** = 401ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 10276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 6387ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 9827ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 6690ms (閾値: ≤1800ms)