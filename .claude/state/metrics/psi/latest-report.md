# PSI 計測レポート — 2026-04-27

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **80件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 97 | 100 | 100 | 92 | 858 | 0.038 |
| /search | desktop | 68⚠ | 94 | 100 | 83⚠ | 1270 | 0.025 |
| /category | desktop | 94 | 98 | 96 | 75⚠ | 613 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 91 | 100 | 100 | 92 | 1636 | 0.024 |
| /docs/civil-construction-1-guide-four-management | desktop | 92 | 100 | 100 | 92 | 1581 | 0.024 |
| /docs/civil-construction-1-primary-r07-a | desktop | 77 | 100 | 100 | 92 | 2382 | 0.159⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 82 | 100 | 100 | 92 | 2061 | 0.03 |
| /docs/civil-construction-1-secondary-r07 | desktop | 64⚠ | 100 | 100 | 92 | 1625 | 0.024 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 83 | 100 | 100 | 92 | 2042 | 0.064 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 84 | 100 | 100 | 92 | 2142 | 0.029 |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 75 | 100 | 100 | 92 | 1983 | 0.187⚠ |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 87 | 100 | 100 | 92 | 1803 | 0.058 |
| /docs/pe-comprehensive-management-exam-index | desktop | 92 | 96 | 100 | 92 | 1447 | 0.026 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 90 | 95 | 100 | 92 | 1742 | 0.054 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 89 | 100 | 100 | 92 | 1556 | 0.095 |
| /docs/pe-comprehensive-management-r05-primary | desktop | 83 | 100 | 96 | 92 | 1562 | 0.078 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 94 | 100 | 100 | 92 | 1461 | 0.027 |
| /docs/pe-comprehensive-management-followership | desktop | 88 | 92 | 100 | 92 | 1261 | 0.156⚠ |
| /docs/pe-comprehensive-management-agile | desktop | 93 | 93 | 100 | 92 | 1476 | 0.048 |
| /docs/pe-comprehensive-management-activity-abc | desktop | 90 | 91 | 100 | 92 | 1599 | 0.047 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 95 | 91 | 100 | 92 | 1301 | 0.025 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 94 | 91 | 100 | 92 | 1501 | 0.034 |
| / | mobile | 51⚠ | 96 | 100 | 92 | 4224⚠ | 0.009 |
| /search | mobile | 77 | 92 | 100 | 83⚠ | 5622⚠ | 0 |
| /category | mobile | 68⚠ | 98 | 96 | 75⚠ | 5359⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 56⚠ | 96 | 100 | 92 | 11701⚠ | 0.059 |
| /docs/civil-construction-1-guide-four-management | mobile | 55⚠ | 96 | 100 | 92 | 11326⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 55⚠ | 96 | 100 | 92 | 13352⚠ | 0.062 |
| /docs/civil-construction-1-primary-h26-a | mobile | 47⚠ | 96 | 100 | 92 | 15226⚠ | 0.009 |
| /docs/civil-construction-1-secondary-r07 | mobile | 58⚠ | 96 | 100 | 92 | 9301⚠ | 0.009 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 53⚠ | 96 | 100 | 92 | 14851⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 41⚠ | 96 | 100 | 92 | 12301⚠ | 0.009 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 56⚠ | 96 | 100 | 92 | 10803⚠ | 0.009 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 57⚠ | 96 | 100 | 92 | 10936⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-index | mobile | 48⚠ | 93 | 100 | 92 | 11476⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 60⚠ | 91 | 100 | 92 | 8926⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 61⚠ | 96 | 100 | 92 | 8028⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 60⚠ | 96 | 96 | 92 | 8026⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 61⚠ | 96 | 100 | 92 | 8326⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 59⚠ | 93 | 100 | 92 | 7905⚠ | 0.084 |
| /docs/pe-comprehensive-management-agile | mobile | 56⚠ | 93 | 100 | 92 | 11027⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 55⚠ | 91 | 100 | 92 | 10727⚠ | 0.009 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 48⚠ | 91 | 100 | 92 | 10427⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 52⚠ | 91 | 100 | 92 | 10127⚠ | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **TBT** = 890ms (閾値: ≤300ms)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.159 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 766ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (desktop): **CLS** = 0.187 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (desktop): **CLS** = 0.156 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **Performance** = 51 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 4224ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 3621ms (閾値: ≤1800ms)
- `https://doboku-note.com/` (mobile): **TBT** = 994ms (閾値: ≤300ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 5622ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **Performance** = 68 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 5359ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 4342ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 11701ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 8337ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 11326ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 8041ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 13352ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 9751ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 47 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 15226ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 12529ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **TBT** = 371ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 9301ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 6601ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **Performance** = 53 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 14851ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **FCP** = 10291ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 41 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 12301ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 8551ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **TBT** = 549ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 10803ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 8761ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 10936ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 7705ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 48 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 11476ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 8385ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **TBT** = 367ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 8926ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 6151ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 8028ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 5702ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 60 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 8026ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 6151ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 8326ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 5551ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 59 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 7905ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 4951ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 56 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 11027ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 7177ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 55 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 10727ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 6751ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 48 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 10427ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 7158ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **TBT** = 412ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 52 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **LCP** = 10127ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **FCP** = 7391ms (閾値: ≤1800ms)