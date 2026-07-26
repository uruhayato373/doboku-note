# PSI 計測レポート — 2026-07-26

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **50件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 100 | 802 | 0.015 |
| /search | desktop | 76 | 100 | 96 | 66⚠ | 422 | 0.766⚠ |
| /category | desktop | 70 | 98 | 96 | 91 | 490 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 92 | 100 | 96 | 100 | 664 | 0.015 |
| https://doboku-note.com/docs/civil-construction-1-guide-four-management | desktop | ERROR | | | | | |
| /docs/civil-construction-1-primary-r07-a | desktop | 84 | 100 | 96 | 100 | 1308 | 0.231⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 96 | 98 | 96 | 100 | 1244 | 0.021 |
| /docs/civil-construction-1-secondary-r07 | desktop | 98 | 96 | 96 | 100 | 626 | 0.015 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 100 | 96 | 96 | 100 | 664 | 0.015 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 97 | 96 | 96 | 100 | 651 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 99 | 100 | 96 | 100 | 882 | 0.015 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 100 | 96 | 100 | 759 | 0.015 |
| /docs/pe-comprehensive-management-exam-index | desktop | 98 | 100 | 96 | 100 | 674 | 0.015 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 97 | 100 | 96 | 100 | 736 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 99 | 100 | 96 | 100 | 686 | 0.015 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 96 | 100 | 96 | 100 | 557 | 0.035 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 96 | 96 | 100 | 571 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 93 | 100 | 96 | 100 | 757 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 99 | 100 | 96 | 100 | 851 | 0.029 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 98 | 96 | 100 | 750 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 98 | 96 | 100 | 945 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 100 | 98 | 96 | 100 | 583 | 0.015 |
| / | mobile | 68⚠ | 96 | 96 | 100 | 7429⚠ | 0.011 |
| /search | mobile | 76 | 96 | 96 | 66⚠ | 1527 | 0.61⚠ |
| /category | mobile | 99 | 98 | 96 | 91 | 1660 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 67⚠ | 96 | 96 | 100 | 6001⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 72 | 93 | 96 | 100 | 2551⚠ | 0.011 |
| /docs/civil-construction-1-primary-r07-a | mobile | 65⚠ | 96 | 96 | 100 | 6901⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 62⚠ | 95 | 96 | 100 | 4890⚠ | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 76 | 93 | 96 | 100 | 4622⚠ | 0.011 |
| https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics | mobile | ERROR | | | | | |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 62⚠ | 93 | 96 | 100 | 6164⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 58⚠ | 96 | 96 | 100 | 4094⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 64⚠ | 96 | 96 | 100 | 6751⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 97 | 96 | 96 | 100 | 2476 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 94 | 96 | 96 | 100 | 2929⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 75 | 96 | 96 | 100 | 4854⚠ | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 95 | 96 | 96 | 100 | 2626⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 98 | 92 | 96 | 100 | 2257 | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 79 | 96 | 96 | 100 | 4331⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 77 | 96 | 96 | 100 | 4915⚠ | 0.011 |
| https://doboku-note.com/docs/pe-comprehensive-management-activity-abc | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 78 | 95 | 96 | 100 | 4507⚠ | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 83 | 95 | 96 | 100 | 2563⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/category` (desktop): **TBT** = 1390ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.231 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7429ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2819ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6001ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3090ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 1882ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 980ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6901ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3566ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 4890ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3179ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 504ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4622ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 3014ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6164ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3217ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 4094ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3316ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **TBT** = 868ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 6751ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3286ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2929ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4854ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3087ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 1825ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4331ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2559ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 4915ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2796ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4507ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2808ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 2563ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 515ms (閾値: ≤300ms)