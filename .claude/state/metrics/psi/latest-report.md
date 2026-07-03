# PSI 計測レポート — 2026-07-03

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **38件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 97 | 100 | 96 | 100 | 716 | 0.013 |
| /search | desktop | 76 | 100 | 96 | 92 | 430 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 424 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 82 | 96 | 96 | 100 | 2216 | 0.013 |
| /docs/civil-construction-1-guide-four-management | desktop | 88 | 96 | 96 | 100 | 2303 | 0.013 |
| /docs/civil-construction-1-primary-r07-a | desktop | 85 | 96 | 96 | 100 | 1339 | 0.227⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 92 | 96 | 96 | 100 | 879 | 0.021 |
| /docs/civil-construction-1-secondary-r07 | desktop | 91 | 96 | 96 | 100 | 1910 | 0.03 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 100 | 842 | 0.013 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 97 | 96 | 96 | 100 | 1174 | 0.013 |
| https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-index | desktop | 93 | 96 | 96 | 100 | 1772 | 0.013 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 96 | 96 | 100 | 741 | 0.013 |
| https://doboku-note.com/docs/pe-comprehensive-management-r07-primary | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-r05-primary | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 601 | 0.013 |
| https://doboku-note.com/docs/pe-comprehensive-management-followership | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 96 | 96 | 100 | 1133 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 85 | 94 | 96 | 100 | 2333 | 0.013 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 98 | 94 | 96 | 100 | 1050 | 0.013 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 98 | 94 | 96 | 100 | 1139 | 0.013 |
| / | mobile | 79 | 96 | 96 | 100 | 2036 | 0.009 |
| /search | mobile | 59⚠ | 96 | 96 | 92 | 4107⚠ | 0.61⚠ |
| /category | mobile | 99 | 98 | 96 | 83⚠ | 1524 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 75 | 93 | 96 | 100 | 4974⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 74 | 93 | 96 | 100 | 5197⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 62⚠ | 93 | 96 | 100 | 9904⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 99 | 92 | 96 | 100 | 2101 | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 98 | 93 | 96 | 100 | 2026 | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 92 | 93 | 96 | 100 | 3076⚠ | 0 |
| https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide | mobile | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview | mobile | ERROR | | | | | |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 73 | 92 | 96 | 100 | 5348⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 97 | 93 | 96 | 100 | 2326 | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 97 | 93 | 96 | 100 | 2257 | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 93 | 93 | 96 | 100 | 3151⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 68⚠ | 93 | 96 | 100 | 5116⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 76 | 92 | 96 | 100 | 4758⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 75 | 93 | 96 | 100 | 4838⚠ | 0.009 |
| https://doboku-note.com/docs/pe-comprehensive-management-agile | mobile | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-activity-abc | mobile | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-agenda-21 | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 98 | 91 | 96 | 100 | 2326 | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.227 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): PSI API 500: {
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
- `https://doboku-note.com/` (mobile): **TBT** = 735ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **LCP** = 4107ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **FCP** = 2531ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 4974ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2816ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5197ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2960ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 9904ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 2984ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 3076ms (閾値: ≤2500ms)
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
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5348ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2831ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 3151ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 5116ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2880ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **TBT** = 302ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4758ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2717ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4838ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2666ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr