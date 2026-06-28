# PSI 計測レポート — 2026-06-28

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **48件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 78 | 100 | 96 | 100 | 898 | 0.013 |
| /search | desktop | 76 | 100 | 96 | 92 | 449 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 409 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 97 | 96 | 96 | 100 | 1241 | 0.013 |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 96 | 96 | 100 | 1055 | 0.013 |
| /docs/civil-construction-1-primary-r07-a | desktop | 85 | 96 | 96 | 100 | 1381 | 0.227⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 99 | 96 | 96 | 100 | 871 | 0.021 |
| /docs/civil-construction-1-secondary-r07 | desktop | 95 | 96 | 96 | 100 | 1501 | 0.013 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 95 | 96 | 96 | 100 | 747 | 0.108⚠ |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 98 | 96 | 96 | 100 | 1057 | 0.013 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 95 | 96 | 96 | 100 | 1075 | 0.013 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 98 | 96 | 96 | 100 | 962 | 0.013 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 96 | 96 | 100 | 757 | 0.013 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 95 | 96 | 96 | 100 | 648 | 0.013 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 92 | 96 | 96 | 100 | 943 | 0.158⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 99 | 96 | 96 | 100 | 601 | 0.033 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 97 | 96 | 96 | 100 | 672 | 0.013 |
| /docs/pe-comprehensive-management-followership | desktop | 95 | 96 | 96 | 100 | 874 | 0.013 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 96 | 96 | 100 | 1067 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 97 | 94 | 96 | 100 | 776 | 0.013 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 97 | 94 | 96 | 100 | 1229 | 0.013 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 94 | 96 | 100 | 743 | 0.013 |
| / | mobile | 79 | 96 | 96 | 100 | 4444⚠ | 0.009 |
| /search | mobile | 78 | 96 | 96 | 92 | 1509 | 0.61⚠ |
| /category | mobile | 100 | 98 | 96 | 83⚠ | 1523 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 63⚠ | 93 | 96 | 100 | 6001⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 69⚠ | 93 | 96 | 100 | 5275⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 69⚠ | 93 | 96 | 100 | 6153⚠ | 0.029 |
| /docs/civil-construction-1-primary-h26-a | mobile | 71 | 92 | 96 | 100 | 6020⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 95 | 93 | 96 | 100 | 2851⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 70 | 93 | 96 | 100 | 6240⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 71 | 93 | 92 | 100 | 5497⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 61⚠ | 93 | 96 | 100 | 6226⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 93 | 92 | 96 | 100 | 3151⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 70 | 93 | 96 | 100 | 5701⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 61⚠ | 93 | 96 | 100 | 2776⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 52⚠ | 93 | 96 | 100 | 5776⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 73 | 93 | 96 | 100 | 5003⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 99 | 92 | 96 | 100 | 1959 | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 77 | 93 | 96 | 100 | 4618⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 98 | 93 | 96 | 100 | 2326 | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 76 | 91 | 96 | 100 | 5055⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 77 | 91 | 96 | 100 | 4826⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 98 | 91 | 96 | 100 | 2258 | 0.009 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **TBT** = 498ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.227 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **CLS** = 0.108 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 4444ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2523ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6001ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2998ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5275ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3000ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6153ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 2985ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6020ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2797ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 2851ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 6240ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3105ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 5497ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2693ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 6226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3129ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **TBT** = 309ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 3151ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5701ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2605ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2776ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 4018ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 5776ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3500ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 618ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 5003ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2692ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4618ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2696ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 5055ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2654ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4826ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2693ms (閾値: ≤1800ms)