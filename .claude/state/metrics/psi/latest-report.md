# PSI 計測レポート — 2026-05-05

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **55件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 71 | 100 | 96 | 92 | 793 | 0.024 |
| /search | desktop | 97 | 94 | 96 | 83⚠ | 1256 | 0 |
| /category | desktop | 99 | 98 | 96 | 75⚠ | 566 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 97 | 100 | 96 | 92 | 812 | 0.023 |
| /docs/civil-construction-1-guide-four-management | desktop | 94 | 100 | 96 | 92 | 825 | 0.023 |
| /docs/civil-construction-1-primary-r07-a | desktop | 74 | 100 | 96 | 92 | 1295 | 0.135⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 88 | 100 | 96 | 92 | 617 | 0.023 |
| /docs/civil-construction-1-secondary-r07 | desktop | 93 | 100 | 96 | 92 | 692 | 0.023 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 91 | 100 | 96 | 92 | 803 | 0.023 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 96 | 100 | 96 | 92 | 741 | 0.023 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 70 | 100 | 96 | 92 | 845 | 0.023 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 87 | 100 | 96 | 92 | 617 | 0.185⚠ |
| /docs/pe-comprehensive-management-exam-index | desktop | 82 | 96 | 96 | 92 | 696 | 0.023 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 98 | 96 | 92 | 692 | 0.023 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 88 | 100 | 96 | 92 | 710 | 0.074 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 98 | 100 | 96 | 92 | 709 | 0.023 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 98 | 100 | 96 | 92 | 690 | 0.023 |
| /docs/pe-comprehensive-management-followership | desktop | 95 | 96 | 96 | 92 | 690 | 0.023 |
| /docs/pe-comprehensive-management-agile | desktop | 92 | 96 | 96 | 92 | 752 | 0.023 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 81 | 94 | 96 | 92 | 591 | 0.023 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 84 | 94 | 96 | 92 | 816 | 0.023 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 97 | 94 | 96 | 92 | 810 | 0.023 |
| / | mobile | 60⚠ | 96 | 96 | 92 | 8098⚠ | 0 |
| /search | mobile | 60⚠ | 92 | 96 | 83⚠ | 3963⚠ | 0.009 |
| /category | mobile | 97 | 98 | 96 | 75⚠ | 2263 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 59⚠ | 96 | 96 | 92 | 9325⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 94 | 96 | 96 | 92 | 2926⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 59⚠ | 96 | 96 | 92 | 9996⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 55⚠ | 96 | 96 | 92 | 9213⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 62⚠ | 96 | 96 | 92 | 3672⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 79 | 96 | 96 | 92 | 5476⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 59⚠ | 96 | 96 | 92 | 9725⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 53⚠ | 100 | 96 | 92 | 5072⚠ | 0.001 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 83 | 96 | 96 | 92 | 4266⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 94 | 93 | 96 | 92 | 2851⚠ | 0.009 |
| https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy | mobile | ERROR | | | | | |
| /docs/pe-comprehensive-management-r07-primary | mobile | 92 | 96 | 96 | 92 | 2626⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 96 | 96 | 96 | 92 | 2626⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 63⚠ | 96 | 96 | 92 | 8843⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 57⚠ | 96 | 96 | 92 | 9084⚠ | 0 |
| /docs/pe-comprehensive-management-agile | mobile | 88 | 96 | 96 | 92 | 3389⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 90 | 95 | 96 | 92 | 3415⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 90 | 95 | 96 | 92 | 3276⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 89 | 95 | 96 | 92 | 3770⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **TBT** = 796ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.135 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 396ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **TBT** = 830ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (desktop): **CLS** = 0.185 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **TBT** = 395ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **TBT** = 427ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): **TBT** = 357ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8098ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 4949ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 3963ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **TBT** = 1347ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 9325ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 5140ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 2926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 9996ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 5891ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 9213ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 5238ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 3672ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **TBT** = 1451ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5476ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 9725ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 5076ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 5072ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3196ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **TBT** = 991ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 4266ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 2115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 2851ms (閾値: ≤2500ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 8843ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 4670ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 9084ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 5193ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 3389ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 3415ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 3276ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 3770ms (閾値: ≤2500ms)