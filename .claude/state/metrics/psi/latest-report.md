# PSI 計測レポート — 2026-06-14

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **59件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 92 | 100 | 650 | 0.011 |
| /search | desktop | 93 | 94 | 96 | 92 | 818 | 0.011 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 437 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 98 | 96 | 96 | 100 | 1011 | 0.011 |
| /docs/civil-construction-1-guide-four-management | desktop | 97 | 96 | 96 | 100 | 1229 | 0.011 |
| /docs/civil-construction-1-primary-r07-a | desktop | 72 | 96 | 96 | 100 | 1081 | 0.172⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 97 | 96 | 96 | 100 | 1206 | 0.018 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 96 | 96 | 100 | 943 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 80 | 96 | 96 | 100 | 782 | 0.061 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 86 | 96 | 96 | 100 | 2368 | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 95 | 96 | 96 | 100 | 1473 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 84 | 96 | 96 | 100 | 2375 | 0.011 |
| /docs/pe-comprehensive-management-exam-index | desktop | 98 | 96 | 96 | 100 | 1011 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 96 | 96 | 96 | 100 | 921 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 85 | 96 | 96 | 100 | 877 | 0.152⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 99 | 96 | 96 | 100 | 634 | 0.032 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 759 | 0.011 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 100 | 862 | 0.011 |
| /docs/pe-comprehensive-management-agile | desktop | 91 | 96 | 96 | 100 | 1084 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 94 | 96 | 100 | 849 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 91 | 94 | 96 | 100 | 800 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 94 | 96 | 100 | 921 | 0.011 |
| / | mobile | 75 | 92 | 96 | 100 | 4982⚠ | 0.009 |
| /search | mobile | 88 | 91 | 96 | 92 | 3470⚠ | 0.009 |
| /category | mobile | 74 | 98 | 96 | 83⚠ | 4188⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 67⚠ | 93 | 96 | 100 | 6976⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 70 | 93 | 96 | 100 | 6403⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 68⚠ | 93 | 96 | 100 | 7728⚠ | 0.04 |
| /docs/civil-construction-1-primary-h26-a | mobile | 64⚠ | 92 | 96 | 100 | 7051⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 69⚠ | 93 | 96 | 100 | 6185⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 68⚠ | 93 | 96 | 100 | 7301⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 67⚠ | 93 | 96 | 100 | 6266⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 68⚠ | 93 | 96 | 100 | 6487⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 67⚠ | 92 | 96 | 100 | 6725⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 73 | 93 | 96 | 100 | 5954⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 96 | 93 | 96 | 100 | 2776⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 52⚠ | 93 | 96 | 100 | 5835⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 94 | 93 | 96 | 100 | 3001⚠ | 0 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 66⚠ | 92 | 96 | 100 | 6912⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 95 | 93 | 96 | 100 | 2776⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 69⚠ | 93 | 96 | 100 | 6411⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 71 | 91 | 96 | 100 | 6273⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 61⚠ | 91 | 96 | 100 | 9674⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 71 | 91 | 96 | 100 | 5972⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.172 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 413ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 375ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 4982ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2679ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 3470ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 4188ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 3022ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6976ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2586ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6403ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2955ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7728ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3271ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 7051ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3021ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6185ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2697ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7301ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3142ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6266ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2713ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 6487ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3004ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 6725ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2855ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5954ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2499ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2776ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 5835ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3064ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 867ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 3001ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 6912ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2807ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 2776ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6411ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2691ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6273ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2722ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 9674ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 4602ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 5972ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2694ms (閾値: ≤1800ms)