# PSI 計測レポート — 2026-07-08

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **51件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 674 | 0.013 |
| /search | desktop | 76 | 100 | 96 | 92 | 463 | 0.766⚠ |
| /category | desktop | 99 | 98 | 96 | 83⚠ | 434 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 96 | 96 | 100 | 748 | 0.013 |
| /docs/civil-construction-1-guide-four-management | desktop | 59⚠ | 96 | 96 | 100 | 1692 | 0.013 |
| /docs/civil-construction-1-primary-r07-a | desktop | 86 | 96 | 96 | 100 | 1169 | 0.221⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 96 | 96 | 96 | 100 | 1361 | 0.013 |
| /docs/civil-construction-1-secondary-r07 | desktop | 94 | 96 | 96 | 100 | 691 | 0.112⚠ |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 69⚠ | 96 | 96 | 100 | 768 | 0.113⚠ |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 99 | 96 | 96 | 100 | 657 | 0.013 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 99 | 96 | 96 | 100 | 872 | 0.013 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 96 | 96 | 100 | 589 | 0.013 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 96 | 96 | 100 | 860 | 0.013 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 88 | 96 | 96 | 100 | 615 | 0.225⚠ |
| /docs/pe-comprehensive-management-r07-primary | desktop | 84 | 96 | 96 | 100 | 642 | 0.139⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 94 | 96 | 96 | 100 | 424 | 0.032 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 518 | 0.013 |
| /docs/pe-comprehensive-management-followership | desktop | 96 | 96 | 96 | 100 | 821 | 0.013 |
| /docs/pe-comprehensive-management-agile | desktop | 100 | 96 | 96 | 100 | 663 | 0.027 |
| https://doboku-note.com/docs/pe-comprehensive-management-activity-abc | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 100 | 95 | 96 | 100 | 688 | 0.013 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 95 | 96 | 100 | 521 | 0.013 |
| / | mobile | 68⚠ | 96 | 96 | 100 | 6715⚠ | 0.009 |
| /search | mobile | 77 | 96 | 96 | 92 | 1683 | 0.606⚠ |
| /category | mobile | 98 | 98 | 96 | 83⚠ | 1533 | 0 |
| https://doboku-note.com/docs/civil-construction-1-guide-strategy | mobile | ERROR | | | | | |
| /docs/civil-construction-1-guide-four-management | mobile | 75 | 93 | 96 | 100 | 5114⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 67⚠ | 93 | 96 | 100 | 6228⚠ | 0.03 |
| /docs/civil-construction-1-primary-h26-a | mobile | 73 | 92 | 96 | 100 | 5709⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 75 | 93 | 96 | 100 | 4824⚠ | 0.009 |
| https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics | mobile | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide | mobile | ERROR | | | | | |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 66⚠ | 93 | 96 | 100 | 6526⚠ | 0 |
| https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-index | mobile | 63⚠ | 93 | 96 | 100 | 6451⚠ | 0 |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-primary | mobile | 99 | 93 | 96 | 100 | 1801 | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 69⚠ | 93 | 96 | 100 | 4980⚠ | 0.009 |
| https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-followership | mobile | 64⚠ | 93 | 96 | 100 | 6226⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 72 | 93 | 96 | 100 | 5212⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 77 | 91 | 96 | 100 | 4951⚠ | 0.009 |
| https://doboku-note.com/docs/pe-comprehensive-management-agenda-21 | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 76 | 91 | 96 | 100 | 4754⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **TBT** = 1869ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.221 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **CLS** = 0.112 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **CLS** = 0.113 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 749ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **CLS** = 0.225 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.139 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 6715ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2534ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.606 (閾値: ≤0.1)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- ❌ `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5114ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2793ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6228ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3323ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5709ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2638ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4824ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2745ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 6526ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 2978ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6451ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3028ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4980ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3024ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2758ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5212ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2515ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4951ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2627ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4754ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2759ms (閾値: ≤1800ms)