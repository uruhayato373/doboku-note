# PSI 計測レポート — 2026-10-24

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **47件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 705 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 455 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 531 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 802 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 99 | 100 | 100 | 100 | 841 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 87 | 100 | 100 | 100 | 769 | 0.25⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 96 | 100 | 100 | 100 | 922 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 99 | 100 | 100 | 100 | 902 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 97 | 100 | 100 | 100 | 819 | 0.048 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 100 | 100 | 100 | 781 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 879 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 950 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 98 | 100 | 100 | 100 | 1055 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 99 | 100 | 100 | 100 | 892 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 99 | 100 | 100 | 100 | 882 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 99 | 100 | 100 | 100 | 763 | 0.041 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 99 | 100 | 100 | 100 | 828 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 99 | 100 | 100 | 100 | 1013 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 99 | 100 | 100 | 100 | 881 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 99 | 100 | 100 | 100 | 915 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 89 | 100 | 100 | 100 | 786 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 95 | 100 | 100 | 100 | 897 | 0.004 |
| / | mobile | 95 | 100 | 100 | 100 | 2851⚠ | 0.006 |
| /search | mobile | 79 | 100 | 100 | 66⚠ | 4417⚠ | 0.006 |
| /exam | mobile | 100 | 100 | 100 | 100 | 1508 | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 62⚠ | 100 | 100 | 100 | 6976⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 81 | 100 | 100 | 100 | 4876⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 64⚠ | 100 | 100 | 100 | 8102⚠ | 0 |
| /exam/civil-construction-1/primary/h26-a | mobile | 70 | 100 | 100 | 100 | 6099⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 73 | 100 | 100 | 100 | 5493⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 70 | 100 | 100 | 100 | 5806⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 74 | 100 | 100 | 100 | 4811⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 73 | 100 | 100 | 100 | 5557⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 72 | 100 | 100 | 100 | 5658⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 75 | 100 | 100 | 100 | 5182⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 82 | 100 | 100 | 100 | 4876⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 72 | 100 | 100 | 100 | 5344⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 96 | 100 | 100 | 100 | 2627⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 52⚠ | 100 | 100 | 100 | 7351⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 71 | 100 | 100 | 100 | 5420⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 73 | 100 | 100 | 100 | 5383⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 67⚠ | 100 | 100 | 100 | 7052⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 92 | 100 | 100 | 100 | 3301⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 74 | 100 | 100 | 100 | 5282⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.25 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 2851ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4417ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2976ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 6976ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3206ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 4876ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 1820ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 8102ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3749ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 6099ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3327ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 5493ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3247ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5806ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3482ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 4811ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3363ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5557ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3294ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5658ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3479ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5182ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **FCP** = 3166ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 4876ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 5344ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3406ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 2627ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 1829ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 7351ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3592ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **TBT** = 520ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5420ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3277ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5383ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3239ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 7052ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3152ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 3301ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5282ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3098ms (閾値: ≤1800ms)