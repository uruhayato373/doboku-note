# PSI 計測レポート — 2026-08-10

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **38件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 96 | 96 | 100 | 735 | 0.015 |
| https://doboku-note.com/search | desktop | ERROR | | | | | |
| /category | desktop | 100 | 98 | 96 | 91 | 449 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 100 | 96 | 100 | 645 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 96 | 96 | 100 | 881 | 0.015 |
| https://doboku-note.com/docs/civil-construction-1-primary-r07-a | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-primary-h26-a | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-secondary-r07 | desktop | ERROR | | | | | |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 100 | 721 | 0.015 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 99 | 96 | 96 | 100 | 631 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 99 | 100 | 96 | 100 | 821 | 0.015 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 97 | 100 | 100 | 100 | 770 | 0.015 |
| /docs/pe-comprehensive-management-exam-index | desktop | 100 | 100 | 96 | 100 | 624 | 0.015 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 96 | 100 | 743 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 100 | 100 | 96 | 100 | 629 | 0.015 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 100 | 96 | 100 | 550 | 0.015 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 94 | 96 | 96 | 100 | 613 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 95 | 100 | 96 | 100 | 726 | 0.015 |
| https://doboku-note.com/docs/pe-comprehensive-management-agile | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 98 | 96 | 100 | 637 | 0.015 |
| https://doboku-note.com/docs/pe-comprehensive-management-agenda-21 | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle | desktop | ERROR | | | | | |
| / | mobile | 76 | 92 | 96 | 100 | 5735⚠ | 0.011 |
| /search | mobile | 77 | 96 | 96 | 66⚠ | 1659 | 0.61⚠ |
| /category | mobile | 79 | 98 | 96 | 91 | 4184⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 98 | 93 | 96 | 100 | 2251 | 0.011 |
| /docs/civil-construction-1-guide-four-management | mobile | 63⚠ | 93 | 96 | 100 | 7201⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 66⚠ | 93 | 96 | 100 | 5657⚠ | 0.032 |
| /docs/civil-construction-1-primary-h26-a | mobile | 65⚠ | 95 | 96 | 100 | 7576⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 97 | 93 | 96 | 100 | 2401 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 69⚠ | 93 | 96 | 100 | 5110⚠ | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 70 | 93 | 96 | 100 | 4911⚠ | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 73 | 93 | 92 | 100 | 5264⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 98 | 92 | 96 | 100 | 2251 | 0.011 |
| /docs/pe-comprehensive-management-exam-index | mobile | 76 | 93 | 96 | 100 | 4727⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 74 | 93 | 96 | 100 | 4957⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 97 | 96 | 96 | 100 | 2251 | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 96 | 96 | 96 | 100 | 2401 | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 76 | 92 | 96 | 100 | 4646⚠ | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 98 | 96 | 96 | 100 | 2110 | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 82 | 96 | 96 | 100 | 3226⚠ | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 97 | 95 | 96 | 100 | 2326 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 99 | 95 | 96 | 100 | 1672 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 97 | 95 | 96 | 100 | 2259 | 0.011 |

## しきい値違反

- ❌ `https://doboku-note.com/search` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
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
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
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
- `https://doboku-note.com/` (mobile): **LCP** = 5735ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- `https://doboku-note.com/category` (mobile): **LCP** = 4184ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 3080ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3297ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5657ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3465ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 7576ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3287ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5110ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3465ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4911ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3173ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5264ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3132ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4727ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3085ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 4957ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2991ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 1823ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 1824ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4646ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2865ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **TBT** = 418ms (閾値: ≤300ms)