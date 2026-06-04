# PSI 計測レポート — 2026-06-04

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **54件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 96 | 96 | 100 | 633 | 0.035 |
| /search | desktop | 100 | 94 | 96 | 92 | 689 | 0.035 |
| https://doboku-note.com/category | desktop | ERROR | | | | | |
| /docs/civil-construction-1-guide-strategy | desktop | 88 | 96 | 96 | 100 | 2059 | 0.035 |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 96 | 96 | 100 | 1075 | 0.035 |
| /docs/civil-construction-1-primary-r07-a | desktop | 77 | 96 | 96 | 100 | 1167 | 0.196⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 91 | 96 | 96 | 100 | 1832 | 0.035 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 96 | 96 | 100 | 623 | 0.035 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 95 | 96 | 96 | 100 | 811 | 0.085 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 99 | 96 | 96 | 100 | 881 | 0.035 |
| https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-index | desktop | 79 | 96 | 96 | 100 | 2309 | 0.035 |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-primary | desktop | 82 | 96 | 96 | 100 | 2032 | 0.175⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 99 | 96 | 96 | 100 | 635 | 0.056 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 413 | 0.035 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 100 | 856 | 0.035 |
| https://doboku-note.com/docs/pe-comprehensive-management-agile | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 94 | 96 | 100 | 882 | 0.035 |
| https://doboku-note.com/docs/pe-comprehensive-management-agenda-21 | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 94 | 96 | 100 | 770 | 0.035 |
| https://doboku-note.com/ | mobile | ERROR | | | | | |
| https://doboku-note.com/search | mobile | ERROR | | | | | |
| /category | mobile | 99 | 98 | 96 | 83⚠ | 905 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 73 | 93 | 96 | 100 | 5656⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 68⚠ | 93 | 96 | 100 | 6258⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 68⚠ | 93 | 96 | 100 | 7277⚠ | 0.04 |
| /docs/civil-construction-1-primary-h26-a | mobile | 70 | 92 | 96 | 100 | 6191⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 69⚠ | 93 | 96 | 100 | 6187⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 66⚠ | 93 | 96 | 100 | 7465⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 70 | 93 | 96 | 100 | 6468⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 63⚠ | 93 | 96 | 100 | 7801⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 69⚠ | 92 | 96 | 100 | 6481⚠ | 0.009 |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-index | mobile | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-primary | mobile | 70 | 93 | 96 | 100 | 6260⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 72 | 93 | 96 | 100 | 5943⚠ | 0.009 |
| https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-followership | mobile | 70 | 93 | 96 | 100 | 5897⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 71 | 93 | 96 | 100 | 6330⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 66⚠ | 91 | 96 | 100 | 6988⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 64⚠ | 91 | 96 | 100 | 6212⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 95 | 91 | 96 | 100 | 2858⚠ | 0.009 |

## しきい値違反

- ❌ `https://doboku-note.com/category` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.196 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): PSI API 500: {
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
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.175 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): PSI API 502: <!DOCTYPE html>
<html lang=en>
  <meta charset=utf-8>
  <meta name=viewport content="initial-scale=1, minimum-scale=1, width=device-width">
  <title>Error 502 (Server Error)!!1</title>
  
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
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 5656ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2526ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6258ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3000ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7277ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 2982ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6191ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2796ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6187ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2708ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7465ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3132ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6468ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2741ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 7801ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3441ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 6481ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3378ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6260ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2881ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 5943ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2658ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 5897ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2683ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6330ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2660ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6988ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2681ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 6212ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2756ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **TBT** = 330ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 2858ms (閾値: ≤2500ms)