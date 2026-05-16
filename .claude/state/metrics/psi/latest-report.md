# PSI 計測レポート — 2026-05-15

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **65件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 95 | 100 | 96 | 92 | 674 | 0.02 |
| /search | desktop | 63⚠ | 94 | 96 | 83⚠ | 1293 | 0.02 |
| /category | desktop | 98 | 98 | 96 | 75⚠ | 490 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 67⚠ | 100 | 96 | 92 | 1012 | 0.02 |
| /docs/civil-construction-1-guide-four-management | desktop | 90 | 100 | 96 | 92 | 668 | 0.034 |
| /docs/civil-construction-1-primary-r07-a | desktop | 88 | 100 | 96 | 92 | 1079 | 0.151⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 100 | 100 | 96 | 92 | 531 | 0.024 |
| /docs/civil-construction-1-secondary-r07 | desktop | 95 | 100 | 96 | 92 | 589 | 0.02 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 96 | 100 | 96 | 92 | 827 | 0.02 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 84 | 100 | 96 | 92 | 865 | 0.02 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 98 | 100 | 96 | 92 | 698 | 0.02 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 99 | 100 | 96 | 92 | 626 | 0.02 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 96 | 96 | 92 | 641 | 0.02 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 78 | 100 | 92 | 92 | 657 | 0.02 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 93 | 100 | 96 | 92 | 533 | 0.16⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 96 | 100 | 96 | 92 | 540 | 0.041 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 59⚠ | 100 | 96 | 92 | 1054 | 0.02 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 100 | 96 | 92 | 869 | 0.02 |
| /docs/pe-comprehensive-management-agile | desktop | 86 | 100 | 96 | 92 | 757 | 0.02 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 92 | 98 | 92 | 92 | 774 | 0.02 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 94 | 98 | 96 | 92 | 639 | 0.02 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 98 | 96 | 92 | 723 | 0.02 |
| / | mobile | 85 | 96 | 96 | 92 | 2791⚠ | 0 |
| /search | mobile | 60⚠ | 92 | 96 | 83⚠ | 3994⚠ | 0.009 |
| /category | mobile | 98 | 98 | 96 | 75⚠ | 1568 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 92 | 96 | 96 | 92 | 2190 | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 52⚠ | 96 | 96 | 92 | 9863⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 66⚠ | 96 | 96 | 92 | 7053⚠ | 0.009 |
| /docs/civil-construction-1-primary-h26-a | mobile | 84 | 96 | 96 | 92 | 2326 | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 87 | 96 | 96 | 92 | 2080 | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 83 | 96 | 96 | 92 | 3076⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 70 | 96 | 96 | 92 | 5240⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 61⚠ | 96 | 96 | 92 | 10133⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 91 | 96 | 96 | 92 | 2510⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 63⚠ | 93 | 96 | 92 | 9372⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 63⚠ | 96 | 96 | 92 | 9583⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 56⚠ | 96 | 96 | 92 | 9412⚠ | 0 |
| https://doboku-note.com/docs/pe-comprehensive-management-r05-primary | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 55⚠ | 96 | 96 | 92 | 8980⚠ | 0 |
| https://doboku-note.com/docs/pe-comprehensive-management-followership | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-agile | mobile | 63⚠ | 96 | 96 | 92 | 9261⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 63⚠ | 95 | 96 | 92 | 9526⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 63⚠ | 95 | 96 | 92 | 9300⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 69⚠ | 95 | 96 | 92 | 3914⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **TBT** = 1174ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **TBT** = 859ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.151 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **TBT** = 323ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **TBT** = 499ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.16 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (desktop): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (desktop): **TBT** = 4063ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **TBT** = 311ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 2791ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **TBT** = 415ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 3994ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3071ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **TBT** = 805ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 9863ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 5610ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 330ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7053ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3151ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 562ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **TBT** = 457ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 3076ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **TBT** = 381ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 5240ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 390ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 10133ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 5226ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 2510ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 2115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 9372ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 4667ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 9583ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 4802ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 9412ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 5380ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: UNKNOWN_ERROR. Unknown error encountered with message 'Could not find relevant puppeteer page'",
    "errors": [
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 8980ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 5031ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): PSI API 400: {
  "error": {
    "code": 400,
    "message": "Lighthouse returned error: NO_FCP. The page did not paint any content. Please ensure you keep the browser window in the foreground during t
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 9261ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 4602ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 9526ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 4590ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 9300ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 4603ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 3914ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 752ms (閾値: ≤300ms)