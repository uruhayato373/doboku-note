# PSI 計測レポート — 2026-05-22

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **73件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 81 | 96 | 96 | 92 | 695 | 0.02 |
| /search | desktop | 93 | 94 | 96 | 83⚠ | 1114 | 0.02 |
| /category | desktop | 98 | 98 | 96 | 75⚠ | 326 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 97 | 100 | 96 | 92 | 535 | 0.02 |
| /docs/civil-construction-1-guide-four-management | desktop | 91 | 100 | 96 | 92 | 662 | 0.02 |
| /docs/civil-construction-1-primary-r07-a | desktop | 70 | 96 | 96 | 92 | 971 | 0.18⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 97 | 96 | 96 | 92 | 613 | 0.026 |
| /docs/civil-construction-1-secondary-r07 | desktop | 84 | 96 | 96 | 92 | 573 | 0.02 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 92 | 808 | 0.02 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 99 | 96 | 96 | 92 | 712 | 0.02 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 95 | 96 | 96 | 92 | 701 | 0.02 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 99 | 96 | 96 | 92 | 735 | 0.02 |
| /docs/pe-comprehensive-management-exam-index | desktop | 42⚠ | 96 | 96 | 92 | 2263 | 0.03 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 97 | 96 | 96 | 92 | 708 | 0.02 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 83 | 96 | 96 | 92 | 558 | 0.16⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 98 | 96 | 96 | 92 | 529 | 0.041 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 58⚠ | 96 | 96 | 92 | 1276 | 0.02 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 92 | 790 | 0.02 |
| https://doboku-note.com/docs/pe-comprehensive-management-agile | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-activity-abc | desktop | 92 | 94 | 96 | 92 | 714 | 0.02 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 87 | 94 | 96 | 92 | 709 | 0.02 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 94 | 96 | 92 | 687 | 0.02 |
| / | mobile | 79 | 93 | 96 | 92 | 4521⚠ | 0.009 |
| /search | mobile | 92 | 92 | 96 | 83⚠ | 3184⚠ | 0.009 |
| /category | mobile | 79 | 98 | 96 | 75⚠ | 4181⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 65⚠ | 96 | 96 | 92 | 6059⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 73 | 96 | 96 | 92 | 4324⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 65⚠ | 96 | 92 | 92 | 7126⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 69⚠ | 96 | 96 | 92 | 5834⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 85 | 93 | 96 | 92 | 2326 | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 75 | 93 | 96 | 92 | 4126⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 69⚠ | 93 | 96 | 92 | 6187⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 67⚠ | 93 | 96 | 92 | 6177⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 68⚠ | 92 | 96 | 92 | 6339⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 71 | 93 | 96 | 92 | 5965⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 70 | 93 | 96 | 92 | 6112⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 66⚠ | 93 | 96 | 92 | 5595⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 49⚠ | 93 | 96 | 92 | 6279⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 70 | 92 | 96 | 92 | 6050⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 71 | 93 | 96 | 92 | 5980⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 52⚠ | 93 | 96 | 92 | 6376⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 68⚠ | 91 | 96 | 92 | 6135⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 71 | 91 | 96 | 92 | 5750⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 65⚠ | 91 | 96 | 92 | 5705⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **TBT** = 421ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.18 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 433ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 366ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **Performance** = 42 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **FCP** = 1999ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **TBT** = 3789ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.16 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (desktop): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (desktop): **TBT** = 3880ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/` (mobile): **LCP** = 4521ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2505ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 3184ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 4181ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2555ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6059ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2754ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **TBT** = 307ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 4324ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 433ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7126ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3086ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5834ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2858ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **TBT** = 506ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 4126ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **TBT** = 410ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6187ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2673ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 6177ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3457ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 6339ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3329ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5965ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2686ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6112ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2695ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 5595ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2861ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 310ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 49 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6279ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3332ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **TBT** = 660ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 6050ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2730ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 5980ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2688ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6376ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 3210ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **TBT** = 576ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6135ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2704ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 5750ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2679ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 5705ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2734ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 360ms (閾値: ≤300ms)