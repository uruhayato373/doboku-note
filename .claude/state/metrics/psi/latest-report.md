# PSI 計測レポート — 2026-07-05

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **48件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 100 | 756 | 0.013 |
| /search | desktop | 76 | 100 | 96 | 92 | 447 | 0.766⚠ |
| /category | desktop | 97 | 98 | 96 | 83⚠ | 423 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 96 | 96 | 100 | 581 | 0.013 |
| /docs/civil-construction-1-guide-four-management | desktop | 100 | 96 | 96 | 100 | 682 | 0.013 |
| /docs/civil-construction-1-primary-r07-a | desktop | 83 | 96 | 96 | 100 | 1124 | 0.221⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 99 | 96 | 96 | 100 | 812 | 0.013 |
| /docs/civil-construction-1-secondary-r07 | desktop | 100 | 96 | 96 | 100 | 581 | 0.013 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 96 | 96 | 96 | 100 | 642 | 0.113⚠ |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 93 | 96 | 96 | 100 | 790 | 0.013 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 92 | 96 | 96 | 100 | 613 | 0.013 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 96 | 96 | 100 | 685 | 0.013 |
| /docs/pe-comprehensive-management-exam-index | desktop | 100 | 96 | 96 | 100 | 675 | 0.013 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 96 | 96 | 100 | 646 | 0.013 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 99 | 96 | 96 | 100 | 927 | 0.013 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 94 | 96 | 96 | 100 | 442 | 0.032 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 96 | 96 | 100 | 620 | 0.013 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 100 | 779 | 0.013 |
| /docs/pe-comprehensive-management-agile | desktop | 99 | 96 | 96 | 100 | 556 | 0.027 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 94 | 96 | 100 | 821 | 0.013 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 100 | 95 | 96 | 100 | 732 | 0.013 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 94 | 96 | 100 | 572 | 0.013 |
| / | mobile | 73 | 96 | 96 | 100 | 5821⚠ | 0.009 |
| /search | mobile | 66⚠ | 96 | 96 | 92 | 5725⚠ | 0 |
| /category | mobile | 100 | 98 | 96 | 83⚠ | 1509 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 96 | 93 | 96 | 100 | 2476 | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 76 | 93 | 96 | 100 | 5026⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 68⚠ | 93 | 96 | 100 | 6377⚠ | 0.03 |
| /docs/civil-construction-1-primary-h26-a | mobile | 69⚠ | 92 | 92 | 100 | 6012⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 66⚠ | 93 | 96 | 100 | 6376⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 70 | 93 | 96 | 100 | 6301⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 67⚠ | 93 | 96 | 100 | 5576⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 66⚠ | 93 | 96 | 100 | 5284⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 72 | 92 | 96 | 100 | 5551⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 73 | 93 | 96 | 100 | 4976⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 77 | 93 | 96 | 100 | 5114⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 61⚠ | 93 | 96 | 100 | 9387⚠ | 0 |
| https://doboku-note.com/docs/pe-comprehensive-management-r05-primary | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 99 | 92 | 96 | 100 | 2183 | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 97 | 93 | 96 | 100 | 2251 | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 77 | 93 | 96 | 100 | 5026⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 76 | 91 | 96 | 100 | 4900⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 78 | 91 | 96 | 100 | 4671⚠ | 0.009 |
| https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle | mobile | ERROR | | | | | |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.221 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **CLS** = 0.113 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5821ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2496ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **LCP** = 5725ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3034ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5026ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2768ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6377ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3123ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6012ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2882ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6376ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2806ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 6301ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3073ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 5576ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2728ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 301ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5284ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3026ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **TBT** = 328ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5551ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3073ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4976ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2829ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 5114ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2491ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 9387ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 4911ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5026ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2467ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4900ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2660ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4671ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2506ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr