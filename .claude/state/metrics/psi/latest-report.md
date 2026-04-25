# PSI 計測レポート — 2026-04-25

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **92件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 71 | 100 | 100 | 92 | 1574 | 0.055 |
| /search | desktop | 86 | 94 | 100 | 83⚠ | 1443 | 0.049 |
| /category | desktop | 99 | 98 | 96 | 75⚠ | 776 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 81 | 100 | 100 | 92 | 2201 | 0.024 |
| /docs/civil-construction-1-guide-four-management | desktop | 83 | 100 | 100 | 92 | 2101 | 0.024 |
| /docs/civil-construction-1-primary-r07-a | desktop | 71 | 100 | 100 | 92 | 2645⚠ | 0.149⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 79 | 100 | 100 | 92 | 2262 | 0.036 |
| /docs/civil-construction-1-secondary-r07 | desktop | 87 | 100 | 100 | 92 | 1881 | 0.024 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 76 | 100 | 100 | 92 | 2512⚠ | 0.065 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 56⚠ | 100 | 100 | 92 | 2581⚠ | 0.024 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 70 | 100 | 100 | 92 | 2327 | 0.189⚠ |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 81 | 100 | 100 | 92 | 2192 | 0.059 |
| /docs/pe-comprehensive-management-exam-index | desktop | 84 | 96 | 100 | 92 | 2061 | 0.026 |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-primary | desktop | 83 | 100 | 100 | 92 | 1934 | 0.107⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 80 | 100 | 100 | 92 | 2261 | 0.037 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 83 | 100 | 100 | 92 | 2102 | 0.027 |
| /docs/pe-comprehensive-management-followership | desktop | 77 | 92 | 100 | 92 | 1844 | 0.157⚠ |
| /docs/pe-comprehensive-management-agile | desktop | 88 | 93 | 100 | 92 | 1868 | 0.048 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 81 | 91 | 100 | 92 | 1923 | 0.048 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 86 | 91 | 100 | 92 | 1879 | 0.025 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 86 | 91 | 100 | 92 | 1943 | 0.034 |
| / | mobile | 47⚠ | 96 | 100 | 92 | 11845⚠ | 0 |
| /search | mobile | 53⚠ | 92 | 100 | 83⚠ | 7496⚠ | 0 |
| /category | mobile | 56⚠ | 98 | 96 | 75⚠ | 6928⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 53⚠ | 96 | 100 | 92 | 15677⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 49⚠ | 96 | 100 | 92 | 15076⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 42⚠ | 96 | 100 | 92 | 17027⚠ | 0.092 |
| /docs/civil-construction-1-primary-h26-a | mobile | 55⚠ | 96 | 100 | 92 | 15976⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 39⚠ | 96 | 100 | 92 | 13128⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 56⚠ | 96 | 100 | 92 | 15601⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 55⚠ | 96 | 100 | 92 | 15526⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 55⚠ | 96 | 100 | 92 | 13550⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 56⚠ | 96 | 100 | 92 | 15391⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 49⚠ | 93 | 100 | 92 | 14477⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 56⚠ | 91 | 100 | 92 | 12827⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 56⚠ | 96 | 100 | 92 | 10951⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 51⚠ | 96 | 100 | 92 | 15301⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 56⚠ | 96 | 100 | 92 | 14176⚠ | 0.012 |
| /docs/pe-comprehensive-management-followership | mobile | 58⚠ | 93 | 100 | 92 | 10726⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 40⚠ | 93 | 100 | 92 | 12976⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 56⚠ | 91 | 100 | 92 | 14177⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 48⚠ | 91 | 100 | 92 | 12722⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 55⚠ | 91 | 100 | 92 | 14027⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **TBT** = 463ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **LCP** = 2645ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.149 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **FCP** = 1802ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **LCP** = 2512ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **FCP** = 1921ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **LCP** = 2581ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **FCP** = 1841ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **TBT** = 412ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **CLS** = 0.189 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **FCP** = 1813ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.107 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **CLS** = 0.157 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 47 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 11845ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 8610ms (閾値: ≤1800ms)
- `https://doboku-note.com/` (mobile): **TBT** = 393ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 7496ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 5130ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **TBT** = 418ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 6928ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 5776ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 15677ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 11639ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 49 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 15076ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 11189ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 317ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 42 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 17027ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 13014ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 467ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 15976ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 13201ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 39 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 13128ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 9602ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **TBT** = 676ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 15601ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 11101ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 15526ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 11701ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 13550ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 10725ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 15391ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 10117ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 49 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 14477ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 11066ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 12827ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 9001ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 10951ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 7651ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 51 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 15301ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 12097ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 14176ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 10436ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 10726ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 7201ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 40 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 12976ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 9601ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **TBT** = 637ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 14177ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 9235ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 48 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 12722ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 9409ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **TBT** = 341ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 14027ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 9701ms (閾値: ≤1800ms)