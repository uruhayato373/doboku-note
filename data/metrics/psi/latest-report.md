# PSI 計測レポート — 2026-09-30

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **56件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 100 | 841 | 0 |
| /search | desktop | 96 | 100 | 100 | 66⚠ | 934 | 0.004 |
| /exam | desktop | 99 | 100 | 96 | 100 | 592 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 650 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 100 | 100 | 100 | 100 | 743 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 100 | 100 | 100 | 801 | 0.23⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 92 | 100 | 100 | 100 | 827 | 0.158⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 78 | 100 | 100 | 100 | 820 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 100 | 100 | 100 | 100 | 786 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 100 | 100 | 100 | 753 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 864 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 757 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 100 | 100 | 100 | 623 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 601 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 96 | 100 | 100 | 100 | 641 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 98 | 100 | 100 | 100 | 559 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 642 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 97 | 100 | 100 | 100 | 621 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 799 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 98 | 100 | 100 | 100 | 739 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 634 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 810 | 0.004 |
| / | mobile | 63⚠ | 100 | 96 | 100 | 6012⚠ | 0 |
| /search | mobile | 64⚠ | 100 | 100 | 66⚠ | 8628⚠ | 0 |
| /exam | mobile | 65⚠ | 100 | 96 | 100 | 8678⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 77 | 100 | 100 | 100 | 4726⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 95 | 100 | 100 | 100 | 2551⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 78 | 100 | 100 | 100 | 3127⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 71 | 100 | 100 | 100 | 5879⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 72 | 100 | 100 | 100 | 4927⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 86 | 100 | 100 | 100 | 2551⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 70 | 100 | 100 | 100 | 5441⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 68⚠ | 100 | 100 | 100 | 5559⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 73 | 100 | 100 | 100 | 3677⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 74 | 100 | 100 | 100 | 4835⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 73 | 100 | 100 | 100 | 5205⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 74 | 100 | 100 | 100 | 4921⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 73 | 100 | 100 | 100 | 5009⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 68⚠ | 100 | 100 | 100 | 5092⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 73 | 100 | 100 | 100 | 4952⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 62⚠ | 100 | 100 | 100 | 3393⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 95 | 100 | 100 | 100 | 2251 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 73 | 100 | 100 | 100 | 4830⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 72 | 100 | 100 | 100 | 5262⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (desktop): **TBT** = 488ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 6012ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3089ms (閾値: ≤1800ms)
- `https://doboku-note.com/` (mobile): **TBT** = 380ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 8628ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3519ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam` (mobile): **LCP** = 8678ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 3265ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 4726ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3086ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 3127ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 1951ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **TBT** = 544ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5879ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3262ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 4927ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3235ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 1904ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **TBT** = 386ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5441ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3348ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5559ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3357ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 3677ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **TBT** = 605ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4835ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3207ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5205ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3109ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4921ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3292ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5009ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3379ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 5092ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3312ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 4952ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3221ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 3393ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **TBT** = 2113ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 4830ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3120ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5262ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3163ms (閾値: ≤1800ms)