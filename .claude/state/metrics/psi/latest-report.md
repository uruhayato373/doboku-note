# PSI 計測レポート — 2026-09-13

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **48件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 721 | 0 |
| /search | desktop | 65⚠ | 100 | 100 | 66⚠ | 1281 | 0.715⚠ |
| /exam | desktop | 89 | 100 | 96 | 100 | 933 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 88 | 100 | 100 | 100 | 606 | 0.234⚠ |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 96 | 100 | 100 | 961 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 99 | 96 | 100 | 100 | 826 | 0.004 |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 98 | 100 | 100 | 881 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 96 | 100 | 100 | 615 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 80 | 96 | 100 | 100 | 614 | 0.111⚠ |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 96 | 100 | 100 | 786 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 803 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 82 | 100 | 100 | 100 | 816 | 0.161⚠ |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 96 | 100 | 100 | 659 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 517 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 96 | 100 | 100 | 100 | 669 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 98 | 100 | 100 | 100 | 571 | 0.015 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 99 | 96 | 100 | 100 | 565 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 98 | 100 | 100 | 100 | 668 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 95 | 100 | 100 | 100 | 779 | 0.018 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 98 | 100 | 100 | 601 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 98 | 100 | 100 | 637 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 98 | 100 | 100 | 595 | 0.004 |
| / | mobile | 73 | 100 | 96 | 100 | 6052⚠ | 0 |
| /search | mobile | 65⚠ | 100 | 100 | 66⚠ | 8110⚠ | 0 |
| /exam | mobile | 79 | 100 | 96 | 100 | 4212⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 66⚠ | 100 | 100 | 100 | 7576⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 97 | 96 | 100 | 100 | 2326 | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 62⚠ | 96 | 100 | 100 | 8701⚠ | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 72 | 98 | 100 | 100 | 5661⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 75 | 96 | 100 | 100 | 4847⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 65⚠ | 96 | 100 | 100 | 8101⚠ | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 80 | 96 | 100 | 100 | 2134 | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 66⚠ | 100 | 100 | 100 | 5509⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 98 | 100 | 100 | 100 | 1963 | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 79 | 96 | 100 | 100 | 4562⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 77 | 100 | 100 | 100 | 4869⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 74 | 100 | 100 | 100 | 4973⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 99 | 100 | 100 | 100 | 2176 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 100 | 96 | 100 | 100 | 1577 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 98 | 100 | 100 | 100 | 2036 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 74 | 100 | 100 | 100 | 5105⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 100 | 98 | 100 | 100 | 1801 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 66⚠ | 98 | 100 | 100 | 7726⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 78 | 98 | 100 | 100 | 4681⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.715 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **CLS** = 0.234 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **CLS** = 0.111 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **TBT** = 373ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **CLS** = 0.161 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 6052ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2734ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 8110ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3121ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4212ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 3107ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 7576ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3025ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 8701ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3312ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5661ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3077ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 4847ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 2995ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 8101ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3426ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 1867ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **TBT** = 666ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5509ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3336ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4562ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 2832ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 4869ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 2833ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4973ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3273ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5105ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3142ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 7726ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3247ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 4681ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 2949ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。