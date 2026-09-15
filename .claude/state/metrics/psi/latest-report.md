# PSI 計測レポート — 2026-09-15

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **65件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 661 | 0 |
| /search | desktop | 71 | 100 | 100 | 66⚠ | 1092 | 0.715⚠ |
| /exam | desktop | 96 | 100 | 96 | 100 | 758 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 619 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 87 | 96 | 100 | 100 | 820 | 0.01 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 96 | 100 | 100 | 876 | 0.23⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 98 | 100 | 100 | 982 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 96 | 96 | 100 | 100 | 812 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 100 | 96 | 100 | 100 | 720 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 96 | 100 | 100 | 690 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 681 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 944 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 71 | 96 | 100 | 100 | 991 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 66⚠ | 100 | 100 | 100 | 694 | 0.215⚠ |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 95 | 100 | 100 | 100 | 688 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 554 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 95 | 96 | 100 | 100 | 698 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 96 | 100 | 100 | 100 | 755 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 97 | 100 | 100 | 100 | 784 | 0.018 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 98 | 100 | 100 | 855 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 98 | 100 | 100 | 646 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 98 | 100 | 100 | 729 | 0.004 |
| / | mobile | 71 | 100 | 96 | 100 | 6055⚠ | 0 |
| /search | mobile | 72 | 100 | 100 | 66⚠ | 5552⚠ | 0 |
| /exam | mobile | 73 | 100 | 96 | 100 | 4928⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 74 | 100 | 100 | 100 | 4915⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 74 | 96 | 100 | 100 | 5207⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 81 | 96 | 100 | 100 | 2626⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 88 | 98 | 100 | 100 | 3002⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 53⚠ | 96 | 100 | 100 | 7501⚠ | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 70 | 96 | 100 | 100 | 4352⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 60⚠ | 96 | 100 | 100 | 8026⚠ | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 72 | 100 | 100 | 100 | 4635⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 69⚠ | 100 | 100 | 100 | 5386⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 64⚠ | 96 | 100 | 100 | 7726⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 71 | 100 | 100 | 100 | 4414⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 80 | 100 | 100 | 100 | 3076⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 65⚠ | 100 | 100 | 100 | 8251⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 69⚠ | 96 | 100 | 100 | 4774⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 74 | 100 | 100 | 100 | 4825⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 73 | 100 | 100 | 100 | 5189⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 96 | 98 | 100 | 100 | 2553⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 98 | 98 | 100 | 100 | 2251 | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 77 | 98 | 100 | 100 | 4884⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.715 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (desktop): **TBT** = 302ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (desktop): **TBT** = 838ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (desktop): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (desktop): **CLS** = 0.215 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (desktop): **TBT** = 567ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 6055ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2974ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5552ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3093ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4928ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2942ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 4915ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3132ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5207ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3266ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 2101ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **TBT** = 519ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 3002ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 1867ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 7501ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3263ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **TBT** = 546ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 4352ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3526ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **TBT** = 318ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 8026ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3188ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **TBT** = 307ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 4635ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3314ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5386ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3310ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 7726ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3295ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 4414ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3067ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **TBT** = 350ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 3076ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 1881ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **TBT** = 463ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 8251ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3277ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 4774ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3069ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **TBT** = 333ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 4825ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3197ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5189ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3139ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 2553ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 4884ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 2805ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。