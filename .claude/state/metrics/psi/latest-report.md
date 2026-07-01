# PSI 計測レポート — 2026-07-01

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **43件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 100 | 479 | 0.013 |
| /search | desktop | 72 | 100 | 96 | 92 | 494 | 0.766⚠ |
| /category | desktop | 73 | 98 | 96 | 83⚠ | 490 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 98 | 96 | 96 | 92 | 571 | 0.013 |
| /docs/civil-construction-1-guide-four-management | desktop | 82 | 96 | 96 | 100 | 2562⚠ | 0.013 |
| /docs/civil-construction-1-primary-r07-a | desktop | 84 | 96 | 92 | 100 | 1039 | 0.228⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 99 | 96 | 96 | 100 | 801 | 0.013 |
| /docs/civil-construction-1-secondary-r07 | desktop | 95 | 96 | 96 | 100 | 1314 | 0.013 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 100 | 859 | 0.013 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 43⚠ | 96 | 96 | 100 | 2986⚠ | 0.027 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 98 | 96 | 96 | 100 | 1003 | 0.013 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 94 | 96 | 96 | 100 | 496 | 0.013 |
| /docs/pe-comprehensive-management-exam-index | desktop | 98 | 96 | 96 | 100 | 974 | 0.013 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 96 | 96 | 100 | 642 | 0.013 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 83 | 96 | 96 | 100 | 2027 | 0.158⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 91 | 96 | 96 | 100 | 454 | 0.033 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 457 | 0.013 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 100 | 841 | 0.013 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 96 | 96 | 100 | 1017 | 0.028 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 94 | 94 | 96 | 100 | 979 | 0.013 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 94 | 96 | 100 | 1034 | 0.013 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 93 | 94 | 96 | 100 | 898 | 0.013 |
| / | mobile | 75 | 96 | 96 | 100 | 4499⚠ | 0.009 |
| /search | mobile | 60⚠ | 96 | 96 | 92 | 3965⚠ | 0.61⚠ |
| /category | mobile | 95 | 96 | 96 | 83⚠ | 2293 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 75 | 93 | 96 | 100 | 4969⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 94 | 93 | 96 | 100 | 3001⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 71 | 93 | 96 | 100 | 6228⚠ | 0.029 |
| /docs/civil-construction-1-primary-h26-a | mobile | 98 | 92 | 96 | 100 | 2026 | 0.009 |
| https://doboku-note.com/docs/civil-construction-1-secondary-r07 | mobile | ERROR | | | | | |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 65⚠ | 93 | 96 | 100 | 7801⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 75 | 93 | 96 | 100 | 5062⚠ | 0.009 |
| https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview | mobile | ERROR | | | | | |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 90 | 92 | 96 | 100 | 1501 | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 78 | 93 | 96 | 100 | 4664⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 94 | 93 | 96 | 100 | 3076⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 77 | 93 | 96 | 100 | 4715⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 77 | 93 | 96 | 100 | 4733⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 98 | 92 | 96 | 100 | 2145 | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 76 | 93 | 96 | 100 | 4728⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 96 | 93 | 96 | 100 | 2401 | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 77 | 91 | 96 | 100 | 4760⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 70 | 91 | 96 | 100 | 4917⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 98 | 91 | 96 | 100 | 2259 | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **TBT** = 773ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **LCP** = 2562ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.228 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **Performance** = 43 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **LCP** = 2986ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **TBT** = 3078ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 4499ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2553ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **LCP** = 3965ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **FCP** = 2514ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **FCP** = 2293ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 4969ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2817ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 3001ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6228ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 2924ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7801ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3086ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 5062ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2808ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): PSI API 400: {
  "error": {
    "code": 400,
    "message": "Lighthouse returned error: NO_FCP. The page did not paint any content. Please ensure you keep the browser window in the foreground during t
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **TBT** = 310ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4664ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2477ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 3076ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4715ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2632ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4733ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2647ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4728ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2713ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4760ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2677ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4917ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2746ms (閾値: ≤1800ms)