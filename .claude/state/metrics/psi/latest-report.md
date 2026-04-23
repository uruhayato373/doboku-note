# PSI 計測レポート — 2026-04-23

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **74件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 98 | 96 | 100 | 92 | 976 | 0.028 |
| /search | desktop | 84 | 93 | 100 | 83⚠ | 1438 | 0.026 |
| /category | desktop | 100 | 92 | 96 | 75⚠ | 598 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 89 | 96 | 100 | 92 | 1801 | 0.027 |
| /docs/civil-construction-1-guide-four-management | desktop | 90 | 96 | 100 | 92 | 1741 | 0.027 |
| /docs/civil-construction-1-primary-r07-a | desktop | 41⚠ | 96 | 100 | 92 | 2441 | 0.179⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 80 | 96 | 100 | 92 | 2256 | 0.034 |
| /docs/civil-construction-1-secondary-r07 | desktop | 86 | 96 | 100 | 92 | 1415 | 0.042 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 73 | 96 | 100 | 92 | 2161 | 0.044 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 84 | 96 | 100 | 92 | 2142 | 0.032 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 70 | 96 | 100 | 92 | 1833 | 0.086 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 85 | 96 | 100 | 92 | 2135 | 0.035 |
| /docs/pe-comprehensive-management-exam-index | desktop | 91 | 96 | 100 | 92 | 1621 | 0.068 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 90 | 96 | 100 | 92 | 1767 | 0.063 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 74 | 96 | 100 | 92 | 2061 | 0.06 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 84 | 96 | 100 | 92 | 2075 | 0.031 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 98 | 96 | 100 | 92 | 1001 | 0.033 |
| /docs/pe-comprehensive-management-followership | desktop | 86 | 92 | 100 | 92 | 1441 | 0.182⚠ |
| /docs/pe-comprehensive-management-agile | desktop | 82 | 93 | 100 | 92 | 1619 | 0.053 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 94 | 92 | 100 | 92 | 1501 | 0.029 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 91 | 92 | 100 | 92 | 1530 | 0.028 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 94 | 92 | 100 | 92 | 1491 | 0.032 |
| / | mobile | 64⚠ | 92 | 100 | 92 | 7120⚠ | 0.047 |
| /search | mobile | 80 | 91 | 100 | 83⚠ | 5432⚠ | 0.009 |
| /category | mobile | 65⚠ | 92 | 96 | 75⚠ | 3168⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 56⚠ | 93 | 100 | 92 | 9826⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 52⚠ | 93 | 100 | 92 | 12226⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 56⚠ | 93 | 100 | 92 | 15451⚠ | 0.05 |
| /docs/civil-construction-1-primary-h26-a | mobile | 53⚠ | 92 | 100 | 92 | 16276⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 50⚠ | 93 | 100 | 92 | 12827⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 57⚠ | 93 | 100 | 92 | 13426⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 50⚠ | 93 | 100 | 92 | 13426⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 56⚠ | 93 | 100 | 92 | 12614⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 55⚠ | 93 | 100 | 92 | 12066⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 54⚠ | 93 | 100 | 92 | 12226⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 57⚠ | 93 | 100 | 92 | 12827⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 57⚠ | 93 | 100 | 92 | 10726⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 53⚠ | 93 | 100 | 92 | 14026⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 57⚠ | 92 | 100 | 92 | 8972⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 57⚠ | 93 | 100 | 92 | 11191⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 57⚠ | 93 | 100 | 92 | 11177⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 52⚠ | 93 | 100 | 92 | 11627⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 57⚠ | 93 | 100 | 92 | 10877⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 58⚠ | 93 | 100 | 92 | 11179⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Performance** = 41 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.179 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 1230ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **TBT** = 330ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **CLS** = 0.182 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7120ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 4756ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5432ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 3168ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2564ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **TBT** = 1266ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 9826ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 6901ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 12226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 8802ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 15451ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 8551ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 16276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 11950ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 12827ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 8965ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 13426ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 8701ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 13426ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 8701ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 12614ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 9819ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 12066ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 8159ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 12226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 8475ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 12827ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 8040ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 10726ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 7801ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 14026ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 9879ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 8972ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 5702ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 11191ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 7310ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 11177ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 7202ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 11627ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 7085ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 10877ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 7067ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 11179ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 7285ms (閾値: ≤1800ms)