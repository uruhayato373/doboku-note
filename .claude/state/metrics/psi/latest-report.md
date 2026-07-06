# PSI 計測レポート — 2026-07-06

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **44件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 96 | 100 | 490 | 0.013 |
| /search | desktop | 76 | 100 | 96 | 92 | 536 | 0.766⚠ |
| /category | desktop | 98 | 98 | 96 | 75⚠ | 449 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 89 | 96 | 96 | 100 | 2239 | 0.013 |
| /docs/civil-construction-1-guide-four-management | desktop | 86 | 96 | 96 | 100 | 1937 | 0.013 |
| https://doboku-note.com/docs/civil-construction-1-primary-r07-a | desktop | ERROR | | | | | |
| /docs/civil-construction-1-primary-h26-a | desktop | 99 | 96 | 96 | 100 | 896 | 0.013 |
| https://doboku-note.com/docs/civil-construction-1-secondary-r07 | desktop | ERROR | | | | | |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 93 | 96 | 96 | 100 | 642 | 0.113⚠ |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 83 | 96 | 96 | 100 | 2469 | 0.013 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 95 | 96 | 96 | 100 | 1501 | 0.013 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 96 | 96 | 100 | 665 | 0.013 |
| /docs/pe-comprehensive-management-exam-index | desktop | 89 | 96 | 96 | 100 | 2220 | 0.013 |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-primary | desktop | 73 | 96 | 96 | 100 | 2320 | 0.152⚠ |
| https://doboku-note.com/docs/pe-comprehensive-management-r05-primary | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 627 | 0.013 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 100 | 944 | 0.013 |
| /docs/pe-comprehensive-management-agile | desktop | 89 | 96 | 96 | 100 | 1025 | 0.027 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 84 | 95 | 96 | 100 | 2248 | 0.013 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 100 | 95 | 96 | 100 | 767 | 0.013 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 98 | 95 | 96 | 100 | 1079 | 0.013 |
| https://doboku-note.com/ | mobile | ERROR | | | | | |
| https://doboku-note.com/search | mobile | ERROR | | | | | |
| /category | mobile | 99 | 98 | 96 | 83⚠ | 1057 | 0 |
| https://doboku-note.com/docs/civil-construction-1-guide-strategy | mobile | ERROR | | | | | |
| /docs/civil-construction-1-guide-four-management | mobile | 99 | 93 | 96 | 100 | 1876 | 0.009 |
| https://doboku-note.com/docs/civil-construction-1-primary-r07-a | mobile | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-primary-h26-a | mobile | ERROR | | | | | |
| /docs/civil-construction-1-secondary-r07 | mobile | 81 | 93 | 96 | 100 | 3325⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 65⚠ | 93 | 96 | 100 | 7876⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 60⚠ | 93 | 96 | 100 | 9732⚠ | 0 |
| https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview | mobile | ERROR | | | | | |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 72 | 92 | 96 | 100 | 5421⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 63⚠ | 93 | 96 | 100 | 6451⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 74 | 93 | 96 | 100 | 5122⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 99 | 93 | 96 | 100 | 1951 | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 73 | 93 | 96 | 100 | 4975⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 75 | 92 | 96 | 100 | 4763⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 60⚠ | 93 | 96 | 100 | 6601⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 75 | 93 | 96 | 100 | 5196⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 75 | 91 | 96 | 100 | 4828⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 77 | 91 | 96 | 100 | 4664⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 99 | 91 | 96 | 100 | 2039 | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
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
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **CLS** = 0.113 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): PSI API 500: {
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
- ❌ `https://doboku-note.com/search` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- ❌ `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 3325ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **TBT** = 332ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7876ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3237ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 9732ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 4578ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5421ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3138ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6451ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3018ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 5122ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2725ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4975ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3024ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4763ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2743ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6601ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2874ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **TBT** = 344ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5196ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2560ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4828ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2686ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4664ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2597ms (閾値: ≤1800ms)