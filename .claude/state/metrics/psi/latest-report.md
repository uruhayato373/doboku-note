# PSI 計測レポート — 2026-07-22

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **53件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| https://doboku-note.com/ | desktop | ERROR | | | | | |
| /search | desktop | 76 | 100 | 96 | 66⚠ | 490 | 0.766⚠ |
| /category | desktop | 99 | 98 | 96 | 91 | 451 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 97 | 100 | 96 | 100 | 700 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 90 | 96 | 96 | 100 | 720 | 0.022 |
| /docs/civil-construction-1-primary-r07-a | desktop | 99 | 100 | 96 | 100 | 912 | 0.015 |
| /docs/civil-construction-1-primary-h26-a | desktop | 95 | 98 | 96 | 100 | 1435 | 0.015 |
| https://doboku-note.com/docs/civil-construction-1-secondary-r07 | desktop | ERROR | | | | | |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 100 | 100 | 96 | 100 | 681 | 0.015 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 96 | 96 | 100 | 536 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 97 | 100 | 96 | 100 | 756 | 0.015 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 100 | 96 | 100 | 776 | 0.015 |
| /docs/pe-comprehensive-management-exam-index | desktop | 100 | 100 | 96 | 100 | 630 | 0.015 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 79 | 100 | 96 | 100 | 774 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 90 | 100 | 96 | 100 | 724 | 0.168⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 80 | 100 | 96 | 100 | 539 | 0.034 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 100 | 96 | 100 | 818 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 100 | 100 | 96 | 100 | 640 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 97 | 100 | 96 | 100 | 774 | 0.03 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 98 | 96 | 100 | 701 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 92 | 98 | 96 | 100 | 636 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 98 | 96 | 100 | 690 | 0.015 |
| / | mobile | 95 | 96 | 96 | 100 | 2715⚠ | 0.011 |
| /search | mobile | 58⚠ | 96 | 96 | 66⚠ | 8843⚠ | 0 |
| /category | mobile | 77 | 98 | 96 | 91 | 4279⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 65⚠ | 96 | 96 | 100 | 6076⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 99 | 93 | 96 | 100 | 2101 | 0.011 |
| /docs/civil-construction-1-primary-r07-a | mobile | 66⚠ | 96 | 96 | 100 | 7201⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 84 | 95 | 96 | 100 | 2756⚠ | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 70 | 96 | 96 | 100 | 6151⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 67⚠ | 96 | 96 | 100 | 6451⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 77 | 93 | 96 | 100 | 4705⚠ | 0.011 |
| https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview | mobile | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-index | mobile | 57⚠ | 96 | 96 | 100 | 6451⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 99 | 96 | 92 | 100 | 1951 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 61⚠ | 96 | 96 | 100 | 6376⚠ | 0 |
| https://doboku-note.com/docs/pe-comprehensive-management-r05-primary | mobile | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-followership | mobile | 77 | 96 | 96 | 100 | 4567⚠ | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 73 | 96 | 96 | 100 | 4916⚠ | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 98 | 95 | 100 | 100 | 2326 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 69⚠ | 95 | 96 | 100 | 4739⚠ | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 54⚠ | 95 | 96 | 100 | 6226⚠ | 0 |

## しきい値違反

- ❌ `https://doboku-note.com/` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **TBT** = 458ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.168 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **TBT** = 464ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 2715ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 8843ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 4984ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **LCP** = 4279ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 3132ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6076ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2992ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3529ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 2756ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 1842ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 415ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6151ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2822ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 6451ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3220ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4705ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2928ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6451ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3269ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **TBT** = 391ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6376ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3154ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4567ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2807ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 4916ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2857ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4739ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 3014ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **TBT** = 317ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 6226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 3180ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 532ms (閾値: ≤300ms)