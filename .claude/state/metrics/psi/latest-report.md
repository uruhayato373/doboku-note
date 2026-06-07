# PSI 計測レポート — 2026-06-07

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **46件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| https://doboku-note.com/ | desktop | ERROR | | | | | |
| /search | desktop | 93 | 94 | 96 | 92 | 1131 | 0.035 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 409 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 98 | 96 | 96 | 100 | 1007 | 0.035 |
| /docs/civil-construction-1-guide-four-management | desktop | 97 | 96 | 96 | 100 | 1208 | 0.035 |
| /docs/civil-construction-1-primary-r07-a | desktop | 94 | 96 | 96 | 100 | 1581 | 0.035 |
| /docs/civil-construction-1-primary-h26-a | desktop | 87 | 96 | 96 | 100 | 961 | 0.042 |
| /docs/civil-construction-1-secondary-r07 | desktop | 96 | 96 | 96 | 100 | 1389 | 0.035 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 100 | 816 | 0.035 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 98 | 96 | 96 | 100 | 991 | 0.035 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 69⚠ | 96 | 96 | 100 | 1091 | 0.114⚠ |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 94 | 96 | 96 | 100 | 1043 | 0.035 |
| /docs/pe-comprehensive-management-exam-index | desktop | 98 | 96 | 96 | 100 | 785 | 0.035 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 97 | 96 | 96 | 100 | 1188 | 0.035 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 98 | 96 | 96 | 100 | 996 | 0.035 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 99 | 96 | 96 | 100 | 519 | 0.056 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 720 | 0.035 |
| /docs/pe-comprehensive-management-followership | desktop | 97 | 96 | 96 | 100 | 878 | 0.035 |
| /docs/pe-comprehensive-management-agile | desktop | 95 | 96 | 96 | 100 | 1307 | 0.052 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 94 | 96 | 100 | 950 | 0.035 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 100 | 94 | 96 | 100 | 677 | 0.035 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 97 | 94 | 96 | 100 | 1104 | 0.035 |
| / | mobile | 77 | 92 | 96 | 100 | 4817⚠ | 0.009 |
| /search | mobile | 93 | 91 | 96 | 92 | 3216⚠ | 0.009 |
| /category | mobile | 99 | 98 | 96 | 83⚠ | 1055 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 66⚠ | 93 | 96 | 100 | 6976⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 66⚠ | 93 | 96 | 100 | 6562⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 65⚠ | 93 | 96 | 100 | 7506⚠ | 0.04 |
| /docs/civil-construction-1-primary-h26-a | mobile | 60⚠ | 92 | 96 | 100 | 6328⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 94 | 93 | 96 | 100 | 3001⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 66⚠ | 93 | 96 | 100 | 7387⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 72 | 93 | 96 | 100 | 6399⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 67⚠ | 93 | 96 | 100 | 6796⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 68⚠ | 92 | 96 | 100 | 6590⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 95 | 93 | 96 | 100 | 2926⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 92 | 93 | 96 | 100 | 3301⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 98 | 93 | 96 | 100 | 2251 | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 71 | 93 | 96 | 100 | 6106⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 99 | 92 | 96 | 100 | 2101 | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 64⚠ | 93 | 96 | 100 | 6526⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 70 | 93 | 96 | 100 | 6342⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 97 | 91 | 96 | 100 | 2484 | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 65⚠ | 91 | 96 | 100 | 6837⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 95 | 91 | 96 | 100 | 2712⚠ | 0.009 |

## しきい値違反

- ❌ `https://doboku-note.com/` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **CLS** = 0.114 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **TBT** = 644ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 4817ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2672ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 3216ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6976ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2654ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6562ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3008ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7506ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3005ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6328ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2809ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 3001ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7387ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3130ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6399ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2643ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 6796ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3425ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 6590ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3403ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 2926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 3301ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6106ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2684ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 6526ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2829ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6342ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2696ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 6837ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2797ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 2712ms (閾値: ≤2500ms)