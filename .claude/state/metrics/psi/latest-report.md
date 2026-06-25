# PSI 計測レポート — 2026-06-25

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **53件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 96 | 100 | 661 | 0.011 |
| /search | desktop | 99 | 94 | 96 | 92 | 770 | 0 |
| /category | desktop | 100 | 98 | 96 | 83⚠ | 430 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 86 | 96 | 92 | 100 | 2417 | 0.011 |
| /docs/civil-construction-1-guide-four-management | desktop | 96 | 96 | 96 | 100 | 1325 | 0.011 |
| /docs/civil-construction-1-primary-r07-a | desktop | 87 | 96 | 96 | 100 | 1410 | 0.176⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 99 | 96 | 96 | 100 | 823 | 0.035 |
| /docs/civil-construction-1-secondary-r07 | desktop | 97 | 96 | 96 | 100 | 1088 | 0.011 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 60⚠ | 96 | 96 | 100 | 1185 | 0.061 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 91 | 96 | 96 | 100 | 1200 | 0.11⚠ |
| /docs/civil-construction-1-textbook-quality-overview | desktop | 100 | 96 | 96 | 100 | 699 | 0.011 |
| /docs/civil-construction-1-textbook-schedule-overview | desktop | 99 | 96 | 96 | 100 | 844 | 0.011 |
| /docs/pe-comprehensive-management-exam-index | desktop | 93 | 96 | 96 | 100 | 943 | 0.011 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 99 | 96 | 96 | 100 | 795 | 0.011 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 99 | 96 | 96 | 100 | 823 | 0.011 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 100 | 96 | 96 | 100 | 747 | 0.011 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 100 | 96 | 96 | 100 | 748 | 0.011 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 100 | 755 | 0.011 |
| /docs/pe-comprehensive-management-agile | desktop | 88 | 96 | 96 | 100 | 934 | 0.04 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 99 | 94 | 96 | 100 | 797 | 0.011 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 83 | 94 | 96 | 100 | 922 | 0.011 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 94 | 96 | 100 | 782 | 0.011 |
| / | mobile | 77 | 96 | 96 | 100 | 4879⚠ | 0.009 |
| /search | mobile | 84 | 91 | 96 | 92 | 4128⚠ | 0 |
| /category | mobile | 79 | 98 | 96 | 83⚠ | 4174⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 57⚠ | 93 | 96 | 100 | 6301⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 63⚠ | 93 | 96 | 100 | 6601⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 78 | 93 | 96 | 100 | 5103⚠ | 0.01 |
| /docs/civil-construction-1-primary-h26-a | mobile | 70 | 92 | 96 | 100 | 6473⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 74 | 93 | 96 | 100 | 5414⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 73 | 93 | 96 | 100 | 5265⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 91 | 93 | 96 | 100 | 3526⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-overview | mobile | 71 | 93 | 96 | 100 | 5721⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-overview | mobile | 70 | 92 | 96 | 100 | 5871⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 72 | 93 | 96 | 100 | 5575⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 67⚠ | 93 | 96 | 100 | 5726⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 74 | 93 | 96 | 100 | 5371⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 69⚠ | 93 | 96 | 100 | 5524⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 67⚠ | 92 | 96 | 100 | 3675⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 96 | 93 | 96 | 100 | 2776⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 74 | 93 | 96 | 100 | 5599⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 68⚠ | 91 | 96 | 100 | 5656⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 71 | 91 | 96 | 100 | 5438⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 74 | 91 | 96 | 100 | 5210⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/category` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.176 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 1994ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **CLS** = 0.11 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): **TBT** = 354ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 4879ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2628ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **LCP** = 4128ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 4174ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 3006ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 6301ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 2894ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **TBT** = 418ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6601ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 3061ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 5103ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6473ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 2825ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 5414ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2669ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 5265ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 3526ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **LCP** = 5721ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-overview` (mobile): **FCP** = 2995ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **LCP** = 5871ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-overview` (mobile): **FCP** = 2899ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5575ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2825ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 5726ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 2758ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 5371ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2730ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 5524ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 2940ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 3675ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **TBT** = 932ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 2776ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5599ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2567ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 5656ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2753ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 5438ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 2766ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 5210ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 2702ms (閾値: ≤1800ms)