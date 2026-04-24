# PSI 計測レポート — 2026-04-24

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **87件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 95 | 96 | 100 | 92 | 1318 | 0.026 |
| /search | desktop | 74 | 93 | 100 | 83⚠ | 1312 | 0.026 |
| /category | desktop | 99 | 92 | 96 | 75⚠ | 648 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 63⚠ | 96 | 100 | 92 | 1787 | 0.026 |
| /docs/civil-construction-1-guide-four-management | desktop | 90 | 96 | 100 | 92 | 1741 | 0.027 |
| /docs/civil-construction-1-primary-r07-a | desktop | 70 | 96 | 100 | 92 | 2489 | 0.214⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 67⚠ | 96 | 100 | 92 | 1404 | 0.026 |
| /docs/civil-construction-1-secondary-r07 | desktop | 85 | 96 | 100 | 92 | 1791 | 0.112⚠ |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 82 | 96 | 100 | 92 | 2142 | 0.07 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 83 | 96 | 100 | 92 | 2222 | 0.032 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 52⚠ | 96 | 100 | 92 | 1981 | 0.057 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 85 | 96 | 100 | 92 | 1878 | 0.031 |
| /docs/pe-comprehensive-management-exam-index | desktop | 90 | 96 | 100 | 92 | 1681 | 0.07 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 89 | 95 | 100 | 92 | 1801 | 0.063 |
| https://doboku-note.com/docs/pe-comprehensive-management-r07-primary | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-r05-primary | desktop | 67⚠ | 96 | 100 | 92 | 1861 | 0.05 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 91 | 96 | 100 | 92 | 1586 | 0.035 |
| /docs/pe-comprehensive-management-followership | desktop | 85 | 92 | 100 | 92 | 1535 | 0.182⚠ |
| /docs/pe-comprehensive-management-agile | desktop | 86 | 93 | 100 | 92 | 1586 | 0.053 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 83 | 91 | 100 | 92 | 1656 | 0.029 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 93 | 91 | 100 | 92 | 1581 | 0.026 |
| https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle | desktop | ERROR | | | | | |
| / | mobile | 60⚠ | 92 | 100 | 92 | 8526⚠ | 0 |
| /search | mobile | 64⚠ | 91 | 100 | 83⚠ | 7022⚠ | 0 |
| /category | mobile | 67⚠ | 92 | 96 | 75⚠ | 3322⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 55⚠ | 93 | 100 | 92 | 12902⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 50⚠ | 93 | 100 | 92 | 12076⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 47⚠ | 93 | 100 | 92 | 12902⚠ | 0.051 |
| /docs/civil-construction-1-primary-h26-a | mobile | 48⚠ | 92 | 100 | 92 | 16126⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 53⚠ | 93 | 100 | 92 | 12676⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 53⚠ | 93 | 100 | 92 | 15376⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 54⚠ | 93 | 100 | 92 | 14950⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 56⚠ | 93 | 100 | 92 | 12122⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 37⚠ | 93 | 100 | 92 | 11347⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 52⚠ | 93 | 100 | 92 | 12227⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 60⚠ | 91 | 100 | 92 | 10458⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 53⚠ | 93 | 100 | 92 | 11326⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 56⚠ | 93 | 100 | 92 | 13427⚠ | 0.016 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 53⚠ | 92 | 100 | 92 | 9152⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 57⚠ | 93 | 100 | 92 | 11102⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 60⚠ | 93 | 100 | 92 | 8902⚠ | 0.012 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 55⚠ | 91 | 100 | 92 | 11845⚠ | 0 |
| https://doboku-note.com/docs/pe-comprehensive-management-agenda-21 | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 54⚠ | 91 | 100 | 92 | 11178⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **TBT** = 535ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **TBT** = 689ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.214 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **TBT** = 780ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **CLS** = 0.112 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **TBT** = 2848ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **TBT** = 455ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **CLS** = 0.182 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8526ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 5284ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 7022ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 4487ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 3322ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2263ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **TBT** = 1056ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 12902ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 9096ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 12076ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 8829ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 47 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 12902ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3901ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 711ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 48 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 16126ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 12759ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 341ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 12676ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 8957ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 15376ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 10351ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 14950ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 10480ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 12122ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 8912ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 37 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 11347ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 7714ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **TBT** = 767ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 12227ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 8526ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 10458ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 6301ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 11326ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 8551ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 13427ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 9826ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 9152ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 5701ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **TBT** = 342ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 11102ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 7290ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 8902ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 5565ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 11845ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 7039ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 11178ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 6896ms (閾値: ≤1800ms)