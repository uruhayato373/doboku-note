# PSI 計測レポート — 2026-07-13

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **45件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 719 | 0.013 |
| /search | desktop | 76 | 100 | 96 | 92 | 490 | 0.766⚠ |
| /category | desktop | 93 | 98 | 96 | 83⚠ | 458 | 0 |
| https://doboku-note.com/docs/civil-construction-1-guide-strategy | desktop | ERROR | | | | | |
| /docs/civil-construction-1-guide-four-management | desktop | 87 | 100 | 96 | 100 | 800 | 0.02 |
| /docs/civil-construction-1-primary-r07-a | desktop | 86 | 100 | 96 | 100 | 1128 | 0.221⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 98 | 98 | 96 | 100 | 1057 | 0.013 |
| /docs/civil-construction-1-secondary-r07 | desktop | 87 | 100 | 96 | 100 | 656 | 0.013 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 100 | 100 | 96 | 100 | 657 | 0.013 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 99 | 100 | 96 | 100 | 850 | 0.013 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 99 | 100 | 96 | 100 | 877 | 0.013 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 92 | 100 | 96 | 100 | 613 | 0.013 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 100 | 96 | 100 | 909 | 0.013 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 96 | 100 | 663 | 0.013 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 94 | 100 | 96 | 100 | 631 | 0.152⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 90 | 100 | 96 | 100 | 442 | 0.032 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 100 | 96 | 100 | 704 | 0.013 |
| /docs/pe-comprehensive-management-followership | desktop | 95 | 100 | 96 | 100 | 712 | 0.013 |
| /docs/pe-comprehensive-management-agile | desktop | 99 | 100 | 96 | 100 | 1030 | 0.027 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 70 | 98 | 96 | 100 | 904 | 0.013 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 100 | 98 | 96 | 100 | 688 | 0.013 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 98 | 96 | 100 | 681 | 0.013 |
| / | mobile | 64⚠ | 96 | 96 | 100 | 7846⚠ | 0 |
| /search | mobile | 70 | 96 | 96 | 92 | 2263 | 0.606⚠ |
| /category | mobile | 97 | 98 | 96 | 83⚠ | 1542 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 65⚠ | 96 | 96 | 100 | 6526⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 73 | 96 | 96 | 100 | 5198⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 70 | 96 | 96 | 100 | 6233⚠ | 0.03 |
| /docs/civil-construction-1-primary-h26-a | mobile | 72 | 95 | 96 | 100 | 5946⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 75 | 96 | 96 | 100 | 4889⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 73 | 96 | 96 | 100 | 5344⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 77 | 96 | 96 | 100 | 4821⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 74 | 96 | 96 | 100 | 5189⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 72 | 96 | 96 | 100 | 5719⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 75 | 96 | 96 | 100 | 5047⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 70 | 96 | 96 | 100 | 5425⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 72 | 96 | 96 | 100 | 5122⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 96 | 96 | 96 | 100 | 2626⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 99 | 96 | 96 | 100 | 2184 | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 65⚠ | 96 | 96 | 100 | 6226⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 77 | 96 | 96 | 100 | 5116⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 77 | 95 | 96 | 100 | 4893⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 98 | 95 | 96 | 100 | 1651 | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 99 | 95 | 96 | 100 | 2037 | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- ❌ `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.221 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 308ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **TBT** = 936ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7846ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2962ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.606 (閾値: ≤0.1)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6526ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3016ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5198ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2982ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6233ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3092ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5946ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2652ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4889ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2745ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5344ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4821ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2661ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5189ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 2937ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5719ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2953ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5047ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2822ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 5425ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2860ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 5122ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2985ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2677ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5116ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2502ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4893ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2645ms (閾値: ≤1800ms)