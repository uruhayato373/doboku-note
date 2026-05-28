# PSI 計測レポート — 2026-05-28

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **114件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 92 | 96 | 100 | 731 | 0.02 |
| /search | desktop | 93 | 94 | 96 | 92 | 1127 | 0.02 |
| /category | desktop | 94 | 98 | 96 | 83⚠ | 457 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 97 | 87⚠ | 96 | 92 | 1016 | 0.02 |
| /docs/civil-construction-1-guide-four-management | desktop | 96 | 87⚠ | 96 | 92 | 1252 | 0.02 |
| /docs/civil-construction-1-primary-r07-a | desktop | 80 | 87⚠ | 96 | 92 | 1323 | 0.186⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 85 | 87⚠ | 96 | 92 | 2478 | 0.02 |
| /docs/civil-construction-1-secondary-r07 | desktop | 84 | 87⚠ | 96 | 92 | 1145 | 0.02 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 54⚠ | 87⚠ | 96 | 92 | 1624 | 0.05 |
| https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide | desktop | ERROR | | | | | |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 96 | 87⚠ | 96 | 92 | 1070 | 0.02 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 64⚠ | 86⚠ | 96 | 92 | 1569 | 0.02 |
| /docs/pe-comprehensive-management-exam-index | desktop | 68⚠ | 87⚠ | 96 | 92 | 1865 | 0.03 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 97 | 87⚠ | 96 | 92 | 1114 | 0.02 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 92 | 87⚠ | 96 | 92 | 975 | 0.16⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 81 | 87⚠ | 96 | 92 | 638 | 0.041 |
| https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-followership | desktop | 98 | 87⚠ | 96 | 92 | 879 | 0.02 |
| https://doboku-note.com/docs/pe-comprehensive-management-agile | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 85⚠ | 96 | 92 | 761 | 0.02 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 98 | 91 | 96 | 100 | 821 | 0.02 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 90 | 91 | 96 | 100 | 863 | 0.02 |
| / | mobile | 74 | 83⚠ | 96 | 92 | 5226⚠ | 0.009 |
| /search | mobile | 58⚠ | 91 | 96 | 92 | 5281⚠ | 0 |
| /category | mobile | 69⚠ | 98 | 96 | 83⚠ | 4340⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 70 | 84⚠ | 96 | 92 | 6404⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 73 | 84⚠ | 96 | 92 | 3301⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 67⚠ | 84⚠ | 96 | 92 | 7427⚠ | 0.076 |
| /docs/civil-construction-1-primary-h26-a | mobile | 69⚠ | 83⚠ | 96 | 92 | 6574⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 67⚠ | 84⚠ | 96 | 92 | 6490⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 65⚠ | 84⚠ | 96 | 92 | 8363⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 68⚠ | 84⚠ | 96 | 92 | 5164⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 65⚠ | 84⚠ | 96 | 92 | 6980⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 65⚠ | 83⚠ | 96 | 92 | 5590⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 68⚠ | 84⚠ | 96 | 92 | 6418⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 70 | 84⚠ | 96 | 92 | 6712⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 52⚠ | 84⚠ | 96 | 92 | 7576⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 44⚠ | 84⚠ | 96 | 92 | 4213⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 66⚠ | 83⚠ | 96 | 92 | 6367⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 69⚠ | 84⚠ | 96 | 92 | 6276⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 71 | 84⚠ | 96 | 92 | 5742⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 67⚠ | 82⚠ | 96 | 92 | 6946⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 62⚠ | 82⚠ | 96 | 92 | 7364⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 57⚠ | 82⚠ | 96 | 92 | 7215⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.186 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 988ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): PSI API 400: {
  "error": {
    "code": 400,
    "message": "Lighthouse returned error: NO_FCP. The page did not paint any content. Please ensure you keep the browser window in the foreground during t
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **Accessibility** = 86 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **TBT** = 636ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **TBT** = 566ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.16 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **TBT** = 403ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **Accessibility** = 87 (閾値: ≥90)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **Accessibility** = 85 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **LCP** = 5226ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2571ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **LCP** = 5281ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3043ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **TBT** = 522ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 4340ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2666ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **TBT** = 449ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6404ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2724ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 3301ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 742ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7427ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3018ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6574ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2890ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6490ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2838ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 8363ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3180ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 5164ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 439ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 6980ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3349ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 5590ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3490ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6418ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2776ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6712ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2718ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 7576ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3415ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 488ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 44 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4213ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 4142ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **TBT** = 1363ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 6367ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2719ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2778ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5742ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2738ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6946ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2718ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 7364ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2886ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 7215ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 3004ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 364ms (閾値: ≤300ms)