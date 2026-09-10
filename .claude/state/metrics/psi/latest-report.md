# PSI 計測レポート — 2026-09-10

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **60件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 100 | 778 | 0 |
| /search | desktop | 50⚠ | 100 | 100 | 66⚠ | 1121 | 0.715⚠ |
| /exam | desktop | 99 | 100 | 96 | 100 | 874 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 801 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 96 | 100 | 100 | 963 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 96 | 100 | 100 | 801 | 0.23⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 93 | 98 | 100 | 100 | 803 | 0.158⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 91 | 96 | 100 | 100 | 895 | 0.005 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 95 | 96 | 100 | 100 | 580 | 0.111⚠ |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 69⚠ | 96 | 100 | 100 | 981 | 0.119⚠ |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 85 | 100 | 100 | 100 | 769 | 0.232⚠ |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 810 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 96 | 100 | 100 | 621 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 701 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 96 | 100 | 100 | 100 | 689 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 641 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 96 | 100 | 100 | 581 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 784 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 95 | 100 | 100 | 100 | 848 | 0.018 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 98 | 100 | 100 | 601 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 98 | 98 | 100 | 100 | 796 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 98 | 100 | 100 | 541 | 0.028 |
| / | mobile | 70 | 100 | 96 | 100 | 6077⚠ | 0 |
| /search | mobile | 63⚠ | 100 | 100 | 66⚠ | 8036⚠ | 0 |
| /exam | mobile | 76 | 100 | 96 | 100 | 4983⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 65⚠ | 100 | 100 | 100 | 7726⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 85 | 96 | 100 | 100 | 3526⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 64⚠ | 96 | 100 | 100 | 9001⚠ | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 72 | 98 | 100 | 100 | 5747⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 74 | 96 | 100 | 100 | 4866⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 62⚠ | 96 | 100 | 100 | 8027⚠ | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 66⚠ | 96 | 100 | 100 | 7814⚠ | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 97 | 100 | 100 | 100 | 2401 | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 74 | 100 | 100 | 100 | 5237⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 63⚠ | 96 | 100 | 100 | 7727⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 70 | 100 | 100 | 100 | 5253⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 74 | 100 | 100 | 100 | 4225⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 74 | 100 | 100 | 100 | 2551⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 63⚠ | 96 | 100 | 100 | 7501⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 98 | 100 | 100 | 100 | 2251 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 73 | 100 | 100 | 100 | 5233⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 77 | 98 | 100 | 100 | 4860⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 98 | 98 | 100 | 100 | 2040 | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 77 | 98 | 100 | 100 | 4695⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.715 (閾値: ≤0.1)
- `https://doboku-note.com/search` (desktop): **TBT** = 612ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **CLS** = 0.111 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **CLS** = 0.119 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **TBT** = 682ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **CLS** = 0.232 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 6077ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3002ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 8036ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3165ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4983ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2916ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 7726ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3299ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 3526ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 9001ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3556ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5747ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3154ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 4866ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3000ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 8027ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3510ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 7814ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3261ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 1823ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5237ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3266ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 7727ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3285ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5253ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3185ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4225ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3198ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 1898ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **TBT** = 966ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 7501ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3220ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5233ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3136ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 4860ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 2954ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 4695ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 2892ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。