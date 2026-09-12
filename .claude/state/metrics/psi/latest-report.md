# PSI 計測レポート — 2026-09-12

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **45件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 100 | 827 | 0 |
| /search | desktop | 73 | 100 | 100 | 66⚠ | 1322 | 0.715⚠ |
| /exam | desktop | 99 | 100 | 96 | 100 | 862 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 87 | 100 | 100 | 100 | 846 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 100 | 96 | 100 | 100 | 721 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 67⚠ | 96 | 100 | 100 | 903 | 0.231⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 93 | 98 | 100 | 100 | 706 | 0.158⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 98 | 96 | 100 | 100 | 614 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 100 | 96 | 100 | 100 | 721 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 91 | 96 | 100 | 100 | 831 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 630 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 782 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 97 | 96 | 100 | 100 | 710 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 90 | 100 | 100 | 100 | 422 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 96 | 100 | 100 | 100 | 736 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 509 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 96 | 100 | 100 | 657 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 726 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 783 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 98 | 100 | 100 | 769 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 97 | 98 | 100 | 100 | 693 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 98 | 100 | 100 | 613 | 0.004 |
| / | mobile | 73 | 100 | 96 | 100 | 5996⚠ | 0 |
| /search | mobile | 63⚠ | 100 | 100 | 66⚠ | 8110⚠ | 0 |
| /exam | mobile | 97 | 100 | 96 | 100 | 2564⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 96 | 100 | 100 | 100 | 2551⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 72 | 96 | 100 | 100 | 5342⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 63⚠ | 96 | 100 | 100 | 9076⚠ | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 74 | 98 | 100 | 100 | 5518⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 65⚠ | 96 | 100 | 100 | 7576⚠ | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 73 | 96 | 100 | 100 | 4987⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 97 | 96 | 100 | 100 | 2410 | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 74 | 100 | 100 | 100 | 5111⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 67⚠ | 100 | 100 | 100 | 5324⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 76 | 96 | 100 | 100 | 4663⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 99 | 100 | 100 | 100 | 1801 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 74 | 100 | 100 | 100 | 4934⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 96 | 100 | 100 | 100 | 2626⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 100 | 96 | 100 | 100 | 1652 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 78 | 100 | 100 | 100 | 4548⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 65⚠ | 100 | 100 | 100 | 8101⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 99 | 98 | 100 | 100 | 2035 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 99 | 98 | 100 | 100 | 1801 | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 99 | 98 | 100 | 100 | 1801 | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.715 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.231 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **TBT** = 449ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5996ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2750ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 8110ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3132ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 2564ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5342ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3294ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 9076ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3636ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5518ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 2986ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 7576ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 2875ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 4987ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3190ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 1823ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5111ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3141ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5324ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3338ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4663ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 2894ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4934ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3282ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 1827ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 4548ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 2969ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 8101ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3115ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。