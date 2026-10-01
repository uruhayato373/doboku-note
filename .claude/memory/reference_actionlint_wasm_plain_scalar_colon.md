---
name: actionlint-wasm-plain-scalar-colon
description: "workflow の単一行 `run:` に「: 」を含む文字列を書くと WASM 版 actionlint が違反ではなく RuntimeError unreachable でクラッシュし check-workflow-hygiene が「検査中に停止」になる"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 4493fa3c-b0d0-4f24-9b81-ba293298dc72
  modified: 2026-09-18T00:28:24.818Z
---

`run: node x.mjs --body "復旧 run: $URL"` のように **plain scalar の中に `: `** があると YAML として不正で、`check-workflow-hygiene`（npm パッケージ `actionlint` の WASM）は違反を報告せず `unreachable` で落ちる。エラーは「actionlint が X.yml の検査中に停止」で、どの行かは出ない。

**見分け方:** 直前に自分が触った workflow で、`git show origin/develop:<file>` を同じ linter に通すと 0 violations なら自分の挿入分が原因。

**直し方:** `run: |` の block scalar にする（2026-09-18 に seo-rank-watch.yml で実発生）。関連: [[reference_quality_audit_system]]
