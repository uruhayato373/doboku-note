# PSI 計測レポート — 2026-10-19

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **46件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 100 | 100 | 100 | 641 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 581 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 421 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 97 | 100 | 100 | 100 | 914 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 100 | 100 | 100 | 100 | 667 | 0.004 |
| /exam/civil-construction-1/primary/r07-a | desktop | 100 | 100 | 100 | 100 | 734 | 0.004 |
| /exam/civil-construction-1/primary/h26-a | desktop | 99 | 100 | 100 | 100 | 862 | 0.004 |
| /exam/civil-construction-1/secondary/r07 | desktop | 99 | 100 | 100 | 100 | 801 | 0.009 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 99 | 100 | 100 | 100 | 981 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 100 | 100 | 100 | 781 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 90 | 100 | 100 | 100 | 774 | 0.05 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 921 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 99 | 100 | 100 | 100 | 885 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 812 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 100 | 100 | 100 | 100 | 741 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 611 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 100 | 100 | 100 | 100 | 642 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 768 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 100 | 100 | 100 | 100 | 808 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 701 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 98 | 100 | 100 | 100 | 858 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 819 | 0.004 |
| / | mobile | 67⚠ | 100 | 100 | 100 | 6377⚠ | 0 |
| /search | mobile | 79 | 100 | 100 | 66⚠ | 4409⚠ | 0.006 |
| /exam | mobile | 75 | 100 | 100 | 100 | 4571⚠ | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 74 | 100 | 100 | 100 | 5210⚠ | 0.006 |
| /exam/civil-construction-1/guide/four-management | mobile | 73 | 100 | 100 | 100 | 5494⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 70 | 100 | 100 | 100 | 6003⚠ | 0.014 |
| /exam/civil-construction-1/primary/h26-a | mobile | 71 | 100 | 100 | 100 | 6092⚠ | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 74 | 100 | 100 | 100 | 5277⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 71 | 100 | 100 | 100 | 5964⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 71 | 100 | 100 | 100 | 5525⚠ | 0 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 73 | 100 | 100 | 100 | 5457⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 72 | 100 | 100 | 100 | 5792⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 79 | 100 | 100 | 100 | 5455⚠ | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 83 | 100 | 100 | 100 | 4615⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 66⚠ | 100 | 100 | 100 | 7277⚠ | 0 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 72 | 100 | 100 | 100 | 5442⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 96 | 100 | 100 | 100 | 2551⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 73 | 100 | 100 | 100 | 5288⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 73 | 100 | 100 | 100 | 5310⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 74 | 100 | 100 | 100 | 5275⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 57⚠ | 100 | 100 | 100 | 7201⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 92 | 100 | 100 | 100 | 3226⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/` (mobile): **Performance** = 67 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 6377ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3086ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 4409ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 2995ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4571ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 3106ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5210ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3125ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5494ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **FCP** = 3276ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 6003ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3531ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **LCP** = 6092ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 3245ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 5277ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3200ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 5964ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3446ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5525ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3460ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5457ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3251ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **LCP** = 5792ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/schedule-overview` (mobile): **FCP** = 3326ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-index` (mobile): **LCP** = 5455ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 4615ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 7277ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3342ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5442ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3404ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 2551ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **LCP** = 5288ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/followership` (mobile): **FCP** = 3242ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **LCP** = 5310ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (mobile): **FCP** = 3281ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **LCP** = 5275ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/activity-abc` (mobile): **FCP** = 3164ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 7201ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3565ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **TBT** = 357ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 3226ms (閾値: ≤2500ms)