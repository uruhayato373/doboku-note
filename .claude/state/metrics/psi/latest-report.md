# PSI 計測レポート — 2026-09-19

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **57件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 809 | 0 |
| /search | desktop | 71 | 100 | 100 | 66⚠ | 1462 | 0.73⚠ |
| /exam | desktop | 99 | 100 | 96 | 100 | 865 | 0 |
| /exam/civil-construction-1/guide/strategy | desktop | 99 | 100 | 100 | 100 | 713 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 100 | 96 | 100 | 100 | 781 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 72 | 96 | 100 | 100 | 843 | 0.231⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 91 | 98 | 100 | 100 | 585 | 0.158⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 96 | 100 | 100 | 661 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 97 | 96 | 100 | 100 | 571 | 0.111⚠ |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 92 | 96 | 100 | 100 | 836 | 0.119⚠ |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 821 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 813 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 96 | 100 | 100 | 547 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 713 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 648 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 421 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 96 | 100 | 100 | 511 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 501 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 764 | 0.018 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 98 | 100 | 100 | 601 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 99 | 98 | 100 | 100 | 770 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 98 | 100 | 100 | 573 | 0.004 |
| / | mobile | 69⚠ | 100 | 96 | 100 | 5972⚠ | 0 |
| /search | mobile | 53⚠ | 100 | 100 | 66⚠ | 6452⚠ | 0.409⚠ |
| /exam | mobile | 96 | 100 | 96 | 100 | 2719⚠ | 0 |
| /exam/civil-construction-1/guide/strategy | mobile | 62⚠ | 100 | 100 | 100 | 7801⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 93 | 96 | 100 | 100 | 2026 | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 72 | 96 | 100 | 100 | 5466⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 65⚠ | 98 | 100 | 100 | 9301⚠ | 0 |
| /exam/civil-construction-1/secondary/r07 | mobile | 73 | 96 | 100 | 100 | 4690⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 75 | 96 | 100 | 100 | 4910⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 75 | 96 | 100 | 100 | 4958⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 71 | 100 | 100 | 100 | 5238⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 66⚠ | 100 | 100 | 100 | 8326⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 77 | 96 | 100 | 100 | 4572⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 68⚠ | 100 | 100 | 100 | 7876⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 76 | 100 | 100 | 100 | 4731⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 73 | 100 | 100 | 100 | 4754⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 80 | 96 | 100 | 100 | 4418⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 64⚠ | 100 | 100 | 100 | 7576⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 76 | 100 | 100 | 100 | 5021⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 99 | 98 | 100 | 100 | 2251 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 77 | 98 | 100 | 100 | 4752⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 63⚠ | 98 | 100 | 100 | 7876⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.73 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.231 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **TBT** = 360ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **CLS** = 0.111 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **CLS** = 0.119 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 5972ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2731ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 6452ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.409 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **FCP** = 2669ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 2719ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 7801ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3431ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5466ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3483ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 9301ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3255ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 4690ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 2884ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 4910ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3120ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 4958ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3198ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5238ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3179ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 8326ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3359ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 4572ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 2830ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 7876ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **FCP** = 2785ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4731ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 2977ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 4754ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3013ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 4418ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 2663ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 7576ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3025ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5021ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 2934ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 4752ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3108ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 7876ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3041ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。