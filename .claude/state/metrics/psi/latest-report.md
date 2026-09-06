# PSI 計測レポート — 2026-09-06

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **55件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 97 | 100 | 96 | 100 | 884 | 0 |
| /search | desktop | 44⚠ | 100 | 100 | 66⚠ | 1296 | 0.583⚠ |
| /exam | desktop | 99 | 100 | 96 | 100 | 860 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 99 | 100 | 100 | 100 | 628 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 100 | 96 | 100 | 100 | 667 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 64⚠ | 96 | 100 | 100 | 821 | 0.231⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 74 | 98 | 100 | 100 | 1133 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 99 | 96 | 100 | 100 | 738 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 100 | 96 | 100 | 100 | 641 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 96 | 100 | 100 | 628 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 628 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 663 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 96 | 100 | 100 | 761 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 94 | 100 | 100 | 100 | 684 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 98 | 100 | 100 | 100 | 721 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 91 | 100 | 100 | 100 | 685 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 96 | 100 | 100 | 738 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 99 | 100 | 100 | 100 | 999 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 885 | 0.018 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 98 | 100 | 100 | 814 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 99 | 98 | 100 | 100 | 958 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 98 | 100 | 100 | 838 | 0.004 |
| / | mobile | 64⚠ | 100 | 96 | 100 | 12077⚠ | 0 |
| /search | mobile | 52⚠ | 100 | 100 | 66⚠ | 5209⚠ | 0.599⚠ |
| /exam | mobile | 78 | 100 | 96 | 100 | 4531⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 88 | 100 | 100 | 100 | 2045 | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 73 | 96 | 100 | 100 | 5220⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 61⚠ | 96 | 100 | 100 | 2846⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 69⚠ | 98 | 100 | 100 | 2371 | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 98 | 96 | 100 | 100 | 2113 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 75 | 96 | 100 | 100 | 5001⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 81 | 96 | 100 | 100 | 2203 | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 70 | 100 | 100 | 100 | 5457⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 74 | 100 | 100 | 100 | 5234⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 74 | 96 | 100 | 100 | 4794⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 75 | 100 | 100 | 100 | 5073⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 76 | 100 | 100 | 100 | 4854⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 87 | 100 | 100 | 100 | 2401 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 86 | 96 | 100 | 100 | 2701⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 99 | 100 | 100 | 100 | 1656 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 75 | 100 | 100 | 100 | 5168⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 77 | 98 | 100 | 100 | 4888⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 98 | 98 | 100 | 100 | 2326 | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 48⚠ | 98 | 100 | 100 | 5455⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **Performance** = 44 (閾値: ≥70)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.583 (閾値: ≤0.1)
- `https://doboku-note.com/search` (desktop): **TBT** = 1013ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.231 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **TBT** = 587ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **TBT** = 543ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 12077ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3134ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5209ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.599 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **FCP** = 2838ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4531ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 3097ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **TBT** = 427ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5220ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3274ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 2846ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 2072ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **TBT** = 3340ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 1891ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **TBT** = 1814ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5001ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3379ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 1855ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **TBT** = 644ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5457ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3309ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5234ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3280ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4794ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3167ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5073ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3099ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4854ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3118ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 1854ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **TBT** = 393ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 2701ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **TBT** = 381ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5168ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3105ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 4888ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 2932ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **Performance** = 48 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5455ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3359ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **TBT** = 878ms (閾値: ≤300ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。