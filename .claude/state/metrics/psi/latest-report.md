# PSI 計測レポート — 2026-09-04

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 43（フラグ未記録 1）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **53件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **1件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 759 | 0.004 |
| /search | desktop | 55⚠ | 100 | 100 | 66⚠ | 1149 | 0.583⚠ |
| /exam | desktop | 93 | 100 | 100 | 100 | 897 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 641 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 100 | 96 | 100 | 100 | 713 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 99 | 96 | 100 | 100 | 921 | 0.004 |
| /exam/civil-construction-1/primary/h26-a | desktop | 86 | 98 | 100 | 100 | 993 | 0.158⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 96 | 100 | 100 | 701 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 100 | 96 | 100 | 100 | 621 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 96 | 100 | 100 | 627 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 694 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 788 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 96 | 100 | 100 | 1025 | 0.004 |
| https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | ERROR | | | | | |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 95 | 100 | 100 | 100 | 744 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 571 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 98 | 96 | 100 | 100 | 822 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 62⚠ | 100 | 100 | 100 | 1620 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 705 | 0.018 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 91 | 98 | 100 | 100 | 1961 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 99 | 98 | 100 | 100 | 990 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 98 | 100 | 100 | 829 | 0.004 |
| / | mobile | 62⚠ | 100 | 100 | 100 | 8703⚠ | 0 |
| /search | mobile | 70 | 100 | 100 | 66⚠ | 6428⚠ | 0 |
| /exam | mobile | 67⚠ | 100 | 100 | 100 | 5007⚠ | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 97 | 100 | 100 | 100 | 2326 | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 74 | 96 | 100 | 100 | 5234⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 94 | 96 | 100 | 100 | 2701⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 93 | 98 | 100 | 100 | 2476 | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 77 | 96 | 100 | 100 | 4794⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 76 | 96 | 100 | 100 | 4370⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 90 | 96 | 100 | 100 | 2411 | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 79 | 100 | 100 | 100 | 3041⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 90 | 100 | 100 | 100 | 2326 | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 85 | 96 | 100 | 100 | 2551⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 92 | 100 | 100 | 100 | 2660⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 84 | 100 | 100 | 100 | 2372 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 74 | 100 | 100 | 100 | 5003⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 68⚠ | 96 | 100 | 100 | 2826⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 93 | 100 | 100 | 100 | 2125 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 56⚠ | 100 | 100 | 100 | 10126⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 76 | 98 | 100 | 100 | 4191⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 97 | 98 | 100 | 100 | 2401 | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 78 | 98 | 100 | 100 | 4614⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.583 (閾値: ≤0.1)
- `https://doboku-note.com/search` (desktop): **TBT** = 485ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (desktop): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (desktop): **TBT** = 1613ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8703ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3179ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 6428ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3102ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam` (mobile): **LCP** = 5007ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2907ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **TBT** = 391ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5234ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3263ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 2701ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 1847ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 1854ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 4794ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 2931ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 4370ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3489ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 1828ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **TBT** = 306ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 3041ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 1849ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **TBT** = 554ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **TBT** = 312ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **TBT** = 432ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 2660ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 1893ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **TBT** = 478ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5003ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3162ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 2826ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **TBT** = 1434ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 10126ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3178ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **TBT** = 377ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 4191ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3087ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 4614ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 2804ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。CrUX の供給が戻るのを待つか、judgment.primary_source を lab 中央値ベースへ変更して原則を書き換える。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 43（フラグ未記録 1） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。