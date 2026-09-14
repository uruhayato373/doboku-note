---
name: reference_tailwind_transform_broken
description: Tailwind の transform ユーティリティ（rotate/translate 等）が本 build で変種下で効かない。回転等は globals.css の素の CSS で実装
metadata: 
  node_type: memory
  type: reference
  originSessionId: e028b2ce-3da2-4e44-92f6-93fb7bf97c2a
---

doboku-note の Tailwind 3.4.19 build では、**transform 系ユーティリティが変種下で回転を適用しない**（2026-07-14 実証・アコーディオン開閉で発覚）。

- `group-open:rotate-90` → ルールは生成されるが `--tw-rotate` が 0 にリセットされ潰れる（合成 transform `translate() rotate(var(--tw-rotate)) …` が識別値になる）
- `group-open:[transform:rotate(90deg)]`（arbitrary variant）→ JIT がクラスを拾えずルール未生成
- 既存の FAQCard/CurriculumList の `▶ group-open:rotate-90` も同理由で**回転していなかった潜在バグ**

**対処**: 再利用可能な回転・変形は globals.css の独自クラスで実装する（`.card-interactive` 等と同じく「見た目は globals.css に集約」の既存方針に一貫）。アコーディオン開閉は `.disclosure-chevron` ＋ `details[open] > summary .disclosure-chevron { transform: rotate(90deg) }`（素の CSS）で実装。真実源アイコンは `DisclosureChevron`（`src/components/ui/DisclosureChevron.tsx`）。prose 記事内 details は `--disclosure-chevron` mask ＋ `[open]` 回転。

根因（`@layer`/リセット順の疑い）は未調査で backlog に follow-up 起票済み。将来 `rotate-*`/`translate-*`/`scale-*` を変種（hover/group-*/open 等）で使うときは同じ罠に注意。検証時は [[reference_browser_transition_measure_artifact]] も併読。

**訂正（2026-07-15）: レスポンシブ arbitrary 変種は正常に効く。** 一度「`w-[124px] sm:w-[168px]` の変種が base に負ける」と診断したが**誤り**だった。実証すると `PremiumNoteHero` の `w-[72%] sm:w-[54%]` は reload 後に両幅とも正しく効く（mobile 71.6%／desktop 53.9%）。「desktop でも 124px」に見えたのは [[reference_browser_transition_measure_artifact]] の resize アーティファクト（reload 前の測定）。**この build で壊れるのは transform 系（rotate/translate/scale）の変種だけで、`w-`/`h-` の arbitrary 変種は健全。** レスポンシブ幅の検証は必ず resize→reload→測定で行う。
