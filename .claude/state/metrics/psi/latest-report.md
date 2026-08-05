# PSI 計測レポート — 2026-08-04

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **52件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 96 | 100 | 654 | 0.015 |
| /search | desktop | 76 | 100 | 96 | 66⚠ | 449 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 531 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 100 | 96 | 100 | 624 | 0.015 |
| https://doboku-note.com/docs/civil-construction-1-guide-four-management | desktop | ERROR | | | | | |
| /docs/civil-construction-1-primary-r07-a | desktop | 85 | 96 | 96 | 100 | 781 | 0.231⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 95 | 98 | 96 | 100 | 1514 | 0.015 |
| /docs/civil-construction-1-secondary-r07 | desktop | 98 | 96 | 96 | 100 | 662 | 0.015 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 83 | 96 | 96 | 100 | 614 | 0.121⚠ |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 99 | 96 | 96 | 100 | 739 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 99 | 100 | 96 | 100 | 881 | 0.015 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 100 | 96 | 100 | 581 | 0.015 |
| /docs/pe-comprehensive-management-exam-index | desktop | 73 | 100 | 96 | 100 | 956 | 0.07 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 87 | 100 | 96 | 100 | 732 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 100 | 100 | 96 | 100 | 690 | 0.015 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 93 | 100 | 96 | 100 | 563 | 0.035 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 649 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 100 | 100 | 96 | 100 | 627 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 100 | 96 | 100 | 967 | 0.029 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 98 | 96 | 100 | 629 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 98 | 96 | 100 | 741 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 98 | 96 | 100 | 605 | 0.015 |
| / | mobile | 68⚠ | 92 | 96 | 100 | 7390⚠ | 0.011 |
| /search | mobile | 55⚠ | 96 | 96 | 66⚠ | 4302⚠ | 0.61⚠ |
| /category | mobile | 100 | 98 | 96 | 91 | 1508 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 97 | 93 | 96 | 100 | 2476 | 0.011 |
| /docs/civil-construction-1-guide-four-management | mobile | 98 | 93 | 96 | 100 | 2251 | 0.011 |
| /docs/civil-construction-1-primary-r07-a | mobile | 71 | 93 | 96 | 100 | 5577⚠ | 0.011 |
| /docs/civil-construction-1-primary-h26-a | mobile | 73 | 95 | 96 | 100 | 5337⚠ | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 97 | 93 | 96 | 100 | 2401 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 67⚠ | 93 | 96 | 100 | 4351⚠ | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 67⚠ | 93 | 96 | 100 | 4775⚠ | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 74 | 93 | 96 | 100 | 5180⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 68⚠ | 92 | 96 | 100 | 6151⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 75 | 93 | 96 | 100 | 4777⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 94 | 93 | 96 | 100 | 2928⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 72 | 96 | 96 | 100 | 4884⚠ | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 68⚠ | 96 | 96 | 100 | 5003⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 77 | 92 | 96 | 100 | 4573⚠ | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 77 | 96 | 96 | 100 | 4649⚠ | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 69⚠ | 96 | 96 | 100 | 5153⚠ | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 98 | 95 | 96 | 100 | 2176 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 77 | 95 | 96 | 100 | 4642⚠ | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 60⚠ | 95 | 96 | 100 | 6316⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.231 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **CLS** = 0.121 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **TBT** = 617ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7390ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2926ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4302ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **FCP** = 2878ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5577ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3539ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5337ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2963ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 4351ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3392ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **TBT** = 431ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4775ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3185ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 341ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5180ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3103ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 6151ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3269ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4777ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2928ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4884ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3180ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 5003ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3326ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4573ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2927ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4649ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2828ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5153ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2874ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4642ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2820ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 6316ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 3150ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 329ms (閾値: ≤300ms)