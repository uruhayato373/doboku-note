# PSI 計測レポート — 2026-06-26

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **53件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 479 | 0.011 |
| /search | desktop | 68⚠ | 94 | 96 | 92 | 1488 | 0 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 422 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 62⚠ | 96 | 96 | 100 | 1376 | 0.011 |
| /docs/civil-construction-1-guide-four-management | desktop | 76 | 96 | 96 | 100 | 912 | 0.025 |
| /docs/civil-construction-1-primary-r07-a | desktop | 88 | 96 | 96 | 100 | 1336 | 0.171⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 95 | 96 | 96 | 100 | 1479 | 0.011 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 96 | 96 | 100 | 773 | 0.011 |
| https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics | desktop | ERROR | | | | | |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 95 | 96 | 96 | 100 | 1482 | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 65⚠ | 96 | 96 | 100 | 962 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 99 | 96 | 96 | 100 | 686 | 0.011 |
| /docs/pe-comprehensive-management-exam-index | desktop | 58⚠ | 96 | 96 | 100 | 1524 | 0.029 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 96 | 96 | 100 | 498 | 0.011 |
| https://doboku-note.com/docs/pe-comprehensive-management-r07-primary | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-r05-primary | desktop | 95 | 96 | 96 | 100 | 538 | 0.032 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 657 | 0.011 |
| /docs/pe-comprehensive-management-followership | desktop | 96 | 96 | 96 | 100 | 733 | 0.011 |
| /docs/pe-comprehensive-management-agile | desktop | 94 | 96 | 96 | 100 | 1463 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 98 | 94 | 96 | 100 | 1195 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 94 | 96 | 100 | 990 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 64⚠ | 94 | 96 | 100 | 1370 | 0.011 |
| / | mobile | 99 | 96 | 96 | 100 | 1961 | 0.009 |
| /search | mobile | 84 | 91 | 96 | 92 | 4417⚠ | 0 |
| /category | mobile | 100 | 98 | 96 | 83⚠ | 905 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 62⚠ | 93 | 96 | 100 | 3265⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 69⚠ | 93 | 92 | 100 | 5776⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 68⚠ | 93 | 96 | 100 | 6452⚠ | 0.051 |
| /docs/civil-construction-1-primary-h26-a | mobile | 65⚠ | 92 | 96 | 100 | 6226⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 78 | 93 | 96 | 100 | 1801 | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 92 | 93 | 96 | 100 | 2551⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 72 | 93 | 96 | 100 | 2328 | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 71 | 93 | 96 | 100 | 5274⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 77 | 92 | 96 | 100 | 1876 | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 75 | 93 | 96 | 100 | 1651 | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 76 | 93 | 96 | 100 | 5123⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 49⚠ | 93 | 96 | 100 | 5476⚠ | 0 |
| https://doboku-note.com/docs/pe-comprehensive-management-r05-primary | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 98 | 92 | 96 | 100 | 2259 | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 70 | 93 | 96 | 100 | 1576 | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 72 | 93 | 96 | 100 | 2626⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 76 | 91 | 96 | 100 | 5045⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 58⚠ | 91 | 96 | 100 | 5701⚠ | 0 |
| https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle | mobile | ERROR | | | | | |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/search` (desktop): **TBT** = 738ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **TBT** = 2151ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **TBT** = 531ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.171 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): **TBT** = 1675ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **TBT** = 3719ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (desktop): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (desktop): **TBT** = 1192ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 4417ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 3265ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **TBT** = 2582ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5776ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2968ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6452ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3181ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3325ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **TBT** = 959ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 1464ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5274ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 2988ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **TBT** = 1010ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **TBT** = 1279ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 5123ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2573ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 49 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 5476ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3049ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 904ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **TBT** = 3445ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **TBT** = 1252ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 5045ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2668ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 5701ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 3202ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **TBT** = 398ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr