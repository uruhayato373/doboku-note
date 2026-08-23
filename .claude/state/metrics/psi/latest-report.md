# PSI 計測レポート — 2026-08-23

- 計測対象: 22 URL × 2 strategy
- 診断上のしきい値超過: **38件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 491 | 0.004 |
| /search | desktop | 78 | 100 | 100 | 66⚠ | 559 | 0.549⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 442 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 100 | 100 | 100 | 530 | 0.004 |
| /docs/civil-construction-1-guide-four-management | desktop | 95 | 96 | 100 | 100 | 862 | 0.01 |
| /docs/civil-construction-1-primary-r07-a | desktop | 87 | 96 | 100 | 100 | 801 | 0.226⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 95 | 98 | 100 | 100 | 1048 | 0.004 |
| /docs/civil-construction-1-secondary-r07 | desktop | 96 | 96 | 100 | 100 | 852 | 0.021 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 100 | 100 | 641 | 0.004 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 96 | 100 | 100 | 682 | 0.004 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 100 | 100 | 100 | 100 | 581 | 0.004 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 82 | 100 | 100 | 100 | 544 | 0.173⚠ |
| /docs/pe-comprehensive-management-exam-index | desktop | 90 | 100 | 100 | 100 | 2038 | 0.004 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 690 | 0.004 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 100 | 100 | 100 | 100 | 591 | 0.004 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 100 | 100 | 100 | 529 | 0.004 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 100 | 100 | 547 | 0.004 |
| /docs/pe-comprehensive-management-followership | desktop | 96 | 100 | 100 | 100 | 1320 | 0.004 |
| /docs/pe-comprehensive-management-agile | desktop | 96 | 100 | 100 | 100 | 1072 | 0.038 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 98 | 98 | 100 | 100 | 1059 | 0.004 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 97 | 98 | 100 | 100 | 1190 | 0.004 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 94 | 98 | 100 | 100 | 1032 | 0.004 |
| / | mobile | 96 | 96 | 100 | 100 | 2553⚠ | 0.006 |
| /search | mobile | 79 | 96 | 100 | 66⚠ | 4103⚠ | 0 |
| /category | mobile | 99 | 98 | 96 | 91 | 1529 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 67⚠ | 93 | 100 | 100 | 6076⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 94 | 93 | 100 | 100 | 2860⚠ | 0.006 |
| /docs/civil-construction-1-primary-r07-a | mobile | 65⚠ | 93 | 100 | 100 | 7426⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 71 | 95 | 100 | 100 | 5510⚠ | 0.006 |
| /docs/civil-construction-1-secondary-r07 | mobile | 76 | 93 | 100 | 100 | 4683⚠ | 0.006 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 64⚠ | 93 | 100 | 100 | 8251⚠ | 0 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 98 | 93 | 100 | 100 | 2116 | 0.006 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 73 | 93 | 100 | 100 | 5203⚠ | 0.006 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 96 | 92 | 100 | 100 | 2551⚠ | 0.006 |
| /docs/pe-comprehensive-management-exam-index | mobile | 76 | 93 | 100 | 100 | 4706⚠ | 0.006 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 74 | 93 | 100 | 100 | 5087⚠ | 0.006 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 73 | 96 | 100 | 100 | 4843⚠ | 0.006 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 72 | 96 | 100 | 100 | 4866⚠ | 0.006 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 98 | 92 | 100 | 100 | 1960 | 0.006 |
| /docs/pe-comprehensive-management-followership | mobile | 98 | 96 | 100 | 100 | 2036 | 0.006 |
| /docs/pe-comprehensive-management-agile | mobile | 76 | 96 | 100 | 100 | 4865⚠ | 0.006 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 98 | 95 | 100 | 100 | 2037 | 0.006 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 76 | 95 | 100 | 100 | 4594⚠ | 0.006 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 97 | 95 | 100 | 100 | 2326 | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.549 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.226 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (desktop): **CLS** = 0.173 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 2553ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4103ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3103ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6076ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3192ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 2860ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7426ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3568ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5510ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3150ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 4683ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 3099ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 8251ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3285ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 1821ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5203ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3225ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4706ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3069ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 5087ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 3119ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 4843ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3141ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4866ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3283ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 4865ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2824ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 4594ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2824ms (閾値: ≤1800ms)