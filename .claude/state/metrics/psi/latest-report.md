# PSI 計測レポート — 2026-06-17

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **64件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 96 | 100 | 535 | 0.011 |
| /search | desktop | 95 | 94 | 96 | 92 | 1097 | 0.011 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 490 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 93 | 96 | 96 | 100 | 1234 | 0.011 |
| /docs/civil-construction-1-guide-four-management | desktop | 97 | 96 | 96 | 100 | 1196 | 0.011 |
| /docs/civil-construction-1-primary-r07-a | desktop | 56⚠ | 96 | 96 | 100 | 1189 | 0.165⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 97 | 96 | 96 | 100 | 1197 | 0.011 |
| /docs/civil-construction-1-secondary-r07 | desktop | 64⚠ | 96 | 96 | 100 | 2123 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 98 | 96 | 96 | 100 | 863 | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 97 | 96 | 96 | 100 | 1166 | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 98 | 96 | 96 | 100 | 1074 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 99 | 96 | 96 | 100 | 1018 | 0.011 |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-index | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-r07-primary | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-r05-primary | desktop | 99 | 96 | 96 | 100 | 662 | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 96 | 96 | 100 | 803 | 0.011 |
| /docs/pe-comprehensive-management-followership | desktop | 96 | 96 | 96 | 100 | 836 | 0.011 |
| https://doboku-note.com/docs/pe-comprehensive-management-agile | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-activity-abc | desktop | ERROR | | | | | |
| https://doboku-note.com/docs/pe-comprehensive-management-agenda-21 | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 94 | 96 | 100 | 905 | 0.011 |
| / | mobile | 74 | 92 | 96 | 100 | 5050⚠ | 0.009 |
| /search | mobile | 90 | 91 | 96 | 92 | 3470⚠ | 0 |
| /category | mobile | 80 | 98 | 96 | 83⚠ | 4152⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 93 | 93 | 96 | 100 | 2567⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 67⚠ | 93 | 96 | 100 | 6570⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 57⚠ | 93 | 96 | 100 | 5486⚠ | 0.009 |
| /docs/civil-construction-1-primary-h26-a | mobile | 92 | 92 | 96 | 100 | 2717⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 59⚠ | 93 | 96 | 100 | 7126⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 66⚠ | 93 | 96 | 100 | 7360⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 70 | 93 | 96 | 100 | 6703⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 62⚠ | 93 | 96 | 100 | 7276⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 70 | 92 | 96 | 100 | 6709⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 72 | 93 | 96 | 100 | 5965⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 69⚠ | 93 | 96 | 100 | 6558⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 66⚠ | 93 | 96 | 100 | 6351⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 61⚠ | 93 | 96 | 100 | 7276⚠ | 0 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 96 | 92 | 96 | 100 | 2711⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 59⚠ | 93 | 96 | 100 | 6199⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 71 | 93 | 96 | 100 | 6331⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 69⚠ | 91 | 96 | 100 | 6199⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 72 | 91 | 96 | 100 | 5888⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 73 | 91 | 92 | 100 | 5802⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.165 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 1377ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 638ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): PSI API 500: {
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
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): PSI API 500: {
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
- `https://doboku-note.com/` (mobile): **LCP** = 5050ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2704ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 3470ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 4152ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2534ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 2567ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6570ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2999ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5486ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 881ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 2717ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 7126ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 3142ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7360ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3103ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6703ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2792ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 7276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3106ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 6709ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2880ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5965ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2522ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6558ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2764ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6351ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3044ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 7276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2906ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 2711ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6199ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2744ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **TBT** = 480ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6331ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2675ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6199ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2695ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 5888ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2689ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 5802ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2660ms (閾値: ≤1800ms)