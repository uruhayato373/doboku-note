# PSI 計測レポート — 2026-08-24

- 計測対象: 22 URL × 2 strategy
- 診断上のしきい値超過: **50件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 598 | 0.004 |
| /search | desktop | 78 | 100 | 100 | 66⚠ | 419 | 0.549⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 418 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 95 | 100 | 100 | 100 | 541 | 0.004 |
| /docs/civil-construction-1-guide-four-management | desktop | 94 | 96 | 100 | 100 | 960 | 0.01 |
| /docs/civil-construction-1-primary-r07-a | desktop | 63⚠ | 96 | 100 | 100 | 883 | 0.225⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 77 | 98 | 100 | 100 | 983 | 0.007 |
| /docs/civil-construction-1-secondary-r07 | desktop | 100 | 96 | 100 | 100 | 589 | 0.004 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 95 | 96 | 100 | 100 | 573 | 0.111⚠ |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 98 | 96 | 100 | 100 | 657 | 0.004 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 100 | 100 | 100 | 100 | 717 | 0.004 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 91 | 100 | 100 | 100 | 764 | 0.004 |
| /docs/pe-comprehensive-management-exam-index | desktop | 97 | 100 | 100 | 100 | 723 | 0.004 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 629 | 0.004 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 94 | 100 | 100 | 100 | 1042 | 0.12⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 68⚠ | 100 | 100 | 100 | 900 | 0.004 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 100 | 100 | 566 | 0.004 |
| /docs/pe-comprehensive-management-followership | desktop | 97 | 100 | 100 | 100 | 1000 | 0.004 |
| /docs/pe-comprehensive-management-agile | desktop | 100 | 100 | 100 | 100 | 761 | 0.018 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 87 | 98 | 100 | 100 | 2368 | 0.004 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 92 | 98 | 100 | 100 | 685 | 0.004 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 98 | 100 | 100 | 959 | 0.004 |
| / | mobile | 94 | 96 | 100 | 100 | 2778⚠ | 0.006 |
| /search | mobile | 79 | 96 | 100 | 66⚠ | 4090⚠ | 0 |
| /category | mobile | 80 | 98 | 96 | 91 | 4067⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 62⚠ | 93 | 100 | 100 | 6226⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 74 | 93 | 100 | 100 | 5095⚠ | 0.006 |
| /docs/civil-construction-1-primary-r07-a | mobile | 71 | 93 | 100 | 100 | 5542⚠ | 0.027 |
| /docs/civil-construction-1-primary-h26-a | mobile | 70 | 95 | 100 | 100 | 5666⚠ | 0.006 |
| /docs/civil-construction-1-secondary-r07 | mobile | 98 | 93 | 100 | 100 | 2028 | 0.006 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 64⚠ | 93 | 100 | 100 | 8251⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 54⚠ | 93 | 100 | 100 | 3052⚠ | 0.006 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 97 | 93 | 100 | 100 | 2326 | 0.006 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 72 | 92 | 100 | 100 | 5330⚠ | 0.006 |
| /docs/pe-comprehensive-management-exam-index | mobile | 96 | 93 | 100 | 100 | 1962 | 0.006 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 66⚠ | 93 | 100 | 100 | 7951⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 75 | 96 | 100 | 100 | 4844⚠ | 0.006 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 62⚠ | 96 | 100 | 100 | 6677⚠ | 0 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 75 | 92 | 100 | 100 | 4560⚠ | 0.006 |
| /docs/pe-comprehensive-management-followership | mobile | 76 | 96 | 100 | 100 | 4609⚠ | 0.006 |
| /docs/pe-comprehensive-management-agile | mobile | 97 | 96 | 100 | 100 | 2326 | 0.006 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 76 | 95 | 100 | 100 | 4822⚠ | 0.006 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 98 | 95 | 100 | 100 | 1687 | 0.006 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 74 | 95 | 100 | 100 | 4693⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.549 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.225 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 604ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (desktop): **TBT** = 508ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **CLS** = 0.111 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **TBT** = 1258ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 2778ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4090ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3124ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **LCP** = 4067ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 3099ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3339ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5095ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3229ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5542ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3541ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5666ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3294ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 8251ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3424ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 3052ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2438ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 6964ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5330ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3288ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 7951ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 3012ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4844ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3238ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 6677ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3299ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4560ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2882ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4609ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2795ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4822ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 3032ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4693ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2985ms (閾値: ≤1800ms)