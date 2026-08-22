# PSI 計測レポート — 2026-08-19

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **45件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 96 | 100 | 100 | 748 | 0.015 |
| /search | desktop | 76 | 100 | 100 | 66⚠ | 409 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 420 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 100 | 100 | 100 | 607 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 96 | 100 | 100 | 941 | 0.015 |
| https://doboku-note.com/docs/civil-construction-1-primary-r07-a | desktop | ERROR | | | | | |
| /docs/civil-construction-1-primary-h26-a | desktop | 99 | 98 | 100 | 100 | 883 | 0.015 |
| /docs/civil-construction-1-secondary-r07 | desktop | 100 | 96 | 100 | 100 | 612 | 0.015 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 95 | 96 | 100 | 100 | 787 | 0.015 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 96 | 100 | 100 | 628 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 50⚠ | 100 | 100 | 100 | 1323 | 0.226⚠ |
| https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-index | desktop | 94 | 100 | 100 | 100 | 713 | 0.015 |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-primary | desktop | 93 | 100 | 100 | 100 | 648 | 0.131⚠ |
| https://doboku-note.com/docs/pe-comprehensive-management-r05-primary | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 100 | 100 | 581 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 100 | 100 | 100 | 616 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 100 | 100 | 100 | 100 | 806 | 0.029 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 98 | 100 | 100 | 691 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 98 | 100 | 100 | 613 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 98 | 100 | 100 | 575 | 0.015 |
| / | mobile | 63⚠ | 92 | 100 | 100 | 8762⚠ | 0 |
| https://doboku-note.com/search | mobile | ERROR | | | | | |
| /category | mobile | 76 | 98 | 96 | 91 | 4178⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 66⚠ | 93 | 100 | 100 | 6001⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 74 | 93 | 100 | 100 | 5137⚠ | 0.011 |
| /docs/civil-construction-1-primary-r07-a | mobile | 61⚠ | 93 | 100 | 100 | 7426⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 58⚠ | 95 | 100 | 100 | 7201⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 98 | 93 | 100 | 100 | 2111 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 70 | 93 | 100 | 100 | 4960⚠ | 0.011 |
| https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide | mobile | ERROR | | | | | |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 74 | 93 | 100 | 100 | 5133⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 75 | 92 | 100 | 100 | 5002⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-index | mobile | 99 | 93 | 100 | 100 | 2101 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 56⚠ | 93 | 100 | 100 | 6226⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 96 | 96 | 100 | 100 | 2477 | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 75 | 96 | 100 | 100 | 4921⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 98 | 92 | 100 | 100 | 1962 | 0.011 |
| https://doboku-note.com/docs/pe-comprehensive-management-followership | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-agile | mobile | 99 | 96 | 100 | 100 | 2036 | 0.011 |
| https://doboku-note.com/docs/pe-comprehensive-management-activity-abc | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 82 | 95 | 100 | 100 | 2476 | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 98 | 95 | 100 | 100 | 1962 | 0.011 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): **CLS** = 0.226 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): **TBT** = 2868ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.131 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8762ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3130ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/search` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/category` (mobile): **LCP** = 4178ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2876ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6001ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3174ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5137ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3122ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7426ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3608ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3019ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 360ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 4960ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3441ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5133ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3235ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5002ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3140ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2930ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 507ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 1823ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4921ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3092ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): PSI API 500: {
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
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **TBT** = 560ms (閾値: ≤300ms)