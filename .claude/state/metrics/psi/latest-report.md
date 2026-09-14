# PSI 計測レポート — 2026-09-14

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **48件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 724 | 0 |
| /search | desktop | 75 | 100 | 100 | 66⚠ | 1041 | 0.715⚠ |
| /exam | desktop | 100 | 100 | 96 | 100 | 573 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 98 | 100 | 100 | 100 | 783 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 96 | 96 | 100 | 100 | 992 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 99 | 96 | 100 | 100 | 901 | 0.004 |
| /exam/civil-construction-1/primary/h26-a | desktop | 91 | 98 | 100 | 100 | 661 | 0.158⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 96 | 100 | 100 | 662 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 90 | 96 | 100 | 100 | 536 | 0.107⚠ |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 76 | 96 | 100 | 100 | 973 | 0.119⚠ |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 697 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 861 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 96 | 100 | 100 | 846 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 86 | 100 | 100 | 100 | 649 | 0.215⚠ |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 96 | 100 | 100 | 100 | 582 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 511 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 99 | 96 | 100 | 100 | 722 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 98 | 100 | 100 | 100 | 1175 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 82 | 100 | 100 | 100 | 892 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 98 | 100 | 100 | 723 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 99 | 98 | 100 | 100 | 741 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 98 | 100 | 100 | 745 | 0.004 |
| / | mobile | 88 | 100 | 96 | 100 | 2927⚠ | 0 |
| /search | mobile | 55⚠ | 100 | 100 | 66⚠ | 5251⚠ | 0.409⚠ |
| /exam | mobile | 66⚠ | 100 | 96 | 100 | 8162⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 77 | 100 | 100 | 100 | 4795⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 73 | 96 | 100 | 100 | 5254⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 62⚠ | 96 | 100 | 100 | 8851⚠ | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 71 | 98 | 100 | 100 | 5483⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 92 | 96 | 100 | 100 | 2064 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 98 | 96 | 100 | 100 | 2251 | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 87 | 96 | 100 | 100 | 2334 | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 71 | 100 | 100 | 100 | 5226⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 74 | 100 | 100 | 100 | 5079⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 76 | 96 | 100 | 100 | 4798⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 76 | 100 | 100 | 100 | 4899⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 76 | 100 | 100 | 100 | 4775⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 75 | 100 | 100 | 100 | 4931⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 98 | 96 | 100 | 100 | 2326 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 77 | 100 | 100 | 100 | 4596⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 98 | 100 | 100 | 100 | 2401 | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 100 | 98 | 100 | 100 | 1802 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 73 | 98 | 100 | 100 | 4790⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 74 | 98 | 100 | 100 | 4868⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.715 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **CLS** = 0.107 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **CLS** = 0.119 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **TBT** = 405ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (desktop): **CLS** = 0.215 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (desktop): **TBT** = 385ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 2927ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **TBT** = 308ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5251ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.409 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **FCP** = 2703ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam` (mobile): **LCP** = 8162ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2746ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 4795ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3079ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5254ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3279ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 8851ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3325ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5483ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3048ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **TBT** = 455ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5226ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3206ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5079ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3055ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4798ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3100ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 4899ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 2856ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4775ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3016ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 4931ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3256ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 4596ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3014ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 4790ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3387ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 4868ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 2966ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。