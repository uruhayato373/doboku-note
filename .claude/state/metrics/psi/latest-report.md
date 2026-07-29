# PSI 計測レポート — 2026-07-29

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **49件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| https://doboku-note.com/ | desktop | ERROR | | | | | |
| /search | desktop | 76 | 100 | 96 | 66⚠ | 367 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 326 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 100 | 96 | 100 | 641 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 96 | 96 | 100 | 730 | 0.015 |
| https://doboku-note.com/docs/civil-construction-1-primary-r07-a | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-primary-h26-a | desktop | ERROR | | | | | |
| /docs/civil-construction-1-secondary-r07 | desktop | 82 | 96 | 96 | 100 | 713 | 0.032 |
| https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics | desktop | ERROR | | | | | |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 91 | 96 | 96 | 100 | 717 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 86 | 100 | 96 | 100 | 615 | 0.242⚠ |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 100 | 96 | 100 | 544 | 0.015 |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-index | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 96 | 100 | 641 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 99 | 100 | 96 | 100 | 629 | 0.015 |
| https://doboku-note.com/docs/pe-comprehensive-management-r05-primary | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 588 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 97 | 100 | 96 | 100 | 669 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 100 | 100 | 96 | 100 | 741 | 0.015 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 98 | 96 | 100 | 629 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 98 | 96 | 100 | 775 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 88 | 98 | 96 | 100 | 790 | 0.015 |
| / | mobile | 92 | 96 | 96 | 100 | 3168⚠ | 0.011 |
| /search | mobile | 80 | 96 | 96 | 66⚠ | 4070⚠ | 0 |
| /category | mobile | 62⚠ | 98 | 96 | 91 | 5227⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 75 | 96 | 96 | 100 | 4656⚠ | 0.011 |
| /docs/civil-construction-1-guide-four-management | mobile | 65⚠ | 93 | 96 | 100 | 6301⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 65⚠ | 96 | 96 | 100 | 7276⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 96 | 95 | 96 | 100 | 2476 | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 99 | 93 | 96 | 100 | 1876 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 62⚠ | 93 | 96 | 100 | 6526⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 70 | 93 | 96 | 100 | 4758⚠ | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 96 | 96 | 96 | 100 | 2626⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 72 | 96 | 96 | 100 | 5366⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 74 | 96 | 96 | 100 | 4786⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 96 | 96 | 96 | 100 | 2551⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 96 | 96 | 96 | 100 | 2551⚠ | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 70 | 96 | 96 | 100 | 4326⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 74 | 92 | 96 | 100 | 4743⚠ | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 77 | 96 | 96 | 100 | 4568⚠ | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 98 | 96 | 96 | 100 | 2101 | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 71 | 95 | 96 | 100 | 2524⚠ | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 98 | 95 | 96 | 100 | 2113 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 97 | 95 | 96 | 100 | 2176 | 0.011 |

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
- ❌ `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 389ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): **CLS** = 0.242 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/` (mobile): **LCP** = 3168ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4070ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2952ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **LCP** = 5227ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2956ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **TBT** = 413ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 4656ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2863ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6301ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3286ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3536ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 1824ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 6526ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3447ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4758ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3012ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5366ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3218ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4786ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2976ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 1826ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4326ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3195ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **TBT** = 351ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4743ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2853ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4568ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2923ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 2524ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **TBT** = 1339ms (閾値: ≤300ms)