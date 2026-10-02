# PSI 計測レポート — 2026-10-02

- 計測対象: 22 URL × 2 strategy
- field(CrUX) 取得: **44/44件**
- 診断上のしきい値超過: **41件**
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 79 | 100 | 100 | 100 | 825 | 0.004 |
| /search | desktop | 100 | 100 | 100 | 66⚠ | 521 | 0.004 |
| /exam | desktop | 100 | 100 | 100 | 100 | 407 | 0.004 |
| /exam/civil-construction-1/guide/strategy | desktop | 100 | 100 | 100 | 100 | 624 | 0.004 |
| /exam/civil-construction-1/guide/four-management | desktop | 98 | 100 | 100 | 100 | 796 | 0.008 |
| /exam/civil-construction-1/primary/r07-a | desktop | 61⚠ | 100 | 100 | 100 | 744 | 0.227⚠ |
| /exam/civil-construction-1/primary/h26-a | desktop | 92 | 100 | 100 | 100 | 822 | 0.158⚠ |
| /exam/civil-construction-1/secondary/r07 | desktop | 100 | 100 | 100 | 100 | 641 | 0.004 |
| /exam/civil-construction-1/secondary/concrete-basics | desktop | 100 | 100 | 100 | 100 | 661 | 0.004 |
| /exam/civil-construction-1/secondary/experience-writing-guide | desktop | 100 | 100 | 100 | 100 | 750 | 0.004 |
| /exam/civil-construction-1/textbook/quality-overview | desktop | 99 | 100 | 100 | 100 | 707 | 0.004 |
| /exam/civil-construction-1/textbook/schedule-overview | desktop | 99 | 100 | 100 | 100 | 706 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-index | desktop | 100 | 100 | 100 | 100 | 622 | 0.004 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | desktop | 100 | 100 | 100 | 100 | 723 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | desktop | 94 | 100 | 100 | 100 | 673 | 0.12⚠ |
| /exam/pe-comprehensive-management/past-exams/r05-primary | desktop | 100 | 100 | 100 | 100 | 555 | 0.004 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | desktop | 99 | 100 | 100 | 100 | 670 | 0.004 |
| /exam/pe-comprehensive-management/keywords/followership | desktop | 100 | 100 | 100 | 100 | 666 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agile | desktop | 92 | 100 | 100 | 100 | 793 | 0.004 |
| /exam/pe-comprehensive-management/keywords/activity-abc | desktop | 100 | 100 | 100 | 100 | 712 | 0.004 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | desktop | 100 | 100 | 100 | 100 | 630 | 0.004 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | desktop | 100 | 100 | 100 | 100 | 776 | 0.004 |
| / | mobile | 75 | 100 | 100 | 100 | 5342⚠ | 0.006 |
| /search | mobile | 72 | 100 | 100 | 66⚠ | 5759⚠ | 0 |
| /exam | mobile | 77 | 100 | 100 | 100 | 4350⚠ | 0.006 |
| /exam/civil-construction-1/guide/strategy | mobile | 65⚠ | 100 | 100 | 100 | 8101⚠ | 0 |
| /exam/civil-construction-1/guide/four-management | mobile | 94 | 100 | 100 | 100 | 3015⚠ | 0.006 |
| /exam/civil-construction-1/primary/r07-a | mobile | 70 | 100 | 100 | 100 | 5730⚠ | 0.006 |
| /exam/civil-construction-1/primary/h26-a | mobile | 96 | 100 | 100 | 100 | 2326 | 0.006 |
| /exam/civil-construction-1/secondary/r07 | mobile | 75 | 100 | 100 | 100 | 4788⚠ | 0.006 |
| /exam/civil-construction-1/secondary/concrete-basics | mobile | 72 | 100 | 100 | 100 | 4351⚠ | 0.006 |
| /exam/civil-construction-1/secondary/experience-writing-guide | mobile | 72 | 100 | 100 | 100 | 5484⚠ | 0.006 |
| /exam/civil-construction-1/textbook/quality-overview | mobile | 71 | 100 | 100 | 100 | 5538⚠ | 0.006 |
| /exam/civil-construction-1/textbook/schedule-overview | mobile | 97 | 100 | 100 | 100 | 2401 | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-index | mobile | 97 | 100 | 100 | 100 | 2251 | 0.006 |
| /exam/pe-comprehensive-management/guide/exam-passing-strategy | mobile | 95 | 100 | 100 | 100 | 2701⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-primary | mobile | 73 | 100 | 100 | 100 | 4927⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r05-primary | mobile | 71 | 100 | 100 | 100 | 5048⚠ | 0.006 |
| /exam/pe-comprehensive-management/past-exams/r07-secondary | mobile | 76 | 100 | 100 | 100 | 4892⚠ | 0.006 |
| /exam/pe-comprehensive-management/keywords/followership | mobile | 97 | 100 | 100 | 100 | 2326 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agile | mobile | 97 | 100 | 100 | 100 | 2476 | 0.006 |
| /exam/pe-comprehensive-management/keywords/activity-abc | mobile | 97 | 100 | 100 | 100 | 2326 | 0.006 |
| /exam/pe-comprehensive-management/keywords/agenda-21 | mobile | 60⚠ | 100 | 100 | 100 | 8251⚠ | 0 |
| /exam/pe-comprehensive-management/keywords/alarp-principle | mobile | 74 | 100 | 100 | 100 | 5160⚠ | 0.006 |

## しきい値違反

- `https://doboku-note.com/` (desktop): **TBT** = 477ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.227 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **TBT** = 863ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (desktop): **CLS** = 0.158 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.12 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 5342ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2939ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5759ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 3393ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam` (mobile): **LCP** = 4350ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam` (mobile): **FCP** = 3002ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 8101ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **FCP** = 3316ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 3015ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **LCP** = 5730ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (mobile): **FCP** = 3589ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/primary/h26-a` (mobile): **FCP** = 1829ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **LCP** = 4788ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (mobile): **FCP** = 3170ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 4351ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **FCP** = 3520ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **LCP** = 5484ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide` (mobile): **FCP** = 3505ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **LCP** = 5538ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/textbook/quality-overview` (mobile): **FCP** = 3298ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/guide/exam-passing-strategy` (mobile): **LCP** = 2701ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **LCP** = 4927ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (mobile): **FCP** = 3395ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **LCP** = 5048ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r05-primary` (mobile): **FCP** = 3394ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **LCP** = 4892ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-secondary` (mobile): **FCP** = 3238ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **LCP** = 8251ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agenda-21` (mobile): **FCP** = 3377ms (閾値: ≤1800ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **LCP** = 5160ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/alarp-principle` (mobile): **FCP** = 3163ms (閾値: ≤1800ms)