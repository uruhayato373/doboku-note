# PSI 計測レポート — 2026-08-09

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **46件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 96 | 96 | 100 | 765 | 0.015 |
| /search | desktop | 76 | 100 | 96 | 66⚠ | 424 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 409 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 98 | 100 | 96 | 100 | 609 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 100 | 96 | 96 | 100 | 771 | 0.015 |
| /docs/civil-construction-1-primary-r07-a | desktop | 87 | 96 | 96 | 100 | 761 | 0.231⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 89 | 98 | 96 | 100 | 782 | 0.021 |
| /docs/civil-construction-1-secondary-r07 | desktop | 96 | 96 | 96 | 100 | 724 | 0.015 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 91 | 96 | 96 | 100 | 577 | 0.121⚠ |
| https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide | desktop | ERROR | | | | | |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 100 | 100 | 96 | 100 | 821 | 0.015 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 100 | 96 | 100 | 661 | 0.015 |
| /docs/pe-comprehensive-management-exam-index | desktop | 92 | 100 | 96 | 100 | 780 | 0.015 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 100 | 96 | 100 | 685 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 92 | 100 | 96 | 100 | 654 | 0.157⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 100 | 96 | 100 | 549 | 0.015 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 601 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 96 | 100 | 96 | 100 | 726 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 100 | 100 | 96 | 100 | 813 | 0.029 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 98 | 92 | 100 | 601 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 92 | 98 | 96 | 100 | 621 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 98 | 96 | 100 | 778 | 0.04 |
| / | mobile | 90 | 92 | 96 | 100 | 3470⚠ | 0.011 |
| /search | mobile | 57⚠ | 96 | 96 | 66⚠ | 4235⚠ | 0.61⚠ |
| /category | mobile | 98 | 98 | 96 | 91 | 1525 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 98 | 93 | 96 | 100 | 1951 | 0.011 |
| /docs/civil-construction-1-guide-four-management | mobile | 72 | 93 | 96 | 100 | 5348⚠ | 0.011 |
| /docs/civil-construction-1-primary-r07-a | mobile | 86 | 93 | 96 | 100 | 3826⚠ | 0.001 |
| /docs/civil-construction-1-primary-h26-a | mobile | 95 | 95 | 100 | 100 | 2701⚠ | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 98 | 93 | 96 | 100 | 2251 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 73 | 93 | 96 | 100 | 5045⚠ | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 65⚠ | 93 | 96 | 100 | 6539⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 96 | 93 | 96 | 100 | 2326 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 72 | 92 | 96 | 100 | 5393⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-index | mobile | 75 | 93 | 96 | 100 | 4749⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 59⚠ | 93 | 96 | 100 | 6601⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 68⚠ | 96 | 96 | 100 | 4256⚠ | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 75 | 96 | 96 | 100 | 4839⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 98 | 92 | 96 | 100 | 1975 | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 98 | 96 | 96 | 100 | 2036 | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 96 | 96 | 96 | 100 | 2626⚠ | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 61⚠ | 95 | 96 | 100 | 6601⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 65⚠ | 95 | 96 | 100 | 4772⚠ | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 97 | 95 | 96 | 100 | 2333 | 0.011 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.231 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **CLS** = 0.121 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.157 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 3470ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4235ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **FCP** = 2815ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5348ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3124ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 3826ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 1951ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 2701ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 1837ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5045ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3271ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6539ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3166ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5393ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3264ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4749ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3010ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6601ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 3161ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 370ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4256ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3205ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 420ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4839ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3223ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6601ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 3020ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **TBT** = 309ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4772ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 3048ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **TBT** = 426ms (閾値: ≤300ms)