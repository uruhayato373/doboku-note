# PSI 計測レポート — 2026-09-09

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 43（フラグ未記録 1）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **63件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 100 | 857 | 0 |
| /search | desktop | 63⚠ | 100 | 100 | 66⚠ | 1284 | 0.715⚠ |
| /exam | desktop | 99 | 100 | 96 | 100 | 870 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 87 | 100 | 100 | 100 | 640 | 0.234⚠ |
| /exam/civil-construction-1/guide/four-management | desktop | 100 | 96 | 100 | 100 | 809 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 96 | 100 | 100 | 801 | 0.23⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 72 | 98 | 100 | 100 | 899 | 0.158⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 76 | 96 | 100 | 100 | 813 | 0.005 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 100 | 96 | 100 | 100 | 690 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 96 | 100 | 100 | 683 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 98 | 100 | 100 | 100 | 1024 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 697 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 96 | 100 | 100 | 618 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 765 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 96 | 100 | 100 | 100 | 667 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 98 | 100 | 100 | 100 | 558 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 99 | 96 | 100 | 100 | 653 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 84 | 100 | 100 | 100 | 684 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 628 | 0.038 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 98 | 100 | 100 | 696 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 98 | 100 | 100 | 624 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 98 | 100 | 100 | 741 | 0.004 |
| / | mobile | 72 | 100 | 96 | 100 | 5976⚠ | 0 |
| /search | mobile | 32⚠ | 100 | 100 | 66⚠ | 4823⚠ | 0.409⚠ |
| /exam | mobile | 67⚠ | 100 | 96 | 100 | 7784⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 94 | 100 | 100 | 100 | 2551⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 64⚠ | 96 | 100 | 100 | 8251⚠ | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 71 | 96 | 100 | 100 | 4883⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 76 | 98 | 100 | 100 | 3005⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 99 | 96 | 100 | 100 | 1801 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 67⚠ | 96 | 100 | 100 | 7726⚠ | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 56⚠ | 96 | 100 | 100 | 7814⚠ | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 74 | 100 | 100 | 100 | 5157⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 83 | 100 | 100 | 100 | 2176 | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 75 | 96 | 100 | 100 | 4777⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 77 | 100 | 100 | 100 | 4857⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 64⚠ | 100 | 100 | 100 | 7801⚠ | 0 |
| https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary | mobile | ERROR | | | | | |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 65⚠ | 96 | 100 | 100 | 2254 | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 65⚠ | 100 | 100 | 100 | 7726⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 47⚠ | 100 | 100 | 100 | 5029⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 92 | 98 | 100 | 100 | 2042 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 79 | 98 | 100 | 100 | 4494⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 64⚠ | 98 | 100 | 100 | 7576⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.715 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **CLS** = 0.234 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **TBT** = 465ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (desktop): **TBT** = 557ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (desktop): **TBT** = 350ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 5976ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3018ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 32 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4823ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.409 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **TBT** = 3572ms (閾値: ≤300ms)
- `https://doboku-note.com/exam` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam` (mobile): **LCP** = 7784ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2831ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 8251ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3299ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 4883ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3464ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 3005ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 1891ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **TBT** = 712ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 7726ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3092ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 7814ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3482ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **TBT** = 378ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5157ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3143ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **TBT** = 610ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4777ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3142ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 4857ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 2786ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 7801ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3056ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 1957ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **TBT** = 3919ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 7726ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3274ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Performance** = 47 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5029ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3702ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **TBT** = 1306ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 4494ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 2797ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 7576ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3155ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 43（フラグ未記録 1） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。