# PSI 計測レポート — 2026-09-16

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **58件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 96 | 100 | 96 | 100 | 846 | 0 |
| /search | desktop | 71 | 100 | 100 | 66⚠ | 1311 | 0.715⚠ |
| /exam | desktop | 98 | 100 | 96 | 100 | 1097 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 782 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 85 | 96 | 100 | 100 | 889 | 0.01 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 96 | 100 | 100 | 851 | 0.23⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 70 | 98 | 100 | 100 | 1030 | 0.158⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 96 | 100 | 100 | 641 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 96 | 96 | 100 | 100 | 574 | 0.111⚠ |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 95 | 96 | 100 | 100 | 901 | 0.119⚠ |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 693 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 944 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 87 | 96 | 100 | 100 | 700 | 0.059 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 652 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 634 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 588 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 96 | 100 | 100 | 615 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 67⚠ | 100 | 100 | 100 | 1001 | 0.107⚠ |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 826 | 0.038 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 70 | 98 | 100 | 100 | 949 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 98 | 100 | 100 | 662 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 98 | 100 | 100 | 810 | 0.004 |
| / | mobile | 95 | 100 | 96 | 100 | 2777⚠ | 0 |
| /search | mobile | 54⚠ | 100 | 100 | 66⚠ | 5475⚠ | 0.409⚠ |
| /exam | mobile | 84 | 100 | 96 | 100 | 4451⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 97 | 100 | 100 | 100 | 2252 | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 58⚠ | 96 | 100 | 100 | 5727⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 58⚠ | 96 | 100 | 100 | 9076⚠ | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 72 | 98 | 100 | 100 | 5727⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 97 | 96 | 100 | 100 | 2326 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 70 | 96 | 100 | 100 | 4351⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 95 | 96 | 100 | 100 | 2779⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 67⚠ | 100 | 100 | 100 | 4511⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 96 | 100 | 100 | 100 | 2551⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 72 | 96 | 100 | 100 | 4972⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 75 | 100 | 100 | 100 | 5133⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 72 | 100 | 100 | 100 | 4947⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 74 | 100 | 100 | 100 | 5006⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 74 | 96 | 100 | 100 | 4704⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 74 | 100 | 100 | 100 | 4993⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 70 | 100 | 100 | 100 | 5249⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 75 | 98 | 100 | 100 | 4948⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 73 | 98 | 100 | 100 | 4920⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 99 | 98 | 100 | 100 | 2036 | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.715 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (desktop): **TBT** = 324ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **TBT** = 510ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **CLS** = 0.111 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **CLS** = 0.119 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (desktop): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (desktop): **CLS** = 0.107 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (desktop): **TBT** = 896ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (desktop): **TBT** = 876ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 2777ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5475ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.409 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **FCP** = 3056ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4451ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5727ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3448ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **TBT** = 481ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 9076ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3511ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **TBT** = 302ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5727ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3285ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 4351ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3601ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **TBT** = 304ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 2779ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 1822ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 4511ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3412ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **TBT** = 407ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4972ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3270ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5133ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3190ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4947ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3336ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5006ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3287ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 4704ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 2991ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 4993ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3150ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5249ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3249ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 4948ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 2923ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 4920ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3268ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。