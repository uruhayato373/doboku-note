# PSI 計測レポート — 2026-05-01

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **65件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 91 | 100 | 96 | 92 | 605 | 0.023 |
| /search | desktop | 97 | 94 | 96 | 83⚠ | 1174 | 0.023 |
| /category | desktop | 88 | 98 | 96 | 75⚠ | 490 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 71 | 100 | 96 | 92 | 591 | 0.023 |
| /docs/civil-construction-1-guide-four-management | desktop | 100 | 100 | 96 | 92 | 732 | 0.023 |
| /docs/civil-construction-1-primary-r07-a | desktop | 65⚠ | 100 | 96 | 92 | 964 | 0.112⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 91 | 100 | 96 | 92 | 674 | 0.023 |
| /docs/civil-construction-1-secondary-r07 | desktop | 97 | 100 | 96 | 92 | 690 | 0.023 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 87 | 100 | 96 | 92 | 862 | 0.023 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 99 | 100 | 96 | 92 | 907 | 0.023 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 46⚠ | 100 | 96 | 92 | 2199 | 0.108⚠ |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 99 | 100 | 96 | 92 | 839 | 0.023 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 96 | 96 | 92 | 678 | 0.023 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 97 | 98 | 96 | 92 | 723 | 0.023 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 89 | 100 | 92 | 92 | 577 | 0.074 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 76 | 100 | 92 | 92 | 629 | 0.066 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 79 | 100 | 96 | 92 | 696 | 0.023 |
| /docs/pe-comprehensive-management-followership | desktop | 86 | 96 | 96 | 92 | 705 | 0.023 |
| /docs/pe-comprehensive-management-agile | desktop | 99 | 96 | 96 | 92 | 789 | 0.023 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 96 | 94 | 96 | 92 | 635 | 0.023 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 96 | 94 | 96 | 92 | 672 | 0.023 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 89 | 94 | 96 | 92 | 815 | 0.023 |
| / | mobile | 99 | 96 | 96 | 92 | 1837 | 0 |
| /search | mobile | 53⚠ | 92 | 96 | 83⚠ | 4264⚠ | 0.009 |
| /category | mobile | 99 | 98 | 96 | 75⚠ | 1961 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 88 | 96 | 96 | 92 | 3386⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 57⚠ | 96 | 96 | 92 | 9443⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 68⚠ | 96 | 96 | 92 | 5328⚠ | 0.009 |
| /docs/civil-construction-1-primary-h26-a | mobile | 59⚠ | 96 | 96 | 92 | 3534⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 95 | 96 | 96 | 92 | 2711⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 48⚠ | 96 | 96 | 92 | 3999⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 83 | 96 | 96 | 92 | 4394⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 57⚠ | 96 | 96 | 92 | 10919⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 85 | 96 | 96 | 92 | 3423⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 54⚠ | 93 | 96 | 92 | 9029⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 71 | 95 | 96 | 92 | 3691⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 76 | 96 | 96 | 92 | 2776⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 59⚠ | 96 | 96 | 92 | 9804⚠ | 0 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 63⚠ | 96 | 96 | 92 | 9111⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 55⚠ | 96 | 96 | 92 | 8624⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 80 | 96 | 96 | 92 | 3405⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 59⚠ | 95 | 96 | 92 | 9525⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 54⚠ | 95 | 96 | 92 | 3391⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 63⚠ | 95 | 96 | 92 | 7482⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **TBT** = 972ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.112 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 1335ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **Performance** = 46 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **CLS** = 0.108 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **TBT** = 4016ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **TBT** = 538ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (desktop): **TBT** = 464ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **TBT** = 321ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4264ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **TBT** = 2489ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 3386ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 9443ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 5603ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5328ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 445ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 3534ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 6443ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 2711ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 48 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 3999ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **TBT** = 7477ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4394ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 10919ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 5651ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 3423ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 2115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 9029ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 4953ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 3691ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 774ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 2776ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 828ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 9804ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 5376ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 9111ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 4581ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 8624ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 3824ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **TBT** = 418ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 3405ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **TBT** = 436ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 9525ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 4762ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 3391ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **TBT** = 3368ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 7482ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 3797ms (閾値: ≤1800ms)