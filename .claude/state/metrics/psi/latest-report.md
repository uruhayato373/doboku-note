# PSI 計測レポート — 2026-06-19

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **55件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 96 | 100 | 481 | 0.011 |
| /search | desktop | 100 | 94 | 96 | 92 | 677 | 0.011 |
| /category | desktop | 97 | 98 | 96 | 83⚠ | 430 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 96 | 96 | 96 | 100 | 1019 | 0.011 |
| /docs/civil-construction-1-guide-four-management | desktop | 95 | 96 | 96 | 100 | 1541 | 0.011 |
| /docs/civil-construction-1-primary-r07-a | desktop | 95 | 96 | 96 | 100 | 1506 | 0.011 |
| /docs/civil-construction-1-primary-h26-a | desktop | 72 | 96 | 96 | 100 | 1203 | 0.011 |
| /docs/civil-construction-1-secondary-r07 | desktop | 56⚠ | 96 | 96 | 100 | 1818 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 100 | 774 | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 97 | 96 | 96 | 100 | 1143 | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 84 | 96 | 96 | 100 | 1029 | 0.125⚠ |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 85 | 96 | 96 | 100 | 2621⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 96 | 96 | 100 | 875 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 92 | 96 | 96 | 100 | 881 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 91 | 96 | 96 | 100 | 1069 | 0.152⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 95 | 96 | 96 | 100 | 644 | 0.032 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 597 | 0.011 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 100 | 835 | 0.011 |
| /docs/pe-comprehensive-management-agile | desktop | 92 | 96 | 96 | 100 | 1034 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 94 | 96 | 100 | 853 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 94 | 96 | 100 | 947 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 94 | 96 | 100 | 860 | 0.011 |
| / | mobile | 75 | 92 | 96 | 100 | 5039⚠ | 0.009 |
| /search | mobile | 79 | 91 | 96 | 92 | 4152⚠ | 0 |
| /category | mobile | 99 | 98 | 96 | 83⚠ | 1810 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 71 | 93 | 96 | 100 | 6104⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 59⚠ | 93 | 96 | 100 | 5900⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 62⚠ | 93 | 96 | 100 | 8401⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 71 | 92 | 96 | 100 | 6104⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 70 | 93 | 96 | 100 | 6336⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 69⚠ | 93 | 96 | 100 | 6992⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 99 | 93 | 96 | 100 | 2101 | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 69⚠ | 93 | 96 | 100 | 6413⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 71 | 92 | 96 | 100 | 6039⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 95 | 93 | 96 | 100 | 2926⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 72 | 93 | 96 | 100 | 6335⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 68⚠ | 93 | 96 | 100 | 6043⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 96 | 93 | 96 | 100 | 2626⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 62⚠ | 92 | 96 | 100 | 6911⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 72 | 93 | 96 | 100 | 5805⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 68⚠ | 93 | 96 | 100 | 6424⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 72 | 91 | 96 | 100 | 6265⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 72 | 91 | 96 | 100 | 5970⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 67⚠ | 91 | 96 | 100 | 6018⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **TBT** = 614ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 2027ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): **CLS** = 0.125 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (desktop): **LCP** = 2621ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5039ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2678ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 4152ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3046ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6104ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2572ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5900ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3079ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 478ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 8401ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3228ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6104ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2799ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6336ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2678ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 6992ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3090ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 6413ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 2977ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 6039ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2823ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 2926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6335ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2524ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6043ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2722ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 6911ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2921ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 5805ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2688ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6424ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2706ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6265ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2746ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 5970ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2661ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 6018ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2745ms (閾値: ≤1800ms)