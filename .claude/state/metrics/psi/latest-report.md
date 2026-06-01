# PSI 計測レポート — 2026-06-01

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **99件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 92 | 96 | 100 | 490 | 0.03 |
| /search | desktop | 100 | 94 | 96 | 92 | 763 | 0.03 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 511 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 97 | 87⚠ | 96 | 92 | 1304 | 0.03 |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 87⚠ | 96 | 92 | 1038 | 0.03 |
| /docs/civil-construction-1-primary-r07-a | desktop | 87 | 87⚠ | 96 | 92 | 1041 | 0.195⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 90 | 87⚠ | 96 | 92 | 2016 | 0.03 |
| /docs/civil-construction-1-secondary-r07 | desktop | 63⚠ | 87⚠ | 96 | 92 | 1456 | 0.03 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 72 | 87⚠ | 96 | 92 | 789 | 0.05 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 92 | 87⚠ | 96 | 92 | 1821 | 0.03 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 98 | 87⚠ | 96 | 92 | 1057 | 0.03 |
| https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-exam-index | desktop | 96 | 87⚠ | 96 | 92 | 1335 | 0.03 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 98 | 87⚠ | 96 | 92 | 1057 | 0.03 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 98 | 87⚠ | 96 | 92 | 973 | 0.03 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 99 | 87⚠ | 96 | 92 | 502 | 0.051 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 92 | 96 | 100 | 570 | 0.03 |
| /docs/pe-comprehensive-management-followership | desktop | 97 | 87⚠ | 96 | 92 | 1282 | 0.03 |
| /docs/pe-comprehensive-management-agile | desktop | 97 | 87⚠ | 96 | 92 | 1254 | 0.047 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 85⚠ | 96 | 92 | 901 | 0.03 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 77 | 91 | 96 | 100 | 986 | 0.03 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 98 | 91 | 96 | 100 | 984 | 0.03 |
| / | mobile | 74 | 83⚠ | 96 | 92 | 5230⚠ | 0.009 |
| /search | mobile | 80 | 91 | 96 | 92 | 4119⚠ | 0 |
| /category | mobile | 78 | 98 | 96 | 83⚠ | 3983⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 70 | 84⚠ | 96 | 92 | 6402⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 79 | 84⚠ | 96 | 92 | 4608⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 67⚠ | 84⚠ | 96 | 92 | 7653⚠ | 0.04 |
| /docs/civil-construction-1-primary-h26-a | mobile | 66⚠ | 83⚠ | 96 | 92 | 6963⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 69⚠ | 84⚠ | 96 | 92 | 6552⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 69⚠ | 69⚠ | 96 | 82⚠ | 6556⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 65⚠ | 84⚠ | 96 | 92 | 6938⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 66⚠ | 84⚠ | 96 | 92 | 6626⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 65⚠ | 83⚠ | 96 | 92 | 2458 | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 66⚠ | 84⚠ | 96 | 92 | 7276⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 69⚠ | 84⚠ | 96 | 92 | 7086⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 68⚠ | 84⚠ | 96 | 92 | 6702⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 70 | 84⚠ | 96 | 92 | 6618⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 93 | 83⚠ | 96 | 92 | 3160⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 64⚠ | 84⚠ | 96 | 92 | 2563⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 64⚠ | 84⚠ | 96 | 92 | 7426⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 67⚠ | 82⚠ | 96 | 92 | 7584⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 70 | 82⚠ | 96 | 92 | 5298⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 70 | 82⚠ | 96 | 92 | 6717⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.195 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 1252ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 748ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **Accessibility** = 87 (閾値: ≥90)
- ❌ `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **Accessibility** = 87 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **Accessibility** = 85 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): **TBT** = 504ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **LCP** = 5230ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2615ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 4119ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2518ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 3983ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2839ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6402ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2674ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 4608ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7653ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3039ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6963ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2873ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6552ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2897ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Accessibility** = 69 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **SEO** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 6556ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 2652ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6938ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2687ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 6626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3445ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 2115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **TBT** = 2509ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 7276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2647ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 7086ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2692ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6702ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3028ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6618ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2682ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Accessibility** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 3160ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 2563ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **TBT** = 3524ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Accessibility** = 84 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 7426ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2753ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 7584ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2694ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 5298ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2712ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Accessibility** = 82 (閾値: ≥90)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 6717ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2661ms (閾値: ≤1800ms)