# PSI 計測レポート — 2026-06-08

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **52件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 96 | 100 | 697 | 0.011 |
| /search | desktop | 98 | 94 | 96 | 92 | 920 | 0.011 |
| /category | desktop | 90 | 98 | 96 | 83⚠ | 428 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 96 | 96 | 96 | 100 | 1364 | 0.011 |
| /docs/civil-construction-1-guide-four-management | desktop | 97 | 96 | 96 | 100 | 1211 | 0.011 |
| /docs/civil-construction-1-primary-r07-a | desktop | 80 | 96 | 96 | 100 | 1062 | 0.176⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 98 | 96 | 96 | 100 | 1059 | 0.011 |
| /docs/civil-construction-1-secondary-r07 | desktop | 98 | 96 | 96 | 100 | 1047 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 98 | 96 | 96 | 100 | 882 | 0.061 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 98 | 96 | 96 | 100 | 1129 | 0.011 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 95 | 96 | 96 | 100 | 1056 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 99 | 96 | 96 | 100 | 1033 | 0.011 |
| /docs/pe-comprehensive-management-exam-index | desktop | 97 | 96 | 96 | 100 | 1018 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 98 | 96 | 96 | 100 | 1144 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 91 | 96 | 96 | 100 | 981 | 0.152⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 96 | 96 | 100 | 649 | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 96 | 96 | 100 | 764 | 0.011 |
| /docs/pe-comprehensive-management-followership | desktop | 100 | 96 | 96 | 100 | 459 | 0.011 |
| /docs/pe-comprehensive-management-agile | desktop | 97 | 96 | 96 | 100 | 999 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 98 | 94 | 96 | 100 | 1147 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 94 | 96 | 100 | 849 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 94 | 96 | 100 | 941 | 0.011 |
| / | mobile | 75 | 92 | 92 | 100 | 5000⚠ | 0.009 |
| /search | mobile | 91 | 91 | 96 | 92 | 3472⚠ | 0.009 |
| /category | mobile | 97 | 98 | 96 | 83⚠ | 1532 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 64⚠ | 93 | 96 | 100 | 6901⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 46⚠ | 93 | 96 | 100 | 6808⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 68⚠ | 93 | 96 | 100 | 7503⚠ | 0.04 |
| /docs/civil-construction-1-primary-h26-a | mobile | 88 | 92 | 96 | 100 | 2326 | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 70 | 93 | 96 | 100 | 6123⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 67⚠ | 93 | 96 | 100 | 7236⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 69⚠ | 93 | 96 | 100 | 6794⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 67⚠ | 93 | 96 | 100 | 6561⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 69⚠ | 92 | 96 | 100 | 6396⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 63⚠ | 93 | 96 | 100 | 6826⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 67⚠ | 93 | 96 | 100 | 7201⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 68⚠ | 93 | 96 | 100 | 6339⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 71 | 93 | 96 | 100 | 5942⚠ | 0 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 58⚠ | 92 | 96 | 100 | 7139⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 98 | 93 | 96 | 100 | 2401 | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 70 | 93 | 96 | 100 | 6408⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 95 | 91 | 96 | 100 | 2858⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 96 | 91 | 96 | 100 | 2707⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 77 | 91 | 96 | 100 | 4396⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.176 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5000ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2676ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 3472ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6901ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2771ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 46 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6808ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3065ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 763ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7503ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3167ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 319ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6123ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2756ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7236ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3129ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6794ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2680ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 6561ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3419ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 6396ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3291ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6826ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2744ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2722ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6339ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2981ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 5942ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2739ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 7139ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2970ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **TBT** = 351ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6408ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2669ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 2858ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 2707ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4396ms (閾値: ≤2500ms)