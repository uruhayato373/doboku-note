# PSI 計測レポート — 2026-05-09

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **59件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 95 | 100 | 92 | 92 | 578 | 0.023 |
| /search | desktop | 97 | 94 | 96 | 83⚠ | 1152 | 0.023 |
| /category | desktop | 100 | 98 | 96 | 75⚠ | 422 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 95 | 100 | 96 | 92 | 701 | 0.023 |
| /docs/civil-construction-1-guide-four-management | desktop | 96 | 100 | 96 | 92 | 741 | 0.023 |
| /docs/civil-construction-1-primary-r07-a | desktop | 89 | 100 | 96 | 92 | 1126 | 0.14⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 96 | 100 | 96 | 92 | 711 | 0.023 |
| /docs/civil-construction-1-secondary-r07 | desktop | 97 | 100 | 96 | 92 | 723 | 0.023 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 79 | 100 | 96 | 92 | 841 | 0.023 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 71 | 100 | 96 | 92 | 915 | 0.023 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 89 | 100 | 96 | 92 | 811 | 0.023 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 24⚠ | 100 | 96 | 92 | 4028⚠ | 0.158⚠ |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 96 | 96 | 92 | 701 | 0.023 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 97 | 98 | 96 | 92 | 821 | 0.023 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 99 | 100 | 96 | 92 | 721 | 0.023 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 98 | 100 | 96 | 92 | 613 | 0.066 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 86 | 100 | 96 | 92 | 704 | 0.023 |
| /docs/pe-comprehensive-management-followership | desktop | 69⚠ | 100 | 96 | 92 | 716 | 0.023 |
| /docs/pe-comprehensive-management-agile | desktop | 72 | 100 | 96 | 92 | 863 | 0.023 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 93 | 98 | 96 | 92 | 679 | 0.023 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 79 | 98 | 96 | 92 | 577 | 0.023 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 97 | 98 | 96 | 92 | 670 | 0.023 |
| / | mobile | 61⚠ | 96 | 96 | 92 | 8173⚠ | 0 |
| /search | mobile | 87 | 92 | 96 | 83⚠ | 3847⚠ | 0.009 |
| /category | mobile | 60⚠ | 98 | 96 | 75⚠ | 7601⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 63⚠ | 96 | 96 | 92 | 8863⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 58⚠ | 96 | 96 | 92 | 9395⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 73 | 96 | 96 | 92 | 4803⚠ | 0.009 |
| /docs/civil-construction-1-primary-h26-a | mobile | 56⚠ | 96 | 96 | 92 | 9276⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 93 | 96 | 96 | 92 | 3104⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 76 | 96 | 96 | 92 | 5401⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 88 | 96 | 96 | 92 | 3917⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 84 | 96 | 96 | 92 | 4205⚠ | 0.001 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 82 | 96 | 96 | 92 | 4191⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 92 | 93 | 96 | 92 | 3391⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 90 | 95 | 96 | 92 | 3226⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 59⚠ | 96 | 96 | 92 | 9535⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 85 | 96 | 96 | 92 | 2651⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 90 | 96 | 96 | 92 | 2791⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 62⚠ | 96 | 96 | 92 | 8348⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 88 | 96 | 96 | 92 | 2863⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 73 | 95 | 96 | 92 | 3848⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 90 | 95 | 96 | 92 | 3462⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 94 | 95 | 96 | 92 | 2863⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.14 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 443ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **TBT** = 762ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **Performance** = 24 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **LCP** = 4028ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **FCP** = 2372ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **TBT** = 3320ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (desktop): **TBT** = 315ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **TBT** = 1619ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **TBT** = 764ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): **TBT** = 483ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8173ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 4803ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 3847ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 7601ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 5167ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 8863ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 4577ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 9395ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 5167ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 4803ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 339ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 9276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 5265ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 3104ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5401ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 3917ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 4205ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 2115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 4191ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 2115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 3391ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 9535ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 5403ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2651ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **TBT** = 470ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 2791ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 8348ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 3882ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 2863ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **TBT** = 334ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 3848ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **TBT** = 595ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 3462ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 2863ms (閾値: ≤2500ms)