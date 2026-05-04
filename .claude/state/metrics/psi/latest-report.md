# PSI 計測レポート — 2026-05-04

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **59件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 92 | 432 | 0.023 |
| /search | desktop | 92 | 94 | 96 | 83⚠ | 948 | 0.023 |
| /category | desktop | 100 | 98 | 96 | 75⚠ | 523 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 96 | 100 | 96 | 92 | 728 | 0.023 |
| /docs/civil-construction-1-guide-four-management | desktop | 85 | 100 | 96 | 92 | 771 | 0.023 |
| /docs/civil-construction-1-primary-r07-a | desktop | 82 | 100 | 96 | 92 | 982 | 0.135⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 78 | 100 | 96 | 92 | 719 | 0.023 |
| /docs/civil-construction-1-secondary-r07 | desktop | 75 | 100 | 96 | 92 | 829 | 0.023 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 69⚠ | 100 | 96 | 92 | 766 | 0.023 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 86 | 100 | 96 | 92 | 899 | 0.023 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 86 | 100 | 96 | 92 | 861 | 0.023 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 87 | 100 | 96 | 92 | 880 | 0.023 |
| /docs/pe-comprehensive-management-exam-index | desktop | 100 | 96 | 96 | 92 | 773 | 0.023 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 98 | 96 | 92 | 816 | 0.023 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 75 | 100 | 96 | 92 | 742 | 0.074 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 73 | 100 | 96 | 92 | 749 | 0.066 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 72 | 100 | 96 | 92 | 598 | 0.023 |
| /docs/pe-comprehensive-management-followership | desktop | 63⚠ | 96 | 96 | 92 | 1091 | 0.023 |
| /docs/pe-comprehensive-management-agile | desktop | 88 | 96 | 92 | 92 | 700 | 0.023 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 94 | 96 | 92 | 710 | 0.023 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 100 | 94 | 96 | 92 | 771 | 0.023 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 95 | 94 | 96 | 92 | 670 | 0.023 |
| / | mobile | 97 | 96 | 96 | 92 | 2112 | 0 |
| /search | mobile | 85 | 92 | 96 | 83⚠ | 3772⚠ | 0.009 |
| /category | mobile | 65⚠ | 98 | 96 | 75⚠ | 7164⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 60⚠ | 96 | 96 | 92 | 9260⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 74 | 96 | 96 | 92 | 2626⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 63⚠ | 96 | 96 | 92 | 9242⚠ | 0.03 |
| /docs/civil-construction-1-primary-h26-a | mobile | 82 | 96 | 96 | 92 | 3601⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 61⚠ | 96 | 96 | 92 | 9105⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 85 | 96 | 96 | 92 | 4201⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 60⚠ | 96 | 96 | 92 | 8103⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 54⚠ | 96 | 96 | 92 | 10763⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 86 | 96 | 96 | 92 | 3276⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 56⚠ | 93 | 96 | 92 | 5354⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 99 | 95 | 96 | 92 | 1968 | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 90 | 96 | 96 | 92 | 3676⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 72 | 96 | 96 | 92 | 2948⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 54⚠ | 96 | 96 | 92 | 9234⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 89 | 96 | 96 | 92 | 3774⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 91 | 96 | 96 | 92 | 3334⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 87 | 95 | 96 | 92 | 3913⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 81 | 95 | 96 | 92 | 3393⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 90 | 95 | 96 | 92 | 3388⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **TBT** = 335ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.135 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **TBT** = 504ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 610ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 1105ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **TBT** = 307ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **TBT** = 305ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **TBT** = 558ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **TBT** = 636ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (desktop): **TBT** = 862ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **TBT** = 1451ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 3772ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 7164ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 4573ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 9260ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 5019ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 952ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 9242ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 4377ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 3601ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 356ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 9105ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 4874ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 4201ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 8103ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 4023ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 10763ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 5522ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 3276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 2115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5354ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3061ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **TBT** = 659ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 3676ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2948ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **TBT** = 1030ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 9234ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 5062ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 3774ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 3334ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 3913ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 3393ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **TBT** = 416ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 3388ms (閾値: ≤2500ms)