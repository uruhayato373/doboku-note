# PSI 計測レポート — 2026-07-07

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **50件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 100 | 817 | 0.013 |
| /search | desktop | 76 | 100 | 96 | 92 | 473 | 0.766⚠ |
| https://doboku-note.com/category | desktop | ERROR | | | | | |
| /docs/civil-construction-1-guide-strategy | desktop | 99 | 96 | 96 | 100 | 776 | 0.013 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 96 | 96 | 100 | 749 | 0.013 |
| /docs/civil-construction-1-primary-r07-a | desktop | 77 | 96 | 96 | 100 | 891 | 0.221⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 95 | 96 | 96 | 100 | 862 | 0.02 |
| /docs/civil-construction-1-secondary-r07 | desktop | 95 | 96 | 96 | 100 | 821 | 0.013 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 92 | 96 | 96 | 100 | 702 | 0.113⚠ |
| https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-index | desktop | 100 | 96 | 96 | 100 | 701 | 0.013 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 96 | 96 | 100 | 685 | 0.013 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 92 | 96 | 96 | 100 | 744 | 0.152⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 96 | 96 | 100 | 584 | 0.013 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 94 | 96 | 96 | 100 | 553 | 0.013 |
| /docs/pe-comprehensive-management-followership | desktop | 98 | 96 | 96 | 100 | 747 | 0.013 |
| https://doboku-note.com/docs/pe-comprehensive-management-agile | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-activity-abc | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 98 | 95 | 96 | 100 | 591 | 0.013 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 95 | 92 | 100 | 676 | 0.013 |
| https://doboku-note.com/ | mobile | ERROR | | | | | |
| /search | mobile | 64⚠ | 96 | 96 | 92 | 5866⚠ | 0 |
| /category | mobile | 99 | 98 | 96 | 83⚠ | 1810 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 95 | 93 | 96 | 100 | 2851⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 60⚠ | 93 | 96 | 100 | 9426⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 68⚠ | 93 | 96 | 100 | 6302⚠ | 0.03 |
| https://doboku-note.com/docs/civil-construction-1-primary-h26-a | mobile | ERROR | | | | | |
| /docs/civil-construction-1-secondary-r07 | mobile | 98 | 93 | 96 | 100 | 2326 | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 70 | 93 | 96 | 100 | 6236⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 56⚠ | 93 | 96 | 100 | 7051⚠ | 0 |
| https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview | mobile | ERROR | | | | | |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 64⚠ | 92 | 96 | 100 | 7051⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 74 | 93 | 96 | 100 | 4971⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 64⚠ | 93 | 92 | 100 | 5701⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 74 | 93 | 96 | 100 | 5190⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 69⚠ | 93 | 96 | 100 | 4603⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 98 | 92 | 96 | 100 | 2251 | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 75 | 93 | 96 | 100 | 4912⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 98 | 93 | 96 | 100 | 2326 | 0.009 |
| https://doboku-note.com/docs/pe-comprehensive-management-activity-abc | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 96 | 91 | 96 | 100 | 1651 | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 77 | 91 | 96 | 100 | 4677⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/category` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.221 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **CLS** = 0.113 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): PSI API 500: {
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
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
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
- ❌ `https://doboku-note.com/` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/search` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **LCP** = 5866ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3037ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 2851ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 9426ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 4745ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6302ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3283ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 6236ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3117ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 7051ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3078ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 410ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 7051ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3134ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4971ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2826ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 5701ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2884ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 322ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 5190ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2947ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4603ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2866ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **TBT** = 345ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4912ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2607ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4677ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2685ms (閾値: ≤1800ms)