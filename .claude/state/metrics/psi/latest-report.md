# PSI 計測レポート — 2026-05-07

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **60件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 92 | 552 | 0.023 |
| /search | desktop | 96 | 94 | 96 | 83⚠ | 1307 | 0.023 |
| /category | desktop | 90 | 98 | 96 | 75⚠ | 584 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 99 | 100 | 96 | 92 | 633 | 0.023 |
| /docs/civil-construction-1-guide-four-management | desktop | 88 | 100 | 96 | 92 | 674 | 0.023 |
| /docs/civil-construction-1-primary-r07-a | desktop | 90 | 100 | 96 | 92 | 899 | 0.135⚠ |
| https://doboku-note.com/docs/civil-construction-1-primary-h26-a | desktop | ERROR | | | | | |
| /docs/civil-construction-1-secondary-r07 | desktop | 79 | 100 | 96 | 92 | 582 | 0.023 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 71 | 100 | 96 | 92 | 997 | 0.023 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 76 | 100 | 96 | 92 | 922 | 0.023 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 99 | 100 | 96 | 92 | 871 | 0.023 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 99 | 100 | 92 | 92 | 879 | 0.023 |
| /docs/pe-comprehensive-management-exam-index | desktop | 77 | 96 | 96 | 92 | 766 | 0.023 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 95 | 98 | 96 | 92 | 818 | 0.023 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 87 | 100 | 96 | 92 | 550 | 0.219⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 92 | 100 | 96 | 92 | 552 | 0.023 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 94 | 100 | 96 | 92 | 690 | 0.023 |
| /docs/pe-comprehensive-management-followership | desktop | 100 | 100 | 96 | 92 | 695 | 0.023 |
| /docs/pe-comprehensive-management-agile | desktop | 100 | 100 | 96 | 92 | 688 | 0.023 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 84 | 98 | 96 | 92 | 804 | 0.023 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 78 | 98 | 96 | 92 | 758 | 0.023 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 97 | 98 | 96 | 92 | 593 | 0.023 |
| / | mobile | 61⚠ | 96 | 96 | 92 | 8124⚠ | 0 |
| /search | mobile | 87 | 92 | 96 | 83⚠ | 3847⚠ | 0 |
| /category | mobile | 96 | 98 | 96 | 75⚠ | 2263 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 63⚠ | 96 | 96 | 92 | 8819⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 78 | 96 | 96 | 92 | 3226⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 61⚠ | 96 | 96 | 92 | 4877⚠ | 0.009 |
| /docs/civil-construction-1-primary-h26-a | mobile | 42⚠ | 96 | 96 | 92 | 7200⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 58⚠ | 96 | 96 | 92 | 9154⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 56⚠ | 96 | 96 | 92 | 8397⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 92 | 96 | 96 | 92 | 3378⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 65⚠ | 96 | 96 | 92 | 2998⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 61⚠ | 96 | 96 | 92 | 9670⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 90 | 93 | 96 | 92 | 3396⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 61⚠ | 95 | 96 | 92 | 9327⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 91 | 96 | 96 | 92 | 2776⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 91 | 96 | 96 | 92 | 3376⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 88 | 96 | 96 | 92 | 2948⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 83 | 96 | 96 | 92 | 3389⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 91 | 96 | 96 | 92 | 3326⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 85 | 95 | 96 | 92 | 2947⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 94 | 95 | 96 | 92 | 2886⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 77 | 95 | 96 | 92 | 2941⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.135 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 474ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 705ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **TBT** = 548ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **TBT** = 524ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.219 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **TBT** = 359ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): **TBT** = 509ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8124ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 4903ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 3847ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 8819ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 4666ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 533ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 4877ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 842ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 42 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 7200ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3823ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 1029ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 9154ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 5148ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 8397ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3488ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **TBT** = 341ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 3378ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 2998ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **TBT** = 1714ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 9670ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 5334ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 3396ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 9327ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 4687ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 2776ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 3376ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 1861ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 2948ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **TBT** = 310ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 3389ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **TBT** = 369ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 3326ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 2947ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **TBT** = 404ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 2886ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 2941ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 705ms (閾値: ≤300ms)