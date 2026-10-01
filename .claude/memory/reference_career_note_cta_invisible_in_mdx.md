---
name: career-note-cta-invisible-in-mdx
description: career記事のnote CTA混入はMDXのgrepでは見えない。ビルド後HTMLのdata-cta="note"で数える
metadata:
  type: reference
---

「career 記事（`tags: [career]`）に note 二次 CTA を置かない」は方針だが、**MDX を grep しても検出できない**。2026-09-22 に実証。

**なぜ見えないか** — note CTA には 3 つの出方があり、うち 2 つは MDX に文字列として現れない。

1. `<MagazineCard id="...">` … MDX にあるが、`NoteLink` / `cta:` / `note.com/dobokunote` のいずれにも一致しない
2. `resolvePlacement()` の `top` / `inline` … MDX に一切現れない。カテゴリと group から自動で挿入される
3. `sidebarProduct()` … 同上

**数え方** — `npm run build` 後に、career 記事の出力 HTML で `data-cta="note"` を数えるのが唯一の実測。URL は `out/exam|practice/<category>/<group>/<name>.html`（フラット slug `<category>-<group>-<name>` から組み立てる）。実際これで 44 件中 3 件を発見した。

**Why:** 改稿ゲートに `grep -cE 'NoteLink|cta:|note\.com/dobokunote' <path>` を入れて「0 件＝混入なし」と判定していたが、同じページがビルド後に note CTA を 1 つ出していた。source grep は 2 と 3 を原理的に見られない。

**How to apply:**
- career 記事の CTA 検査は**必ずビルド後 HTML で**行う。MDX の grep は補助にしかならない
- 自動配線（2・3）は `resolvePlacement` の入口 `isCareer` ガードで止まる（2026-09-22 に真実源 `isCareerDoc` へ寄せた）。カテゴリ別・slug 接頭辞別に判定を書き足さない
- MDX に著者が明示的に置いた `<MagazineCard>` はガードの射程外。機械で一律に剥がさず判断を残す（2026-09-22 時点で 2 本が該当: `pe-comprehensive-management-public-engineer-qualification-map` と `civil-construction-1-guide-consultant`。いずれも RCCM 商品）
- 関連: [[reference_site_magazine_cta_firing]]（CTA が出る/出ない条件）・[[affiliate-career-only]]
