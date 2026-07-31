# PSI 計測レポート — 2026-07-31

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **57件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 96 | 96 | 100 | 592 | 0.015 |
| /search | desktop | 76 | 100 | 96 | 66⚠ | 326 | 0.766⚠ |
| /category | desktop | 96 | 98 | 96 | 91 | 326 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 100 | 96 | 100 | 530 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 87 | 96 | 96 | 100 | 875 | 0.015 |
| /docs/civil-construction-1-primary-r07-a | desktop | 84 | 100 | 96 | 100 | 881 | 0.231⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 95 | 98 | 96 | 100 | 1441 | 0.015 |
| /docs/civil-construction-1-secondary-r07 | desktop | 100 | 96 | 96 | 100 | 621 | 0.015 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 98 | 96 | 96 | 100 | 860 | 0.015 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 96 | 96 | 100 | 627 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 100 | 100 | 96 | 100 | 702 | 0.015 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 100 | 96 | 100 | 721 | 0.015 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 100 | 96 | 100 | 772 | 0.015 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 96 | 100 | 581 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 100 | 100 | 96 | 100 | 550 | 0.015 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 100 | 96 | 100 | 549 | 0.015 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 635 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 74 | 100 | 96 | 100 | 764 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 99 | 100 | 96 | 100 | 701 | 0.029 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 98 | 96 | 100 | 581 | 0.015 |
| https://doboku-note.com/docs/pe-comprehensive-management-agenda-21 | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle | desktop | ERROR | | | | | |
| / | mobile | 68⚠ | 92 | 96 | 100 | 7403⚠ | 0.011 |
| /search | mobile | 69⚠ | 96 | 96 | 66⚠ | 1530 | 0.61⚠ |
| /category | mobile | 87 | 98 | 96 | 91 | 1540 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 66⚠ | 93 | 96 | 100 | 6151⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 97 | 93 | 92 | 100 | 2401 | 0.011 |
| https://doboku-note.com/docs/civil-construction-1-primary-r07-a | mobile | ERROR | | | | | |
| /docs/civil-construction-1-primary-h26-a | mobile | 90 | 95 | 96 | 100 | 2298 | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 71 | 93 | 96 | 100 | 4937⚠ | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 64⚠ | 93 | 96 | 100 | 2885⚠ | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 65⚠ | 93 | 96 | 100 | 6537⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 60⚠ | 93 | 96 | 100 | 8145⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 72 | 92 | 96 | 100 | 5331⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-index | mobile | 67⚠ | 93 | 96 | 100 | 6076⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 53⚠ | 93 | 96 | 100 | 6301⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 40⚠ | 96 | 96 | 100 | 6151⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 75 | 96 | 96 | 100 | 4761⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 77 | 92 | 96 | 100 | 4601⚠ | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 61⚠ | 96 | 96 | 100 | 4794⚠ | 0.011 |
| https://doboku-note.com/docs/pe-comprehensive-management-agile | mobile | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-activity-abc | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 98 | 95 | 96 | 100 | 2112 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 66⚠ | 95 | 96 | 100 | 5935⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.231 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **TBT** = 619ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7403ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2798ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **TBT** = 339ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (mobile): **TBT** = 476ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6151ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3146ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 1895ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4937ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 3013ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 2885ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 2469ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **TBT** = 1131ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6537ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3149ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 8145ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 5385ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5331ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3273ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6076ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3019ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6301ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 3036ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 613ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 40 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6151ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3298ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 1494ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4761ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3113ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4601ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2796ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4794ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2886ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **TBT** = 600ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 5935ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2882ms (閾値: ≤1800ms)