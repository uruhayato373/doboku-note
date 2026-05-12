# PSI 計測レポート — 2026-05-12

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **72件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 92 | 622 | 0.02 |
| /search | desktop | 92 | 94 | 96 | 83⚠ | 1305 | 0.02 |
| /category | desktop | 97 | 98 | 96 | 75⚠ | 421 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 90 | 100 | 96 | 92 | 489 | 0.02 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 100 | 96 | 92 | 621 | 0.02 |
| /docs/civil-construction-1-primary-r07-a | desktop | 72 | 100 | 96 | 92 | 983 | 0.127⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 72 | 100 | 96 | 92 | 1229 | 0.024 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 100 | 96 | 92 | 699 | 0.02 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 41⚠ | 100 | 96 | 92 | 2296 | 0.02 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 100 | 96 | 92 | 601 | 0.02 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 94 | 100 | 96 | 92 | 576 | 0.133⚠ |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 73 | 100 | 96 | 92 | 661 | 0.188⚠ |
| /docs/pe-comprehensive-management-exam-index | desktop | 96 | 96 | 96 | 92 | 578 | 0.02 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 98 | 96 | 92 | 634 | 0.02 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 86 | 100 | 96 | 92 | 535 | 0.16⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 95 | 100 | 96 | 92 | 523 | 0.041 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 100 | 96 | 92 | 632 | 0.02 |
| /docs/pe-comprehensive-management-followership | desktop | 89 | 100 | 96 | 92 | 597 | 0.02 |
| /docs/pe-comprehensive-management-agile | desktop | 69⚠ | 100 | 96 | 92 | 640 | 0.02 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 98 | 98 | 96 | 92 | 701 | 0.02 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 100 | 98 | 96 | 92 | 670 | 0.02 |
| https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle | desktop | ERROR | | | | | |
| / | mobile | 65⚠ | 96 | 96 | 92 | 7876⚠ | 0.009 |
| /search | mobile | 66⚠ | 92 | 96 | 83⚠ | 5840⚠ | 0 |
| /category | mobile | 63⚠ | 98 | 96 | 75⚠ | 7214⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 59⚠ | 96 | 96 | 92 | 9265⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 78 | 96 | 96 | 92 | 4276⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 72 | 96 | 96 | 92 | 6601⚠ | 0.009 |
| /docs/civil-construction-1-primary-h26-a | mobile | 63⚠ | 96 | 96 | 92 | 9154⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 87 | 96 | 96 | 92 | 2206 | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 74 | 96 | 96 | 92 | 5176⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 53⚠ | 96 | 96 | 92 | 9905⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 84 | 96 | 96 | 92 | 2366 | 0.009 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 72 | 96 | 96 | 92 | 2816⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 88 | 93 | 96 | 92 | 2626⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 64⚠ | 95 | 96 | 92 | 9242⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 57⚠ | 96 | 96 | 92 | 9090⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 67⚠ | 96 | 96 | 92 | 5851⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 61⚠ | 96 | 96 | 92 | 2824⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 63⚠ | 96 | 96 | 92 | 9012⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 70 | 96 | 96 | 92 | 5562⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 53⚠ | 95 | 96 | 92 | 5961⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 60⚠ | 95 | 96 | 92 | 8813⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 97 | 95 | 96 | 92 | 2484 | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.127 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 507ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **TBT** = 431ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **Performance** = 41 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **FCP** = 2110ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 4286ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **CLS** = 0.133 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **CLS** = 0.188 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **TBT** = 399ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.16 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **TBT** = 1372ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7876ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 4411ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5840ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3823ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 7214ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 4633ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 9265ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 5161ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 4276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 311ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6601ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 9154ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 4790ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **TBT** = 412ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5176ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 9905ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 5310ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 302ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **TBT** = 523ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 2816ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 2115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **TBT** = 812ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **TBT** = 369ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 9242ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 4566ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 9090ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 5134ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 5851ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3356ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 2824ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2053ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **TBT** = 2519ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 9012ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 4573ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5562ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2987ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 5961ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 3123ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **TBT** = 615ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 8813ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 4783ms (閾値: ≤1800ms)