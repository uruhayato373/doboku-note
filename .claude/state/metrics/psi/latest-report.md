# PSI 計測レポート — 2026-05-24

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **67件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 96 | 92 | 551 | 0.02 |
| /search | desktop | 100 | 94 | 96 | 83⚠ | 700 | 0.02 |
| /category | desktop | 99 | 98 | 96 | 75⚠ | 394 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 99 | 100 | 96 | 92 | 652 | 0.02 |
| /docs/civil-construction-1-guide-four-management | desktop | 95 | 100 | 96 | 92 | 581 | 0.02 |
| /docs/civil-construction-1-primary-r07-a | desktop | 86 | 96 | 96 | 92 | 1429 | 0.183⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 97 | 96 | 96 | 92 | 548 | 0.02 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 96 | 96 | 92 | 521 | 0.02 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 89 | 96 | 96 | 92 | 760 | 0.069 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 98 | 96 | 96 | 92 | 702 | 0.02 |
| https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text | desktop | ERROR | | | | | |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 64⚠ | 96 | 96 | 92 | 695 | 0.169⚠ |
| /docs/pe-comprehensive-management-exam-index | desktop | 97 | 96 | 96 | 92 | 681 | 0.02 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 97 | 96 | 96 | 92 | 695 | 0.02 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 63⚠ | 96 | 96 | 92 | 912 | 0.16⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 98 | 96 | 96 | 92 | 533 | 0.041 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 80 | 96 | 96 | 92 | 654 | 0.02 |
| /docs/pe-comprehensive-management-followership | desktop | 97 | 96 | 96 | 92 | 742 | 0.02 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 96 | 96 | 92 | 744 | 0.023 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 96 | 94 | 96 | 92 | 758 | 0.02 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 94 | 96 | 92 | 867 | 0.02 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 94 | 96 | 92 | 877 | 0.02 |
| / | mobile | 68⚠ | 93 | 96 | 92 | 4113⚠ | 0 |
| /search | mobile | 92 | 92 | 96 | 83⚠ | 3150⚠ | 0.009 |
| /category | mobile | 73 | 98 | 96 | 75⚠ | 1580 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 65⚠ | 96 | 96 | 92 | 5771⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 68⚠ | 96 | 96 | 92 | 6044⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 66⚠ | 96 | 96 | 92 | 7128⚠ | 0.052 |
| /docs/civil-construction-1-primary-h26-a | mobile | 68⚠ | 96 | 96 | 92 | 6202⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 70 | 93 | 96 | 92 | 5956⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 67⚠ | 93 | 96 | 92 | 7835⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 91 | 93 | 96 | 92 | 3303⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 67⚠ | 93 | 96 | 92 | 6353⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 69⚠ | 92 | 96 | 92 | 6520⚠ | 0.009 |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-index | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 71 | 93 | 96 | 92 | 6111⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 70 | 93 | 96 | 92 | 5366⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 70 | 93 | 96 | 92 | 6265⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 70 | 92 | 96 | 92 | 5978⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 66⚠ | 93 | 96 | 92 | 5685⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 70 | 93 | 96 | 92 | 6035⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 66⚠ | 91 | 96 | 92 | 5532⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 71 | 91 | 96 | 92 | 5972⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 57⚠ | 91 | 96 | 92 | 9581⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.183 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **CLS** = 0.169 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **TBT** = 818ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.16 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **TBT** = 754ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (desktop): **TBT** = 457ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 4113ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2631ms (閾値: ≤1800ms)
- `https://doboku-note.com/` (mobile): **TBT** = 532ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 3150ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **TBT** = 1450ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 5771ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2728ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **TBT** = 339ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6044ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2997ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7128ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3071ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6202ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2921ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 5956ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2849ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7835ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3197ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 3303ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 6353ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3450ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 6520ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3304ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6111ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2687ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 5366ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2856ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6265ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2869ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 5978ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2694ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 5685ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2714ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6035ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2681ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 5532ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2759ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **TBT** = 358ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 5972ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2684ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 9581ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 4776ms (閾値: ≤1800ms)