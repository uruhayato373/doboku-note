---
name: reference_local_build_io_bound
description: ローカルビルドはCPUでなくファイル数で決まる（会社PCのEDRが1ファイル20-45ms）。遅いときはまずout/とpublic/のファイル数を数える
metadata: 
  node_type: memory
  type: reference
  originSessionId: 86489d29-5e6f-4db8-b11e-d3bdf4c06436
  modified: 2026-07-30T06:38:25.805Z
---

会社 PC のローカルビルドは **CPU ではなくファイル数**で時間が決まる。`Trend Micro Apex One`（企業EDR）＋ Windows Defender が全ファイル操作を実時間スキャンするため、NVMe SSD にもかかわらず **1 ファイルあたり書込 ~20ms・削除 ~45ms**（本来 1ms 未満）。実測ベンチ（300 小ファイル）:

| 場所 | 書込 | 削除 |
|---|---|---|
| リポジトリ内 | 8.7s | 13.4s |
| `C:/tmp` | 7.1s | 2.1s |

リポジトリ内の削除だけ 6 倍遅いのは **`next dev`（ポート3020）の watcher** が監視しているため。ビルド前に止めると速くなる。

**2026-07-30 の実例**: ビルドが 32.5 分かかっていた。Next.js の自己申告（コンパイル 19.9s＋静的生成 62s）は実時間の 8% にすぎず、残りは全部ファイル I/O だった。原因は `public/pagefind/` に **20 段の再帰的な入れ子**（`pagefind/pagefind/pagefind/…`）が育ち **92,803 個のゴミ**が滞留していたこと。Next は `public/` を毎ビルド `out/` へ全コピーするので `out/` が 108,408 ファイルに膨張し、`rm -rf out` だけで 11 分・`next build` が 18 分になっていた。掃除後は **8.0 分**（`out/` 15,605 ファイル）。

**Why:** ファイル数がそのまま時間に比例する環境なので、生成物の滞留が「なんとなく遅い」として何週間も見逃される。Next.js の自己申告時間を見ていると原因に辿り着けない（実時間の 1 割未満しか説明しない）。

**How to apply:**
- ビルドが遅いと感じたら、まず **`find out -type f | wc -l` と `find public -type f | wc -l`**。ページ数 ~1,100 に対し `out/` は 15,000 程度が正常。数万なら生成物の滞留を疑う。
- フェーズ別の実測は `rm -rf out` / `refresh-indexes` / `next build` / `pagefind` / `sitemap` / `rss` を個別に時間計測する（Next の自己申告は当てにしない）。
- 大量ファイルの削除は Git Bash の `rm -rf` より **PowerShell `Remove-Item -Recurse -Force`** が速い（`rm -rf` は「Directory not empty」で失敗することもある）。
- `public/` は毎ビルド `out/` へ全コピーされる。生成物を置かない。`public/pagefind/` は dev のローカル検索用に `fragment/` `index/` ＋ ランタイム 12 点（計 ~950）だけが正しい姿。
- **CI（Linux ランナー）はこの問題と無関係**。`public/pagefind/` は gitignore 済みでコミットされていないため、Cloudflare デプロイのビルド時間は元から正常だった。これはローカル固有の問題。
- `git log --all --name-only` は `.git` 13GB に対し 21.5 秒。3 プロセスから呼ばれていたのを `git rev-parse --all` の sha256 をキーにディスクキャッシュ化済み（`.claude/scripts/lib/git-dates.mjs`・ヒット時 ~700ms）。

関連: [[feedback_metrics_cicd_supplied]] / [[reference_admin_worktree_turbopack]]
