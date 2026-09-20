# PSI 計測レポート — 2026-09-20

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 40（フラグ未記録 4）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **57件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 97 | 100 | 96 | 100 | 932 | 0 |
| /search | desktop | 70 | 100 | 100 | 66⚠ | 1530 | 0.73⚠ |
| /exam | desktop | 98 | 100 | 96 | 100 | 1113 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 617 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 84 | 96 | 100 | 100 | 758 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 96 | 100 | 100 | 860 | 0.23⚠ |
| https://doboku-note.com/exam/civil-construction-1/primary/h26-a | desktop | ERROR | | | | | |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 96 | 100 | 100 | 661 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 100 | 96 | 100 | 100 | 743 | 0.004 |
| https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide | desktop | ERROR | | | | | |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 834 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 721 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 96 | 100 | 100 | 621 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 665 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 641 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 555 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 98 | 96 | 100 | 100 | 661 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 99 | 100 | 100 | 100 | 793 | 0.004 |
| https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile | desktop | ERROR | | | | | |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 98 | 100 | 100 | 614 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 99 | 98 | 100 | 100 | 625 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 98 | 100 | 100 | 709 | 0.004 |
| / | mobile | 65⚠ | 100 | 96 | 100 | 8327⚠ | 0 |
| /search | mobile | 58⚠ | 100 | 100 | 66⚠ | 6117⚠ | 0.409⚠ |
| https://doboku-note.com/exam | mobile | ERROR | | | | | |
| /exam/civil-construction-1/guide/strategy | mobile | 59⚠ | 100 | 100 | 100 | 7802⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 73 | 96 | 100 | 100 | 5280⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 71 | 96 | 100 | 100 | 5529⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 72 | 98 | 100 | 100 | 5800⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 74 | 96 | 100 | 100 | 4858⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 73 | 96 | 100 | 100 | 5100⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 76 | 96 | 100 | 100 | 4391⚠ | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 69⚠ | 100 | 100 | 100 | 5491⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 96 | 100 | 100 | 100 | 2551⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 64⚠ | 96 | 100 | 100 | 7652⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 77 | 100 | 100 | 100 | 4430⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 72 | 100 | 100 | 100 | 4948⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 74 | 100 | 100 | 100 | 4962⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 69⚠ | 96 | 100 | 100 | 4791⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 98 | 100 | 100 | 100 | 2401 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 71 | 100 | 100 | 100 | 5255⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 76 | 98 | 100 | 100 | 4969⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 72 | 98 | 100 | 100 | 4887⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 76 | 98 | 100 | 100 | 4907⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.73 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (desktop): **TBT** = 348ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- ❌ `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8327ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3207ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 6117ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.409 (閾値: ≤0.1)
- ❌ `https://doboku-note.com/exam` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 7802ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3315ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **TBT** = 322ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5280ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3285ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5529ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3510ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5800ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3267ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 4858ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3010ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5100ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3511ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 4391ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3230ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5491ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3314ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 7652ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3402ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 4430ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **TBT** = 316ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4948ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3339ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 4962ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3363ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 4791ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3105ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **TBT** = 329ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5255ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3257ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 4969ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 2902ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 4887ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3149ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 4907ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 2901ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 40（フラグ未記録 4） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。