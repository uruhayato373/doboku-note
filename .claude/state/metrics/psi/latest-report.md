# PSI 計測レポート — 2026-07-28

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **35件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| https://doboku-note.com/ | desktop | ERROR | | | | | |
| https://doboku-note.com/search | desktop | ERROR | | | | | |
| /category | desktop | 100 | 98 | 96 | 91 | 449 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 99 | 100 | 96 | 100 | 754 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 94 | 96 | 96 | 100 | 719 | 0.021 |
| https://doboku-note.com/docs/civil-construction-1-primary-r07-a | desktop | ERROR | | | | | |
| /docs/civil-construction-1-primary-h26-a | desktop | 99 | 98 | 96 | 100 | 871 | 0.015 |
| https://doboku-note.com/docs/civil-construction-1-secondary-r07 | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics | desktop | ERROR | | | | | |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 96 | 96 | 100 | 542 | 0.015 |
| https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview | desktop | ERROR | | | | | |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 100 | 96 | 100 | 532 | 0.015 |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-index | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 96 | 100 | 610 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 100 | 100 | 96 | 100 | 649 | 0.015 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 100 | 96 | 100 | 573 | 0.015 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 98 | 96 | 96 | 100 | 576 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 100 | 100 | 96 | 100 | 626 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 99 | 100 | 96 | 100 | 821 | 0.029 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 68⚠ | 98 | 96 | 100 | 1020 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 98 | 96 | 100 | 866 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 98 | 96 | 100 | 549 | 0.015 |
| https://doboku-note.com/ | mobile | ERROR | | | | | |
| /search | mobile | 76 | 96 | 96 | 66⚠ | 1525 | 0.61⚠ |
| https://doboku-note.com/category | mobile | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-guide-strategy | mobile | ERROR | | | | | |
| /docs/civil-construction-1-guide-four-management | mobile | 72 | 93 | 96 | 100 | 4848⚠ | 0.011 |
| https://doboku-note.com/docs/civil-construction-1-primary-r07-a | mobile | ERROR | | | | | |
| /docs/civil-construction-1-primary-h26-a | mobile | 71 | 95 | 96 | 100 | 5430⚠ | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 96 | 93 | 96 | 100 | 2401 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 96 | 93 | 96 | 100 | 2401 | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 96 | 93 | 96 | 100 | 2410 | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 74 | 96 | 96 | 100 | 4972⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 72 | 96 | 96 | 100 | 5194⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-index | mobile | 95 | 96 | 96 | 100 | 2326 | 0.011 |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-primary | mobile | 71 | 96 | 96 | 100 | 4942⚠ | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 95 | 96 | 96 | 100 | 2626⚠ | 0.011 |
| https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-followership | mobile | 98 | 96 | 96 | 100 | 1951 | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 97 | 96 | 96 | 100 | 2326 | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 97 | 95 | 96 | 100 | 2476 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 77 | 95 | 96 | 100 | 4566⚠ | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 74 | 95 | 96 | 100 | 4670⚠ | 0.011 |

## しきい値違反

- ❌ `https://doboku-note.com/` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
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
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): PSI API 500: {
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
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **TBT** = 1318ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/category` (mobile): PSI API 502: <!DOCTYPE html>
<html lang=en>
  <meta charset=utf-8>
  <meta name=viewport content="initial-scale=1, minimum-scale=1, width=device-width">
  <title>Error 502 (Server Error)!!1</title>
  
- ❌ `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 4848ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3319ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5430ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2980ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 1832ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 1825ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 4972ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3124ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5194ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3262ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4942ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3150ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 1820ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4566ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2803ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4670ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2852ms (閾値: ≤1800ms)