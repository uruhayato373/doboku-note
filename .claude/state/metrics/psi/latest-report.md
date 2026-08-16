# PSI 計測レポート — 2026-08-16

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **43件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 96 | 96 | 100 | 704 | 0.015 |
| /search | desktop | 75 | 100 | 96 | 66⚠ | 585 | 0.766⚠ |
| /category | desktop | 98 | 98 | 96 | 91 | 425 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 100 | 100 | 100 | 614 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 96 | 96 | 100 | 882 | 0.015 |
| https://doboku-note.com/docs/civil-construction-1-primary-r07-a | desktop | ERROR | | | | | |
| /docs/civil-construction-1-primary-h26-a | desktop | 95 | 98 | 96 | 100 | 878 | 0.021 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 96 | 96 | 100 | 878 | 0.015 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 100 | 833 | 0.015 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 96 | 96 | 100 | 630 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 100 | 100 | 96 | 100 | 710 | 0.015 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 100 | 96 | 100 | 621 | 0.015 |
| /docs/pe-comprehensive-management-exam-index | desktop | 96 | 100 | 96 | 100 | 800 | 0.015 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 100 | 96 | 100 | 630 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 88 | 100 | 96 | 100 | 720 | 0.157⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 100 | 96 | 100 | 531 | 0.015 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 582 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 100 | 100 | 96 | 100 | 586 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 100 | 100 | 96 | 100 | 465 | 0.029 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 98 | 96 | 100 | 601 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 100 | 98 | 96 | 100 | 562 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 98 | 96 | 100 | 820 | 0.015 |
| https://doboku-note.com/ | mobile | ERROR | | | | | |
| https://doboku-note.com/search | mobile | ERROR | | | | | |
| /category | mobile | 99 | 98 | 96 | 91 | 1530 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 64⚠ | 93 | 92 | 100 | 6001⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 67⚠ | 93 | 96 | 100 | 5376⚠ | 0.011 |
| /docs/civil-construction-1-primary-r07-a | mobile | 82 | 93 | 96 | 100 | 3451⚠ | 0.011 |
| /docs/civil-construction-1-primary-h26-a | mobile | 73 | 95 | 96 | 100 | 5192⚠ | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 58⚠ | 93 | 96 | 100 | 6152⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 74 | 93 | 96 | 100 | 4900⚠ | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 63⚠ | 93 | 96 | 100 | 6170⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 71 | 93 | 96 | 100 | 5299⚠ | 0.011 |
| https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-index | mobile | 75 | 93 | 96 | 100 | 4732⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 95 | 93 | 96 | 100 | 2476 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 73 | 96 | 96 | 100 | 4927⚠ | 0.011 |
| https://doboku-note.com/docs/pe-comprehensive-management-r05-primary | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 76 | 92 | 96 | 100 | 4676⚠ | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 96 | 96 | 96 | 100 | 2036 | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 76 | 96 | 96 | 100 | 4868⚠ | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 69⚠ | 95 | 96 | 100 | 6151⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 98 | 95 | 96 | 100 | 2035 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 76 | 95 | 96 | 100 | 4676⚠ | 0.011 |

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
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.157 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/search` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6001ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3326ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5376ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3284ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 3451ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 2101ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 325ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5192ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2970ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6152ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 3193ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **TBT** = 411ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 4900ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3398ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6170ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3242ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5299ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3303ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4732ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2989ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4927ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3144ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4676ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2826ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 4868ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2814ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6151ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2940ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4676ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2829ms (閾値: ≤1800ms)