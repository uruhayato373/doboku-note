---
name: site-magazine-cta-firing
description: note マガジンを published:true にしてもサイト CTA は出ないことがある。sidebar は死に配線・inline は本文8000字ゲート・非HUB資格はもくじ無し
metadata: 
  node_type: memory
  type: reference
  originSessionId: 60cf5fe1-8ec7-437d-ace6-139916d7453d
  modified: 2026-08-17T11:03:18.932Z
---

`note-magazines.ts` を `published: true` にしても、サイトの `/docs` に note マガジン CTA が
1 面も出ないことがある（2026-07-31 コンクリート診断士で実際に発生。handoff は「3面で発火」と
書いていたが 2026-07 の CTA 統一より前の記述だった）。

`src/app/docs/[...slug]/page.tsx` が実際に使う経路は次の 4 つだけ:

| 経路 | 発火条件 |
|---|---|
| `placement.top`（冒頭 CTA） | 配線があれば無条件。**確実に出せる唯一の枠** |
| `placement.inline`（中間 CTA） | group が guide/pillar/textbook/土木secondary **かつ h2>=5 かつ本文 8,000 字以上**。さらに下限枠ゲート（h2>=4 かつ 2,500 字）| 
| もくじタイル（`resolveHubCta`） | **HUB 資格のみ**。concrete 系・一次・reference は null |
| MDX 内 `<MagazineCard id=... utmContent=... />` | 置けば出る |

**`placement.sidebar` はどこからも参照されていない**（2026-07 の統一で廃止）。配線しても出ない。

**`inline` は先頭 1 誌しか描画されない**（2026-08-17 追記）。しかも `top` と別マガジンのときだけ。
つまり `inline` の 2 位以降は**優先順位リストであって面ではない**。到達検査
（`check-magazine-cta-reachability.ts`）は 2026-08-17 まで inline を全スロット credit していて、
2 位以降しか持たないマガジンを「導線あり」と誤判定していた（同期後に 5 誌が新規で赤くなった）。

**`primary` / `pastExam` は中間 CTA の対象外**。`midEligibleGroup` に含まれないので、
これらの group では **`top` を配線しない限り note CTA はゼロ**になる。この形の欠陥は
診断士(7/31)・主任技士(8/13)・総監択一(8/17)・土木 primary 29本(8/17) と 4 度再発した。

**`<MagazineCard>` の `utmContent` は必須**。省略すると URL に literal `utm_content=undefined` が
入り GA4 帰属が壊れる（型エラーにはならないので気づけない）。既存 123 件は全て指定済み。

新しいマガジンを公開したら、`published: true` にしただけで終わりにせず **dev + curl で
マガジン key（`m/xxxx`）がページ HTML に出るか実査する**。出ていなければ top を足すか
MDX に `<MagazineCard>` を置く。配線の生死は `resolvePlacement` + `getMagazine` を
tsx で直接評価すると 1 コマンドで分かる。

関連: [[civil-site-cta-architecture]]（civil の CTA は magazine-placement.ts 一元管理）
