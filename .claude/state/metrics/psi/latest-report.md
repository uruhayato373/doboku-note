# PSI 計測レポート — 2026-08-21

- 計測対象: 22 URL × 2 strategy
- 診断上のしきい値超過: **60件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 97 | 96 | 100 | 100 | 707 | 0.015 |
| /search | desktop | 69⚠ | 100 | 100 | 66⚠ | 593 | 0.766⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 409 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 83 | 100 | 100 | 100 | 658 | 0.015 |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 96 | 100 | 100 | 1042 | 0.015 |
| /docs/civil-construction-1-primary-r07-a | desktop | 58⚠ | 96 | 100 | 100 | 858 | 0.237⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 99 | 98 | 100 | 100 | 767 | 0.015 |
| /docs/civil-construction-1-secondary-r07 | desktop | 69⚠ | 96 | 100 | 100 | 800 | 0.015 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 98 | 96 | 100 | 100 | 856 | 0.015 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 99 | 96 | 100 | 100 | 842 | 0.015 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 99 | 100 | 100 | 100 | 822 | 0.015 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 96 | 100 | 100 | 100 | 881 | 0.015 |
| /docs/pe-comprehensive-management-exam-index | desktop | 94 | 100 | 100 | 100 | 643 | 0.015 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 652 | 0.015 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 56⚠ | 100 | 100 | 100 | 1698 | 0.116⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 95 | 100 | 100 | 100 | 593 | 0.03 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 100 | 100 | 641 | 0.015 |
| /docs/pe-comprehensive-management-followership | desktop | 100 | 100 | 100 | 100 | 668 | 0.015 |
| /docs/pe-comprehensive-management-agile | desktop | 100 | 100 | 100 | 100 | 681 | 0.029 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 100 | 98 | 100 | 100 | 680 | 0.015 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 84 | 98 | 100 | 100 | 660 | 0.015 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 98 | 100 | 100 | 611 | 0.015 |
| / | mobile | 59⚠ | 92 | 100 | 100 | 11582⚠ | 0 |
| /search | mobile | 77 | 96 | 100 | 66⚠ | 1522 | 0.61⚠ |
| /category | mobile | 78 | 98 | 96 | 91 | 4233⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 76 | 93 | 100 | 100 | 4646⚠ | 0.011 |
| /docs/civil-construction-1-guide-four-management | mobile | 74 | 93 | 100 | 100 | 5150⚠ | 0.011 |
| /docs/civil-construction-1-primary-r07-a | mobile | 63⚠ | 93 | 100 | 100 | 7426⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 71 | 95 | 100 | 100 | 5612⚠ | 0.011 |
| /docs/civil-construction-1-secondary-r07 | mobile | 69⚠ | 93 | 100 | 100 | 4919⚠ | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 73 | 93 | 100 | 100 | 4948⚠ | 0.011 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 76 | 93 | 100 | 100 | 4638⚠ | 0.011 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 63⚠ | 93 | 100 | 100 | 3055⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 94 | 92 | 100 | 100 | 2252 | 0.011 |
| /docs/pe-comprehensive-management-exam-index | mobile | 68⚠ | 93 | 100 | 100 | 4916⚠ | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 67⚠ | 93 | 100 | 100 | 5248⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 71 | 96 | 100 | 100 | 5000⚠ | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 75 | 96 | 100 | 100 | 4796⚠ | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 77 | 92 | 100 | 100 | 4501⚠ | 0.011 |
| /docs/pe-comprehensive-management-followership | mobile | 98 | 96 | 100 | 100 | 2038 | 0.011 |
| /docs/pe-comprehensive-management-agile | mobile | 98 | 96 | 100 | 100 | 1751 | 0.011 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 76 | 95 | 100 | 100 | 4755⚠ | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 77 | 95 | 100 | 100 | 4601⚠ | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 60⚠ | 95 | 100 | 100 | 5943⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.766 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **TBT** = 369ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.237 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 851ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 1246ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.116 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **TBT** = 1955ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): **TBT** = 361ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 11582ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 4978ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.61 (閾値: ≤0.1)
- `https://doboku-note.com/category` (mobile): **LCP** = 4233ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 3098ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 4646ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3071ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5150ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3265ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7426ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3597ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5612ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3222ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4919ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 3018ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 4948ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3401ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4638ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3071ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 3055ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **TBT** = 2719ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4916ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3182ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **TBT** = 318ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 5248ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 3181ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 5000ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3281ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4796ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3239ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4501ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2821ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4755ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2952ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4601ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2787ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 5943ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 3206ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 345ms (閾値: ≤300ms)