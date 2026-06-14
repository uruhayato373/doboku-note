# PSI 計測レポート — 2026-06-13

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **56件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 96 | 100 | 456 | 0.011 |
| /search | desktop | 100 | 94 | 96 | 92 | 780 | 0.011 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 423 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 98 | 96 | 96 | 100 | 1010 | 0.011 |
| /docs/civil-construction-1-guide-four-management | desktop | 96 | 96 | 96 | 100 | 1357 | 0.011 |
| /docs/civil-construction-1-primary-r07-a | desktop | 85 | 96 | 96 | 100 | 1321 | 0.172⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 97 | 96 | 96 | 100 | 1180 | 0.011 |
| /docs/civil-construction-1-secondary-r07 | desktop | 97 | 96 | 96 | 100 | 1190 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 98 | 96 | 96 | 100 | 731 | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 95 | 96 | 96 | 100 | 1491 | 0 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 98 | 96 | 96 | 100 | 1069 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 97 | 96 | 96 | 100 | 1260 | 0.011 |
| /docs/pe-comprehensive-management-exam-index | desktop | 69⚠ | 96 | 96 | 100 | 1010 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 96 | 96 | 100 | 869 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 92 | 96 | 96 | 100 | 903 | 0.152⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 98 | 96 | 96 | 100 | 617 | 0.032 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 627 | 0.011 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 100 | 919 | 0.011 |
| /docs/pe-comprehensive-management-agile | desktop | 99 | 96 | 96 | 100 | 954 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 68⚠ | 94 | 96 | 100 | 1181 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 94 | 96 | 100 | 911 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 98 | 94 | 96 | 100 | 1031 | 0.011 |
| / | mobile | 69⚠ | 92 | 96 | 100 | 5269⚠ | 0.009 |
| /search | mobile | 92 | 91 | 96 | 92 | 3402⚠ | 0.009 |
| https://doboku-note.com/category | mobile | ERROR | | | | | |
| /docs/civil-construction-1-guide-strategy | mobile | 63⚠ | 93 | 96 | 100 | 6976⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 67⚠ | 93 | 96 | 100 | 6343⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 68⚠ | 93 | 96 | 100 | 7429⚠ | 0.04 |
| /docs/civil-construction-1-primary-h26-a | mobile | 70 | 92 | 96 | 100 | 6109⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 77 | 93 | 96 | 100 | 4610⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 68⚠ | 93 | 96 | 100 | 7360⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 70 | 93 | 96 | 100 | 6185⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 70 | 93 | 96 | 100 | 6257⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 66⚠ | 92 | 96 | 100 | 7501⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 98 | 93 | 96 | 100 | 1951 | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 65⚠ | 93 | 96 | 100 | 7201⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 88 | 93 | 96 | 100 | 2476 | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 66⚠ | 93 | 96 | 100 | 6346⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 61⚠ | 92 | 96 | 100 | 9606⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 72 | 93 | 96 | 100 | 6027⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 67⚠ | 93 | 96 | 100 | 6344⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 73 | 91 | 96 | 100 | 6044⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 72 | 91 | 96 | 100 | 6042⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 69⚠ | 91 | 96 | 100 | 5987⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.172 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **TBT** = 810ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **TBT** = 1039ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 5269ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2736ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 3402ms (閾値: ≤2500ms)
- ❌ `https://doboku-note.com/category` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6976ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2711ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6343ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3069ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7429ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3180ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6109ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2886ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4610ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7360ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6185ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2673ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 6257ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 2963ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 7501ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2843ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2694ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 381ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6346ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2862ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 9606ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 4617ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6027ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2652ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6344ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2747ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6044ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2629ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 6042ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2700ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 5987ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2708ms (閾値: ≤1800ms)