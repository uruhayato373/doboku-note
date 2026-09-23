# PSI 計測レポート — 2026-09-22

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0）
  - origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。
- 診断上のしきい値超過: **52件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 627 | 0.004 |
| /search | desktop | 73 | 100 | 100 | 58⚠ | 1138 | 0.73⚠ |
| /exam | desktop | 96 | 100 | 100 | 100 | 762 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 777 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 96 | 100 | 100 | 797 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 99 | 96 | 100 | 100 | 861 | 0.004 |
| /exam/civil-construction-1/primary/h26-a | desktop | 100 | 98 | 100 | 100 | 781 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 96 | 100 | 100 | 557 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 65⚠ | 96 | 100 | 100 | 846 | 0.107⚠ |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 96 | 100 | 100 | 770 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 100 | 100 | 100 | 100 | 781 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 100 | 100 | 100 | 100 | 742 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 96 | 100 | 100 | 522 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 88 | 100 | 100 | 100 | 641 | 0.215⚠ |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 85 | 100 | 100 | 100 | 828 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 489 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 96 | 100 | 100 | 548 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 561 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 752 | 0.014 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 98 | 100 | 100 | 632 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 98 | 98 | 100 | 100 | 757 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 99 | 98 | 100 | 100 | 729 | 0.004 |
| / | mobile | 58⚠ | 100 | 100 | 100 | 8027⚠ | 0 |
| /search | mobile | 57⚠ | 100 | 100 | 66⚠ | 6190⚠ | 0.409⚠ |
| /exam | mobile | 78 | 100 | 100 | 100 | 4819⚠ | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 99 | 100 | 100 | 100 | 2026 | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 68⚠ | 96 | 100 | 100 | 5447⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 72 | 96 | 100 | 100 | 5468⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 68⚠ | 98 | 100 | 100 | 5674⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 97 | 96 | 100 | 100 | 2401 | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 72 | 96 | 100 | 100 | 5093⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 98 | 96 | 100 | 100 | 2111 | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 65⚠ | 100 | 100 | 100 | 8326⚠ | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 66⚠ | 100 | 100 | 100 | 8401⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 61⚠ | 96 | 100 | 100 | 5551⚠ | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 97 | 100 | 100 | 100 | 2402 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 75 | 100 | 100 | 100 | 4889⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 69⚠ | 100 | 100 | 100 | 2476 | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 75 | 96 | 100 | 100 | 4808⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 74 | 100 | 100 | 100 | 2007 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 66⚠ | 100 | 100 | 100 | 7951⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 75 | 98 | 100 | 100 | 4983⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 94 | 98 | 100 | 100 | 2251 | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 97 | 98 | 100 | 100 | 2326 | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 58 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.73 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **CLS** = 0.107 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **TBT** = 1206ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (desktop): **CLS** = 0.215 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8027ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3371ms (閾値: ≤1800ms)
- `https://doboku-note.com/` (mobile): **TBT** = 305ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 6190ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.409 (閾値: ≤0.1)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4819ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 2633ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5447ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3276ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5468ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3410ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 5674ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3404ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5093ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3431ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 1822ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 8326ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3401ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 8401ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3367ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3432ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **TBT** = 336ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4889ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3328ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 1913ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **TBT** = 1603ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 4808ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3061ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **TBT** = 1398ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 7951ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3100ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 4983ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 2852ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。欠測は警告として継続観測する（CI ゲート対象外）。 field 判定不能の内訳: URL レベル 0 / origin レベル 0 / どちらも無し 44（フラグ未記録 0） origin レベルにも CrUX が無い。DN-0158 (3)＝CrUX 全体の供給問題として記録する。