# PSI 計測レポート — 2026-05-13

- 計測対象: 22 URL × 2 strategy
- しきい値違反: **79件**

## スコアサマリー

| URL | Strategy | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| / | desktop | 98 | 100 | 96 | 92 | 730 | 0.02 |
| /search | desktop | 99 | 94 | 96 | 83⚠ | 895 | 0.02 |
| /category | desktop | 92 | 98 | 96 | 75⚠ | 450 | 0 |
| /docs/civil-construction-1-guide-strategy | desktop | 97 | 100 | 96 | 92 | 637 | 0.02 |
| /docs/civil-construction-1-guide-four-management | desktop | 76 | 100 | 96 | 92 | 809 | 0.02 |
| /docs/civil-construction-1-primary-r07-a | desktop | 89 | 100 | 96 | 92 | 1142 | 0.147⚠ |
| /docs/civil-construction-1-primary-h26-a | desktop | 97 | 100 | 96 | 92 | 618 | 0.024 |
| /docs/civil-construction-1-secondary-r07 | desktop | 84 | 100 | 96 | 92 | 788 | 0.02 |
| /docs/civil-construction-1-secondary-concrete-basics | desktop | 85 | 100 | 96 | 92 | 710 | 0.069 |
| /docs/civil-construction-1-secondary-experience-writing-guide | desktop | 77 | 100 | 96 | 92 | 762 | 0.128⚠ |
| /docs/civil-construction-1-textbook-quality-management-text | desktop | 98 | 100 | 96 | 92 | 741 | 0.02 |
| /docs/civil-construction-1-textbook-schedule-management | desktop | 99 | 100 | 96 | 92 | 575 | 0.02 |
| /docs/pe-comprehensive-management-exam-index | desktop | 97 | 96 | 96 | 92 | 685 | 0.02 |
| /docs/pe-comprehensive-management-exam-passing-strategy | desktop | 98 | 98 | 96 | 92 | 738 | 0.02 |
| /docs/pe-comprehensive-management-r07-primary | desktop | 85 | 100 | 96 | 92 | 538 | 0.16⚠ |
| /docs/pe-comprehensive-management-r05-primary | desktop | 88 | 100 | 96 | 92 | 527 | 0.021 |
| /docs/pe-comprehensive-management-r07-secondary | desktop | 82 | 100 | 96 | 92 | 612 | 0.02 |
| /docs/pe-comprehensive-management-followership | desktop | 96 | 100 | 96 | 92 | 651 | 0.02 |
| https://doboku-note.com/docs/pe-comprehensive-management-agile | desktop | ERROR | | | | | |
| /docs/pe-comprehensive-management-activity-abc | desktop | 65⚠ | 98 | 96 | 92 | 922 | 0.02 |
| /docs/pe-comprehensive-management-agenda-21 | desktop | 99 | 98 | 96 | 92 | 669 | 0.02 |
| /docs/pe-comprehensive-management-alarp-principle | desktop | 99 | 98 | 96 | 92 | 599 | 0.02 |
| / | mobile | 62⚠ | 96 | 96 | 92 | 8363⚠ | 0.009 |
| /search | mobile | 64⚠ | 92 | 96 | 83⚠ | 7366⚠ | 0 |
| /category | mobile | 62⚠ | 98 | 96 | 75⚠ | 7255⚠ | 0 |
| /docs/civil-construction-1-guide-strategy | mobile | 62⚠ | 96 | 96 | 92 | 9275⚠ | 0.009 |
| /docs/civil-construction-1-guide-four-management | mobile | 62⚠ | 96 | 96 | 92 | 9392⚠ | 0 |
| /docs/civil-construction-1-primary-r07-a | mobile | 54⚠ | 96 | 96 | 92 | 9861⚠ | 0 |
| /docs/civil-construction-1-primary-h26-a | mobile | 58⚠ | 96 | 96 | 92 | 9242⚠ | 0 |
| /docs/civil-construction-1-secondary-r07 | mobile | 58⚠ | 96 | 96 | 92 | 8875⚠ | 0 |
| /docs/civil-construction-1-secondary-concrete-basics | mobile | 86 | 96 | 96 | 92 | 3676⚠ | 0.009 |
| /docs/civil-construction-1-secondary-experience-writing-guide | mobile | 63⚠ | 96 | 96 | 92 | 9777⚠ | 0 |
| /docs/civil-construction-1-textbook-quality-management-text | mobile | 61⚠ | 96 | 96 | 92 | 10188⚠ | 0.011 |
| /docs/civil-construction-1-textbook-schedule-management | mobile | 61⚠ | 96 | 96 | 92 | 10246⚠ | 0 |
| /docs/pe-comprehensive-management-exam-index | mobile | 65⚠ | 93 | 96 | 92 | 6853⚠ | 0.009 |
| /docs/pe-comprehensive-management-exam-passing-strategy | mobile | 57⚠ | 95 | 96 | 92 | 9429⚠ | 0 |
| /docs/pe-comprehensive-management-r07-primary | mobile | 69⚠ | 96 | 96 | 92 | 5401⚠ | 0.009 |
| /docs/pe-comprehensive-management-r05-primary | mobile | 62⚠ | 96 | 96 | 92 | 9554⚠ | 0.009 |
| /docs/pe-comprehensive-management-r07-secondary | mobile | 63⚠ | 96 | 96 | 92 | 8748⚠ | 0.009 |
| /docs/pe-comprehensive-management-followership | mobile | 62⚠ | 96 | 96 | 92 | 9281⚠ | 0.009 |
| /docs/pe-comprehensive-management-agile | mobile | 63⚠ | 96 | 96 | 92 | 5584⚠ | 0 |
| /docs/pe-comprehensive-management-activity-abc | mobile | 63⚠ | 95 | 96 | 92 | 9347⚠ | 0 |
| /docs/pe-comprehensive-management-agenda-21 | mobile | 63⚠ | 95 | 96 | 92 | 8920⚠ | 0 |
| /docs/pe-comprehensive-management-alarp-principle | mobile | 69⚠ | 95 | 96 | 92 | 2178 | 0.009 |

## しきい値違反

- `https://doboku-note.com/search` (desktop): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/category` (desktop): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (desktop): **TBT** = 526ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (desktop): **CLS** = 0.147 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (desktop): **TBT** = 353ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (desktop): **TBT** = 327ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **CLS** = 0.128 (閾値: ≤0.1)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (desktop): **TBT** = 398ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (desktop): **CLS** = 0.16 (閾値: ≤0.1)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (desktop): **TBT** = 401ms (閾値: ≤300ms)
- ❌ `https://doboku-note.com/docs/pe-comprehensive-management-agile` (desktop): PSI API 500: {
  "error": {
    "code": 500,
    "message": "Lighthouse returned error: Something went wrong.",
    "errors": [
      {
        "message": "Lighthouse returned error: Something went wr
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (desktop): **TBT** = 1729ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/` (mobile): **LCP** = 8363ms (閾値: ≤2500ms)
- `https://doboku-note.com/` (mobile): **FCP** = 4540ms (閾値: ≤1800ms)
- `https://doboku-note.com/search` (mobile): **Performance** = 64 (閾値: ≥70)
- `https://doboku-note.com/search` (mobile): **SEO** = 83 (閾値: ≥90)
- `https://doboku-note.com/search` (mobile): **LCP** = 7366ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **FCP** = 4622ms (閾値: ≤1800ms)
- `https://doboku-note.com/category` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/category` (mobile): **SEO** = 75 (閾値: ≥90)
- `https://doboku-note.com/category` (mobile): **LCP** = 7255ms (閾値: ≤2500ms)
- `https://doboku-note.com/category` (mobile): **FCP** = 4662ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **LCP** = 9275ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-strategy` (mobile): **FCP** = 4739ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **LCP** = 9392ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-guide-four-management` (mobile): **FCP** = 4963ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **Performance** = 54 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **LCP** = 9861ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-r07-a` (mobile): **FCP** = 5912ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **LCP** = 9242ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-primary-h26-a` (mobile): **FCP** = 5111ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **Performance** = 58 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **LCP** = 8875ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-r07` (mobile): **FCP** = 4818ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-concrete-basics` (mobile): **LCP** = 3676ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **LCP** = 9777ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-secondary-experience-writing-guide` (mobile): **FCP** = 4641ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **LCP** = 10188ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-quality-management-text` (mobile): **FCP** = 5216ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **Performance** = 61 (閾値: ≥70)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **LCP** = 10246ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/civil-construction-1-textbook-schedule-management` (mobile): **FCP** = 5366ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **Performance** = 65 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **LCP** = 6853ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-index` (mobile): **FCP** = 3053ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **Performance** = 57 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **LCP** = 9429ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-exam-passing-strategy` (mobile): **FCP** = 4627ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **LCP** = 5401ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary` (mobile): **FCP** = 2914ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **LCP** = 9554ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r05-primary` (mobile): **FCP** = 4874ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **LCP** = 8748ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary` (mobile): **FCP** = 4776ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **Performance** = 62 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **LCP** = 9281ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-followership` (mobile): **FCP** = 4784ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **LCP** = 5584ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **FCP** = 3087ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agile` (mobile): **TBT** = 391ms (閾値: ≤300ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **LCP** = 9347ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-activity-abc` (mobile): **FCP** = 4599ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **Performance** = 63 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **LCP** = 8920ms (閾値: ≤2500ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-agenda-21` (mobile): **FCP** = 4561ms (閾値: ≤1800ms)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **Performance** = 69 (閾値: ≥70)
- `https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle` (mobile): **TBT** = 2137ms (閾値: ≤300ms)