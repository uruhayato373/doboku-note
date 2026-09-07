# PSI 計測レポート — 2026-09-07

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 43（フラグ未記録 1）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **58件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 100 | 713 | 0 |
| /search | desktop | 48⚠ | 100 | 100 | 66⚠ | 1209 | 0.583⚠ |
| /exam | desktop | 99 | 100 | 96 | 100 | 959 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 70 | 100 | 100 | 100 | 1778 | 0.234⚠ |
| /exam/civil-construction-1/guide/four-management | desktop | 90 | 96 | 100 | 100 | 1870 | 0.01 |
| /exam/civil-construction-1/primary/r07-a | desktop | 87 | 96 | 100 | 100 | 1113 | 0.23⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 92 | 98 | 100 | 100 | 950 | 0.158⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 96 | 100 | 100 | 741 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 100 | 96 | 100 | 100 | 683 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 96 | 100 | 100 | 550 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 661 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 707 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 96 | 100 | 100 | 984 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 657 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 550 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 94 | 100 | 100 | 100 | 446 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 97 | 96 | 100 | 100 | 695 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 92 | 100 | 100 | 100 | 1756 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 94 | 100 | 100 | 100 | 1616 | 0.018 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 91 | 98 | 100 | 100 | 1970 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 97 | 98 | 100 | 100 | 1305 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 88 | 98 | 100 | 100 | 1974 | 0.004 |
| / | mobile | 70 | 100 | 96 | 100 | 7264⚠ | 0 |
| /search | mobile | 55⚠ | 100 | 100 | 66⚠ | 5884⚠ | 0.599⚠ |
| /exam | mobile | 77 | 100 | 96 | 100 | 4896⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 58⚠ | 100 | 100 | 100 | 10201⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 73 | 96 | 100 | 100 | 5238⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 73 | 96 | 100 | 100 | 5399⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 71 | 98 | 100 | 100 | 5743⚠ | 0.006 |
| https://doboku-note.com/exam/civil-construction-1/secondary/r07 | mobile | ERROR | | | | | |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 75 | 96 | 100 | 100 | 4920⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 56⚠ | 96 | 100 | 100 | 7663⚠ | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 73 | 100 | 100 | 100 | 5344⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 88 | 100 | 100 | 100 | 2952⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 77 | 96 | 100 | 100 | 4691⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 74 | 100 | 100 | 100 | 5128⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 60⚠ | 100 | 100 | 100 | 7951⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 75 | 100 | 100 | 100 | 4846⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 77 | 96 | 100 | 100 | 4720⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 50⚠ | 100 | 100 | 100 | 5626⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 74 | 100 | 100 | 100 | 5159⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 60⚠ | 98 | 100 | 100 | 5551⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 75 | 98 | 100 | 100 | 4929⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 98 | 98 | 100 | 100 | 2036 | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **Performance** = 48 (閾値: ≥70)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.583 (閾値: ≤0.1)
- `https://doboku-note.com/search` (desktop): **TBT** = 710ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **CLS** = 0.234 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.23 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 7264ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2973ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5884ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.599 (閾値: ≤0.1)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4896ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2803ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 10201ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3141ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5238ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3297ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5399ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3417ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5743ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3284ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): PSI network error: The operation was aborted due to timeout
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 4920ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3400ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 7663ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3159ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **TBT** = 426ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5344ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3256ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 2952ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4691ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3112ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 5128ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 3020ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 7951ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3374ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 4846ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3245ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 4720ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 2971ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **Performance** = 50 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5626ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3127ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **TBT** = 850ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5159ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3139ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3153ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **TBT** = 408ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 4929ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3144ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 43（フラグ未記録 1） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。