# PSI 計測レポート — 2026-08-30

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- 診断上のしきい値超過: **55件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **1件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 701 | 0.004 |
| /search | desktop | 77 | 100 | 100 | 66⚠ | 996 | 0.583⚠ |
| /category | desktop | 100 | 100 | 100 | 100 | 810 | 0.004 |
| /docs/civil-construction-1-guide-strategy | desktop | 100 | 100 | 100 | 100 | 734 | 0.004 |
| /docs/civil-construction-1-guide-four-management | desktop | 99 | 96 | 100 | 100 | 936 | 0.01 |
| /docs/civil-construction-1-primary-r07-a | desktop | 88 | 96 | 100 | 100 | 691 | 0.225⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 94 | 98 | 100 | 100 | 1635 | 0.004 |
| /docs/civil-construction-1-secondary-r07 | desktop | 98 | 96 | 100 | 100 | 1107 | 0.004 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 99 | 96 | 100 | 100 | 778 | 0.004 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 96 | 100 | 100 | 621 | 0.004 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 100 | 100 | 100 | 100 | 657 | 0.004 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 100 | 100 | 100 | 637 | 0.004 |
| /docs/pe-comprehensive-management-exam-index | desktop | 94 | 96 | 100 | 100 | 1665 | 0.004 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 768 | 0.004 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 100 | 100 | 100 | 100 | 617 | 0.004 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 100 | 100 | 100 | 612 | 0.019 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 100 | 100 | 727 | 0.004 |
| /docs/pe-comprehensive-management-followership | desktop | 96 | 100 | 100 | 100 | 1433 | 0.004 |
| /docs/pe-comprehensive-management-agile | desktop | 100 | 100 | 100 | 100 | 816 | 0.018 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 98 | 98 | 100 | 100 | 1112 | 0.004 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 98 | 100 | 100 | 864 | 0.004 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 98 | 100 | 100 | 1012 | 0.004 |
| / | mobile | 65⚠ | 100 | 100 | 100 | 7485⚠ | 0 |
| /search | mobile | 44⚠ | 100 | 100 | 66⚠ | 5785⚠ | 0.599⚠ |
| /category | mobile | 74 | 100 | 100 | 100 | 5343⚠ | 0.006 |
| /docs/civil-construction-1-guide-strategy | mobile | 67⚠ | 96 | 100 | 100 | 6202⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 64⚠ | 96 | 100 | 100 | 8745⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 82 | 96 | 100 | 100 | 4191⚠ | 0.001 |
| /docs/civil-construction-1-primary-h26-a | mobile | 70 | 98 | 100 | 100 | 6371⚠ | 0.006 |
| /docs/civil-construction-1-secondary-r07 | mobile | 73 | 96 | 100 | 100 | 5311⚠ | 0.006 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 92 | 96 | 100 | 100 | 2971⚠ | 0.006 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 72 | 96 | 100 | 100 | 5416⚠ | 0.006 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 72 | 96 | 100 | 100 | 5576⚠ | 0.006 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 72 | 96 | 100 | 100 | 5585⚠ | 0.006 |
| /docs/pe-comprehensive-management-exam-index | mobile | 74 | 96 | 100 | 100 | 5193⚠ | 0.006 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 94 | 96 | 100 | 100 | 2794⚠ | 0.006 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 72 | 100 | 100 | 100 | 5464⚠ | 0.006 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 73 | 100 | 100 | 100 | 5423⚠ | 0.006 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 75 | 96 | 100 | 100 | 5015⚠ | 0.006 |
| /docs/pe-comprehensive-management-followership | mobile | 75 | 100 | 100 | 100 | 4967⚠ | 0.006 |
| /docs/pe-comprehensive-management-agile | mobile | 73 | 100 | 100 | 100 | 5194⚠ | 0.006 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 74 | 98 | 100 | 100 | 5218⚠ | 0.006 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 75 | 98 | 100 | 100 | 5051⚠ | 0.006 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 73 | 98 | 100 | 100 | 5208⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.583 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.225 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7485ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3101ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 44 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5785ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.599 (閾値: ≤0.1)
- `https://doboku-note.com/search` (mobile): **FCP** = 2756ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **TBT** = 342ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (mobile): **LCP** = 5343ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 3014ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6202ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3415ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 8745ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3462ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 4191ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 2418ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6371ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3308ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 5311ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 3269ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 2971ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 2421ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 5416ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3405ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5576ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3389ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5585ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3418ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5193ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3262ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2794ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 1978ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 5464ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3418ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 5423ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3406ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 5015ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 3150ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4967ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 3102ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5194ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 3308ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 5218ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 3189ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 5051ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 3251ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 5208ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 3391ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。CrUX の供給が戻るのを待つか、judgment.primary_source を lab 中央値ベースへ変更して原則を書き換える。