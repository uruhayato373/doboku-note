# PSI 計測レポート — 2026-08-28

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- 診断上のしきい値超過: **57件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **1件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 583 | 0.004 |
| /search | desktop | 78 | 100 | 100 | 66⚠ | 427 | 0.549⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 430 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 86 | 100 | 100 | 100 | 1065 | 0.234⚠ |
| /docs/civil-construction-1-guide-four-management | desktop | 98 | 96 | 100 | 100 | 1181 | 0.01 |
| /docs/civil-construction-1-primary-r07-a | desktop | 88 | 96 | 100 | 100 | 988 | 0.225⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 99 | 98 | 100 | 100 | 964 | 0.004 |
| /docs/civil-construction-1-secondary-r07 | desktop | 93 | 96 | 100 | 100 | 1721 | 0.004 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 65⚠ | 96 | 100 | 100 | 1234 | 0.004 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 100 | 96 | 100 | 100 | 575 | 0.004 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 100 | 100 | 100 | 100 | 698 | 0.004 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 100 | 100 | 100 | 100 | 710 | 0.004 |
| /docs/pe-comprehensive-management-exam-index | desktop | 99 | 100 | 100 | 100 | 982 | 0.004 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 621 | 0.004 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 93 | 100 | 100 | 100 | 1266 | 0.12⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 99 | 100 | 100 | 100 | 583 | 0.019 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 96 | 100 | 100 | 647 | 0.004 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 100 | 100 | 100 | 1034 | 0.004 |
| /docs/pe-comprehensive-management-agile | desktop | 96 | 100 | 100 | 100 | 1378 | 0.018 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 98 | 100 | 100 | 1043 | 0.004 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 98 | 100 | 100 | 964 | 0.004 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 98 | 100 | 100 | 1036 | 0.004 |
| / | mobile | 73 | 100 | 100 | 100 | 6511⚠ | 0.006 |
| /search | mobile | 81 | 100 | 100 | 66⚠ | 4051⚠ | 0 |
| /category | mobile | 77 | 98 | 96 | 91 | 4237⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 65⚠ | 96 | 100 | 100 | 7726⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 74 | 96 | 100 | 100 | 5217⚠ | 0.006 |
| /docs/civil-construction-1-primary-r07-a | mobile | 72 | 96 | 100 | 100 | 5541⚠ | 0.027 |
| /docs/civil-construction-1-primary-h26-a | mobile | 96 | 98 | 100 | 100 | 2627⚠ | 0.006 |
| /docs/civil-construction-1-secondary-r07 | mobile | 68⚠ | 96 | 100 | 100 | 6227⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 74 | 96 | 100 | 100 | 5038⚠ | 0.006 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 76 | 96 | 100 | 100 | 4818⚠ | 0.006 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 66⚠ | 96 | 100 | 100 | 8026⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 73 | 96 | 100 | 100 | 5320⚠ | 0.006 |
| /docs/pe-comprehensive-management-exam-index | mobile | 78 | 96 | 100 | 100 | 4664⚠ | 0.006 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 90 | 96 | 100 | 100 | 2642⚠ | 0.006 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 66⚠ | 100 | 100 | 100 | 8177⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 75 | 100 | 100 | 100 | 4875⚠ | 0.006 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 78 | 96 | 100 | 100 | 4679⚠ | 0.006 |
| /docs/pe-comprehensive-management-followership | mobile | 77 | 100 | 100 | 100 | 4673⚠ | 0.006 |
| /docs/pe-comprehensive-management-agile | mobile | 75 | 100 | 100 | 100 | 5152⚠ | 0.006 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 78 | 98 | 100 | 100 | 4673⚠ | 0.006 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 68⚠ | 98 | 100 | 100 | 6002⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 80 | 98 | 100 | 100 | 4464⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.549 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **CLS** = 0.234 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.225 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 745ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 6511ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2670ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4051ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2948ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **LCP** = 4237ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 2889ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 7726ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3165ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5217ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3272ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5541ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3380ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 2627ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 1830ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6227ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2983ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5038ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3413ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4818ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2972ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 8026ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 3084ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5320ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3296ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4664ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2963ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2642ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 8177ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3122ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4875ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3143ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 4679ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2826ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4673ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2866ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5152ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2877ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4673ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2792ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 6002ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2979ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4464ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2804ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。CrUX の供給が戻るのを待つか、judgment.primary_source を lab 中央値ベースへ変更して原則を書き換える。