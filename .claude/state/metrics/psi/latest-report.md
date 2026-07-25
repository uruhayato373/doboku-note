# PSI 計測レポート — 2026-07-25

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **47件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 100 | 654 | 0.015 |
| /search | desktop | 76 | 100 | 96 | 66⚠ | 490 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 416 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 100 | 96 | 100 | 646 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 96 | 96 | 100 | 753 | 0.015 |
| /docs/civil-construction-1-primary-r07-a | desktop | 85 | 100 | 96 | 100 | 1309 | 0.231⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 99 | 98 | 96 | 100 | 647 | 0.021 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 96 | 96 | 100 | 597 | 0.015 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 100 | 96 | 96 | 100 | 661 | 0.015 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 96 | 96 | 100 | 631 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 43⚠ | 100 | 96 | 100 | 1931 | 0.226⚠ |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 100 | 96 | 100 | 697 | 0.015 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 100 | 96 | 100 | 755 | 0.015 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 96 | 100 | 706 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 100 | 100 | 96 | 100 | 669 | 0.015 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 78 | 100 | 96 | 100 | 538 | 0.035 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 96 | 96 | 100 | 601 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 98 | 100 | 96 | 100 | 651 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 100 | 100 | 96 | 100 | 805 | 0.029 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 98 | 96 | 100 | 635 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 98 | 96 | 100 | 783 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 98 | 96 | 100 | 741 | 0.015 |
| / | mobile | 67⚠ | 96 | 96 | 100 | 7472⚠ | 0.011 |
| /search | mobile | 56⚠ | 96 | 96 | 66⚠ | 4109⚠ | 0.61⚠ |
| https://doboku-note.com/category | mobile | ERROR | | | | | |
| /docs/civil-construction-1-guide-strategy | mobile | 86 | 96 | 96 | 100 | 2776⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 56⚠ | 93 | 96 | 100 | 6376⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 68⚠ | 96 | 96 | 100 | 5653⚠ | 0.032 |
| /docs/civil-construction-1-primary-h26-a | mobile | 73 | 95 | 96 | 100 | 5324⚠ | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 73 | 93 | 96 | 100 | 4657⚠ | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 73 | 93 | 96 | 100 | 5087⚠ | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 77 | 93 | 96 | 100 | 4546⚠ | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 96 | 96 | 96 | 100 | 2626⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 72 | 96 | 96 | 100 | 5363⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-index | mobile | 75 | 96 | 96 | 100 | 4729⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 94 | 96 | 96 | 100 | 2934⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 75 | 96 | 96 | 100 | 4731⚠ | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 71 | 96 | 96 | 100 | 4904⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 97 | 92 | 96 | 100 | 2185 | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 98 | 96 | 96 | 100 | 1951 | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 98 | 96 | 96 | 100 | 1951 | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 73 | 95 | 96 | 100 | 4860⚠ | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 75 | 95 | 96 | 100 | 4634⚠ | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 98 | 95 | 96 | 100 | 2038 | 0.011 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.231 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): **Performance** = 43 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): **CLS** = 0.226 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (desktop): **TBT** = 3410ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **TBT** = 498ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7472ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2808ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4109ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **FCP** = 2827ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/category` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 2776ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **TBT** = 371ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6376ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3385ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 469ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5653ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3468ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5324ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2938ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4657ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 3042ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5087ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3393ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4546ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2865ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5363ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3249ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4729ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2987ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2934ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4731ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3184ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4904ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3159ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4860ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 3002ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4634ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2831ms (閾値: ≤1800ms)