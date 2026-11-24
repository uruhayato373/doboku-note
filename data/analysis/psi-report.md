# PSI 計測レポート — 2026-11-24

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **51件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 89 | 96 | 100 | 100 | 621 | 0.206⚠ |
| /search | desktop | 75 | 100 | 77⚠ | 69⚠ | 2343 | 0.209⚠ |
| /exam | desktop | 90 | 100 | 100 | 100 | 245 | 0.206⚠ |
| /exam/civil-construction-1/guide/strategy | desktop | 81 | 96 | 100 | 100 | 1721 | 0.206⚠ |
| /exam/civil-construction-1/guide/four-management | desktop | 86 | 97 | 100 | 100 | 1061 | 0.206⚠ |
| /exam/civil-construction-1/primary/r07-a | desktop | 88 | 93 | 100 | 100 | 781 | 0.206⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 85 | 97 | 100 | 100 | 1257 | 0.21⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 86 | 97 | 100 | 100 | 1250 | 0.206⚠ |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 85 | 97 | 100 | 100 | 1121 | 0.215⚠ |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 86 | 97 | 81⚠ | 100 | 1021 | 0.21⚠ |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 73 | 97 | 100 | 100 | 1032 | 0.233⚠ |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 57⚠ | 96 | 100 | 100 | 1121 | 0.206⚠ |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 84 | 97 | 100 | 100 | 1525 | 0.206⚠ |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 53⚠ | 97 | 81⚠ | 100 | 1069 | 0.206⚠ |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 67⚠ | 97 | 81⚠ | 100 | 1234 | 0.377⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 83 | 97 | 100 | 100 | 400 | 0.206⚠ |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 89 | 100 | 100 | 100 | 281 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 81 | 96 | 100 | 100 | 1312 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 87 | 97 | 100 | 100 | 1200 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 88 | 100 | 100 | 100 | 961 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 84 | 96 | 81⚠ | 100 | 1549 | 0.206⚠ |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 51⚠ | 96 | 100 | 100 | 1136 | 0.206⚠ |
| / | mobile | 73 | 100 | 100 | 100 | 6225⚠ | 0 |
| /search | mobile | 60⚠ | 100 | 100 | 66⚠ | 4693⚠ | 0.483⚠ |
| /exam | mobile | 78 | 100 | 81⚠ | 100 | 905 | 0.335⚠ |
| /exam/civil-construction-1/guide/strategy | mobile | 92 | 100 | 100 | 100 | 1960 | 0.02 |
| /exam/civil-construction-1/guide/four-management | mobile | 95 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/primary/r07-a | mobile | 75 | 100 | 81⚠ | 100 | 5485⚠ | 0.049 |
| /exam/civil-construction-1/primary/h26-a | mobile | 94 | 100 | 100 | 100 | 1351 | 0.017 |
| /exam/civil-construction-1/secondary/r07 | mobile | 96 | 97 | 100 | 100 | 1201 | 0.018 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 91 | 100 | 100 | 100 | 2259 | 0 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 93 | 100 | 100 | 100 | 1351 | 0.019 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 94 | 100 | 100 | 100 | 1201 | 0 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 93 | 100 | 81⚠ | 100 | 1201 | 0.019 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 91 | 100 | 100 | 100 | 1918 | 0 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 97 | 100 | 100 | 100 | 1201 | 0.002 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 96 | 100 | 100 | 100 | 1351 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 97 | 100 | 100 | 100 | 1501 | 0.019 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 99 | 100 | 100 | 100 | 1051 | 0.017 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 98 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 100 | 100 | 100 | 100 | 1051 | 0 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 74 | 100 | 81⚠ | 100 | 1522 | 0.018 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 90 | 100 | 100 | 100 | 1967 | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 98 | 100 | 100 | 100 | 1051 | 0 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/search` (desktop): **Best Practices** = 77 (閾値: ≥85)
- `https://doboku-note.com/search` (desktop): **SEO** = 69 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.209 (閾値: ≤0.1)
- `https://doboku-note.com/exam` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.21 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (desktop): **CLS** = 0.215 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (desktop): **CLS** = 0.21 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (desktop): **CLS** = 0.233 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (desktop): **TBT** = 852ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (desktop): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (desktop): **TBT** = 1737ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.377 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (desktop): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (desktop): **Performance** = 51 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (desktop): **TBT** = 1963ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 6225ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4693ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **CLS** = 0.483 (閾値: ≤0.1)
- `https://doboku-note.com/exam` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam` (mobile): **CLS** = 0.335 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 1960ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5485ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 2259ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 1918ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **Best Practices** = 81 (閾値: ≥85)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **TBT** = 910ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 1967ms (閾値: ≤1800ms)