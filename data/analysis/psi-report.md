# PSI 計測レポート — 2026-11-28

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **58件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 94 | 97 | 100 | 100 | 761 | 0.124⚠ |
| /search | desktop | 71 | 100 | 81⚠ | 69⚠ | 698 | 0.206⚠ |
| /exam | desktop | 94 | 100 | 81⚠ | 100 | 245 | 0.138⚠ |
| /exam/civil-construction-1/guide/strategy | desktop | 75 | 96 | 100 | 100 | 2016 | 0.206⚠ |
| /exam/civil-construction-1/guide/four-management | desktop | 84 | 97 | 100 | 100 | 1063 | 0.206⚠ |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 93 | 100 | 100 | 741 | 0.206⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 85 | 97 | 100 | 100 | 1104 | 0.206⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 86 | 93 | 100 | 100 | 972 | 0.207⚠ |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 57⚠ | 96 | 81⚠ | 100 | 1261 | 0.206⚠ |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 73 | 97 | 81⚠ | 100 | 1061 | 0.206⚠ |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 85 | 97 | 100 | 100 | 1475 | 0.206⚠ |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 87 | 96 | 100 | 100 | 1081 | 0.211⚠ |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 88 | 97 | 100 | 100 | 908 | 0.206⚠ |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 81 | 97 | 100 | 100 | 894 | 0.206⚠ |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 61⚠ | 97 | 100 | 100 | 1902 | 0.344⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 65⚠ | 93 | 81⚠ | 100 | 382 | 0.206⚠ |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 71 | 100 | 81⚠ | 100 | 329 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 86 | 96 | 100 | 100 | 873 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 81 | 97 | 81⚠ | 100 | 1373 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 55⚠ | 100 | 81⚠ | 100 | 888 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 88 | 97 | 100 | 100 | 864 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 76 | 96 | 81⚠ | 100 | 880 | 0.206⚠ |
| / | mobile | 54⚠ | 97 | 100 | 100 | 6514⚠ | 0.004 |
| /search | mobile | 61⚠ | 100 | 100 | 66⚠ | 4713⚠ | 0.483⚠ |
| /exam | mobile | 73 | 100 | 100 | 100 | 905 | 0.483⚠ |
| /exam/civil-construction-1/guide/strategy | mobile | 98 | 100 | 100 | 100 | 1201 | 0.02 |
| /exam/civil-construction-1/guide/four-management | mobile | 69⚠ | 100 | 100 | 100 | 1229 | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 87 | 100 | 100 | 100 | 2707⚠ | 0.051 |
| /exam/civil-construction-1/primary/h26-a | mobile | 81 | 100 | 100 | 100 | 1351 | 0.017 |
| /exam/civil-construction-1/secondary/r07 | mobile | 97 | 93 | 100 | 100 | 1201 | 0.018 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 91 | 100 | 100 | 100 | 1501 | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 93 | 100 | 100 | 100 | 1374 | 0.018 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 92 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 98 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 93 | 100 | 100 | 100 | 1201 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 100 | 100 | 100 | 100 | 1201 | 0.018 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 91 | 100 | 92 | 100 | 1351 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 85 | 97 | 100 | 100 | 1501 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 93 | 100 | 100 | 100 | 1051 | 0.017 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 89 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 96 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 93 | 100 | 100 | 100 | 1051 | 0.018 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 98 | 100 | 100 | 100 | 1051 | 0.001 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 92 | 100 | 100 | 100 | 1051 | 0 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **CLS** = 0.124 (閾値: ≤0.1)
- `https://doboku-note.com/search` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/search` (desktop): **SEO** = 69 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/search` (desktop): **TBT** = 431ms (閾値: ≤300ms)
- `https://doboku-note.com/exam` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam` (desktop): **CLS** = 0.138 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (desktop): **CLS** = 0.207 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **TBT** = 817ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **TBT** = 332ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **CLS** = 0.211 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.344 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (desktop): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (desktop): **TBT** = 481ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (desktop): **TBT** = 347ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (desktop): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (desktop): **TBT** = 1196ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (desktop): **TBT** = 307ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 6514ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **TBT** = 586ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4713ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.483 (閾値: ≤0.1)
- `https://doboku-note.com/exam` (mobile): **CLS** = 0.483 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **TBT** = 1028ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 2707ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **TBT** = 494ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **TBT** = 316ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **TBT** = 402ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **TBT** = 350ms (閾値: ≤300ms)