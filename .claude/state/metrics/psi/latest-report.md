# PSI 計測レポート — 2026-07-02

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **55件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| https://doboku-note.com/ | desktop | ERROR | | | | | |
| https://doboku-note.com/search | desktop | ERROR | | | | | |
| /category | desktop | 98 | 98 | 96 | 83⚠ | 457 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 93 | 96 | 96 | 100 | 1715 | 0.013 |
| /docs/civil-construction-1-guide-four-management | desktop | 88 | 96 | 96 | 100 | 2337 | 0.013 |
| /docs/civil-construction-1-primary-r07-a | desktop | 72 | 96 | 92 | 100 | 913 | 0.228⚠ |
| https://doboku-note.com/docs/civil-construction-1-primary-h26-a | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-secondary-r07 | desktop | ERROR | | | | | |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 100 | 826 | 0.013 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 99 | 96 | 96 | 100 | 763 | 0.013 |
| https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-index | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 96 | 96 | 100 | 636 | 0.013 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 70 | 96 | 96 | 100 | 2368 | 0.158⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 97 | 96 | 96 | 100 | 401 | 0.033 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 96 | 96 | 100 | 500 | 0.013 |
| /docs/pe-comprehensive-management-followership | desktop | 71 | 96 | 96 | 100 | 2244 | 0.013 |
| /docs/pe-comprehensive-management-agile | desktop | 97 | 96 | 96 | 100 | 1267 | 0.013 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 94 | 96 | 100 | 1036 | 0.013 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 81 | 94 | 96 | 100 | 2487 | 0.013 |
| https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle | desktop | ERROR | | | | | |
| / | mobile | 76 | 96 | 96 | 100 | 4756⚠ | 0 |
| /search | mobile | 61⚠ | 96 | 96 | 92 | 8655⚠ | 0 |
| /category | mobile | 80 | 98 | 96 | 83⚠ | 4161⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 64⚠ | 93 | 96 | 100 | 6376⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 75 | 93 | 96 | 100 | 5113⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 71 | 93 | 96 | 100 | 6077⚠ | 0.029 |
| /docs/civil-construction-1-primary-h26-a | mobile | 69⚠ | 92 | 96 | 100 | 5948⚠ | 0.009 |
| https://doboku-note.com/docs/civil-construction-1-secondary-r07 | mobile | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics | mobile | ERROR | | | | | |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 74 | 93 | 96 | 100 | 5275⚠ | 0.009 |
| https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview | mobile | ERROR | | | | | |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 76 | 92 | 96 | 100 | 5026⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 98 | 93 | 96 | 100 | 2326 | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 63⚠ | 93 | 96 | 100 | 2573⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 77 | 93 | 96 | 100 | 4947⚠ | 0.009 |
| https://doboku-note.com/docs/pe-comprehensive-management-r05-primary | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 76 | 92 | 96 | 100 | 4755⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 75 | 93 | 96 | 100 | 4641⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 74 | 93 | 96 | 100 | 5123⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 73 | 91 | 96 | 100 | 4983⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 77 | 91 | 96 | 100 | 4672⚠ | 0.009 |
| https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle | mobile | ERROR | | | | | |

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
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.228 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 347ms (閾値: ≤300ms)
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
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **TBT** = 368ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/` (mobile): **LCP** = 4756ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2772ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **LCP** = 8655ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 4640ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 4161ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2546ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6376ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3016ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5113ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2778ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6077ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 2968ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5948ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2875ms (閾値: ≤1800ms)
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
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 5275ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2784ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5026ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2790ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2573ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 4710ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4947ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2642ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4755ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2695ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4641ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2689ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5123ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2593ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4983ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2739ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4672ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2664ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr