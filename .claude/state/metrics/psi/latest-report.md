# PSI 計測レポート — 2026-04-29

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **77件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 99 | 100 | 96 | 92 | 490 | 0.023 |
| /search | desktop | 77 | 94 | 96 | 83⚠ | 937 | 0.023 |
| /category | desktop | 100 | 98 | 96 | 75⚠ | 552 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 68⚠ | 100 | 96 | 92 | 801 | 0.023 |
| /docs/civil-construction-1-guide-four-management | desktop | 61⚠ | 100 | 96 | 92 | 1072 | 0.023 |
| /docs/civil-construction-1-primary-r07-a | desktop | 70 | 100 | 96 | 92 | 1028 | 0.135⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 98 | 100 | 96 | 92 | 663 | 0.023 |
| /docs/civil-construction-1-secondary-r07 | desktop | 99 | 100 | 96 | 92 | 650 | 0.023 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 61⚠ | 100 | 96 | 92 | 1217 | 0.074 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 81 | 100 | 96 | 92 | 855 | 0.023 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 59⚠ | 100 | 96 | 92 | 1418 | 0.023 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 99 | 100 | 96 | 92 | 651 | 0.023 |
| /docs/pe-comprehensive-management-exam-index | desktop | 82 | 96 | 96 | 92 | 587 | 0.023 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 79 | 98 | 96 | 92 | 721 | 0.023 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 80 | 100 | 96 | 92 | 774 | 0.074 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 75 | 100 | 96 | 92 | 595 | 0.023 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 61⚠ | 100 | 96 | 92 | 1000 | 0.062 |
| /docs/pe-comprehensive-management-followership | desktop | 96 | 96 | 96 | 92 | 692 | 0.023 |
| /docs/pe-comprehensive-management-agile | desktop | 81 | 96 | 96 | 92 | 714 | 0.023 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 86 | 94 | 96 | 92 | 675 | 0.023 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 85 | 94 | 96 | 92 | 713 | 0.023 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 92 | 94 | 96 | 92 | 832 | 0.023 |
| / | mobile | 72 | 96 | 96 | 92 | 2182 | 0.009 |
| /search | mobile | 60⚠ | 92 | 96 | 83⚠ | 8301⚠ | 0 |
| /category | mobile | 95 | 98 | 96 | 75⚠ | 1961 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 60⚠ | 96 | 96 | 92 | 9294⚠ | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 53⚠ | 96 | 96 | 92 | 9865⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 68⚠ | 96 | 96 | 92 | 4879⚠ | 0.009 |
| /docs/civil-construction-1-primary-h26-a | mobile | 52⚠ | 96 | 96 | 92 | 9325⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 58⚠ | 96 | 96 | 92 | 9093⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 75 | 96 | 96 | 92 | 3852⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 90 | 96 | 96 | 92 | 3601⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 79 | 96 | 96 | 92 | 3504⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 53⚠ | 96 | 96 | 92 | 10933⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 86 | 93 | 96 | 92 | 3526⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 66⚠ | 95 | 96 | 92 | 3606⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 58⚠ | 96 | 96 | 92 | 9408⚠ | 0 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 91 | 96 | 92 | 92 | 2776⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 68⚠ | 96 | 96 | 92 | 3418⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 78 | 96 | 96 | 92 | 3392⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 73 | 96 | 96 | 92 | 3875⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 74 | 95 | 96 | 92 | 2564⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 82 | 95 | 96 | 92 | 2945⚠ | 0.009 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 55⚠ | 95 | 96 | 92 | 9059⚠ | 0 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **TBT** = 494ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (desktop): **TBT** = 1306ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **TBT** = 3260ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.135 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **TBT** = 559ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 1430ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **TBT** = 417ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **TBT** = 1923ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (desktop): **TBT** = 403ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (desktop): **TBT** = 479ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **TBT** = 419ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (desktop): **TBT** = 618ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (desktop): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (desktop): **TBT** = 1959ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): **TBT** = 427ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **TBT** = 329ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (desktop): **TBT** = 338ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **TBT** = 1407ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 8301ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 5075ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 9294ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 5053ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 9865ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 5656ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **TBT** = 306ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 4879ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **TBT** = 520ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 9325ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 4935ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 370ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 9093ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 5066ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 3852ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **TBT** = 521ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 3601ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 3504ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 2115ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **TBT** = 357ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 10933ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 5323ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 3526ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 3606ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 1191ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 9408ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 5444ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 2776ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 3418ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **TBT** = 1124ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 3392ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **TBT** = 550ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 3875ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **TBT** = 573ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 2564ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **TBT** = 1097ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 2945ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **TBT** = 496ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 9059ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 4906ms (閾値: ≤1800ms)