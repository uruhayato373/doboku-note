# PSI 計測レポート — 2026-06-02

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **89件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 92 | 96 | 100 | 531 | 0.03 |
| /search | desktop | 98 | 94 | 96 | 92 | 988 | 0.03 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 428 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 99 | 87⚠ | 96 | 92 | 675 | 0.03 |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 87⚠ | 96 | 92 | 1068 | 0.03 |
| /docs/civil-construction-1-primary-r07-a | desktop | 73 | 87⚠ | 96 | 92 | 1262 | 0.195⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 89 | 87⚠ | 96 | 92 | 2175 | 0.03 |
| /docs/civil-construction-1-secondary-r07 | desktop | 100 | 87⚠ | 96 | 92 | 506 | 0.03 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 87⚠ | 96 | 92 | 716 | 0.03 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 99 | 87⚠ | 96 | 92 | 802 | 0.03 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 99 | 87⚠ | 96 | 92 | 981 | 0.03 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 86 | 86⚠ | 96 | 92 | 2492 | 0.03 |
| /docs/pe-comprehensive-management-exam-index | desktop | 98 | 87⚠ | 96 | 92 | 854 | 0.03 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 97 | 87⚠ | 96 | 92 | 1052 | 0.03 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 82 | 87⚠ | 96 | 92 | 1002 | 0.17⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 93 | 87⚠ | 96 | 92 | 529 | 0.051 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 92 | 96 | 100 | 596 | 0.03 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 87⚠ | 96 | 92 | 973 | 0.03 |
| /docs/pe-comprehensive-management-agile | desktop | 97 | 87⚠ | 96 | 92 | 1155 | 0.047 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 85⚠ | 96 | 92 | 785 | 0.03 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 91 | 96 | 100 | 904 | 0.03 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 91 | 96 | 100 | 884 | 0.03 |
| / | mobile | 70 | 83⚠ | 96 | 92 | 5521⚠ | 0 |
| /search | mobile | 91 | 91 | 96 | 92 | 3307⚠ | 0.009 |
| /category | mobile | 100 | 98 | 96 | 83⚠ | 1508 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 70 | 84⚠ | 96 | 92 | 6261⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 66⚠ | 84⚠ | 96 | 92 | 7951⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 64⚠ | 84⚠ | 96 | 92 | 8252⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 90 | 83⚠ | 96 | 92 | 2863⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 67⚠ | 84⚠ | 96 | 92 | 6559⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 66⚠ | 84⚠ | 96 | 92 | 7757⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 70 | 84⚠ | 96 | 92 | 6782⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 63⚠ | 84⚠ | 96 | 92 | 8046⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 90 | 83⚠ | 96 | 92 | 2590⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 92 | 84⚠ | 96 | 92 | 2851⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 70 | 84⚠ | 96 | 92 | 6261⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 68⚠ | 84⚠ | 96 | 92 | 6480⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 69⚠ | 84⚠ | 96 | 92 | 6481⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 71 | 83⚠ | 96 | 92 | 6340⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 69⚠ | 84⚠ | 96 | 92 | 6335⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 72 | 84⚠ | 96 | 92 | 6326⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 69⚠ | 82⚠ | 96 | 92 | 6869⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 70 | 82⚠ | 96 | 92 | 6346⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 72 | 82⚠ | 96 | 92 | 6107⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.195 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 329ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **Accessibility** = 86 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.17 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **Accessibility** = 85 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **LCP** = 5521ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2663ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 3307ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6261ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2533ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 7951ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2956ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 8252ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3015ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 2863ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6559ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2806ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7757ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3135ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6782ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2707ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 8046ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3430ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 2590ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 2115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 2851ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6261ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2552ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6480ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2980ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6481ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2844ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 6340ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2657ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6335ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2833ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6326ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2681ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6869ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2673ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 6346ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2746ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 6107ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2637ms (閾値: ≤1800ms)