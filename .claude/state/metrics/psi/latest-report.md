# PSI 計測レポート — 2026-09-24

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **52件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 100 | 949 | 0 |
| /search | desktop | 73 | 100 | 100 | 66⚠ | 1385 | 0.73⚠ |
| /exam | desktop | 99 | 100 | 96 | 100 | 940 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 628 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 96 | 100 | 100 | 782 | 0.008 |
| /exam/civil-construction-1/primary/r07-a | desktop | 87 | 96 | 100 | 100 | 899 | 0.23⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 86 | 98 | 100 | 100 | 902 | 0.158⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 96 | 100 | 100 | 629 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 78 | 96 | 100 | 100 | 596 | 0.111⚠ |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 69⚠ | 96 | 100 | 100 | 964 | 0.119⚠ |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 821 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 805 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 96 | 100 | 100 | 621 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 96 | 100 | 666 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 72 | 100 | 100 | 100 | 773 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 555 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 96 | 100 | 100 | 511 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 95 | 100 | 100 | 100 | 846 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 686 | 0.018 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 98 | 100 | 100 | 714 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 98 | 98 | 100 | 100 | 724 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 98 | 100 | 100 | 724 | 0.004 |
| / | mobile | 87 | 100 | 96 | 100 | 3977⚠ | 0 |
| /search | mobile | 66⚠ | 100 | 100 | 66⚠ | 8185⚠ | 0 |
| /exam | mobile | 93 | 100 | 96 | 100 | 3093⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 66⚠ | 100 | 100 | 100 | 7801⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 66⚠ | 96 | 100 | 100 | 8176⚠ | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 70 | 96 | 100 | 100 | 5502⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 96 | 98 | 100 | 100 | 2626⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 75 | 96 | 100 | 100 | 4783⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 73 | 96 | 100 | 100 | 5040⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 76 | 96 | 100 | 100 | 4944⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 95 | 100 | 100 | 100 | 2626⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 73 | 100 | 100 | 100 | 5311⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 97 | 96 | 100 | 100 | 2251 | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 75 | 100 | 100 | 100 | 5113⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 74 | 100 | 100 | 100 | 4923⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 75 | 100 | 100 | 100 | 4824⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 53⚠ | 96 | 100 | 100 | 7726⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 75 | 100 | 100 | 100 | 4860⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 99 | 100 | 100 | 100 | 1951 | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 76 | 98 | 100 | 100 | 5005⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 97 | 98 | 100 | 100 | 2251 | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 97 | 98 | 100 | 100 | 2326 | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.73 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **CLS** = 0.111 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **TBT** = 414ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **CLS** = 0.119 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **TBT** = 642ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **TBT** = 552ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 3977ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 8185ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3345ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 3093ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 7801ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3203ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 8176ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3319ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5502ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3548ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 1823ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 4783ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3186ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5040ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3524ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 4944ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3125ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 1827ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5311ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3339ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5113ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3181ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4923ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3370ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 4824ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3265ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 7726ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3362ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **TBT** = 505ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 4860ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3255ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5005ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 2989ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。