# PSI 計測レポート — 2026-06-12

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **54件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 96 | 96 | 100 | 651 | 0.011 |
| https://doboku-note.com/search | desktop | ERROR | | | | | |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 490 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 98 | 96 | 96 | 100 | 938 | 0.011 |
| /docs/civil-construction-1-guide-four-management | desktop | 95 | 96 | 96 | 100 | 1464 | 0.011 |
| /docs/civil-construction-1-primary-r07-a | desktop | 80 | 96 | 96 | 100 | 1142 | 0.176⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 98 | 96 | 96 | 100 | 1019 | 0.011 |
| /docs/civil-construction-1-secondary-r07 | desktop | 98 | 96 | 96 | 100 | 971 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 100 | 893 | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 98 | 96 | 96 | 100 | 1005 | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 96 | 96 | 96 | 100 | 1461 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 97 | 96 | 77⚠ | 100 | 1290 | 0.011 |
| /docs/pe-comprehensive-management-exam-index | desktop | 71 | 96 | 96 | 100 | 1174 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 96 | 96 | 100 | 756 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 92 | 96 | 96 | 100 | 1048 | 0.152⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 96 | 96 | 96 | 100 | 615 | 0.032 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 597 | 0.011 |
| /docs/pe-comprehensive-management-followership | desktop | 67⚠ | 96 | 96 | 100 | 1145 | 0.011 |
| /docs/pe-comprehensive-management-agile | desktop | 88 | 96 | 96 | 100 | 1727 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 94 | 96 | 100 | 889 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 98 | 94 | 96 | 100 | 966 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 94 | 96 | 100 | 803 | 0.011 |
| / | mobile | 96 | 92 | 96 | 100 | 2708⚠ | 0.009 |
| /search | mobile | 90 | 91 | 96 | 92 | 3470⚠ | 0.009 |
| /category | mobile | 90 | 98 | 96 | 83⚠ | 1524 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 65⚠ | 93 | 96 | 100 | 5954⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 63⚠ | 93 | 96 | 100 | 7276⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 67⚠ | 93 | 96 | 100 | 7359⚠ | 0.04 |
| /docs/civil-construction-1-primary-h26-a | mobile | 66⚠ | 92 | 96 | 100 | 7201⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 63⚠ | 93 | 96 | 100 | 6338⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 68⚠ | 93 | 96 | 100 | 7457⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 56⚠ | 93 | 96 | 100 | 5126⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 64⚠ | 93 | 96 | 100 | 6976⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 71 | 92 | 96 | 100 | 6473⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 70 | 93 | 96 | 100 | 6042⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 94 | 93 | 96 | 100 | 2926⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 65⚠ | 93 | 96 | 100 | 7126⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 70 | 93 | 96 | 100 | 6201⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 95 | 92 | 96 | 100 | 2860⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 72 | 93 | 96 | 100 | 6029⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 99 | 93 | 96 | 100 | 1673 | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 65⚠ | 91 | 96 | 100 | 6912⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 69⚠ | 91 | 96 | 100 | 5754⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 100 | 91 | 96 | 100 | 1668 | 0.009 |

## しきい値違反

- ❌ `https://doboku-note.com/search` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.176 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (desktop): **Best Practices** = 77 (閾値: ≥85)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **TBT** = 569ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **TBT** = 1157ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 2708ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 3470ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 5954ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2551ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 7276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3018ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7359ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3200ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2899ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6338ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2864ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7457ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3141ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 5126ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 1100ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 6976ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3070ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 6473ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2809ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6042ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2526ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 7126ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3141ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6201ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2681ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 2860ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6029ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2651ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6912ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2840ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 5754ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2759ms (閾値: ≤1800ms)