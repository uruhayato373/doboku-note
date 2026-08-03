# PSI 計測レポート — 2026-08-03

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **51件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 96 | 96 | 100 | 815 | 0.015 |
| /search | desktop | 76 | 100 | 96 | 66⚠ | 410 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 419 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 100 | 96 | 100 | 621 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 100 | 96 | 96 | 100 | 672 | 0.015 |
| /docs/civil-construction-1-primary-r07-a | desktop | 88 | 100 | 96 | 100 | 741 | 0.231⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 100 | 98 | 96 | 100 | 562 | 0.015 |
| /docs/civil-construction-1-secondary-r07 | desktop | 98 | 96 | 96 | 100 | 780 | 0.032 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 100 | 96 | 96 | 100 | 661 | 0.015 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 96 | 96 | 100 | 631 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 99 | 100 | 96 | 100 | 877 | 0.015 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 100 | 96 | 100 | 706 | 0.015 |
| /docs/pe-comprehensive-management-exam-index | desktop | 81 | 100 | 96 | 100 | 690 | 0.07 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 96 | 100 | 653 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 92 | 100 | 96 | 100 | 631 | 0.157⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 94 | 100 | 96 | 100 | 536 | 0.035 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 96 | 96 | 100 | 650 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 100 | 100 | 96 | 100 | 523 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 93 | 100 | 96 | 100 | 879 | 0.029 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 89 | 98 | 96 | 100 | 811 | 0.04 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 98 | 98 | 92 | 100 | 883 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 98 | 96 | 100 | 592 | 0.015 |
| https://doboku-note.com/ | mobile | ERROR | | | | | |
| /search | mobile | 77 | 96 | 96 | 66⚠ | 1509 | 0.61⚠ |
| /category | mobile | 71 | 98 | 96 | 91 | 1631 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 62⚠ | 93 | 96 | 100 | 6301⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 74 | 93 | 96 | 100 | 4786⚠ | 0.011 |
| /docs/civil-construction-1-primary-r07-a | mobile | 70 | 96 | 96 | 100 | 5568⚠ | 0.032 |
| /docs/civil-construction-1-primary-h26-a | mobile | 73 | 95 | 96 | 100 | 5323⚠ | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 77 | 93 | 96 | 100 | 4590⚠ | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 60⚠ | 93 | 96 | 100 | 6826⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 58⚠ | 93 | 96 | 100 | 4986⚠ | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 97 | 93 | 96 | 100 | 2401 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 96 | 92 | 96 | 100 | 2551⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-index | mobile | 76 | 93 | 96 | 100 | 4650⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 69⚠ | 93 | 96 | 100 | 4893⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 69⚠ | 96 | 96 | 100 | 4114⚠ | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 71 | 96 | 96 | 100 | 4988⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 98 | 92 | 96 | 100 | 2037 | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 98 | 96 | 96 | 100 | 2251 | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 77 | 96 | 96 | 100 | 4835⚠ | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 66⚠ | 95 | 96 | 100 | 6376⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 72 | 95 | 96 | 100 | 4805⚠ | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 65⚠ | 95 | 96 | 100 | 4903⚠ | 0.011 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.231 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **TBT** = 392ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.157 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- `https://doboku-note.com/category` (mobile): **TBT** = 1975ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6301ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3214ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 4786ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3163ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5568ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3448ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5323ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2935ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4590ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2960ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 6826ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3442ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4986ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3038ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 667ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4650ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2973ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 4893ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 3001ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 327ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4114ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3250ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 413ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4988ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3145ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 4835ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2802ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6376ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2987ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4805ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2851ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4903ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2905ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 437ms (閾値: ≤300ms)