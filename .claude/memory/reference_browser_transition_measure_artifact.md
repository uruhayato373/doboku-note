---
name: reference_browser_transition_measure_artifact
description: ブラウザペイン検証で getComputedStyle が CSS トランジション中の開始フレームを返す測定アーティファクト。最終値は transition 無効化で測る
metadata: 
  node_type: memory
  type: reference
  originSessionId: e028b2ce-3da2-4e44-92f6-93fb7bf97c2a
---

Claude Browser ペイン（自動化ブラウザ）での CSS 検証時、**`getComputedStyle` が CSS トランジション実行中の開始フレーム（多くは identity/none）を返し続ける**（2026-07-14 実証）。JS で `details.open=true` 等を切り替えた直後は勿論、`setTimeout` で待っても transition が advance せず、`transform` が `matrix(1,0,0,1,0,0)`（無回転）のまま見える。

**症状の誤読に注意**: これで「CSS が効いていない」と誤診しやすい（アコーディオン回転 verify で Tailwind も独自 CSS も「効かない」と何度も誤判定した）。

**正しい測り方**:
- transition を一時無効化して最終値を読む: `el.style.transition='none'`（要素直付け）、擬似要素は `<style>.sel::before{transition:none!important}</style>` を注入
- または測定系の健全性を、インライン `transform:rotate(90deg)` の要素で先に確認する（正常なら `matrix(0,1,-1,0,0,0)` が返る）

視覚確認は screenshot がハングしがちなので、この JS 実測が主手段。関連: [[reference_tailwind_transform_broken]]

**類似アーティファクト（2026-07-15b）: scroll イベントが発火しない。** ペインでは `scrollBy()`/`scrollLeft` 代入で scrollLeft は動くのに **scroll イベントが一切 dispatch されない**（自前 addEventListener でも fired=0 を実証）。scroll 連動 UI（矢印の端判定等）が「壊れている」ように見えるが、実ブラウザでは仕様保証で発火する。検証は `el.dispatchEvent(new Event('scroll'))` を手動発火してリスナー→state→再描画の経路を end-to-end で確認する。

**類似アーティファクト（2026-07-15）: resize_window 後の media query 再スタイル遅延。** ペインの `resize_window`（viewport エミュレーション）後、`matchMedia` は新幅を即返すのに**既存要素は media query ルールで再スタイルされない**ことがある（同時点で新規作成した test div には正しく適用される非対称で判別可能）。また resize 直後は `innerWidth`/`clientWidth` が 0 を返す過渡状態もある。**レスポンシブ検証は resize → `location.reload()` → 測定**の順にする。実測値が矛盾したら「fresh test div と既存要素の比較」で CSS 健全性とペイン artifact を切り分ける。
