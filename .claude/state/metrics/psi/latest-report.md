# PSI 計測レポート — 2026-05-08

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **63件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 79 | 100 | 96 | 92 | 662 | 0.023 |
| /search | desktop | 89 | 94 | 96 | 83⚠ | 977 | 0.023 |
| /category | desktop | 100 | 98 | 96 | 75⚠ | 550 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 69⚠ | 100 | 96 | 92 | 881 | 0.023 |
| /docs/civil-construction-1-guide-four-management | desktop | 100 | 100 | 96 | 92 | 741 | 0.023 |
| /docs/civil-construction-1-primary-r07-a | desktop | 63⚠ | 100 | 96 | 92 | 1112 | 0.136⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 98 | 100 | 96 | 92 | 569 | 0.023 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 100 | 96 | 92 | 662 | 0.023 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 73 | 100 | 96 | 92 | 1018 | 0.066 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 74 | 100 | 96 | 92 | 980 | 0.023 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 85 | 100 | 96 | 92 | 681 | 0.023 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 70 | 100 | 96 | 92 | 944 | 0.023 |
| /docs/pe-comprehensive-management-exam-index | desktop | 87 | 96 | 96 | 92 | 755 | 0.023 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 89 | 98 | 96 | 92 | 749 | 0.023 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 88 | 100 | 96 | 92 | 666 | 0.221⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 81 | 100 | 96 | 92 | 698 | 0.042 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 81 | 100 | 96 | 92 | 837 | 0.023 |
| /docs/pe-comprehensive-management-followership | desktop | 96 | 100 | 96 | 92 | 709 | 0.023 |
| /docs/pe-comprehensive-management-agile | desktop | 99 | 100 | 96 | 92 | 789 | 0.023 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 98 | 98 | 92 | 92 | 827 | 0.023 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 98 | 98 | 96 | 92 | 720 | 0.023 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 97 | 98 | 96 | 92 | 823 | 0.023 |
| / | mobile | 94 | 96 | 96 | 92 | 1962 | 0.009 |
| /search | mobile | 61⚠ | 92 | 96 | 83⚠ | 8215⚠ | 0 |
| /category | mobile | 98 | 98 | 96 | 75⚠ | 2263 | 0 |
| https://doboku-note.com/docs/civil-construction-1-guide-strategy | mobile | ERROR | | | | | |
| /docs/civil-construction-1-guide-four-management | mobile | 52⚠ | 96 | 96 | 92 | 9764⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 66⚠ | 96 | 96 | 92 | 4802⚠ | 0.009 |
| /docs/civil-construction-1-primary-h26-a | mobile | 59⚠ | 96 | 96 | 92 | 9598⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 79 | 96 | 96 | 92 | 3182⚠ | 0.009 |
| https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics | mobile | ERROR | | | | | |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 59⚠ | 96 | 96 | 92 | 9929⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 44⚠ | 96 | 96 | 92 | 4351⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 91 | 96 | 96 | 92 | 2946⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 90 | 93 | 96 | 92 | 3395⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 92 | 95 | 96 | 92 | 3151⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 79 | 96 | 96 | 92 | 3751⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 75 | 96 | 96 | 92 | 3847⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 63⚠ | 96 | 96 | 92 | 8843⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 78 | 96 | 96 | 92 | 3091⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 56⚠ | 96 | 96 | 92 | 9157⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 77 | 95 | 96 | 92 | 2717⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 79 | 95 | 96 | 92 | 3152⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 86 | 95 | 96 | 92 | 2866⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **TBT** = 486ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **TBT** = 872ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.136 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 1014ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 584ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **TBT** = 633ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **TBT** = 339ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **TBT** = 867ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.221 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **TBT** = 427ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (desktop): **TBT** = 419ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 8215ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 4821ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- ❌ `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 9764ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 5533ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 354ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 4802ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 591ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 9598ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 5175ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 3182ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **TBT** = 558ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 9929ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 5109ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 44 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 4351ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 2115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **TBT** = 4342ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 2946ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 2115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 3395ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 3151ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 3751ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 406ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 3847ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **TBT** = 503ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 8843ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 4597ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 3091ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **TBT** = 604ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 9157ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 5090ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 2717ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **TBT** = 811ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 3152ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **TBT** = 558ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 2866ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 385ms (閾値: ≤300ms)