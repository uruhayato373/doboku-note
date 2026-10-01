---
name: mac-disk-reclaim
description: この Mac の容量はどこに溜まるか。2026-08-30 と 09-10 の実測内訳。09-10 に doboku-note 側を機械化した（check-disk-hygiene＋日次 launchd）
metadata:
  node_type: memory
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
なく実プロファイル）、`voicevox_engine_dl`（render-longform が使う実体）、`.local/cache/`
（R2 hydrate のキャッシュ。プロキシ不調時の唯一の頼り）。

**手順の型**（消す前に必ず）: `asset-offload --group X --include-untracked --verify` で
ローカル・台帳・R2 の 3 者一致を確認 → `--out` の一覧だけを消す → 追跡下は除外 →
**1 件だけ `asset-hydrate --path` で往復させ sha256 一致を確かめてから**残りを消す。
verify が FAIL のグループは消さない（実際 note-delivery-pdf は 586 中 3 件がローカル改変で
不一致だった）。

**プロセス名だけで「使用中」を判定しない**（2026-09-10 実装時の罠）。別リポジトリの `next dev`・常駐 MCP の
`npm exec`・常駐の Sparkle ヘルパを稼働中と読んで、3 つのガードが掃除を恒久的に止めていた。
pid で `ps` のフルコマンドと `lsof -a -d cwd` を突き合わせ「そのパスで動いているか」を見る。

**溜まり続けるものは生成元を止める**（[[accumulation-find-the-producer]]）。cover SVG は
generate-note-covers が `--emit-svg` のときだけ `.tmp/` へ出す形に既に直っていて、827 件は
修正前の残骸だった＝消せば戻らない。逆に直っていなければ消しても翌週には戻る。

関連: [[untrack-ondisk-vs-tracked]] / [[dn0111-repo-slimming]] / [[note-lint-quotepath-bypass]]
