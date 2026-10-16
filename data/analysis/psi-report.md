# PSI 計測レポート — 2026-10-17

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **52件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 701 | 0.004 |
| /search | desktop | 78 | 100 | 100 | 66⚠ | 520 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 502 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 91 | 100 | 100 | 100 | 625 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 1022 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 100 | 100 | 100 | 856 | 0.225⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 98 | 100 | 100 | 100 | 922 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 99 | 100 | 100 | 100 | 762 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 97 | 100 | 96 | 100 | 1083 | 0.044 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 98 | 100 | 100 | 100 | 629 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 72 | 100 | 100 | 100 | 867 | 0.05 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 822 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 98 | 100 | 100 | 100 | 1142 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 721 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 98 | 100 | 96 | 100 | 863 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 662 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 622 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 768 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 806 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 816 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 768 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 782 | 0.004 |
| / | mobile | 74 | 100 | 100 | 100 | 5377⚠ | 0.006 |
| /search | mobile | 75 | 100 | 100 | 66⚠ | 4777⚠ | 0.006 |
| /exam | mobile | 78 | 100 | 100 | 100 | 4462⚠ | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 66⚠ | 100 | 100 | 100 | 6901⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 64⚠ | 100 | 100 | 100 | 7201⚠ | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 71 | 100 | 100 | 100 | 5822⚠ | 0.014 |
| /exam/civil-construction-1/primary/h26-a | mobile | 72 | 100 | 100 | 100 | 5942⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 74 | 100 | 100 | 100 | 5449⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 86 | 100 | 100 | 100 | 3751⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 72 | 100 | 100 | 100 | 5576⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 72 | 100 | 100 | 100 | 5771⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 66⚠ | 100 | 100 | 100 | 7951⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 74 | 100 | 100 | 100 | 5353⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 60⚠ | 100 | 100 | 100 | 6901⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 73 | 100 | 100 | 100 | 5368⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 96 | 100 | 100 | 100 | 2626⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 95 | 100 | 100 | 100 | 2851⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 74 | 100 | 100 | 100 | 5237⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 91 | 100 | 100 | 100 | 3451⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 72 | 100 | 100 | 100 | 5488⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 73 | 100 | 100 | 100 | 5327⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 74 | 100 | 100 | 100 | 5262⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **TBT** = 509ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.225 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **TBT** = 622ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 5377ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3065ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4777ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3124ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4462ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2992ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 6901ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3199ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3324ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5822ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3582ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5942ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3245ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 5449ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3085ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 3751ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 1849ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5576ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3335ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5771ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3375ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 7951ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3319ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5353ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3120ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 6901ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3192ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **TBT** = 311ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 5368ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3340ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 1851ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 2851ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5237ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3192ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 3451ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5488ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3202ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 5327ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3253ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5262ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3108ms (閾値: ≤1800ms)