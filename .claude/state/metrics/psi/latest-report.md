# PSI 計測レポート — 2026-08-22

- 計測対象: 22 URL × 2 strategy
- 診断上のしきい値超過: **53件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 609 | 0.004 |
| /search | desktop | 78 | 100 | 100 | 66⚠ | 422 | 0.549⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 408 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 100 | 100 | 100 | 516 | 0.004 |
| /docs/civil-construction-1-guide-four-management | desktop | 100 | 96 | 100 | 100 | 649 | 0.004 |
| /docs/civil-construction-1-primary-r07-a | desktop | 85 | 96 | 100 | 100 | 821 | 0.226⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 97 | 98 | 100 | 100 | 933 | 0.007 |
| /docs/civil-construction-1-secondary-r07 | desktop | 98 | 96 | 100 | 100 | 1020 | 0.004 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 96 | 96 | 100 | 100 | 574 | 0.111⚠ |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 96 | 100 | 100 | 553 | 0.004 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 100 | 100 | 100 | 100 | 569 | 0.004 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 81 | 100 | 100 | 100 | 649 | 0.173⚠ |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 100 | 100 | 100 | 1008 | 0.004 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 721 | 0.004 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 89 | 100 | 100 | 100 | 716 | 0.12⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 95 | 100 | 100 | 100 | 558 | 0.019 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 100 | 100 | 509 | 0.004 |
| /docs/pe-comprehensive-management-followership | desktop | 92 | 100 | 100 | 100 | 1112 | 0.004 |
| /docs/pe-comprehensive-management-agile | desktop | 99 | 100 | 100 | 100 | 914 | 0.018 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 88 | 98 | 100 | 100 | 2340 | 0.004 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 67⚠ | 98 | 100 | 100 | 1050 | 0.004 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 98 | 98 | 100 | 100 | 986 | 0.004 |
| / | mobile | 69⚠ | 96 | 100 | 100 | 2554⚠ | 0.006 |
| /search | mobile | 80 | 96 | 100 | 66⚠ | 4014⚠ | 0 |
| /category | mobile | 79 | 98 | 96 | 91 | 4161⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 76 | 93 | 100 | 100 | 4648⚠ | 0.006 |
| /docs/civil-construction-1-guide-four-management | mobile | 73 | 93 | 100 | 100 | 5126⚠ | 0.006 |
| /docs/civil-construction-1-primary-r07-a | mobile | 71 | 93 | 100 | 100 | 5525⚠ | 0.027 |
| /docs/civil-construction-1-primary-h26-a | mobile | 71 | 95 | 100 | 100 | 5440⚠ | 0.006 |
| /docs/civil-construction-1-secondary-r07 | mobile | 74 | 93 | 100 | 100 | 4910⚠ | 0.006 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 67⚠ | 93 | 100 | 100 | 6376⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 64⚠ | 93 | 100 | 100 | 6163⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 70 | 93 | 100 | 100 | 5178⚠ | 0.006 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 94 | 92 | 100 | 100 | 2926⚠ | 0.006 |
| /docs/pe-comprehensive-management-exam-index | mobile | 63⚠ | 93 | 100 | 100 | 6302⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 75 | 93 | 100 | 100 | 4991⚠ | 0.006 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 74 | 96 | 100 | 100 | 4891⚠ | 0.006 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 75 | 96 | 100 | 100 | 4780⚠ | 0.006 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 68⚠ | 92 | 100 | 100 | 6008⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 75 | 96 | 100 | 100 | 4691⚠ | 0.006 |
| /docs/pe-comprehensive-management-agile | mobile | 99 | 96 | 100 | 100 | 1656 | 0.006 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 98 | 95 | 100 | 100 | 2035 | 0.006 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 76 | 95 | 100 | 100 | 4690⚠ | 0.006 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 76 | 95 | 100 | 100 | 4579⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.549 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.226 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **CLS** = 0.111 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (desktop): **CLS** = 0.173 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): **TBT** = 1731ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 2554ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **TBT** = 1710ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4014ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2914ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **LCP** = 4161ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 3068ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 4648ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3079ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5126ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3118ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5525ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3532ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5440ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2974ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4910ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2996ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 6376ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3152ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6163ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3154ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5178ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3290ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 2926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6302ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3291ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 4991ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 3026ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4891ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3228ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4780ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3233ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 6008ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 3031ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4691ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2867ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4690ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2848ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4579ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 3004ms (閾値: ≤1800ms)