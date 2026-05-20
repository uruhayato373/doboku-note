# PSI 計測レポート — 2026-05-19

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **76件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 85 | 100 | 96 | 92 | 757 | 0.02 |
| /search | desktop | 100 | 94 | 96 | 83⚠ | 766 | 0.02 |
| /category | desktop | 100 | 98 | 96 | 75⚠ | 449 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 88 | 100 | 96 | 92 | 619 | 0.02 |
| /docs/civil-construction-1-guide-four-management | desktop | 96 | 100 | 96 | 92 | 677 | 0.02 |
| /docs/civil-construction-1-primary-r07-a | desktop | 68⚠ | 100 | 96 | 92 | 897 | 0.183⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 89 | 100 | 96 | 92 | 685 | 0.02 |
| /docs/civil-construction-1-secondary-r07 | desktop | 83 | 100 | 96 | 92 | 542 | 0.026 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 70 | 100 | 96 | 92 | 823 | 0.069 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 98 | 100 | 96 | 92 | 722 | 0.02 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 94 | 100 | 96 | 92 | 599 | 0.02 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 95 | 100 | 96 | 92 | 746 | 0.02 |
| /docs/pe-comprehensive-management-exam-index | desktop | 78 | 96 | 96 | 92 | 606 | 0.02 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 100 | 96 | 92 | 716 | 0.02 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 86 | 100 | 96 | 92 | 544 | 0.16⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 74 | 100 | 96 | 92 | 536 | 0.021 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 84 | 100 | 96 | 92 | 879 | 0.02 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 100 | 96 | 92 | 824 | 0.02 |
| /docs/pe-comprehensive-management-agile | desktop | 99 | 100 | 96 | 92 | 841 | 0.02 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 97 | 98 | 96 | 92 | 808 | 0.02 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 98 | 98 | 96 | 92 | 892 | 0.02 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 98 | 96 | 92 | 830 | 0.02 |
| / | mobile | 76 | 96 | 96 | 92 | 4926⚠ | 0.009 |
| /search | mobile | 79 | 92 | 96 | 83⚠ | 4169⚠ | 0 |
| /category | mobile | 73 | 98 | 96 | 75⚠ | 4228⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 62⚠ | 96 | 96 | 92 | 6129⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 70 | 96 | 96 | 92 | 6263⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 64⚠ | 96 | 96 | 92 | 7051⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 71 | 96 | 96 | 92 | 6045⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 52⚠ | 96 | 96 | 92 | 6526⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 65⚠ | 96 | 96 | 92 | 6936⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 61⚠ | 96 | 96 | 92 | 7201⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 67⚠ | 96 | 96 | 92 | 6533⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 69⚠ | 96 | 96 | 92 | 6584⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 71 | 93 | 96 | 92 | 6111⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 71 | 96 | 96 | 92 | 6263⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 51⚠ | 96 | 96 | 92 | 6291⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 70 | 96 | 96 | 92 | 6256⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 71 | 96 | 96 | 92 | 5974⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 64⚠ | 96 | 96 | 92 | 5392⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 65⚠ | 96 | 96 | 92 | 6311⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 68⚠ | 95 | 96 | 92 | 6685⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 57⚠ | 95 | 96 | 92 | 5459⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 67⚠ | 95 | 96 | 92 | 6056⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **TBT** = 337ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.183 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 510ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 376ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 806ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **TBT** = 492ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.16 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **TBT** = 686ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (desktop): **TBT** = 353ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 4926ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2531ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4169ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2579ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 4228ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 3063ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6129ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2693ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **TBT** = 430ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6263ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2974ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7051ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3409ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6045ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2836ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6526ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 3361ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **TBT** = 565ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 6936ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3206ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3176ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 6533ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3373ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 6584ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3349ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6111ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2747ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6263ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2747ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 51 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6291ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3003ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 680ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6256ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2976ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 5974ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2685ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 5392ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2779ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **TBT** = 397ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6311ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 3159ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6685ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2729ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 5459ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2752ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **TBT** = 681ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 6056ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2807ms (閾値: ≤1800ms)