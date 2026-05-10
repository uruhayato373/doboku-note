# PSI 計測レポート — 2026-05-10

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **77件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 91 | 100 | 96 | 92 | 572 | 0.02 |
| /search | desktop | 97 | 94 | 96 | 83⚠ | 1167 | 0 |
| /category | desktop | 98 | 98 | 96 | 75⚠ | 423 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 98 | 100 | 96 | 92 | 633 | 0.02 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 100 | 96 | 92 | 634 | 0.02 |
| /docs/civil-construction-1-primary-r07-a | desktop | 78 | 100 | 96 | 92 | 1002 | 0.147⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 100 | 100 | 96 | 92 | 504 | 0.024 |
| /docs/civil-construction-1-secondary-r07 | desktop | 100 | 100 | 96 | 92 | 747 | 0.02 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 100 | 96 | 92 | 822 | 0.02 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 98 | 100 | 96 | 92 | 842 | 0.02 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 98 | 100 | 96 | 92 | 575 | 0.02 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 85 | 100 | 96 | 92 | 746 | 0.02 |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-index | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 98 | 96 | 92 | 692 | 0.02 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 64⚠ | 100 | 96 | 92 | 656 | 0.14⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 71 | 100 | 96 | 92 | 568 | 0.021 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 100 | 96 | 92 | 722 | 0.02 |
| /docs/pe-comprehensive-management-followership | desktop | 100 | 100 | 92 | 92 | 723 | 0.02 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 100 | 96 | 92 | 689 | 0.02 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 98 | 96 | 92 | 591 | 0.02 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 100 | 98 | 96 | 92 | 690 | 0.02 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 80 | 98 | 96 | 92 | 941 | 0.02 |
| / | mobile | 55⚠ | 96 | 96 | 92 | 8552⚠ | 0 |
| /search | mobile | 63⚠ | 92 | 96 | 83⚠ | 7476⚠ | 0 |
| /category | mobile | 64⚠ | 98 | 96 | 75⚠ | 7472⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 70 | 96 | 96 | 92 | 2492 | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 60⚠ | 96 | 96 | 92 | 9814⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 45⚠ | 96 | 96 | 92 | 8628⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 65⚠ | 96 | 96 | 92 | 7288⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 62⚠ | 96 | 96 | 92 | 9342⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 62⚠ | 96 | 96 | 92 | 10833⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 63⚠ | 96 | 96 | 92 | 9939⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 61⚠ | 96 | 96 | 92 | 10267⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 62⚠ | 96 | 96 | 92 | 10180⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 64⚠ | 93 | 96 | 92 | 8662⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 68⚠ | 95 | 96 | 92 | 7394⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 63⚠ | 96 | 96 | 92 | 8689⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 56⚠ | 96 | 96 | 92 | 9638⚠ | 0 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 63⚠ | 96 | 96 | 92 | 9325⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 93 | 96 | 96 | 92 | 2712⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 63⚠ | 96 | 96 | 92 | 9064⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 63⚠ | 95 | 96 | 92 | 9284⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 65⚠ | 95 | 96 | 92 | 7596⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 63⚠ | 95 | 96 | 92 | 9340⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.147 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 332ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **TBT** = 331ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: UNKNOWN_ERROR. Unknown error encountered with message 'Could not find relevant puppeteer page'",
    "errors": [
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.14 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **TBT** = 1156ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **TBT** = 860ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (desktop): **TBT** = 368ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8552ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 4894ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 7476ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 4718ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 7472ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 4610ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2049ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **TBT** = 1089ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 9814ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 5126ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 45 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 8628ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3718ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 716ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 7288ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3306ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 9342ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 4713ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 10833ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 5119ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 9939ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 4845ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 10267ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 5218ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 10180ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 5205ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 8662ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 4337ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 7394ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2986ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 8689ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 4618ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 9638ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 5494ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 9325ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 4679ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 2712ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 9064ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 4773ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 9284ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 4565ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 7596ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 3811ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 9340ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 4777ms (閾値: ≤1800ms)