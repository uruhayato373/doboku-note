# PSI 計測レポート — 2026-07-30

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **45件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 633 | 0.015 |
| /search | desktop | 76 | 100 | 96 | 66⚠ | 426 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 420 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 100 | 96 | 100 | 661 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 96 | 96 | 100 | 859 | 0.015 |
| /docs/civil-construction-1-primary-r07-a | desktop | 99 | 100 | 96 | 100 | 961 | 0.015 |
| /docs/civil-construction-1-primary-h26-a | desktop | 94 | 98 | 96 | 100 | 1290 | 0.021 |
| /docs/civil-construction-1-secondary-r07 | desktop | 97 | 96 | 96 | 100 | 653 | 0.015 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 100 | 96 | 96 | 100 | 701 | 0.015 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 96 | 96 | 100 | 558 | 0.015 |
| https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview | desktop | ERROR | | | | | |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 92 | 100 | 96 | 100 | 521 | 0.015 |
| /docs/pe-comprehensive-management-exam-index | desktop | 68⚠ | 100 | 96 | 100 | 927 | 0.07 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 98 | 100 | 96 | 100 | 657 | 0.015 |
| https://doboku-note.com/docs/pe-comprehensive-management-r07-primary | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-r05-primary | desktop | 97 | 100 | 96 | 100 | 689 | 0.035 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 89 | 96 | 96 | 100 | 592 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 97 | 100 | 96 | 100 | 665 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 68⚠ | 100 | 96 | 100 | 979 | 0.054 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 94 | 98 | 96 | 100 | 861 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 100 | 98 | 96 | 100 | 631 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 98 | 96 | 100 | 631 | 0.015 |
| / | mobile | 93 | 96 | 96 | 100 | 3017⚠ | 0.011 |
| /search | mobile | 55⚠ | 96 | 96 | 66⚠ | 4281⚠ | 0.61⚠ |
| https://doboku-note.com/category | mobile | ERROR | | | | | |
| /docs/civil-construction-1-guide-strategy | mobile | 76 | 93 | 96 | 100 | 4654⚠ | 0.011 |
| /docs/civil-construction-1-guide-four-management | mobile | 96 | 93 | 96 | 100 | 2401 | 0.011 |
| /docs/civil-construction-1-primary-r07-a | mobile | 83 | 96 | 96 | 100 | 3676⚠ | 0.011 |
| /docs/civil-construction-1-primary-h26-a | mobile | 90 | 95 | 96 | 100 | 2270 | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 69⚠ | 93 | 96 | 100 | 6076⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 72 | 93 | 96 | 100 | 5005⚠ | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 73 | 93 | 96 | 100 | 4692⚠ | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 69⚠ | 93 | 96 | 100 | 6001⚠ | 0 |
| https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-index | mobile | 96 | 93 | 96 | 100 | 2401 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 97 | 93 | 96 | 100 | 2476 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 95 | 96 | 96 | 100 | 2626⚠ | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 75 | 96 | 96 | 100 | 4898⚠ | 0.011 |
| https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-followership | mobile | 73 | 96 | 96 | 100 | 4690⚠ | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 99 | 96 | 96 | 100 | 1962 | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 61⚠ | 95 | 96 | 100 | 6389⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 77 | 95 | 96 | 100 | 4633⚠ | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 97 | 95 | 96 | 100 | 2401 | 0.011 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **TBT** = 975ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **TBT** = 1229ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 3017ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4281ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **FCP** = 2832ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/category` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 4654ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3005ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 3676ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 1849ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 1839ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 306ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6076ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2928ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5005ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3294ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4692ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3034ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 6001ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 2936ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 1822ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4898ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3103ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4690ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2819ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6389ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2998ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **TBT** = 338ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4633ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2916ms (閾値: ≤1800ms)