# PSI 計測レポート — 2026-09-23

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 43（フラグ未記録 1）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **64件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 100 | 837 | 0 |
| /search | desktop | 75 | 100 | 100 | 66⚠ | 1099 | 0.73⚠ |
| /exam | desktop | 99 | 100 | 96 | 100 | 987 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 683 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 100 | 96 | 100 | 100 | 796 | 0.008 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 96 | 100 | 100 | 841 | 0.23⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 93 | 98 | 100 | 100 | 849 | 0.158⚠ |
| https://doboku-note.com/exam/civil-construction-1/secondary/r07 | desktop | ERROR | | | | | |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 100 | 96 | 100 | 100 | 707 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 96 | 100 | 100 | 752 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 65⚠ | 100 | 100 | 100 | 1041 | 0.232⚠ |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 92 | 100 | 100 | 100 | 781 | 0.161⚠ |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 57⚠ | 96 | 100 | 100 | 1652 | 0.055 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 92 | 100 | 100 | 100 | 659 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 83 | 100 | 100 | 100 | 706 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 571 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 96 | 100 | 100 | 614 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 630 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 641 | 0.018 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 98 | 100 | 100 | 703 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 98 | 100 | 100 | 626 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 98 | 100 | 100 | 701 | 0.004 |
| / | mobile | 92 | 100 | 96 | 100 | 3226⚠ | 0 |
| /search | mobile | 66⚠ | 100 | 100 | 66⚠ | 8184⚠ | 0 |
| /exam | mobile | 93 | 100 | 96 | 100 | 3093⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 73 | 100 | 96 | 100 | 4800⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 72 | 96 | 100 | 100 | 5432⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 69⚠ | 96 | 100 | 100 | 2626⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 54⚠ | 98 | 100 | 100 | 9151⚠ | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 66⚠ | 96 | 100 | 100 | 7727⚠ | 0 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 72 | 96 | 100 | 100 | 4352⚠ | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 60⚠ | 96 | 100 | 100 | 8177⚠ | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 67⚠ | 100 | 100 | 100 | 8326⚠ | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 93 | 100 | 100 | 100 | 2983⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 74 | 96 | 100 | 100 | 4806⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 71 | 100 | 100 | 100 | 4297⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 73 | 100 | 100 | 100 | 5029⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 76 | 100 | 100 | 100 | 4829⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 72 | 96 | 100 | 100 | 4868⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 75 | 100 | 100 | 100 | 4893⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 96 | 100 | 100 | 100 | 2627⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 57⚠ | 98 | 100 | 100 | 7876⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 97 | 98 | 100 | 100 | 2476 | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 76 | 98 | 100 | 100 | 4946⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.73 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (desktop): PSI network error: The operation was aborted due to timeout
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **CLS** = 0.232 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **TBT** = 531ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **CLS** = 0.161 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (desktop): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (desktop): **TBT** = 1417ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **TBT** = 301ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 8184ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3306ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 3093ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 4800ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3155ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5432ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3248ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 2626ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 1931ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **TBT** = 1351ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 9151ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3367ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **TBT** = 442ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 7727ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3204ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 4352ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3512ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 8177ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3270ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 8326ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3328ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 2983ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4806ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3225ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 4297ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3280ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **TBT** = 338ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 5029ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3393ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 4829ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3251ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 4868ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3118ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 4893ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3238ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 2627ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 7876ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 2919ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **TBT** = 429ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 4946ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 2940ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 43（フラグ未記録 1） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。