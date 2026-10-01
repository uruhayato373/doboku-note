---
name: stale-url-references
description: URL を移行すると「旧URLを叩き続ける参照」が3種類（E2E/ワークフロー/PSI URL一覧）置き去りになる。転送元は301なので検査が恒久的に赤いまま無視される
metadata:
  node_type: memory
  type: reference
---

2026-08-30 の IA 移行（`/docs/` `/category/` → `/exam/` 等）で、**旧 URL を叩き続ける参照が
3 箇所に残った**。旧 URL は `_redirects` の転送元として 301 を返すだけで実体が無いため、
「200 を期待する検査」は必ず落ちる。**サイトは正常なのに検査だけが恒久的に赤くなる。**

| 置き去りになった場所 | 症状 | 気づいた経緯 |
|---|---|---|
| `e2e/fixtures.ts` 等 | dev で必ず 404。smoke/navigation が長期間ずっと赤 | 2026-08-30 |
| `.github/workflows/uptime-ping.yml` | 「SSR 壊れ / body 空」を毎回誤報し Issue #477 へ追記し続けた | 2026-08-31 |
| `.claude/config/psi-urls.txt` | 22 URL 中 **20 が転送元**。field(CrUX) が構造的に 0 のまま | 2026-08-31 |

**なぜ放置されるか**: 赤が常態化すると誰も見なくなる。とくに uptime は
「本物の障害を捕まえる」のが仕事なので、オオカミ少年になった時点で**役目が空席**になる
（CLAUDE.md §9「赤いのに誰も見ていない検査は、無いのと同じ」）。

**PSI 特有の罠**: Lighthouse は 301 を追うので **lab 値は普通に出る**。だが
**CrUX(field) は要求した URL をキーに持つ**ので転送元には最初から存在しない。
`psi-config.json` は `primary_source: field` ＋ `min_field_coverage` ゲートなので、
転送元を測り続ける限り field は 0 で固定＝「実害なし」でも「判定材料なし」でもない赤になる。
**lab が出ているから計測できている、と読まない。**

**機械ゲート**: `npm run check-e2e-targets` が上記 3 種すべてを走査し、`out/` と `_redirects` に
突合して**転送元を叩いていたら redirect-source として落とす**（要 `npm run build` なので
quality:audit ではなく ci.yml / e2e.yml の build 後）。3 箇所とも故障注入で file:line を
名指しすることを確認済み。新しい置き場が増えたら `URL_LIST_FILES` に足す。

**未解決**: PSI の field 0 件は 2026-08-18 から始まっており、URL 移行（08-30）より 12 日早い。
上の修正は「移行以降 field が構造的に戻り得なかった」問題を潰しただけで、
**08-18 の断絶の原因は別**（psi-config.json は CrUX 側の供給停止と記録）。混同しない。

関連: [[standards-chapters]] / [[psi-lab-vs-field]] / [[measurement-incidents]]
