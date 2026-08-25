# PSI 計測レポート — 2026-08-25

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **0/44件**　← **判定不能**（実害の有無を判定する材料が無い）
- 診断上のしきい値超過: **59件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **1件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 91 | 100 | 100 | 100 | 963 | 0.004 |
| /search | desktop | 78 | 100 | 100 | 66⚠ | 419 | 0.549⚠ |
| /category | desktop | 100 | 98 | 96 | 91 | 423 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 98 | 100 | 100 | 100 | 601 | 0.004 |
| /docs/civil-construction-1-guide-four-management | desktop | 96 | 96 | 100 | 100 | 941 | 0.01 |
| /docs/civil-construction-1-primary-r07-a | desktop | 84 | 96 | 100 | 100 | 967 | 0.225⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 95 | 98 | 100 | 100 | 980 | 0.007 |
| /docs/civil-construction-1-secondary-r07 | desktop | 96 | 96 | 100 | 100 | 1321 | 0.004 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 91 | 96 | 100 | 100 | 587 | 0.111⚠ |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 96 | 96 | 100 | 100 | 900 | 0.004 |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 96 | 100 | 100 | 100 | 715 | 0.004 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 99 | 100 | 100 | 100 | 601 | 0.004 |
| /docs/pe-comprehensive-management-exam-index | desktop | 97 | 100 | 100 | 100 | 998 | 0.004 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 772 | 0.004 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 98 | 100 | 100 | 100 | 588 | 0.004 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 98 | 100 | 100 | 100 | 555 | 0.019 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 99 | 96 | 100 | 100 | 601 | 0.004 |
| /docs/pe-comprehensive-management-followership | desktop | 96 | 100 | 100 | 100 | 1379 | 0.004 |
| /docs/pe-comprehensive-management-agile | desktop | 95 | 100 | 100 | 100 | 1476 | 0.018 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 97 | 98 | 100 | 100 | 1263 | 0.004 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 85 | 98 | 100 | 100 | 2602⚠ | 0.004 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 85 | 98 | 100 | 100 | 1165 | 0.004 |
| / | mobile | 61⚠ | 96 | 100 | 100 | 7570⚠ | 0.006 |
| /search | mobile | 58⚠ | 96 | 100 | 66⚠ | 7482⚠ | 0 |
| /category | mobile | 70 | 98 | 96 | 91 | 5283⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 76 | 93 | 100 | 100 | 4657⚠ | 0.006 |
| /docs/civil-construction-1-guide-four-management | mobile | 73 | 93 | 100 | 100 | 5231⚠ | 0.006 |
| /docs/civil-construction-1-primary-r07-a | mobile | 61⚠ | 93 | 100 | 100 | 7576⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 70 | 95 | 100 | 100 | 5809⚠ | 0.006 |
| /docs/civil-construction-1-secondary-r07 | mobile | 68⚠ | 93 | 100 | 100 | 6226⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 72 | 93 | 100 | 100 | 5069⚠ | 0.006 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 76 | 93 | 100 | 100 | 4563⚠ | 0.006 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 91 | 93 | 100 | 100 | 3076⚠ | 0.006 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 62⚠ | 92 | 100 | 100 | 6901⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 71 | 93 | 100 | 100 | 4801⚠ | 0.006 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 68⚠ | 93 | 100 | 100 | 2705⚠ | 0.006 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 66⚠ | 96 | 100 | 100 | 6376⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 72 | 96 | 100 | 100 | 4153⚠ | 0 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 98 | 92 | 100 | 100 | 2030 | 0.006 |
| /docs/pe-comprehensive-management-followership | mobile | 76 | 96 | 100 | 100 | 4643⚠ | 0.006 |
| /docs/pe-comprehensive-management-agile | mobile | 66⚠ | 96 | 100 | 100 | 7576⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 75 | 95 | 100 | 100 | 4802⚠ | 0.006 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 59⚠ | 95 | 100 | 100 | 10359⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 74 | 95 | 100 | 100 | 4684⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.549 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.225 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **CLS** = 0.111 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): **LCP** = 2602ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 7570ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2850ms (閾値: ≤1800ms)
- `https://doboku-note.com/` (mobile): **TBT** = 319ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 7482ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3071ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **TBT** = 331ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (mobile): **LCP** = 5283ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 3147ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 4657ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 3067ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 5231ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3246ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 7576ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 3613ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 5809ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3296ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 6226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 3098ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5069ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3429ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 4563ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 3080ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 3076ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 6901ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 3305ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 4801ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3151ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 2705ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 1695ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 6376ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 3268ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4153ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 3355ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 4643ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2967ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 7576ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2848ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 4802ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2978ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 10359ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 4784ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 4684ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2973ms (閾値: ≤1800ms)
- **field(CrUX) 判定不能** — field(CrUX) を持つ result が 0/44 件。primary_source=field なので実害を判定できない（違反ゼロ＝安全 ではない）。CrUX の供給が戻るのを待つか、judgment.primary_source を lab 中央値ベースへ変更して原則を書き換える。