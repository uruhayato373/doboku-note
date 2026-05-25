# PSI 計測レポート — 2026-05-25

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **54件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 100 | 96 | 96 | 92 | 665 | 0.02 |
| /search | desktop | 98 | 94 | 96 | 83⚠ | 1041 | 0.02 |
| /category | desktop | 72 | 98 | 96 | 75⚠ | 920 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 97 | 96 | 96 | 92 | 1152 | 0.02 |
| /docs/civil-construction-1-guide-four-management | desktop | 85 | 96 | 96 | 92 | 2043 | 0.034 |
| /docs/civil-construction-1-primary-r07-a | desktop | 86 | 96 | 96 | 92 | 1185 | 0.183⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 86 | 96 | 96 | 92 | 2343 | 0.02 |
| /docs/civil-construction-1-secondary-r07 | desktop | 98 | 96 | 96 | 92 | 948 | 0.02 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 92 | 96 | 96 | 92 | 774 | 0.069 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 91 | 96 | 96 | 92 | 1761 | 0.02 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 86 | 96 | 96 | 92 | 1061 | 0.133⚠ |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 97 | 96 | 96 | 92 | 1297 | 0.02 |
| /docs/pe-comprehensive-management-exam-index | desktop | 98 | 96 | 96 | 92 | 931 | 0.02 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 98 | 96 | 96 | 92 | 1086 | 0.02 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 72 | 96 | 96 | 92 | 1013 | 0.16⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 99 | 96 | 96 | 92 | 528 | 0.041 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 97 | 96 | 96 | 92 | 662 | 0.02 |
| /docs/pe-comprehensive-management-followership | desktop | 99 | 96 | 96 | 92 | 857 | 0.02 |
| /docs/pe-comprehensive-management-agile | desktop | 98 | 96 | 96 | 92 | 1097 | 0.023 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 90 | 94 | 96 | 92 | 910 | 0.02 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 96 | 94 | 96 | 92 | 857 | 0.02 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 73 | 94 | 96 | 92 | 945 | 0.02 |
| / | mobile | 76 | 93 | 96 | 92 | 4946⚠ | 0.009 |
| /search | mobile | 91 | 92 | 96 | 83⚠ | 3394⚠ | 0.009 |
| /category | mobile | 94 | 98 | 96 | 75⚠ | 1522 | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 95 | 93 | 96 | 92 | 2267 | 0 |
| /docs/civil-construction-1-guide-four-management | mobile | 70 | 93 | 96 | 92 | 6106⚠ | 0.009 |
| https://doboku-note.com/docs/civil-construction-1-primary-r07-a | mobile | ERROR | | | | | |
| /docs/civil-construction-1-primary-h26-a | mobile | 55⚠ | 92 | 96 | 92 | 6767⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 66⚠ | 93 | 96 | 92 | 5971⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 63⚠ | 93 | 96 | 92 | 7464⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 70 | 93 | 96 | 92 | 6631⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 53⚠ | 93 | 96 | 92 | 5580⚠ | 0 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 65⚠ | 92 | 96 | 92 | 6421⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 72 | 93 | 96 | 92 | 5964⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 76 | 93 | 96 | 92 | 4545⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 87 | 93 | 96 | 92 | 2701⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 82 | 93 | 96 | 92 | 4177⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 60⚠ | 92 | 96 | 92 | 6388⚠ | 0 |
| /docs/pe-comprehensive-management-followership | mobile | 72 | 93 | 96 | 92 | 5968⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 72 | 93 | 96 | 92 | 6033⚠ | 0.009 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 71 | 91 | 96 | 92 | 6281⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 79 | 91 | 96 | 92 | 3879⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 98 | 91 | 96 | 92 | 2409 | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **TBT** = 655ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.183 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **CLS** = 0.133 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.16 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **TBT** = 453ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (desktop): **TBT** = 622ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 4946ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 2587ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 3394ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 6106ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 2975ms (閾値: ≤1800ms)
- ❌ `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 6767ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 3203ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 428ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 66 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 5971ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 2728ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 7464ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 3147ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 6631ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 2719ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 5580ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 3492ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **TBT** = 612ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 6421ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 3333ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 5964ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 2537ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 4545ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **TBT** = 325ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 2701ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **TBT** = 314ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 4177ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 6388ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 2969ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **TBT** = 317ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 5968ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 2725ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 6033ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 2652ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 6281ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 2668ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 3879ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **TBT** = 334ms (閾値: ≤300ms)