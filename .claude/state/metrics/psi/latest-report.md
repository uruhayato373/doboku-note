# PSI 計測レポート — 2026-07-10

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **41件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 477 | 0.013 |
| /search | desktop | 76 | 100 | 96 | 92 | 490 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 426 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 99 | 96 | 96 | 100 | 641 | 0.013 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 96 | 96 | 100 | 755 | 0.013 |
| /docs/civil-construction-1-primary-r07-a | desktop | 77 | 96 | 96 | 100 | 2185 | 0.221⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 93 | 95 | 96 | 100 | 1721 | 0.013 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 96 | 96 | 100 | 788 | 0.013 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 96 | 100 | 761 | 0.013 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 97 | 96 | 96 | 100 | 1103 | 0.013 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 100 | 96 | 96 | 100 | 712 | 0.013 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 93 | 96 | 96 | 100 | 595 | 0.014 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 96 | 96 | 100 | 902 | 0.013 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 96 | 96 | 100 | 541 | 0.013 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 93 | 96 | 96 | 100 | 862 | 0.152⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 99 | 96 | 96 | 100 | 561 | 0.013 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 639 | 0.013 |
| /docs/pe-comprehensive-management-followership | desktop | 100 | 96 | 96 | 100 | 810 | 0.013 |
| /docs/pe-comprehensive-management-agile | desktop | 100 | 96 | 96 | 100 | 809 | 0.027 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 95 | 96 | 100 | 735 | 0.013 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 95 | 96 | 100 | 750 | 0.013 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 96 | 95 | 96 | 100 | 780 | 0.013 |
| / | mobile | 74 | 96 | 96 | 100 | 4720⚠ | 0 |
| /search | mobile | 77 | 96 | 96 | 92 | 1659 | 0.606⚠ |
| /category | mobile | 99 | 98 | 96 | 83⚠ | 1525 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 64⚠ | 93 | 96 | 100 | 6751⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 75 | 93 | 96 | 100 | 5048⚠ | 0.009 |
| /docs/civil-construction-1-primary-r07-a | mobile | 70 | 93 | 96 | 100 | 6227⚠ | 0.03 |
| /docs/civil-construction-1-primary-h26-a | mobile | 70 | 91 | 96 | 100 | 6089⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 65⚠ | 93 | 96 | 100 | 6301⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 70 | 93 | 96 | 100 | 6237⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 74 | 93 | 96 | 100 | 5492⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 74 | 93 | 96 | 100 | 5190⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 93 | 92 | 96 | 100 | 3172⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 98 | 93 | 100 | 100 | 2326 | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 95 | 93 | 96 | 100 | 2781⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 74 | 93 | 96 | 100 | 5122⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 79 | 93 | 96 | 100 | 2026 | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 76 | 92 | 96 | 100 | 4826⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 98 | 93 | 100 | 100 | 2326 | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 76 | 93 | 96 | 100 | 5124⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 57⚠ | 91 | 96 | 100 | 6601⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 98 | 91 | 96 | 100 | 2326 | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 76 | 91 | 96 | 100 | 4680⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.221 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.152 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 4720ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2954ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.606 (閾値: ≤0.1)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6751ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3045ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5048ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2820ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 6227ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3112ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6089ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2714ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6301ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2835ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 6237ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3137ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 5492ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2641ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5190ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 2950ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 3172ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2781ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 5122ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2890ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **TBT** = 818ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4826ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2716ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5124ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2521ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6601ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2749ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **TBT** = 472ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4680ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2711ms (閾値: ≤1800ms)