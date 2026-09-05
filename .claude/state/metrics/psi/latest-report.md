# PSI 計測レポート — 2026-09-05

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **71件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 97 | 100 | 100 | 100 | 837 | 0.004 |
| /search | desktop | 73 | 100 | 100 | 66⚠ | 1349 | 0.583⚠ |
| /exam | desktop | 81 | 100 | 100 | 100 | 927 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 98 | 100 | 100 | 100 | 648 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 96 | 100 | 100 | 923 | 0.01 |
| /exam/civil-construction-1/primary/r07-a | desktop | 87 | 96 | 100 | 100 | 921 | 0.23⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 80 | 98 | 100 | 100 | 1197 | 0.158⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 78 | 96 | 100 | 100 | 863 | 0.005 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 60⚠ | 96 | 100 | 100 | 1225 | 0.107⚠ |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 99 | 96 | 100 | 100 | 621 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 64⚠ | 100 | 100 | 100 | 1277 | 0.226⚠ |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 706 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 96 | 100 | 100 | 1021 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 656 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 95 | 100 | 100 | 100 | 792 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 591 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 99 | 96 | 100 | 100 | 656 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 90 | 100 | 100 | 100 | 781 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 741 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 98 | 100 | 100 | 813 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 84 | 98 | 100 | 100 | 1130 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 78 | 98 | 100 | 100 | 1255 | 0.004 |
| / | mobile | 65⚠ | 100 | 100 | 100 | 7801⚠ | 0 |
| /search | mobile | 51⚠ | 100 | 100 | 66⚠ | 5210⚠ | 0.599⚠ |
| /exam | mobile | 76 | 100 | 100 | 100 | 4763⚠ | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 66⚠ | 100 | 100 | 100 | 7126⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 73 | 96 | 100 | 100 | 5205⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 68⚠ | 96 | 100 | 100 | 2551⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 71 | 98 | 100 | 100 | 5723⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 76 | 96 | 100 | 100 | 4843⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 81 | 96 | 100 | 100 | 2551⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 73 | 96 | 100 | 100 | 4774⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 74 | 100 | 100 | 100 | 5366⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 64⚠ | 100 | 100 | 100 | 5518⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 57⚠ | 96 | 100 | 100 | 7501⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 66⚠ | 100 | 100 | 100 | 7965⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 74 | 100 | 100 | 100 | 4871⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 71 | 100 | 100 | 100 | 4993⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 76 | 96 | 100 | 100 | 4685⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 99 | 100 | 100 | 100 | 2037 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 62⚠ | 100 | 100 | 100 | 8326⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 50⚠ | 98 | 100 | 100 | 7352⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 73 | 98 | 100 | 100 | 4901⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 98 | 98 | 100 | 100 | 2326 | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.583 (閾値: ≤0.1)
- `https://doboku-note.com/exam` (desktop): **TBT** = 375ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (desktop): **TBT** = 479ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **CLS** = 0.107 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **TBT** = 878ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **CLS** = 0.226 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **TBT** = 493ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (desktop): **TBT** = 333ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (desktop): **TBT** = 422ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7801ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3113ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 51 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5210ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.599 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **FCP** = 2832ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4763ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2822ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 7126ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3133ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5205ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3287ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 1877ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **TBT** = 1442ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5723ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3247ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 4843ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 2970ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 1852ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **TBT** = 556ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 4774ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3126ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5366ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3248ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5518ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3359ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 7501ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3056ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **TBT** = 392ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 7965ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3108ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4871ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3290ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 4993ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3339ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 4685ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 2990ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 8326ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3360ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 7352ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3106ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **TBT** = 691ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 4901ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3147ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。