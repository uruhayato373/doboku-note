# PSI 計測レポート — 2026-06-10

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **51件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 96 | 100 | 592 | 0.011 |
| /search | desktop | 100 | 94 | 96 | 92 | 726 | 0.011 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 490 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 97 | 96 | 96 | 100 | 1147 | 0.011 |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 96 | 96 | 100 | 1051 | 0.011 |
| /docs/civil-construction-1-primary-r07-a | desktop | 80 | 96 | 96 | 100 | 1374 | 0.011 |
| /docs/civil-construction-1-primary-h26-a | desktop | 98 | 96 | 96 | 100 | 1138 | 0.018 |
| /docs/civil-construction-1-secondary-r07 | desktop | 97 | 96 | 96 | 100 | 1049 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 95 | 96 | 96 | 100 | 862 | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 96 | 96 | 96 | 100 | 1396 | 0 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 98 | 96 | 96 | 100 | 1086 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 97 | 96 | 96 | 100 | 1136 | 0.011 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 96 | 96 | 100 | 855 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 98 | 96 | 96 | 100 | 1161 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 66⚠ | 69⚠ | 96 | 82⚠ | 1123 | 0.14⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 99 | 96 | 96 | 100 | 648 | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 93 | 96 | 96 | 100 | 788 | 0.011 |
| /docs/pe-comprehensive-management-followership | desktop | 91 | 96 | 96 | 100 | 841 | 0.011 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 96 | 96 | 100 | 1194 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 94 | 96 | 100 | 761 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 94 | 96 | 100 | 854 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 98 | 94 | 96 | 100 | 1079 | 0.011 |
| / | mobile | 75 | 92 | 96 | 100 | 4960⚠ | 0.009 |
| /search | mobile | 77 | 91 | 96 | 92 | 4146⚠ | 0 |
| https://doboku-note.com/category | mobile | ERROR | | | | | |
| /docs/civil-construction-1-guide-strategy | mobile | 68⚠ | 93 | 96 | 100 | 6826⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 66⚠ | 93 | 96 | 100 | 5901⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 61⚠ | 93 | 96 | 100 | 8701⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 72 | 92 | 96 | 100 | 5878⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 72 | 93 | 96 | 100 | 5943⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 57⚠ | 93 | 96 | 100 | 3302⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 64⚠ | 93 | 96 | 100 | 6133⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 70 | 93 | 96 | 100 | 6243⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 71 | 92 | 96 | 100 | 6475⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 73 | 93 | 96 | 100 | 5953⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 94 | 93 | 96 | 100 | 3153⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 63⚠ | 93 | 96 | 100 | 7276⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 64⚠ | 93 | 96 | 100 | 7276⚠ | 0 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 95 | 92 | 96 | 100 | 2561⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 71 | 93 | 96 | 100 | 5809⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 70 | 93 | 96 | 100 | 6335⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 98 | 91 | 96 | 100 | 1675 | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 88 | 91 | 96 | 100 | 3626⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 95 | 91 | 96 | 100 | 2858⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **Accessibility** = 69 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **SEO** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.14 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **TBT** = 757ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 4960ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2711ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 4146ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2991ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/category` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6826ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2533ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5901ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3044ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 8701ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3276ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5878ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2802ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 5943ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2776ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 3302ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **TBT** = 4395ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6133ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2736ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 337ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 6243ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 2957ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 6475ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2849ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5953ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2534ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 3153ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 7276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3158ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 7276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2854ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 2561ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 5809ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2683ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6335ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2813ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 3626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 2858ms (閾値: ≤2500ms)