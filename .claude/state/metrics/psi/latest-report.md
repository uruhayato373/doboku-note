# PSI 計測レポート — 2026-07-24

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **53件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 100 | 654 | 0.015 |
| /search | desktop | 71 | 100 | 96 | 66⚠ | 431 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 415 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 100 | 96 | 100 | 637 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 100 | 96 | 96 | 100 | 681 | 0.015 |
| /docs/civil-construction-1-primary-r07-a | desktop | 94 | 100 | 96 | 100 | 1421 | 0.015 |
| /docs/civil-construction-1-primary-h26-a | desktop | 81 | 98 | 96 | 100 | 801 | 0.021 |
| /docs/civil-construction-1-secondary-r07 | desktop | 100 | 96 | 96 | 100 | 606 | 0.015 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 100 | 96 | 96 | 100 | 561 | 0.015 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 71 | 96 | 96 | 100 | 913 | 0.114⚠ |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 98 | 100 | 96 | 100 | 590 | 0.015 |
| https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-index | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 96 | 100 | 501 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 100 | 100 | 96 | 100 | 550 | 0.015 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 100 | 96 | 100 | 553 | 0.034 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 94 | 96 | 96 | 100 | 654 | 0.015 |
| https://doboku-note.com/docs/pe-comprehensive-management-followership | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-agile | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-activity-abc | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-agenda-21 | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 94 | 98 | 96 | 100 | 631 | 0.015 |
| / | mobile | 68⚠ | 96 | 96 | 100 | 7350⚠ | 0.011 |
| /search | mobile | 77 | 96 | 96 | 66⚠ | 1055 | 0.61⚠ |
| /category | mobile | 78 | 98 | 96 | 91 | 4242⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 75 | 96 | 96 | 100 | 4779⚠ | 0.011 |
| /docs/civil-construction-1-guide-four-management | mobile | 74 | 93 | 96 | 100 | 4932⚠ | 0.011 |
| /docs/civil-construction-1-primary-r07-a | mobile | 71 | 96 | 96 | 100 | 5327⚠ | 0.032 |
| /docs/civil-construction-1-primary-h26-a | mobile | 98 | 95 | 96 | 100 | 2026 | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 75 | 93 | 96 | 100 | 4643⚠ | 0.011 |
| https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics | mobile | ERROR | | | | | |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 73 | 93 | 96 | 100 | 4615⚠ | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 60⚠ | 96 | 96 | 100 | 9499⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 63⚠ | 96 | 96 | 100 | 6826⚠ | 0 |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-index | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 66⚠ | 96 | 96 | 100 | 6452⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 72 | 96 | 96 | 100 | 5030⚠ | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 75 | 96 | 96 | 100 | 4891⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 96 | 92 | 96 | 100 | 2559⚠ | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 76 | 96 | 96 | 100 | 4636⚠ | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 76 | 96 | 96 | 100 | 4962⚠ | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 98 | 95 | 96 | 100 | 1673 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 76 | 95 | 96 | 100 | 4635⚠ | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 79 | 95 | 96 | 100 | 4351⚠ | 0.011 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **TBT** = 419ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **CLS** = 0.114 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **TBT** = 561ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (desktop): PSI API 500: {
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
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): PSI API 500: {
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
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): PSI API 500: {
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
- `https://doboku-note.com/` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7350ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2842ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- `https://doboku-note.com/category` (mobile): **LCP** = 4242ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 3110ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 4779ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2961ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 4932ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3262ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5327ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3287ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 1819ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4643ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2777ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4615ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2946ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 9499ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 5217ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 6826ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3278ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6452ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2998ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 5030ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3145ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4891ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 2559ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4636ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2867ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 4962ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2834ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4635ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2875ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4351ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2660ms (閾値: ≤1800ms)