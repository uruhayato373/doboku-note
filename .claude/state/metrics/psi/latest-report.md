# PSI 計測レポート — 2026-09-11

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **53件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 98 | 100 | 96 | 100 | 812 | 0 |
| /search | desktop | 75 | 100 | 100 | 66⚠ | 1047 | 0.715⚠ |
| /exam | desktop | 99 | 100 | 96 | 100 | 834 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 632 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 84 | 96 | 100 | 100 | 901 | 0.01 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 96 | 100 | 100 | 806 | 0.23⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 100 | 98 | 100 | 100 | 801 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 99 | 96 | 100 | 100 | 708 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 96 | 100 | 100 | 861 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 96 | 100 | 100 | 631 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 867 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 97 | 100 | 100 | 100 | 942 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 96 | 100 | 100 | 642 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 491 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 93 | 100 | 100 | 100 | 637 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 649 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 96 | 100 | 100 | 621 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 99 | 100 | 100 | 100 | 665 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 793 | 0.018 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 98 | 100 | 100 | 621 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 98 | 100 | 100 | 668 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 97 | 98 | 100 | 100 | 759 | 0.004 |
| / | mobile | 65⚠ | 100 | 96 | 100 | 8027⚠ | 0 |
| /search | mobile | 67⚠ | 100 | 100 | 66⚠ | 7813⚠ | 0 |
| /exam | mobile | 79 | 100 | 96 | 100 | 4375⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 77 | 100 | 100 | 100 | 4627⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 74 | 96 | 100 | 100 | 5146⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 71 | 96 | 100 | 100 | 5514⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 71 | 98 | 100 | 100 | 5809⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 74 | 96 | 100 | 100 | 4925⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 74 | 96 | 100 | 100 | 5116⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 76 | 96 | 100 | 100 | 4602⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 72 | 100 | 100 | 100 | 5155⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 74 | 100 | 100 | 100 | 5146⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 73 | 96 | 100 | 100 | 3881⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 71 | 100 | 100 | 100 | 5258⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 75 | 100 | 100 | 100 | 4723⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 78 | 100 | 100 | 100 | 4639⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 75 | 96 | 100 | 100 | 4539⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 97 | 100 | 100 | 100 | 2401 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 82 | 100 | 100 | 100 | 2140 | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 75 | 98 | 100 | 100 | 4754⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 51⚠ | 98 | 100 | 100 | 7576⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 76 | 98 | 100 | 100 | 4515⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.715 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (desktop): **TBT** = 346ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8027ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2982ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 7813ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3105ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4375ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 3099ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 4627ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 2876ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5146ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3003ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5514ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3430ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5809ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3287ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 4925ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3138ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5116ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3419ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 4602ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 2882ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5155ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3198ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5146ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3017ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 3881ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 2945ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **TBT** = 389ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5258ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3177ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4723ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3011ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 4639ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 2964ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 4539ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 2733ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **TBT** = 623ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 4754ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 2702ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **Performance** = 51 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 7576ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3483ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **TBT** = 575ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 4515ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 2739ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。