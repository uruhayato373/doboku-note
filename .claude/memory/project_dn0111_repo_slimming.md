---
name: dn0111-repo-slimming
description: DN-0111 完了。HEAD 4.15→1.14GiB・履歴 11GB→959MB（単一commitへ切り詰め）。切り詰め前履歴はR2にbundleで保全
metadata:
  node_type: memory
  type: project
  originSessionId: 6f1505d4-0791-480d-afdf-fc4f18b22cb7
  modified: 2026-08-29T09:19:46.214Z
---

DN-0111（Git リポジトリ軽量化と R2 アセット保管）。2026-08-21 に Phase 0〜6 を完了。

**恒久ルールは [asset-storage-policy.md](../../../doboku-note/.claude/knowledge/reference/asset-storage-policy.md) に抽出済み**
（Git に残すもの／R2 へ出すものの区分・端末初期設定・移行手順・復旧・cache）。
以下は「なぜそうなったか」だけを残す。

**結果**: HEAD 4.15 → **1.14 GiB**（目標 1.5 GiB 以下を達成）。退避 4,271 件 2.82 GiB。

| group | 件数 | 容量 | 行き先 |
|---|---|---|---|
| note カバー SVG | 827 | 1,288.6 MiB | **保存しない**（読むコードが 1 行も無い中間生成物） |
| note カバー PNG | 827 | 725.5 MiB | 公開 777→doboku-note / draft 50→archive |
| 教材ページ画像 | 868 | 571.2 MiB | archive |
| note 配布 PDF | 586 | 273.0 MiB | archive（購入者限定を含むため公開バケットへは 0 件） |
| IG レンダー画像 | 1,990 | 234.4 MiB | 投稿済み 7→公開 / 1,983→archive |

**この作業で学んだ「退避すると壊れるもの」**——どれも実際に踏んだ:
- ディスク件数を数える検査は手元だけ緑・CI だけ赤になる → [[untrack-ondisk-vs-tracked]]
- 「約束したのに実体が無い」ゲートは全件違反になる（check-note-attachments・偽の赤）
- 期待値をディスクから作る検査は 0 件検査の緑になる（寸法検査・**無言で通る方が危険**）
- 内容ハッシュを取る仕組みは材料が減って全件ドリフトになる（note-republish-hash）
- 外部書き込み（note/IG）は実体が無いまま進むと事故る → ensureLocal() で fail-closed
対策として manifest に width/height を退避時の実測で持たせ、検査は
「ローカル実体 **または** 台帳の記録」を見る形にした。**「ローカルに在る分だけ検査する」形にはしない。**

**Phase 7（履歴）は 2026-08-22 に完了**。段階的除去（11 GB → 2.6 GB）のあと、
**単一 commit へ切り詰めて 959 MB**。新規 partial clone の `.git` は **1.0 MB**。
現在のツリーは 1 バイトも変わっていない（全 ref の `ls-tree -r | sha256sum` が前後で一致）。

**切り詰め前の履歴は失っていない**——`git bundle --all` を private R2
（`archive/git-history/…bundle`・2.59 GB）に置き、台帳の `git-history-bundle` に登録。
**上げた直後に取り直して sha256 照合し、clone して 6,577 commit を確認してから消した。**

先に塞いだもの（切り詰め後に**例外にならず嘘の答えを返す**もの）:
- 記事日付 → frontmatter へ反転（→ [[article-dates-frontmatter-truth]]）
- `check-plan-staleness`（merged PR 0 件と誤報）/ `check-backlog-health`（全カード今日更新）
  → commit 総数で検出して「判定不能」を出す

**GitHub の報告容量も 11.2 GiB → 0.93 GB に下がった**（作業中は「refs/pull/* が固定するので
減らない」と判断したが実測で誤りと判明）。古い PR ref のオブジェクトは `git fetch origin
refs/pull/N/head` で取得できるものの、`size` には計上されず clone でも落ちてこない。
完全に消すにはリポジトリ削除と作り直しが要る（issue/PR/secrets/Pages 連携を全部失う）。
full clone 961 MB / partial clone の .git 1.0 MB。
`git clone --mirror` は refs/pull/* まで取るので書換え作業には `--bare` を使う。1 push 2 GiB 制限あり。

**cover PNG は byte 再現できない**（827 件再生成で 9 件不一致・うち 8 件は不可視な
ラスタライズ揺らぎ）。`sharp` が `^0.35.0` なので他マシンでの一致も保証されない。
だから再生成任せにせず R2 に保管する。

関連: [[untrack-ondisk-vs-tracked]] / [[partial-clone-repack-hazard]] / [[accumulation-find-the-producer]] / [[disk-cleanup-textbook-r2-2026-07]]

**続編（2026-08-29・全ストレージ最適化P0-P9）**: git tracked size **1,163MB→415.4MB**達成
（目標≤420MB）。ogp.png（1,166件・607MB）等をR2退避。DN-0156（asset-reentry検知ゲート・
退避済ファイルの`git add -f`再追跡を止める）を新設して実装後クローズ。DN-0157（srcHashが
`frontmatter.title`変更を追うが実レンダリングは`ogp.title`優先で無視される設計非効率、
バグではなく本番影響なし）を起票。

**OGPをCI供給へ移行（同日continuation・`.github/workflows/ogp-supply.yml`新設）**:
ogp.pngのR2退避で「ローカル生成→手動offload」の2段階人力になっていた問題を解消。
push to develop（`content/site/**/*.mdx`）でCIが不足/陳腐化分を検出→生成→R2供給→
manifest反映まで自動化。鮮度検知はmanifest各エントリの`srcHash`
（`sha256({title,ogp.title,ogp.subtitle,template/category/tags}).slice(0,16)`）で実装
（40文字未満はfindSecretsのlong-hex-secret検知を回避）。実CIで2回のG2負テスト
（`ogp.title`変更→stale検出→自動再生成→R2反映→復元）を完全実証済み。
`npm ci`（--ignore-scripts無し）がpre-commitフックを入れるため、そのフックが読む
`doc-meta-index.json`をworkflow内で明示生成するステップが必須（漏らすと
「Publish manifest」がENOENTで失敗＝実際に本番で1回踏んだ）。
