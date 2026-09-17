# PSI 計測レポート — 2026-09-17

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 42（フラグ未記録 2）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **53件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 88 | 100 | 96 | 100 | 938 | 0 |
| /search | desktop | 73 | 100 | 100 | 66⚠ | 1341 | 0.715⚠ |
| /exam | desktop | 96 | 100 | 96 | 100 | 895 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 83 | 100 | 100 | 100 | 671 | 0.234⚠ |
| /exam/civil-construction-1/guide/four-management | desktop | 97 | 96 | 100 | 100 | 781 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 96 | 100 | 100 | 817 | 0.23⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 98 | 98 | 100 | 100 | 841 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 96 | 100 | 100 | 814 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 100 | 96 | 100 | 100 | 681 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 95 | 96 | 100 | 100 | 783 | 0.119⚠ |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 87 | 100 | 100 | 100 | 815 | 0.232⚠ |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 781 | 0.007 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 98 | 96 | 100 | 100 | 620 | 0.059 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 601 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 96 | 100 | 100 | 100 | 652 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 571 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 90 | 96 | 100 | 100 | 590 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 99 | 100 | 100 | 100 | 743 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 624 | 0.018 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 98 | 100 | 100 | 710 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 98 | 100 | 100 | 643 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 96 | 98 | 100 | 100 | 621 | 0.004 |
| / | mobile | 71 | 100 | 96 | 100 | 5984⚠ | 0 |
| /search | mobile | 72 | 100 | 100 | 66⚠ | 5470⚠ | 0 |
| /exam | mobile | 74 | 100 | 96 | 100 | 4916⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 69⚠ | 100 | 100 | 100 | 4991⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 84 | 96 | 100 | 100 | 3451⚠ | 0.006 |
| https://doboku-note.com/exam/civil-construction-1/primary/r07-a | mobile | ERROR | | | | | |
| /exam/civil-construction-1/primary/h26-a | mobile | 59⚠ | 98 | 100 | 100 | 9451⚠ | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 75 | 96 | 100 | 100 | 4730⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 73 | 96 | 100 | 100 | 5135⚠ | 0.006 |
| https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide | mobile | ERROR | | | | | |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 75 | 100 | 100 | 100 | 2982⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 72 | 100 | 100 | 100 | 5269⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 74 | 96 | 100 | 100 | 4092⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 75 | 100 | 100 | 100 | 5084⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 95 | 100 | 100 | 100 | 2701⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 61⚠ | 100 | 100 | 100 | 8252⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 71 | 96 | 100 | 100 | 4895⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 65⚠ | 100 | 100 | 100 | 7877⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 70 | 100 | 100 | 100 | 4435⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 98 | 98 | 100 | 100 | 2038 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 97 | 98 | 100 | 100 | 2401 | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 69⚠ | 98 | 100 | 100 | 6451⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.715 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **CLS** = 0.234 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **CLS** = 0.119 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **CLS** = 0.232 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5984ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3024ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5470ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3200ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4916ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2944ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 4991ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3141ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 3451ms (閾値: ≤2500ms)
- ❌ `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 9451ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3393ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 4730ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3077ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5135ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3440ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 2982ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 1897ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **TBT** = 743ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5269ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3371ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4092ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3213ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5084ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3170ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 2701ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 1859ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 8252ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3340ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 4895ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3109ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 7877ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3330ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 4435ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3119ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **TBT** = 348ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 6451ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 2858ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 42（フラグ未記録 2） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。