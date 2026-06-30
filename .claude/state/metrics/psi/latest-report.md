# PSI 計測レポート — 2026-06-30

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **40件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 493 | 0.013 |
| /search | desktop | 76 | 100 | 96 | 92 | 420 | 0.766⚠ |
| /category | desktop | 99 | 98 | 96 | 83⚠ | 434 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 92 | 96 | 96 | 92 | 542 | 0.013 |
| /docs/civil-construction-1-guide-four-management | desktop | 85 | 96 | 96 | 100 | 2401 | 0.013 |
| /docs/civil-construction-1-primary-r07-a | desktop | 86 | 96 | 96 | 100 | 1039 | 0.214⚠ |
| https://doboku-note.com/docs/civil-construction-1-primary-h26-a | desktop | ERROR | | | | | |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 96 | 96 | 100 | 755 | 0.013 |
| https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide | desktop | ERROR | | | | | |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 98 | 96 | 96 | 100 | 1081 | 0.013 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 75 | 96 | 96 | 100 | 574 | 0.187⚠ |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 96 | 96 | 100 | 943 | 0.013 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 96 | 96 | 100 | 595 | 0.013 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 92 | 96 | 96 | 100 | 769 | 0.145⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 85 | 96 | 96 | 100 | 484 | 0.02 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 94 | 96 | 96 | 100 | 589 | 0.013 |
| /docs/pe-comprehensive-management-followership | desktop | 97 | 96 | 96 | 100 | 1188 | 0.013 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 96 | 96 | 100 | 1148 | 0.049 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 94 | 96 | 100 | 744 | 0.013 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 94 | 96 | 100 | 966 | 0.013 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 94 | 96 | 100 | 767 | 0.013 |
| / | mobile | 98 | 96 | 96 | 100 | 2187 | 0.009 |
| /search | mobile | 56⚠ | 96 | 96 | 92 | 1585 | 0.61⚠ |
| /category | mobile | 98 | 98 | 96 | 83⚠ | 1562 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 98 | 93 | 96 | 100 | 2326 | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 69⚠ | 93 | 96 | 100 | 5199⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 62⚠ | 93 | 96 | 100 | 3829⚠ | 0.009 |
| https://doboku-note.com/docs/civil-construction-1-primary-h26-a | mobile | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-secondary-r07 | mobile | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics | mobile | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide | mobile | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview | mobile | ERROR | | | | | |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 75 | 92 | 96 | 100 | 5101⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 70 | 93 | 96 | 100 | 5701⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 75 | 93 | 96 | 100 | 5204⚠ | 0.009 |
| https://doboku-note.com/docs/pe-comprehensive-management-r07-primary | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-r05-primary | mobile | 87 | 93 | 96 | 100 | 2663⚠ | 0 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 98 | 92 | 96 | 100 | 2263 | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 99 | 93 | 96 | 100 | 1677 | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 71 | 93 | 96 | 100 | 5198⚠ | 0.009 |
| https://doboku-note.com/docs/pe-comprehensive-management-activity-abc | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 82 | 91 | 96 | 100 | 4006⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 73 | 91 | 96 | 100 | 4793⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.214 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): PSI API 500: {
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
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (desktop): **CLS** = 0.187 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (desktop): **TBT** = 368ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.145 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **TBT** = 520ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5199ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3031ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 3829ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 997ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
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
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5101ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2782ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5701ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2613ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 5204ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2534ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): PSI API 400: {
  "error": {
    "code": 400,
    "message": "Lighthouse returned error: FAILED_DOCUMENT_REQUEST. Lighthouse was unable to reliably load the page you requested. Make sure you are testin
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2663ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2588ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5198ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2684ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4006ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2431ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4793ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2724ms (閾値: ≤1800ms)