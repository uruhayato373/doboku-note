# PSI 計測レポート — 2026-06-24

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **62件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 96 | 100 | 457 | 0.011 |
| /search | desktop | 100 | 94 | 96 | 92 | 768 | 0 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 436 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 94 | 96 | 96 | 100 | 1661 | 0.011 |
| https://doboku-note.com/docs/civil-construction-1-guide-four-management | desktop | ERROR | | | | | |
| /docs/civil-construction-1-primary-r07-a | desktop | 86 | 96 | 96 | 100 | 1549 | 0.176⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 96 | 96 | 96 | 100 | 1042 | 0.035 |
| /docs/civil-construction-1-secondary-r07 | desktop | 95 | 96 | 96 | 100 | 1447 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 90 | 96 | 96 | 100 | 912 | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 97 | 96 | 96 | 100 | 1107 | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 100 | 96 | 96 | 100 | 701 | 0.011 |
| https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-index | desktop | 56⚠ | 96 | 96 | 100 | 1709 | 0.03 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 98 | 96 | 96 | 100 | 904 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 92 | 96 | 96 | 100 | 926 | 0.152⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 97 | 96 | 96 | 100 | 615 | 0.032 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 94 | 96 | 96 | 100 | 713 | 0.011 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 100 | 873 | 0.011 |
| /docs/pe-comprehensive-management-agile | desktop | 96 | 96 | 96 | 100 | 984 | 0.04 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 98 | 94 | 96 | 100 | 1090 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 82 | 94 | 96 | 100 | 922 | 0.011 |
| https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle | desktop | ERROR | | | | | |
| https://doboku-note.com/ | mobile | ERROR | | | | | |
| /search | mobile | 91 | 91 | 96 | 92 | 3470⚠ | 0 |
| /category | mobile | 72 | 98 | 96 | 83⚠ | 4261⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 69⚠ | 93 | 96 | 100 | 6486⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 69⚠ | 93 | 96 | 100 | 6487⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 62⚠ | 93 | 96 | 100 | 6003⚠ | 0.009 |
| /docs/civil-construction-1-primary-h26-a | mobile | 69⚠ | 92 | 96 | 100 | 7304⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 93 | 93 | 96 | 100 | 2326 | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 67⚠ | 93 | 96 | 100 | 6711⚠ | 0.009 |
| https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide | mobile | ERROR | | | | | |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 60⚠ | 93 | 96 | 100 | 5903⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 65⚠ | 92 | 96 | 100 | 7651⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 71 | 93 | 96 | 100 | 6106⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 59⚠ | 93 | 96 | 100 | 7150⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 69⚠ | 93 | 96 | 100 | 6480⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 94 | 93 | 96 | 100 | 2626⚠ | 0 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 64⚠ | 92 | 96 | 100 | 6914⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 73 | 93 | 96 | 100 | 5876⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 64⚠ | 93 | 96 | 100 | 7215⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 70 | 91 | 96 | 100 | 6261⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 72 | 91 | 96 | 100 | 6035⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 72 | 91 | 96 | 100 | 6024⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- ❌ `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.176 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **TBT** = 2521ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): **TBT** = 378ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/search` (mobile): **LCP** = 3470ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 4261ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2632ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **TBT** = 352ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6486ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2829ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6487ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2975ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6003ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 604ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 7304ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2709ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 6711ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3154ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5903ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3066ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **TBT** = 442ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 7651ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3047ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6106ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2836ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 7150ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2771ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 386ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6480ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2962ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 6914ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2866ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 5876ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2492ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 7215ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2731ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6261ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2704ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 6035ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2576ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 6024ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2665ms (閾値: ≤1800ms)