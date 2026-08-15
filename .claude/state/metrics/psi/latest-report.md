# PSI 計測レポート — 2026-08-15

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **37件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 96 | 100 | 592 | 0.015 |
| /search | desktop | 76 | 100 | 96 | 66⚠ | 286 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 408 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 96 | 100 | 96 | 100 | 610 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 100 | 96 | 96 | 100 | 609 | 0.015 |
| /docs/civil-construction-1-primary-r07-a | desktop | 94 | 96 | 96 | 100 | 1633 | 0.015 |
| /docs/civil-construction-1-primary-h26-a | desktop | 97 | 98 | 96 | 100 | 858 | 0.022 |
| https://doboku-note.com/docs/civil-construction-1-secondary-r07 | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics | desktop | ERROR | | | | | |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 98 | 96 | 96 | 100 | 652 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 99 | 100 | 96 | 100 | 741 | 0.015 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 100 | 96 | 100 | 672 | 0.015 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 100 | 96 | 100 | 924 | 0.015 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 96 | 100 | 627 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 100 | 100 | 96 | 100 | 681 | 0.015 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 100 | 96 | 100 | 571 | 0.015 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 583 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 100 | 100 | 96 | 100 | 459 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 100 | 96 | 100 | 825 | 0.015 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 98 | 96 | 100 | 623 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 100 | 98 | 96 | 100 | 593 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 98 | 98 | 96 | 100 | 640 | 0.015 |
| / | mobile | 61⚠ | 92 | 96 | 100 | 3173⚠ | 0.011 |
| /search | mobile | 77 | 96 | 96 | 66⚠ | 1508 | 0.61⚠ |
| /category | mobile | 100 | 98 | 96 | 91 | 1508 | 0 |
| https://doboku-note.com/docs/civil-construction-1-guide-strategy | mobile | ERROR | | | | | |
| /docs/civil-construction-1-guide-four-management | mobile | 64⚠ | 93 | 96 | 100 | 6676⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 71 | 93 | 96 | 100 | 5518⚠ | 0.032 |
| /docs/civil-construction-1-primary-h26-a | mobile | 67⚠ | 95 | 96 | 100 | 5587⚠ | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 73 | 93 | 96 | 100 | 4764⚠ | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 73 | 93 | 96 | 100 | 4988⚠ | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 72 | 93 | 96 | 100 | 4855⚠ | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 73 | 93 | 96 | 100 | 4396⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 96 | 92 | 96 | 100 | 2551⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-index | mobile | 80 | 93 | 96 | 100 | 2326 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 97 | 93 | 96 | 100 | 2401 | 0.011 |
| https://doboku-note.com/docs/pe-comprehensive-management-r07-primary | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-r05-primary | mobile | 96 | 96 | 96 | 100 | 2551⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 76 | 92 | 96 | 100 | 4677⚠ | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 98 | 96 | 96 | 100 | 2251 | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 98 | 96 | 96 | 100 | 2110 | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 77 | 95 | 96 | 100 | 4704⚠ | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 98 | 95 | 96 | 100 | 2251 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 77 | 95 | 96 | 100 | 4648⚠ | 0.011 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 3173ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **TBT** = 2182ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6676ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3193ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5518ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3582ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5587ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3306ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4764ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 3013ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 4988ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3385ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4855ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3137ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 4396ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3153ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **TBT** = 660ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 1820ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4677ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2836ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4704ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2982ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4648ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2808ms (閾値: ≤1800ms)