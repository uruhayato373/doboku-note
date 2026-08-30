# PSI 計測レポート — 2026-08-30

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- 診断上のしきい値超過: **51件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **1件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 609 | 0.004 |
| /search | desktop | 76 | 100 | 100 | 66⚠ | 1001 | 0.583⚠ |
| /exam | desktop | 100 | 100 | 100 | 100 | 565 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 624 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 98 | 96 | 100 | 100 | 1069 | 0.01 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 96 | 100 | 100 | 847 | 0.225⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 89 | 98 | 100 | 100 | 1898 | 0.007 |
| /exam/civil-construction-1/secondary/r07 | desktop | 95 | 96 | 100 | 100 | 1127 | 0.021 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 100 | 96 | 100 | 100 | 681 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 96 | 100 | 100 | 553 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 704 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 727 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 98 | 96 | 100 | 100 | 1137 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 649 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 94 | 100 | 100 | 100 | 803 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 552 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 96 | 100 | 100 | 745 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 99 | 100 | 100 | 100 | 1009 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 770 | 0.018 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 97 | 98 | 100 | 100 | 837 | 0.024 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 98 | 98 | 100 | 100 | 743 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 98 | 100 | 100 | 1036 | 0.004 |
| / | mobile | 90 | 100 | 100 | 100 | 3526⚠ | 0.006 |
| /search | mobile | 56⚠ | 100 | 100 | 66⚠ | 5809⚠ | 0.599⚠ |
| /exam | mobile | 77 | 100 | 100 | 100 | 4692⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 77 | 96 | 100 | 100 | 4782⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 75 | 96 | 100 | 100 | 5107⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 73 | 96 | 100 | 100 | 5367⚠ | 0.027 |
| /exam/civil-construction-1/primary/h26-a | mobile | 71 | 98 | 100 | 100 | 5588⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 77 | 96 | 100 | 100 | 4659⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 75 | 96 | 100 | 100 | 4952⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 77 | 96 | 100 | 100 | 4742⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 75 | 96 | 100 | 100 | 5124⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 67⚠ | 96 | 100 | 100 | 6451⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 78 | 96 | 100 | 100 | 4663⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 94 | 96 | 100 | 100 | 2931⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 76 | 100 | 100 | 100 | 4738⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 65⚠ | 100 | 100 | 100 | 7801⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 77 | 96 | 100 | 100 | 4468⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 78 | 100 | 100 | 100 | 4568⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 77 | 100 | 100 | 100 | 4933⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 77 | 98 | 100 | 100 | 4830⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 78 | 98 | 100 | 100 | 4587⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 79 | 98 | 100 | 100 | 4585⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.583 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.225 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 3526ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5809ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.599 (閾値: ≤0.1)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4692ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2982ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 4782ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 2966ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5107ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3072ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5367ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3441ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5588ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3295ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 4659ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 2937ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 4952ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3408ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 4742ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 2966ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5124ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3084ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 6451ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3278ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4663ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 2933ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 2931ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4738ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3109ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 7801ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3176ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 4468ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 2851ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 4568ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 2815ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 4933ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 2853ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 4830ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 2794ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 4587ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 2788ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 4585ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 2790ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。CrUX の供給が戻るのを待つか、judgment.primary_source を lab 中央値ベースへ変更して原則を書き換える。