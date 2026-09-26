# PSI 計測レポート — 2026-09-26

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **54件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 100 | 861 | 0 |
| /search | desktop | 54⚠ | 100 | 100 | 66⚠ | 1077 | 0.73⚠ |
| /exam | desktop | 100 | 100 | 96 | 100 | 659 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 96 | 100 | 628 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 96 | 100 | 100 | 781 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 82 | 96 | 96 | 100 | 821 | 0.23⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 98 | 100 | 100 | 790 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 96 | 96 | 100 | 621 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 92 | 96 | 96 | 100 | 581 | 0.111⚠ |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 91 | 96 | 96 | 100 | 754 | 0.119⚠ |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 88 | 100 | 96 | 100 | 781 | 0.232⚠ |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 96 | 100 | 741 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 96 | 100 | 100 | 601 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 96 | 100 | 741 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 95 | 100 | 96 | 100 | 661 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 586 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 96 | 96 | 100 | 734 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 629 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 801 | 0.018 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 98 | 100 | 100 | 774 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 98 | 100 | 100 | 628 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 98 | 100 | 100 | 722 | 0.004 |
| / | mobile | 71 | 100 | 96 | 100 | 6136⚠ | 0 |
| /search | mobile | 65⚠ | 100 | 100 | 66⚠ | 5695⚠ | 0 |
| /exam | mobile | 77 | 100 | 96 | 100 | 4887⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 66⚠ | 100 | 96 | 100 | 7726⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 66⚠ | 96 | 100 | 100 | 8251⚠ | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 72 | 96 | 100 | 100 | 5555⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 93 | 98 | 96 | 100 | 2401 | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 98 | 96 | 96 | 100 | 2326 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 74 | 96 | 100 | 100 | 4926⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 76 | 96 | 96 | 100 | 4887⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 74 | 100 | 100 | 100 | 5288⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 72 | 100 | 100 | 100 | 5389⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 72 | 96 | 96 | 100 | 4087⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 82 | 100 | 100 | 100 | 3226⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 75 | 100 | 96 | 100 | 4848⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 75 | 100 | 96 | 100 | 4873⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 97 | 96 | 100 | 100 | 2476 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 98 | 100 | 96 | 100 | 2251 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 70 | 100 | 100 | 100 | 5278⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 68⚠ | 98 | 96 | 100 | 5086⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 75 | 98 | 100 | 100 | 4949⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 75 | 98 | 100 | 100 | 4918⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.73 (閾値: ≤0.1)
- `https://doboku-note.com/search` (desktop): **TBT** = 487ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **CLS** = 0.111 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **CLS** = 0.119 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **CLS** = 0.232 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 6136ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2980ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5695ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **TBT** = 513ms (閾値: ≤300ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4887ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2780ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 7726ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3180ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 8251ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3272ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5555ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3524ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 1846ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 4926ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3412ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 4887ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3093ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5288ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3244ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5389ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3260ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4087ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3168ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **TBT** = 364ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **TBT** = 396ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4848ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3263ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 4873ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3257ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5278ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3150ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5086ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3083ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **TBT** = 312ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 4949ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3121ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 4918ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 2995ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。