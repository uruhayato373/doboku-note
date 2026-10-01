---
name: untrack-ondisk-vs-tracked
description: git rm --cached 後は実体がローカルに残るので、on-disk 件数を数える検査はローカルだけ緑・CI だけ赤になる
metadata: 
  node_type: memory
  type: reference
  originSessionId: 1567f238-b104-48b9-8f7b-c4a47cb3604e
  modified: 2026-08-30T07:31:55.448Z
---

`git rm --cached` は**追跡だけ外し、ワークツリーの実体は残す**。そのため
「ディレクトリを readdir して件数を数える」検査は、untrack 後もローカルでは
元の件数を返し続け、CI（＝追跡下のファイルしか無い）だけが落ちる。
ローカルで何度 `npm test` を回しても再現しない。

2026-08-21 に実際に起きた（DN-0111 Phase 2、note カバー SVG 827 件）:

| | content/note |
|---|---|
| 手元の実ファイル | 4,722 |
| 追跡下（CI が見る） | 3,710 |
| assert | `> 4000` |

`tests/repository-paths.test.mjs` の「content の各チャネルに実体がある」が
`inventory()`（on-disk）で数えていたのが原因。追跡下（`git ls-files`）で
数えるよう変更して解消。TZ・locale・PATH を CI 相当にしても再現しないので、
**環境差を疑う前に「追跡下と手元で件数が違わないか」を先に見る**。

同種の罠を持つのは on-disk を数える全ての検査。DN-0111 Phase 4 の退避
（note -827 -586 / sns -1,997 / textbook -868）でまた表面化する。
**下限を割ったら、数字を下げる前に減った分が
`.claude/state/assets/manifest.json` に sha256 付きで載っていることを確かめる。**
確かめずに下限だけ下げると、その検査は事故を通す飾りになる。

**別型（2026-08-30 に踏んだ）: 実体があると台帳参照の経路が実行されない。**
R2 退避したアセットの被覆検査は「ローカル実体 **または** 退避台帳」で判定する。
このとき台帳の引き方を間違えても（`entries[path]` を `assets[path]` と誤る等）、
手元には実体があるので常に前者で緑になり、**台帳側の分岐を一度も実行しないまま通る**。
実体を持たない CI のクリーンチェックアウトで初めて全件赤になった（章 OGP 344 件）。

対策は 2 つ。**台帳の形状は自前で JSON を読まず `loadManifest()` を使う**（真実源を 1 つにする）。
そして**検査の出力に「台帳に載っている件数」を必ず出す**——実体で緑になっている裏で
参照が死んでいても、この数字が 0 なら気づける。検証は「実体を退避した状態を再現して
台帳経由で通ること」まで確かめる。ローカルで緑になった理由が CI と同じとは限らない。

関連: [[dn0111-repo-slimming]] / [[quality-audit-system]] / [[standards-chapters]]
