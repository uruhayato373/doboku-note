# PSI 計測レポート — 2026-08-31

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- 診断上のしきい値超過: **59件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **1件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 98 | 100 | 100 | 100 | 1159 | 0.004 |
| /search | desktop | 55⚠ | 100 | 100 | 66⚠ | 1177 | 0.583⚠ |
| /exam | desktop | 100 | 100 | 100 | 100 | 656 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 684 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 100 | 96 | 100 | 100 | 808 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 96 | 100 | 100 | 841 | 0.225⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 97 | 98 | 100 | 100 | 1233 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 99 | 96 | 100 | 100 | 1013 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 96 | 96 | 100 | 100 | 576 | 0.111⚠ |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 96 | 100 | 100 | 581 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 85 | 100 | 100 | 100 | 1159 | 0.23⚠ |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 820 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 87 | 96 | 100 | 100 | 1147 | 0.059 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 676 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 661 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 601 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 99 | 96 | 100 | 100 | 608 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 97 | 100 | 100 | 100 | 1206 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 98 | 100 | 100 | 100 | 970 | 0.018 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 98 | 98 | 100 | 100 | 1061 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 98 | 100 | 100 | 729 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 98 | 100 | 100 | 747 | 0.004 |
| / | mobile | 64⚠ | 100 | 100 | 100 | 10578⚠ | 0 |
| /search | mobile | 49⚠ | 100 | 100 | 66⚠ | 5809⚠ | 0.599⚠ |
| /exam | mobile | 95 | 100 | 100 | 100 | 2902⚠ | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 76 | 96 | 100 | 100 | 4789⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 71 | 96 | 100 | 100 | 5269⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 73 | 96 | 100 | 100 | 4812⚠ | 0.027 |
| /exam/civil-construction-1/primary/h26-a | mobile | 72 | 98 | 100 | 100 | 5685⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 65⚠ | 96 | 100 | 100 | 9601⚠ | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 76 | 96 | 100 | 100 | 4795⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 78 | 96 | 100 | 100 | 4642⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 74 | 96 | 100 | 100 | 5150⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 75 | 96 | 100 | 100 | 5132⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 65⚠ | 96 | 100 | 100 | 7576⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 78 | 96 | 100 | 100 | 2693⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 57⚠ | 100 | 100 | 100 | 7726⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 63⚠ | 100 | 100 | 100 | 7951⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 98 | 96 | 100 | 100 | 2251 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 78 | 100 | 100 | 100 | 4521⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 77 | 100 | 100 | 100 | 4926⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 66⚠ | 98 | 100 | 100 | 7351⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 77 | 98 | 100 | 100 | 4541⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 80 | 98 | 100 | 100 | 4423⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.583 (閾値: ≤0.1)
- `https://doboku-note.com/search` (desktop): **TBT** = 455ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.225 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **CLS** = 0.111 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 10578ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3114ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 49 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5809ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.599 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **FCP** = 2703ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 2902ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 4789ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3132ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5269ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3289ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 4812ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3466ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5685ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3292ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 9601ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 2984ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 4795ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3252ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 4642ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 2930ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5150ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3125ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5132ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3091ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 7576ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3124ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 2693ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **TBT** = 694ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 7726ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3339ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **TBT** = 372ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 7951ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3294ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 4521ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 2802ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 4926ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 2800ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 7351ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 2991ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 4541ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3003ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 4423ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 2779ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。CrUX の供給が戻るのを待つか、judgment.primary_source を lab 中央値ベースへ変更して原則を書き換える。