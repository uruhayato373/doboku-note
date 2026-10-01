---
name: hidden-tab-freezes-transitions
description: プレビュータブが hidden だと CSS transition が進まず getComputedStyle が遷移前の値を返す。効いている transform が「効かない」に見える
metadata:
  type: reference
---

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
