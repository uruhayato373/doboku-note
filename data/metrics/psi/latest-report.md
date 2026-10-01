# PSI 計測レポート — 2026-10-01

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **58件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 98 | 100 | 96 | 100 | 803 | 0 |
| /search | desktop | 98 | 100 | 100 | 66⚠ | 1165 | 0.004 |
| /exam | desktop | 94 | 100 | 96 | 100 | 940 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 640 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 100 | 100 | 100 | 100 | 781 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 99 | 100 | 100 | 100 | 827 | 0.004 |
| /exam/civil-construction-1/primary/h26-a | desktop | 92 | 100 | 100 | 100 | 850 | 0.158⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 92 | 100 | 100 | 100 | 718 | 0.005 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 97 | 100 | 100 | 100 | 601 | 0.111⚠ |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 100 | 100 | 100 | 690 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 847 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 841 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 100 | 100 | 100 | 643 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 675 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 661 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 607 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 96 | 100 | 100 | 100 | 669 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 646 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 90 | 100 | 100 | 100 | 747 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 94 | 100 | 100 | 100 | 761 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 66⚠ | 100 | 100 | 100 | 1149 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 100 | 100 | 100 | 721 | 0.004 |
| / | mobile | 65⚠ | 100 | 96 | 100 | 8702⚠ | 0 |
| /search | mobile | 71 | 100 | 100 | 66⚠ | 6377⚠ | 0.006 |
| /exam | mobile | 74 | 100 | 96 | 100 | 5207⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 63⚠ | 100 | 100 | 100 | 8026⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 56⚠ | 100 | 100 | 100 | 5608⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 67⚠ | 100 | 100 | 100 | 5672⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 68⚠ | 100 | 100 | 100 | 5954⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 75 | 100 | 100 | 100 | 4790⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 73 | 100 | 100 | 100 | 5166⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 64⚠ | 100 | 100 | 100 | 3165⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 71 | 100 | 100 | 100 | 5513⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 71 | 100 | 100 | 100 | 5569⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 75 | 100 | 100 | 100 | 4884⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 75 | 100 | 100 | 100 | 5106⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 72 | 100 | 100 | 100 | 5025⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 73 | 100 | 100 | 100 | 5037⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 76 | 100 | 100 | 100 | 4898⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 67⚠ | 100 | 100 | 100 | 2602⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 97 | 100 | 100 | 100 | 2251 | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 74 | 100 | 100 | 100 | 5222⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 60⚠ | 100 | 100 | 100 | 8251⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 72 | 100 | 100 | 100 | 5256⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **CLS** = 0.111 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (desktop): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (desktop): **TBT** = 1481ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8702ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3152ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 6377ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3180ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 5207ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 3043ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 8026ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3352ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5608ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3414ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **TBT** = 574ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5672ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3688ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5954ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3389ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 4790ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3139ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5166ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3517ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 3165ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 1851ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **TBT** = 1734ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5513ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3368ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5569ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3366ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4884ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3219ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5106ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3074ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 5025ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3276ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5037ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3360ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 4898ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3243ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 2602ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **TBT** = 2239ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5222ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3226ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 8251ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3385ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5256ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3232ms (閾値: ≤1800ms)