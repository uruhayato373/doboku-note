# PSI 計測レポート — 2026-05-27

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **107件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 92 | 96 | 100 | 710 | 0.02 |
| /search | desktop | 98 | 94 | 96 | 92 | 994 | 0 |
| /category | desktop | 48⚠ | 98 | 96 | 83⚠ | 2034 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 95 | 87⚠ | 96 | 92 | 1177 | 0.02 |
| /docs/civil-construction-1-guide-four-management | desktop | 75 | 87⚠ | 96 | 92 | 2688⚠ | 0.034 |
| /docs/civil-construction-1-primary-r07-a | desktop | 81 | 87⚠ | 96 | 92 | 1063 | 0.183⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 88 | 87⚠ | 96 | 92 | 2195 | 0.02 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 87⚠ | 96 | 92 | 849 | 0.02 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 96 | 87⚠ | 96 | 92 | 842 | 0.02 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 87 | 87⚠ | 96 | 92 | 2040 | 0.02 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 98 | 87⚠ | 96 | 92 | 1050 | 0.02 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 96 | 86⚠ | 96 | 92 | 1076 | 0.02 |
| /docs/pe-comprehensive-management-exam-index | desktop | 63⚠ | 87⚠ | 96 | 92 | 2556⚠ | 0.049 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 87⚠ | 96 | 92 | 1027 | 0.02 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 77 | 87⚠ | 96 | 92 | 1075 | 0.16⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 99 | 87⚠ | 96 | 92 | 635 | 0.041 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 92 | 96 | 100 | 549 | 0.02 |
| /docs/pe-comprehensive-management-followership | desktop | 90 | 87⚠ | 96 | 92 | 822 | 0.02 |
| /docs/pe-comprehensive-management-agile | desktop | 97 | 87⚠ | 96 | 92 | 1048 | 0.023 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 93 | 85⚠ | 96 | 92 | 761 | 0.02 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 91 | 96 | 100 | 806 | 0.02 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 98 | 91 | 96 | 100 | 966 | 0.02 |
| / | mobile | 64⚠ | 83⚠ | 96 | 92 | 5537⚠ | 0 |
| /search | mobile | 90 | 91 | 96 | 92 | 3433⚠ | 0.009 |
| /category | mobile | 69⚠ | 98 | 96 | 83⚠ | 4271⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 60⚠ | 84⚠ | 96 | 92 | 7372⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 61⚠ | 84⚠ | 96 | 92 | 7576⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 65⚠ | 84⚠ | 96 | 92 | 7280⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 68⚠ | 83⚠ | 96 | 92 | 6501⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 67⚠ | 84⚠ | 96 | 92 | 5596⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 65⚠ | 84⚠ | 96 | 92 | 7971⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 55⚠ | 84⚠ | 96 | 92 | 7549⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 94 | 84⚠ | 96 | 92 | 2350 | 0.01 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 60⚠ | 83⚠ | 96 | 92 | 5604⚠ | 0.009 |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-index | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 96 | 84⚠ | 96 | 92 | 2776⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 66⚠ | 84⚠ | 96 | 92 | 6643⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 70 | 84⚠ | 96 | 92 | 6181⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 66⚠ | 83⚠ | 96 | 92 | 6282⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 59⚠ | 84⚠ | 96 | 92 | 3157⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 53⚠ | 84⚠ | 96 | 92 | 7351⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 71 | 82⚠ | 96 | 92 | 6631⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 70 | 82⚠ | 96 | 92 | 6789⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 69⚠ | 82⚠ | 96 | 92 | 6647⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **Performance** = 48 (閾値: ≥70)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **FCP** = 1868ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (desktop): **TBT** = 888ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **LCP** = 2688ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.183 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **Accessibility** = 86 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **LCP** = 2556ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **TBT** = 452ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.16 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **TBT** = 338ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **Accessibility** = 85 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **LCP** = 5537ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3037ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 3433ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 4271ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2615ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **TBT** = 446ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 7372ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3000ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 7576ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3143ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7280ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3072ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6501ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2871ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 5596ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2850ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7971ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3185ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 7549ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2747ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 421ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 2122ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 5604ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3429ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **TBT** = 435ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2776ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6643ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2836ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6181ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2720ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 6282ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2692ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 3157ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2661ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **TBT** = 1260ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 7351ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 3161ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **TBT** = 454ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6631ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2724ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 6789ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2662ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 6647ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2797ms (閾値: ≤1800ms)