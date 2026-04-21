# PSI 計測レポート — 2026-04-21

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **85件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 71 | 96 | 100 | 100 | 1071 | 0.028 |
| /search | desktop | 97 | 93 | 100 | 92 | 1224 | 0.026 |
| /category | desktop | 100 | 92 | 96 | 83⚠ | 436 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 78 | 96 | 100 | 100 | 1551 | 0.026 |
| /docs/civil-construction-1-guide-four-management | desktop | 90 | 96 | 100 | 100 | 1571 | 0.027 |
| /docs/civil-construction-1-primary-r07-a | desktop | 71 | 96 | 100 | 100 | 2446 | 0.25⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 50⚠ | 96 | 100 | 100 | 2101 | 0.026 |
| /docs/civil-construction-1-secondary-r07 | desktop | 69⚠ | 96 | 100 | 100 | 1555 | 0.026 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 82 | 96 | 100 | 100 | 2118 | 0.095 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 83 | 96 | 100 | 100 | 2162 | 0.032 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 57⚠ | 96 | 96 | 100 | 1952 | 0.061 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 59⚠ | 96 | 100 | 100 | 1694 | 0.026 |
| /docs/pe-comprehensive-management-exam-index | desktop | 92 | 96 | 100 | 100 | 1542 | 0.071 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 59⚠ | 96 | 100 | 100 | 1640 | 0.036 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 93 | 96 | 100 | 100 | 1509 | 0.06 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 87 | 96 | 100 | 100 | 1821 | 0.053 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 93 | 96 | 100 | 100 | 1496 | 0.035 |
| /docs/pe-comprehensive-management-followership | desktop | 59⚠ | 92 | 100 | 100 | 1381 | 0.155⚠ |
| /docs/pe-comprehensive-management-agile | desktop | 93 | 93 | 100 | 100 | 1526 | 0.026 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 91 | 92 | 100 | 100 | 1404 | 0.029 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 96 | 92 | 100 | 100 | 1261 | 0.027 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 95 | 92 | 100 | 100 | 1382 | 0.032 |
| / | mobile | 62⚠ | 92 | 100 | 100 | 7695⚠ | 0 |
| https://doboku-note.com/search | mobile | ERROR | | | | | |
| /category | mobile | 66⚠ | 92 | 96 | 83⚠ | 5641⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 55⚠ | 93 | 100 | 100 | 12302⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 59⚠ | 93 | 100 | 100 | 8026⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 47⚠ | 93 | 100 | 100 | 15528⚠ | 0.086 |
| /docs/civil-construction-1-primary-h26-a | mobile | 51⚠ | 92 | 100 | 100 | 15376⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 55⚠ | 93 | 100 | 100 | 11927⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 56⚠ | 93 | 100 | 100 | 15902⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 53⚠ | 93 | 100 | 100 | 10878⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 56⚠ | 93 | 100 | 100 | 11045⚠ | 0.062 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 57⚠ | 93 | 100 | 100 | 10994⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 56⚠ | 93 | 100 | 100 | 11476⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 56⚠ | 93 | 100 | 100 | 12227⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 49⚠ | 93 | 100 | 100 | 13876⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 60⚠ | 93 | 100 | 100 | 8747⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 57⚠ | 92 | 100 | 100 | 11027⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 48⚠ | 93 | 100 | 100 | 9827⚠ | 0.217⚠ |
| /docs/pe-comprehensive-management-agile | mobile | 62⚠ | 93 | 100 | 100 | 7576⚠ | 0.012 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 61⚠ | 93 | 100 | 100 | 8180⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 53⚠ | 93 | 100 | 100 | 10277⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 55⚠ | 93 | 100 | 100 | 9172⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **TBT** = 790ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **TBT** = 318ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.25 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **TBT** = 1195ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 531ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **TBT** = 573ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **TBT** = 697ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **TBT** = 1369ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **CLS** = 0.155 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **TBT** = 930ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7695ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 5122ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/search` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/category` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 5641ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 4472ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 12302ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 8527ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 8026ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 6301ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 47 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 15528ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 12111ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 312ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 51 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 15376ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 12332ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 11927ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 8220ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 15902ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 10652ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 10878ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 8551ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 11045ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 8610ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 10994ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 7551ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 11476ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 8134ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 12227ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 7916ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 49 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 13876ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 10561ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 306ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 8747ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 6151ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 11027ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 7297ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 48 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 9827ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **CLS** = 0.217 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 6717ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 7576ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 5401ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 8180ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 5103ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 10277ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 7037ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 9172ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 6801ms (閾値: ≤1800ms)