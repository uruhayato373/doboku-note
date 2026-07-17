# PSI 計測レポート — 2026-07-17

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **60件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 551 | 0.015 |
| /search | desktop | 74 | 100 | 96 | 66⚠ | 490 | 0.766⚠ |
| /category | desktop | 99 | 98 | 96 | 91 | 443 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 98 | 100 | 96 | 100 | 673 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 96 | 96 | 100 | 764 | 0.015 |
| /docs/civil-construction-1-primary-r07-a | desktop | 65⚠ | 100 | 96 | 100 | 882 | 0.247⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 90 | 98 | 96 | 100 | 662 | 0.021 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 100 | 96 | 100 | 601 | 0.015 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 79 | 100 | 96 | 100 | 1010 | 0.015 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 96 | 96 | 100 | 619 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 99 | 100 | 96 | 100 | 800 | 0.015 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 99 | 100 | 96 | 100 | 838 | 0.015 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 100 | 96 | 100 | 755 | 0.015 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 96 | 100 | 772 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 100 | 100 | 96 | 100 | 641 | 0.015 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 94 | 100 | 96 | 100 | 450 | 0.034 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 96 | 100 | 96 | 100 | 591 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 97 | 100 | 96 | 100 | 710 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 100 | 100 | 96 | 100 | 661 | 0.051 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 98 | 96 | 100 | 701 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 98 | 96 | 100 | 861 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 63⚠ | 98 | 96 | 100 | 1378 | 0.015 |
| / | mobile | 70 | 96 | 96 | 100 | 7356⚠ | 0.011 |
| /search | mobile | 65⚠ | 96 | 96 | 66⚠ | 5888⚠ | 0 |
| /category | mobile | 92 | 98 | 96 | 91 | 1555 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 63⚠ | 96 | 96 | 100 | 2759⚠ | 0.011 |
| /docs/civil-construction-1-guide-four-management | mobile | 72 | 93 | 96 | 100 | 4852⚠ | 0.011 |
| /docs/civil-construction-1-primary-r07-a | mobile | 67⚠ | 96 | 96 | 100 | 5477⚠ | 0.032 |
| /docs/civil-construction-1-primary-h26-a | mobile | 73 | 95 | 96 | 100 | 5435⚠ | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 79 | 96 | 96 | 100 | 4526⚠ | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 72 | 96 | 96 | 100 | 4953⚠ | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 67⚠ | 93 | 96 | 100 | 6076⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 68⚠ | 96 | 96 | 100 | 6226⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 67⚠ | 96 | 96 | 100 | 5516⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-index | mobile | 67⚠ | 96 | 96 | 100 | 6301⚠ | 0 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 64⚠ | 96 | 96 | 100 | 2926⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 73 | 96 | 96 | 100 | 4857⚠ | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 76 | 96 | 96 | 100 | 4754⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 97 | 96 | 96 | 100 | 2626⚠ | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 76 | 96 | 96 | 100 | 4617⚠ | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 66⚠ | 96 | 96 | 100 | 6301⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 75 | 95 | 96 | 100 | 4865⚠ | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 68⚠ | 95 | 96 | 100 | 4708⚠ | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 98 | 95 | 96 | 100 | 1691 | 0.011 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.247 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 502ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 373ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (desktop): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (desktop): **TBT** = 1982ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 7356ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2512ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5888ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2999ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **TBT** = 346ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 2759ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **TBT** = 3788ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 4852ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3148ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5477ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3316ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5435ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2671ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4526ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2641ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 4953ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3159ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6076ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2817ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 6226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 2949ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5516ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3026ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6301ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3005ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 4303ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4857ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2985ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4754ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2960ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4617ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2555ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6301ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2564ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4865ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2750ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4708ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2541ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **TBT** = 420ms (閾値: ≤300ms)