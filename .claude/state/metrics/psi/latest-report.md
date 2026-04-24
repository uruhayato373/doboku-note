# PSI 計測レポート — 2026-04-24

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **78件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 98 | 96 | 100 | 92 | 1115 | 0.026 |
| /search | desktop | 81 | 93 | 100 | 83⚠ | 1417 | 0.026 |
| /category | desktop | 98 | 92 | 96 | 75⚠ | 694 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 87 | 96 | 100 | 92 | 1762 | 0.027 |
| /docs/civil-construction-1-guide-four-management | desktop | 91 | 96 | 100 | 92 | 1661 | 0.027 |
| /docs/civil-construction-1-primary-r07-a | desktop | 69⚠ | 96 | 100 | 92 | 2741⚠ | 0.181⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 82 | 96 | 100 | 92 | 2021 | 0.032 |
| /docs/civil-construction-1-secondary-r07 | desktop | 90 | 96 | 100 | 92 | 1754 | 0.027 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 80 | 96 | 100 | 92 | 2337 | 0.07 |
| https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide | desktop | ERROR | | | | | |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 87 | 96 | 100 | 92 | 1660 | 0.07 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 86 | 96 | 100 | 92 | 1941 | 0.031 |
| /docs/pe-comprehensive-management-exam-index | desktop | 91 | 96 | 100 | 92 | 1654 | 0.071 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 90 | 95 | 100 | 92 | 1807 | 0.026 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 83 | 96 | 100 | 92 | 2181 | 0.027 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 84 | 96 | 100 | 92 | 1901 | 0.05 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 92 | 96 | 100 | 92 | 1602 | 0.035 |
| /docs/pe-comprehensive-management-followership | desktop | 71 | 92 | 100 | 92 | 1410 | 0.155⚠ |
| /docs/pe-comprehensive-management-agile | desktop | 92 | 93 | 100 | 92 | 1581 | 0.053 |
| https://doboku-note.com/docs/pe-comprehensive-management-activity-abc | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 65⚠ | 91 | 100 | 92 | 1481 | 0.026 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 94 | 91 | 100 | 92 | 1462 | 0.032 |
| / | mobile | 74 | 92 | 100 | 92 | 4828⚠ | 0.001 |
| /search | mobile | 50⚠ | 91 | 100 | 83⚠ | 6488⚠ | 0.009 |
| /category | mobile | 67⚠ | 92 | 96 | 75⚠ | 5755⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 58⚠ | 93 | 100 | 92 | 10052⚠ | 0.013 |
| /docs/civil-construction-1-guide-four-management | mobile | 58⚠ | 93 | 100 | 92 | 9868⚠ | 0.009 |
| https://doboku-note.com/docs/civil-construction-1-primary-r07-a | mobile | ERROR | | | | | |
| /docs/civil-construction-1-primary-h26-a | mobile | 55⚠ | 92 | 100 | 92 | 12076⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 52⚠ | 93 | 100 | 92 | 12827⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 42⚠ | 93 | 100 | 92 | 15451⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 56⚠ | 93 | 100 | 92 | 12231⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 52⚠ | 93 | 100 | 92 | 13860⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 57⚠ | 93 | 100 | 92 | 11813⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 51⚠ | 93 | 100 | 92 | 12226⚠ | 0 |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-primary | mobile | 58⚠ | 93 | 100 | 92 | 7877⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 55⚠ | 93 | 100 | 92 | 14252⚠ | 0 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 61⚠ | 92 | 100 | 92 | 8926⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 55⚠ | 93 | 100 | 92 | 11327⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 35⚠ | 93 | 100 | 92 | 9001⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 57⚠ | 91 | 100 | 92 | 10478⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 55⚠ | 91 | 100 | 92 | 11030⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 50⚠ | 91 | 100 | 92 | 10916⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **TBT** = 348ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **LCP** = 2741ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.181 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **CLS** = 0.155 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **TBT** = 391ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): **TBT** = 808ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 4828ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3168ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 6488ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **TBT** = 1601ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 5755ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 4632ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 10052ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 6901ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 9868ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 6601ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 12076ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 9751ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 12827ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 8378ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 42 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 15451ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 10801ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **TBT** = 531ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 12231ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 8705ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 13860ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 9363ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 11813ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 8159ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 51 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 12226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 8376ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 7877ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 5252ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 14252ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 9842ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 8926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 5701ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 11327ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 6875ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 35 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 9001ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 5551ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **TBT** = 1317ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 10478ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 7029ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 11030ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 6732ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 10916ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 7552ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 341ms (閾値: ≤300ms)