---
name: reference_mac_disk_reclaim
description: "容量・速度の罠。Mac の容量が溜まる場所と掃除手順(check-disk-hygiene)・会社PCローカルビルドはファイル数律速（EDR）"
metadata:
  type: reference
---
2026-09-10 に**機械化した**（→ `.claude/knowledge/reference/disk-hygiene.md`）。`npm run check-disk-hygiene` が
状態を出し、launchd `com.doboku-note.disk-hygiene` が日次 04:17 に再生成可能なものだけ消す。
掃除が止まったこと自体も stamp の鮮度で検知する。**手で消す前にまず `npm run check-disk-hygiene`**。

2026-09-10 実測。**空き 7.5 → 48 GB**。8/30 に 21GB 空けた 10 日後にはまた 96% だった＝生成元を止めないと戻る。
最大は **worktree（node_modules+.next+out で 1 本 4〜5GB。Codex の 2 本で 8.6GB）** と
**Claude Workflow の子エージェント transcript（OCR 1 セッションで 3.1GB・読んだページ画像が丸ごと残る）**。
Turbo キャッシュ 7GB と Codex の Sparkle 残骸 4.6GB は 10 日で再発した（生成元が止められない）。

2026-08-30 実測。**空き 37.4 → 58.8 GB（+21.4 GB）**。消したものは全て再生成か R2 から復元できる。

| place | 回収 | 正体 |
|---|---|---|
| `~/Library/Caches/com.openai.codex/org.sparkle-project.Sparkle` | **4.7 GB** | Codex 自動更新のダウンロード残骸。溜まり続ける |
| `stats47/.turbo/cache` | **9.0 GB** | Turborepo ビルドキャッシュ。単一で最大 |
| `doboku-note/.local/playwright-*-profile` | **4.5 GB** | 下記のとおり大半がブラウザキャッシュ |
| `content/note/**/img/cover*.svg` | **1.35 GB** | 827 件。読むコードゼロの satori 中間生成物 |
| R2 退避済みアセットのローカル重複 | **2.0 GB** | 台帳にあるのにローカルにも実体が残っていた分 |
| `.tmp` の OCR/文字起こしのページ画像・原本PDF | **1.0 GB** | 本文は repo へ統合済み |
| `.next` / `out` | 3.1 GB | `npm run build` で戻る |
| `~/Library/Caches/{Google,Arc,Codex,node-gyp}` | 3.5 GB | 各アプリの HTTP キャッシュ |
| `ms-playwright/chromium-1234` | 0.55 GB | 孤児。**repo が固定するのは `browsers.json` の revision** なので要確認 |

**Playwright プロファイルはログインを消さずに 4.5 GB → 71 MB にできる。**
消してよい: `Default/{Cache,Code Cache,GPUCache,DawnWebGPUCache,DawnGraphiteCache}`、
`Default/Service Worker/CacheStorage`、`GraphiteDawnCache`、`{Sh,GrSh}aderCache`。
**残す**: `Cookies` / `Login Data` / `Local Storage` / `IndexedDB` / `Preferences` / `Sessions`。
X の `Service Worker/CacheStorage` だけで 1.0 GB あった。

**消してはいけない**: `~/Library/Application Support/Google`（13 GB のうち 6.9 GB。キャッシュでは
なく実プロファイル）、`~/voicevox_engine`（エンジンの実体。2026-10-10 時点で `macos-arm64/run` がここから起動している。
完全に同じ複製だった `~/voicevox_engine_dl` はゴミ箱へ移した）、`.local/cache/`
（R2 hydrate のキャッシュ。プロキシ不調時の唯一の頼り）。

**Chrome の自己複製（2026-10-10 実測 11 GB）**: `$(dirname $TMPDIR)/X/com.google.Chrome.code_sign_clone/code_sign_clone.*` は
Chrome を起動するたびに 1 つ（1.4 GB）できる。Playwright で Chrome を起動する自動化（note・X・KDP・MCP）も 1 回ごとに作り、
終了しても残る。使っているのは起動中の Chrome と同じ時刻に作られたものだけなので、`ps -o lstart=` と作成時刻を照合して
それ以外を消す（Chrome を終了すれば全部消してよい）。日次の自動掃除への組み込みは DN-0630。
`.local/archive/git-history/` の履歴 bundle（2.8 GB）は private R2 に同じものがあるので手元は不要（2026-10-10 にゴミ箱へ）。

**手順の型**（消す前に必ず）: `asset-offload --group X --include-untracked --verify` で
ローカル・台帳・R2 の 3 者一致を確認 → `--out` の一覧だけを消す → 追跡下は除外 →
**1 件だけ `asset-hydrate --path` で往復させ sha256 一致を確かめてから**残りを消す。
verify が FAIL のグループは消さない（実際 note-delivery-pdf は 586 中 3 件がローカル改変で
不一致だった）。

**プロセス名だけで「使用中」を判定しない**（2026-09-10 実装時の罠）。別リポジトリの `next dev`・常駐 MCP の
`npm exec`・常駐の Sparkle ヘルパを稼働中と読んで、3 つのガードが掃除を恒久的に止めていた。
pid で `ps` のフルコマンドと `lsof -a -d cwd` を突き合わせ「そのパスで動いているか」を見る。

**溜まり続けるものは生成元を止める**（[[feedback_verify_your_excuses]]）。cover SVG は
generate-note-covers が `--emit-svg` のときだけ `.tmp/` へ出す形に既に直っていて、827 件は
修正前の残骸だった＝消せば戻らない。逆に直っていなければ消しても翌週には戻る。

関連: [[reference_quality_audit_system]] / [[project_asset_audience_routing]] / [[feedback_note_lint_quotepath_bypass]]

---

## ローカルビルドはCPUでなくファイル数で決まる（会社PC・Windows）

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

関連: [[feedback_metrics_cicd_supplied]] / [[reference_shared_worktree_autostash_hazard]]
