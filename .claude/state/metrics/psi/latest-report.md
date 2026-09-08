# PSI 計測レポート — 2026-09-08

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **70件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 77 | 100 | 96 | 100 | 1003 | 0 |
| /search | desktop | 73 | 100 | 100 | 66⚠ | 1043 | 0.715⚠ |
| /exam | desktop | 86 | 100 | 96 | 100 | 938 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 641 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 98 | 96 | 100 | 100 | 772 | 0.01 |
| /exam/civil-construction-1/primary/r07-a | desktop | 81 | 96 | 100 | 100 | 861 | 0.23⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 98 | 100 | 100 | 901 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 99 | 96 | 100 | 100 | 683 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 96 | 100 | 100 | 824 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 99 | 96 | 100 | 100 | 788 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 62⚠ | 100 | 100 | 100 | 844 | 0.228⚠ |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 666 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 96 | 100 | 100 | 623 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 861 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 95 | 100 | 100 | 100 | 621 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 405 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 95 | 96 | 100 | 100 | 572 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 691 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 97 | 100 | 100 | 100 | 771 | 0.018 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 98 | 100 | 100 | 623 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 98 | 100 | 100 | 746 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 98 | 100 | 100 | 720 | 0.004 |
| / | mobile | 68⚠ | 100 | 96 | 100 | 6127⚠ | 0 |
| /search | mobile | 57⚠ | 100 | 100 | 66⚠ | 6308⚠ | 0.409⚠ |
| /exam | mobile | 72 | 100 | 96 | 100 | 4908⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 65⚠ | 100 | 100 | 100 | 7727⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 67⚠ | 96 | 100 | 100 | 6901⚠ | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 69⚠ | 96 | 100 | 100 | 5537⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 81 | 98 | 100 | 100 | 3301⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 77 | 96 | 100 | 100 | 4813⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 60⚠ | 96 | 100 | 100 | 8177⚠ | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 65⚠ | 96 | 100 | 100 | 7511⚠ | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 70 | 100 | 100 | 100 | 5147⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 63⚠ | 100 | 100 | 100 | 7951⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 60⚠ | 96 | 100 | 100 | 7576⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 74 | 100 | 100 | 100 | 4878⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 72 | 100 | 100 | 100 | 4959⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 64⚠ | 100 | 100 | 100 | 8101⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 60⚠ | 96 | 100 | 100 | 7576⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 78 | 100 | 100 | 100 | 4537⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 73 | 100 | 100 | 100 | 4955⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 78 | 98 | 100 | 100 | 4415⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 76 | 98 | 100 | 100 | 4649⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 65⚠ | 98 | 100 | 100 | 7576⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **TBT** = 485ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.715 (閾値: ≤0.1)
- `https://doboku-note.com/exam` (desktop): **TBT** = 303ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **CLS** = 0.228 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **TBT** = 707ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 6127ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3022ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 6308ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.409 (閾値: ≤0.1)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4908ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2887ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 7727ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3250ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 6901ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3264ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5537ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3476ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 3301ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 1842ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **TBT** = 404ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 4813ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 2941ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 8177ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3515ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 7511ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3021ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5147ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3154ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 7951ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3028ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 7576ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3147ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **TBT** = 306ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 4878ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 2888ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4959ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3157ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 8101ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3284ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 7576ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3293ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **TBT** = 309ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 4537ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 2975ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 4955ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3024ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 4415ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 2730ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 4649ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3025ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 7576ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3000ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。