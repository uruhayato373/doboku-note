# PSI 計測レポート — 2026-05-18

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **73件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| https://doboku-note.com/ | desktop | ERROR | | | | | |
| /search | desktop | 94 | 94 | 96 | 83⚠ | 816 | 0.02 |
| /category | desktop | 100 | 98 | 96 | 75⚠ | 449 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 98 | 100 | 96 | 92 | 610 | 0.02 |
| /docs/civil-construction-1-guide-four-management | desktop | 87 | 100 | 96 | 92 | 541 | 0.034 |
| /docs/civil-construction-1-primary-r07-a | desktop | 98 | 100 | 96 | 92 | 989 | 0.02 |
| /docs/civil-construction-1-primary-h26-a | desktop | 97 | 100 | 96 | 92 | 601 | 0.02 |
| /docs/civil-construction-1-secondary-r07 | desktop | 100 | 100 | 96 | 92 | 727 | 0.02 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 89 | 100 | 96 | 92 | 774 | 0.069 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 98 | 100 | 96 | 92 | 846 | 0.02 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 91 | 100 | 96 | 92 | 693 | 0.02 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 99 | 100 | 96 | 92 | 679 | 0.02 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 96 | 96 | 92 | 719 | 0.02 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 100 | 96 | 92 | 709 | 0.02 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 75 | 100 | 96 | 92 | 574 | 0.16⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 82 | 100 | 96 | 92 | 555 | 0.041 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 100 | 96 | 92 | 847 | 0.02 |
| /docs/pe-comprehensive-management-followership | desktop | 88 | 100 | 96 | 92 | 863 | 0.02 |
| /docs/pe-comprehensive-management-agile | desktop | 97 | 100 | 96 | 92 | 895 | 0.02 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 97 | 98 | 96 | 92 | 867 | 0.02 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 98 | 98 | 96 | 92 | 806 | 0.02 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 95 | 98 | 96 | 92 | 917 | 0.02 |
| / | mobile | 60⚠ | 96 | 96 | 92 | 5159⚠ | 0 |
| /search | mobile | 78 | 92 | 96 | 83⚠ | 4152⚠ | 0 |
| /category | mobile | 79 | 98 | 96 | 75⚠ | 4149⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 71 | 96 | 96 | 92 | 6048⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 63⚠ | 96 | 96 | 92 | 6751⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 56⚠ | 96 | 96 | 92 | 7171⚠ | 0.009 |
| /docs/civil-construction-1-primary-h26-a | mobile | 62⚠ | 96 | 96 | 92 | 5644⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 56⚠ | 96 | 96 | 92 | 6526⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 64⚠ | 96 | 96 | 92 | 5386⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 70 | 96 | 96 | 92 | 6634⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 67⚠ | 96 | 96 | 92 | 6680⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 69⚠ | 96 | 96 | 92 | 6406⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 61⚠ | 93 | 96 | 92 | 6301⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 72 | 96 | 96 | 92 | 6334⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 67⚠ | 96 | 96 | 92 | 5747⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 63⚠ | 96 | 96 | 92 | 4702⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 71 | 96 | 96 | 92 | 5974⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 70 | 96 | 96 | 92 | 5967⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 69⚠ | 96 | 96 | 92 | 5906⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 69⚠ | 95 | 96 | 92 | 6357⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 68⚠ | 95 | 96 | 92 | 5999⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 68⚠ | 95 | 96 | 92 | 5976⚠ | 0.009 |

## しきい値違反

- ❌ `https://doboku-note.com/` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **TBT** = 315ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.16 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **TBT** = 413ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **TBT** = 394ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 5159ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3111ms (閾値: ≤1800ms)
- `https://doboku-note.com/` (mobile): **TBT** = 442ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4152ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2988ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 4149ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2570ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6048ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2726ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6751ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3057ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7171ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3485ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 383ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5644ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2985ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 429ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6526ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 3349ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **TBT** = 437ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5386ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **TBT** = 564ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6634ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2734ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 6680ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3443ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 6406ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3337ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6301ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3004ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **TBT** = 303ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 6334ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2677ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 5747ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2993ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4702ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **TBT** = 738ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 5974ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2714ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 5967ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2724ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5906ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2706ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6357ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2690ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 5999ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2693ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 5976ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2709ms (閾値: ≤1800ms)