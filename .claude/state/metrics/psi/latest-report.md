# PSI 計測レポート — 2026-05-21

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **81件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 96 | 96 | 92 | 621 | 0.02 |
| /search | desktop | 98 | 94 | 96 | 83⚠ | 762 | 0.02 |
| /category | desktop | 85 | 98 | 96 | 75⚠ | 458 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 92 | 100 | 96 | 92 | 716 | 0.02 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 100 | 96 | 92 | 578 | 0.02 |
| /docs/civil-construction-1-primary-r07-a | desktop | 76 | 100 | 96 | 92 | 1179 | 0.183⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 76 | 100 | 96 | 92 | 654 | 0.026 |
| /docs/civil-construction-1-secondary-r07 | desktop | 75 | 96 | 96 | 92 | 743 | 0.02 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 92 | 802 | 0.02 |
| https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide | desktop | ERROR | | | | | |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 93 | 96 | 96 | 92 | 555 | 0.133⚠ |
| https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-index | desktop | 97 | 96 | 96 | 92 | 722 | 0.02 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 63⚠ | 96 | 96 | 92 | 595 | 0.148⚠ |
| /docs/pe-comprehensive-management-r07-primary | desktop | 67⚠ | 96 | 96 | 92 | 571 | 0.16⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 96 | 96 | 92 | 516 | 0.041 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 90 | 96 | 96 | 92 | 757 | 0.02 |
| /docs/pe-comprehensive-management-followership | desktop | 96 | 96 | 96 | 92 | 871 | 0.02 |
| /docs/pe-comprehensive-management-agile | desktop | 55⚠ | 96 | 96 | 92 | 2261 | 0.023 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 91 | 94 | 96 | 92 | 695 | 0.02 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 94 | 96 | 92 | 867 | 0.02 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 94 | 96 | 92 | 679 | 0.02 |
| / | mobile | 77 | 93 | 96 | 92 | 4940⚠ | 0.009 |
| /search | mobile | 91 | 92 | 96 | 83⚠ | 3394⚠ | 0.009 |
| /category | mobile | 80 | 98 | 96 | 75⚠ | 1605 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 60⚠ | 96 | 96 | 92 | 6462⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 70 | 96 | 96 | 92 | 6255⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 64⚠ | 96 | 96 | 92 | 6577⚠ | 0.01 |
| /docs/civil-construction-1-primary-h26-a | mobile | 78 | 96 | 96 | 92 | 2340 | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 70 | 93 | 96 | 92 | 6257⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 65⚠ | 93 | 96 | 92 | 5611⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 42⚠ | 93 | 96 | 92 | 6061⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 67⚠ | 93 | 96 | 92 | 6534⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 66⚠ | 92 | 96 | 92 | 6570⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 53⚠ | 93 | 96 | 92 | 6376⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 65⚠ | 93 | 96 | 92 | 5750⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 74 | 93 | 96 | 92 | 4627⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 67⚠ | 93 | 96 | 92 | 4703⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 66⚠ | 92 | 96 | 92 | 5388⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 66⚠ | 93 | 96 | 92 | 6001⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 66⚠ | 93 | 96 | 92 | 5666⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 69⚠ | 91 | 96 | 92 | 6276⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 71 | 91 | 96 | 92 | 6055⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 66⚠ | 91 | 96 | 92 | 5904⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **TBT** = 343ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.183 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 306ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **TBT** = 593ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 637ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **CLS** = 0.133 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **CLS** = 0.148 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **TBT** = 1144ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.16 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **TBT** = 652ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **FCP** = 1906ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **TBT** = 433ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 4940ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2541ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 3394ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **TBT** = 784ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6462ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3242ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6255ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2993ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6577ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3103ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 811ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6257ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2901ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5611ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **TBT** = 487ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 42 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6061ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3301ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 1301ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 6534ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3369ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 6570ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3390ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6376ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3039ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **TBT** = 561ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 5750ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2721ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 362ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4627ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 353ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4703ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **TBT** = 567ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 5388ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2733ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **TBT** = 367ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6001ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2717ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5666ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2727ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **TBT** = 316ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2691ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 6055ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2763ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 5904ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2715ms (閾値: ≤1800ms)