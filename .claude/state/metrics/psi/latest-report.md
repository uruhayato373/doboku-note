# PSI 計測レポート — 2026-09-29

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **70件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 74 | 100 | 96 | 100 | 1032 | 0 |
| /search | desktop | 89 | 100 | 100 | 66⚠ | 942 | 0.004 |
| /exam | desktop | 99 | 100 | 96 | 100 | 860 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 99 | 100 | 100 | 100 | 663 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 100 | 100 | 100 | 100 | 787 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 100 | 100 | 100 | 835 | 0.23⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 100 | 100 | 100 | 100 | 822 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 100 | 100 | 100 | 620 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 818 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 92 | 100 | 100 | 100 | 753 | 0.119⚠ |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 822 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 726 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 100 | 100 | 100 | 651 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 96 | 100 | 100 | 100 | 605 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 79 | 100 | 100 | 100 | 733 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 556 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 91 | 100 | 100 | 100 | 830 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 630 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 97 | 100 | 100 | 100 | 777 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 57⚠ | 100 | 100 | 100 | 1846 | 0.017 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 89 | 100 | 100 | 100 | 654 | 0.011 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 71 | 100 | 100 | 100 | 1074 | 0.025 |
| / | mobile | 65⚠ | 100 | 96 | 100 | 8627⚠ | 0 |
| /search | mobile | 68⚠ | 100 | 100 | 66⚠ | 6526⚠ | 0.006 |
| /exam | mobile | 93 | 100 | 96 | 100 | 3093⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 65⚠ | 100 | 100 | 100 | 7876⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 72 | 100 | 100 | 100 | 5377⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 57⚠ | 100 | 100 | 100 | 9676⚠ | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 65⚠ | 100 | 100 | 100 | 3004⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 57⚠ | 100 | 100 | 100 | 8251⚠ | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 91 | 100 | 100 | 100 | 2927⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 70 | 100 | 100 | 100 | 5455⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 71 | 100 | 100 | 100 | 5454⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 98 | 100 | 100 | 100 | 2251 | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 58⚠ | 100 | 100 | 100 | 8101⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 54⚠ | 100 | 100 | 100 | 8101⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 73 | 100 | 100 | 100 | 5028⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 65⚠ | 100 | 100 | 100 | 2493 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 72 | 100 | 100 | 100 | 5012⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 73 | 100 | 100 | 100 | 5005⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 69⚠ | 100 | 100 | 100 | 4377⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 67⚠ | 100 | 100 | 100 | 5351⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 62⚠ | 100 | 100 | 100 | 8101⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 96 | 100 | 100 | 100 | 2626⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **TBT** = 613ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **CLS** = 0.119 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **TBT** = 367ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (desktop): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (desktop): **TBT** = 2119ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (desktop): **TBT** = 809ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8627ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3113ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 6526ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3136ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 3093ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 7876ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3369ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5377ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3394ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 9676ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3625ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **TBT** = 321ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 3004ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 1871ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **TBT** = 2083ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 8251ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3132ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **TBT** = 377ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 2927ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 1852ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5455ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3515ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5454ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3346ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 8101ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3463ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **TBT** = 316ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 8101ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3272ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **TBT** = 467ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 5028ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3357ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 1969ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **TBT** = 4117ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 5012ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3294ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5005ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3256ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 4377ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3203ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **TBT** = 411ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5351ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3295ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **TBT** = 308ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 8101ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3437ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。