# PSI 計測レポート — 2026-04-30

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **60件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 92 | 100 | 92 | 92 | 482 | 0.023 |
| /search | desktop | 96 | 94 | 96 | 83⚠ | 1157 | 0.023 |
| /category | desktop | 97 | 98 | 96 | 75⚠ | 470 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 87 | 100 | 96 | 92 | 691 | 0.023 |
| /docs/civil-construction-1-guide-four-management | desktop | 87 | 100 | 96 | 92 | 741 | 0.023 |
| /docs/civil-construction-1-primary-r07-a | desktop | 87 | 100 | 96 | 92 | 1507 | 0.024 |
| /docs/civil-construction-1-primary-h26-a | desktop | 88 | 100 | 96 | 92 | 520 | 0.023 |
| /docs/civil-construction-1-secondary-r07 | desktop | 98 | 100 | 96 | 92 | 729 | 0.023 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 68⚠ | 100 | 96 | 92 | 795 | 0.074 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 86 | 100 | 96 | 92 | 821 | 0.023 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 92 | 100 | 96 | 92 | 786 | 0.023 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 99 | 100 | 96 | 92 | 841 | 0.023 |
| /docs/pe-comprehensive-management-exam-index | desktop | 100 | 96 | 96 | 92 | 605 | 0.023 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 98 | 96 | 92 | 599 | 0.023 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 87 | 100 | 96 | 92 | 734 | 0.074 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 91 | 100 | 96 | 92 | 705 | 0.066 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 87 | 100 | 96 | 92 | 632 | 0.023 |
| https://doboku-note.com/docs/pe-comprehensive-management-followership | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-agile | desktop | 92 | 96 | 96 | 92 | 697 | 0.023 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 97 | 94 | 96 | 92 | 672 | 0.023 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 92 | 94 | 96 | 92 | 790 | 0.023 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 64⚠ | 94 | 96 | 92 | 937 | 0.023 |
| / | mobile | 61⚠ | 96 | 96 | 92 | 8120⚠ | 0 |
| /search | mobile | 58⚠ | 92 | 96 | 83⚠ | 8475⚠ | 0 |
| /category | mobile | 94 | 98 | 96 | 75⚠ | 1885 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 57⚠ | 96 | 96 | 92 | 6853⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 92 | 96 | 96 | 92 | 2926⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 74 | 96 | 96 | 92 | 5948⚠ | 0.009 |
| /docs/civil-construction-1-primary-h26-a | mobile | 57⚠ | 96 | 96 | 92 | 9086⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 82 | 96 | 96 | 92 | 2567⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 66⚠ | 96 | 96 | 92 | 8365⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 62⚠ | 96 | 96 | 92 | 4426⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 83 | 96 | 96 | 92 | 4131⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 59⚠ | 96 | 96 | 92 | 10750⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 60⚠ | 93 | 96 | 92 | 9025⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 86 | 95 | 96 | 92 | 3850⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 89 | 96 | 96 | 92 | 2926⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 92 | 96 | 96 | 92 | 3226⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 63⚠ | 96 | 96 | 92 | 9107⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 90 | 96 | 96 | 92 | 3386⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 58⚠ | 96 | 96 | 92 | 9001⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 47⚠ | 95 | 96 | 92 | 5509⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 82 | 95 | 96 | 92 | 3394⚠ | 0.009 |
| https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle | mobile | ERROR | | | | | |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **TBT** = 307ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 1164ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **TBT** = 322ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (desktop): **TBT** = 314ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): PSI API 400: {
  "error": {
    "code": 400,
    "message": "Lighthouse returned error: NO_FCP. The page did not paint any content. Please ensure you keep the browser window in the foreground during t
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (desktop): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (desktop): **TBT** = 1313ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8120ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 4887ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 8475ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 5077ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6853ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3042ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **TBT** = 473ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 2926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5948ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 9086ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 4904ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 2567ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **TBT** = 574ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 8365ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3583ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4426ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 980ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 4131ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 2115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 10750ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 5439ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 9025ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 4874ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 3850ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 2926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 9107ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 4583ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 3386ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 9001ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 4907ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 47 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 5509ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 3169ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **TBT** = 1121ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 3394ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **TBT** = 389ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr