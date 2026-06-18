# PSI 計測レポート — 2026-06-18

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **63件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 83 | 96 | 96 | 100 | 502 | 0.011 |
| /search | desktop | 73 | 94 | 96 | 92 | 1072 | 0.011 |
| /category | desktop | 99 | 98 | 96 | 83⚠ | 422 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 82 | 96 | 96 | 100 | 2383 | 0.011 |
| /docs/civil-construction-1-guide-four-management | desktop | 94 | 96 | 96 | 100 | 1611 | 0.011 |
| /docs/civil-construction-1-primary-r07-a | desktop | 96 | 96 | 96 | 100 | 1323 | 0.011 |
| /docs/civil-construction-1-primary-h26-a | desktop | 97 | 96 | 96 | 100 | 987 | 0.011 |
| /docs/civil-construction-1-secondary-r07 | desktop | 81 | 96 | 96 | 100 | 1084 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 98 | 96 | 96 | 100 | 614 | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 95 | 96 | 96 | 100 | 1508 | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 97 | 96 | 96 | 100 | 1250 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 98 | 96 | 96 | 100 | 1103 | 0.011 |
| /docs/pe-comprehensive-management-exam-index | desktop | 98 | 96 | 96 | 100 | 1038 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 96 | 96 | 100 | 976 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 92 | 96 | 96 | 100 | 908 | 0.152⚠ |
| https://doboku-note.com/docs/pe-comprehensive-management-r05-primary | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 729 | 0.011 |
| /docs/pe-comprehensive-management-followership | desktop | 100 | 96 | 96 | 100 | 768 | 0.011 |
| /docs/pe-comprehensive-management-agile | desktop | 99 | 96 | 96 | 100 | 848 | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 94 | 96 | 100 | 923 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 98 | 94 | 96 | 100 | 911 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 94 | 96 | 100 | 886 | 0.011 |
| / | mobile | 77 | 92 | 96 | 100 | 4667⚠ | 0.009 |
| /search | mobile | 80 | 91 | 96 | 92 | 4147⚠ | 0 |
| /category | mobile | 99 | 98 | 96 | 83⚠ | 1357 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 67⚠ | 93 | 96 | 100 | 2279 | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 66⚠ | 93 | 96 | 100 | 6651⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 60⚠ | 93 | 96 | 100 | 8027⚠ | 0.009 |
| /docs/civil-construction-1-primary-h26-a | mobile | 69⚠ | 92 | 96 | 100 | 6340⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 62⚠ | 93 | 96 | 100 | 6826⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 68⚠ | 93 | 96 | 100 | 7535⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 70 | 93 | 96 | 100 | 6636⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 93 | 93 | 96 | 100 | 3226⚠ | 0.01 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 67⚠ | 92 | 96 | 100 | 7426⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 67⚠ | 93 | 96 | 100 | 6751⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 68⚠ | 93 | 96 | 100 | 6494⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 56⚠ | 93 | 96 | 100 | 7051⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 61⚠ | 93 | 96 | 100 | 6751⚠ | 0 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 62⚠ | 92 | 96 | 100 | 6193⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 71 | 93 | 96 | 100 | 5758⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 72 | 93 | 96 | 100 | 6252⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 61⚠ | 91 | 96 | 100 | 9900⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 72 | 91 | 96 | 100 | 5962⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 59⚠ | 91 | 96 | 100 | 3987⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **TBT** = 376ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (desktop): **TBT** = 588ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 377ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/` (mobile): **LCP** = 4667ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2657ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 4147ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2992ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **TBT** = 2645ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6651ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3039ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 8027ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3190ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6340ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2834ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6826ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 3073ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7535ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3119ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6636ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2728ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 7426ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2820ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6751ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2658ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6494ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2708ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 7051ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3049ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 383ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6751ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2923ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 6193ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2732ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **TBT** = 372ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 5758ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2680ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6252ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2688ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 9900ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 4545ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 5962ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2662ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 3987ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 1759ms (閾値: ≤300ms)