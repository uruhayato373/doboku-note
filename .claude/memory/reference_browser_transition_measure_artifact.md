---
name: reference_browser_transition_measure_artifact
description: "ブラウザ検証の測定アーティファクトとTailwind罠。transition中のgetComputedStyle・hiddenタブでtransitionが進まない・scrollイベント不発火・resize後media query遅延・Tailwind変種のtransformが効かない"
metadata:
  type: reference
---
Claude Browser ペイン（自動化ブラウザ）での CSS 検証時、**`getComputedStyle` が CSS トランジション実行中の開始フレーム（多くは identity/none）を返し続ける**（2026-07-14 実証）。JS で `details.open=true` 等を切り替えた直後は勿論、`setTimeout` で待っても transition が advance せず、`transform` が `matrix(1,0,0,1,0,0)`（無回転）のまま見える。

**症状の誤読に注意**: これで「CSS が効いていない」と誤診しやすい（アコーディオン回転 verify で Tailwind も独自 CSS も「効かない」と何度も誤判定した）。

**正しい測り方**:
- transition を一時無効化して最終値を読む: `el.style.transition='none'`（要素直付け）、擬似要素は `<style>.sel::before{transition:none!important}</style>` を注入
- または測定系の健全性を、インライン `transform:rotate(90deg)` の要素で先に確認する（正常なら `matrix(0,1,-1,0,0,0)` が返る）

視覚確認は screenshot がハングしがちなので、この JS 実測が主手段。関連: [[reference_browser_transition_measure_artifact]]

**類似アーティファクト（2026-07-15b）: scroll イベントが発火しない。** ペインでは `scrollBy()`/`scrollLeft` 代入で scrollLeft は動くのに **scroll イベントが一切 dispatch されない**（自前 addEventListener でも fired=0 を実証）。scroll 連動 UI（矢印の端判定等）が「壊れている」ように見えるが、実ブラウザでは仕様保証で発火する。検証は `el.dispatchEvent(new Event('scroll'))` を手動発火してリスナー→state→再描画の経路を end-to-end で確認する。

**類似アーティファクト（2026-07-15）: resize_window 後の media query 再スタイル遅延。** ペインの `resize_window`（viewport エミュレーション）後、`matchMedia` は新幅を即返すのに**既存要素は media query ルールで再スタイルされない**ことがある（同時点で新規作成した test div には正しく適用される非対称で判別可能）。また resize 直後は `innerWidth`/`clientWidth` が 0 を返す過渡状態もある。**レスポンシブ検証は resize → `location.reload()` → 測定**の順にする。実測値が矛盾したら「fresh test div と既存要素の比較」で CSS 健全性とペイン artifact を切り分ける。

---

## hidden タブで transition が進まない

ブラウザペインのタブは `document.hidden === true` のことがあり、その状態では CSS transition が
進行しない。`transition: transform …` が付いた要素は `getComputedStyle(el).transform` が
**遷移開始時の値（単位行列 `matrix(1,0,0,1,0,0)`）を返し続ける**ので、正しく効いている回転が
「効いていない」に見える。インライン `style.transform`、さらに `!important` を付けても同じ結果になるため、
「CSS ルールが上書きされている」と誤診しやすい。

**切り分け**: 測る直前に `el.style.transition = 'none'` を入れる。これで実値が出る。
併せて `document.hidden` / `visibilityState` も一緒に返して記録する。

実害: 2026-07-14 に「Tailwind の `group-open:rotate-90` と `[transform:…]` が本 build で効かない」と
誤診し、globals.css に素 CSS の回避策を入れて `[[tailwind-content-globs]]` を疑うカードを起票していた。
2026-08-20 に合成 DOM ＋ `transition:none` で測り直したところ、**どちらも正常に生成・適用されていた**。

同種の罠: 生成 CSS を grep するときのエスケープ。`[transform:rotate(90deg)]` は出力では
`.\[transform\:rotate\(90deg\)\]` なので `grep 'transform:rotate'` は当たらない。「ルール未生成」と
即断せず `grep -E '^\.\\\['` で確認する。

---

## Tailwind の transform 系変種が本 build で効かない

doboku-note の Tailwind 3.4.19 build では、**transform 系ユーティリティが変種下で回転を適用しない**（2026-07-14 実証・アコーディオン開閉で発覚）。

- `group-open:rotate-90` → ルールは生成されるが `--tw-rotate` が 0 にリセットされ潰れる（合成 transform `translate() rotate(var(--tw-rotate)) …` が識別値になる）
- `group-open:[transform:rotate(90deg)]`（arbitrary variant）→ JIT がクラスを拾えずルール未生成
- 既存の FAQCard/CurriculumList の `▶ group-open:rotate-90` も同理由で**回転していなかった潜在バグ**

**対処**: 再利用可能な回転・変形は globals.css の独自クラスで実装する（`.card-interactive` 等と同じく「見た目は globals.css に集約」の既存方針に一貫）。アコーディオン開閉は `.disclosure-chevron` ＋ `details[open] > summary .disclosure-chevron { transform: rotate(90deg) }`（素の CSS）で実装。真実源アイコンは `DisclosureChevron`（`src/components/ui/DisclosureChevron.tsx`）。prose 記事内 details は `--disclosure-chevron` mask ＋ `[open]` 回転。

根因（`@layer`/リセット順の疑い）は未調査で backlog に follow-up 起票済み。将来 `rotate-*`/`translate-*`/`scale-*` を変種（hover/group-*/open 等）で使うときは同じ罠に注意。検証時は [[reference_browser_transition_measure_artifact]] も併読。

**訂正（2026-07-15）: レスポンシブ arbitrary 変種は正常に効く。** 一度「`w-[124px] sm:w-[168px]` の変種が base に負ける」と診断したが**誤り**だった。実証すると `PremiumNoteHero` の `w-[72%] sm:w-[54%]` は reload 後に両幅とも正しく効く（mobile 71.6%／desktop 53.9%）。「desktop でも 124px」に見えたのは [[reference_browser_transition_measure_artifact]] の resize アーティファクト（reload 前の測定）。**この build で壊れるのは transform 系（rotate/translate/scale）の変種だけで、`w-`/`h-` の arbitrary 変種は健全。** レスポンシブ幅の検証は必ず resize→reload→測定で行う。
