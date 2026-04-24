# PSI 計測レポート — 2026-04-24

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **85件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| https://doboku-note.com/ | desktop | ERROR | | | | | |
| /search | desktop | 90 | 93 | 100 | 83⚠ | 1372 | 0.026 |
| /category | desktop | 94 | 92 | 96 | 75⚠ | 872 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 68⚠ | 96 | 100 | 92 | 1542 | 0.026 |
| /docs/civil-construction-1-guide-four-management | desktop | 88 | 96 | 100 | 92 | 1786 | 0.027 |
| /docs/civil-construction-1-primary-r07-a | desktop | 40⚠ | 96 | 100 | 92 | 2926⚠ | 0.134⚠ |
| https://doboku-note.com/docs/civil-construction-1-primary-h26-a | desktop | ERROR | | | | | |
| /docs/civil-construction-1-secondary-r07 | desktop | 90 | 96 | 100 | 92 | 1717 | 0.044 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 72 | 96 | 100 | 92 | 2542⚠ | 0.07 |
| https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide | desktop | ERROR | | | | | |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 82 | 96 | 100 | 92 | 2078 | 0.083 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 79 | 96 | 100 | 92 | 1810 | 0.031 |
| /docs/pe-comprehensive-management-exam-index | desktop | 90 | 96 | 100 | 92 | 1781 | 0.026 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 86 | 95 | 100 | 92 | 1842 | 0.063 |
| https://doboku-note.com/docs/pe-comprehensive-management-r07-primary | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-r05-primary | desktop | 85 | 96 | 100 | 92 | 1981 | 0.03 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 91 | 96 | 100 | 92 | 1621 | 0.035 |
| /docs/pe-comprehensive-management-followership | desktop | 80 | 92 | 100 | 92 | 1538 | 0.182⚠ |
| /docs/pe-comprehensive-management-agile | desktop | 92 | 93 | 100 | 92 | 1582 | 0.053 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 93 | 91 | 100 | 92 | 1621 | 0.029 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 94 | 91 | 100 | 92 | 1261 | 0.028 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 94 | 91 | 100 | 92 | 1461 | 0.032 |
| / | mobile | 53⚠ | 92 | 100 | 92 | 8525⚠ | 0 |
| /search | mobile | 63⚠ | 91 | 100 | 83⚠ | 6969⚠ | 0 |
| https://doboku-note.com/category | mobile | ERROR | | | | | |
| /docs/civil-construction-1-guide-strategy | mobile | 48⚠ | 93 | 100 | 92 | 12452⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 47⚠ | 93 | 100 | 92 | 10051⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 55⚠ | 93 | 100 | 92 | 16878⚠ | 0.06 |
| /docs/civil-construction-1-primary-h26-a | mobile | 51⚠ | 92 | 100 | 92 | 15826⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 51⚠ | 93 | 100 | 92 | 12601⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 43⚠ | 93 | 100 | 92 | 15526⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 56⚠ | 93 | 100 | 92 | 14851⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 52⚠ | 93 | 100 | 92 | 13845⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 54⚠ | 93 | 100 | 92 | 12739⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 50⚠ | 93 | 100 | 92 | 12377⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 43⚠ | 91 | 100 | 92 | 10127⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 47⚠ | 93 | 100 | 92 | 14476⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 56⚠ | 93 | 100 | 92 | 11819⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 52⚠ | 92 | 100 | 92 | 11776⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 60⚠ | 93 | 100 | 92 | 8361⚠ | 0.094 |
| /docs/pe-comprehensive-management-agile | mobile | 61⚠ | 93 | 100 | 92 | 9106⚠ | 0.012 |
| https://doboku-note.com/docs/pe-comprehensive-management-activity-abc | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 30⚠ | 91 | 100 | 92 | 7877⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 49⚠ | 91 | 100 | 92 | 8417⚠ | 0.009 |

## しきい値違反

- ❌ `https://doboku-note.com/` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **TBT** = 487ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Performance** = 40 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **LCP** = 2926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.134 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 3365ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **LCP** = 2542ms (閾値: ≤2500ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **CLS** = 0.182 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8525ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 5417ms (閾値: ≤1800ms)
- `https://doboku-note.com/` (mobile): **TBT** = 335ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 6969ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 5072ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/category` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 48 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 12452ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 9184ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **TBT** = 358ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 47 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 10051ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 6601ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 458ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 16878ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 12151ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 51 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 15826ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 12709ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 51 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 12601ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 8396ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 43 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 15526ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 10849ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **TBT** = 515ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 14851ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 10319ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 13845ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 9819ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 12739ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 8159ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 12377ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 8570ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 43 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 10127ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 6302ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 659ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 47 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 14476ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 10900ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 375ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 11819ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 8103ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 11776ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 8083ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 8361ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 5101ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 9106ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 5551ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 30 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 7877ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 4802ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **TBT** = 3495ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 49 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 8417ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 5102ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 519ms (閾値: ≤300ms)