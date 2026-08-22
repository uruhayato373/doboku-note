# アセット退避・復元ポリシー（R2 × Git）

生成物・配布物を Git から R2 へ移し、必要なときだけ手元へ戻す運用の SSOT。
機械可読な定義は `.claude/config/asset-storage.json`、退避台帳は `.claude/state/assets/manifest.json`。

> [!note] 経緯
> 2026-08-21 時点で HEAD は 4.15 GiB あり、CI ランナーが checkout で空きを使い切って落ちるところまで来ていた。
> 原稿・設定の SSOT と、再生成できるカバー・投稿用 PNG・添付 PDF・教材ページ画像が同じ履歴に混ざっていたのが原因。
> DN-0111 で 4,271 件 2.82 GiB を R2 へ移し（うち note カバー SVG 827 件は保存せず生成停止）、HEAD は 1.14 GiB になった。

## 1. 何を Git に残し、何を R2 へ出すか

| 種別 | Git | R2 | 理由 |
|---|---|---|---|
| 記事・SNS 原本（.md / frontmatter / hashtags / slide-data / 台本 / caption / status） | ○ | — | 人が書いた原本。差分レビューの対象 |
| 真正ベクター図版（Base64 raster を含まない .svg） | ○ | — | テキストで差分が読め、サイズも小さい |
| note カバー PNG | — | 公開済み→`doboku-note` / 下書き→`doboku-note-archive` | frontmatter の `cover:` が原本だが **byte 再現はできない**（§6） |
| note 配布 PDF | — | `doboku-note-archive` | 購入者限定の配布物を含む。公開バケットへは置かない |
| IG レンダー画像 | — | 投稿済み→`doboku-note` / それ以外→`doboku-note-archive` | slide-data / SVG が SoT のレンダー成果物 |
| 教材ページ画像・教材 PDF | — | `doboku-note-archive` | 書籍が原本。文字起こし .md と .svg が SSOT |
| note カバー SVG | — | — | satori の中間生成物。読むコードが無いので保存しない（`.tmp/` へ出す） |
| IG reels の frames | — | 別系統 | `sns-archive-policy.md` と `upload-sns-r2` が管轄。この仕組みの対象外 |

**公開バケットへ置かないもの**: 教材、購入者限定 PDF、未公開商品、draft 画像。
`doboku-note-archive` にはカスタムドメインを付けない（S3 API だけで扱う）。

## 2. 端末の初期設定

```bash
git clone --filter=blob:none git@github.com:uruhayato373/doboku-note.git
cd doboku-note && npm install --legacy-peer-deps
```

この時点で記事・設定・コードは揃っており、`npm run dev` も `npm run build` も通る。
画像・PDF は必要になったときだけ取り寄せる。R2 credential は `.env.local`（Git 非追跡）。

```bash
npm run asset-hydrate -- --group note-cover-png                       # グループ単位
npm run asset-hydrate -- --path 'content/sources/textbook/{書名}/'    # 前方一致で部分取得
npm run asset-hydrate -- --group note-cover-png --offline             # cache にあるものだけ
```

credential が無い端末（会社 PC はプロキシで外部 API が遮断される）は `--offline` を付ける。
何が足りないかが一覧で出るので、「取れたつもり」にならない。

## 3. 新しいアセットを作ったとき

退避対象は `.gitignore` してあるので **`git status` に出ない**。作ったまま放置すると
ローカルにしか実体が無い状態が続き、気づくのはその端末を失ったときになる。

```bash
node scripts/asset-offload.mjs --group <group> --commit
```

未退避は `npm run check-asset-storage` が検出する（`quality:audit` に同梱）。
この検査だけがワークツリーを走査するので、**CI では走査 0 件になるのが正常**。
0 件を「異常なし」と読まないよう、件数は必ず出力される。

## 4. 追跡から外すとき（グループ移行の手順）

順序を守る。**1 つでも欠けたらそのグループは外さない。**

```bash
node scripts/asset-offload.mjs --group <group>                        # 1. dry-run（件数・容量・公開内訳）
node scripts/asset-offload.mjs --group <group> --commit               # 2. upload（bytes と sha256 を読み直して検証）
node scripts/asset-offload.mjs --group <group> --verify --out list.txt # 3. ローカル・manifest・R2 の 3 者照合
xargs -a list.txt git rm --cached                                     # 4. 追跡解除（ローカル実体は消さない）
```

`--verify` は sha256 / bytes / bucket / visibility を全件突き合わせ、1 件でも欠ければ exit 1 になる。
`.gitignore` は **拡張子で書く**。置き場の形（`img/` / `pages/` / `{章}/img/`）はグループごとに違い、
同じ dir に Git へ残す `.svg` が同居していることがある。

追跡から外したら、**その実体を読んでいた検査を必ず直す**（§5）。

## 5. 読み手の直し方（退避後に壊れるもの）

ディスクを `existsSync` / `readdirSync` するコードは、退避すると挙動が変わる。壊れ方は 2 種類ある。

- **偽の赤**: 「約束したのに実体が無い」系のゲートが全件違反になる（`check-note-attachments`）
- **無言の緑**: 期待値をディスクから作る検査が 0 件検査になる（寸法チェックの類）

どちらも「ローカル実体 **または** 退避台帳」で解決するよう直す。台帳には
`sha256` / `bytes` / 画像なら `width` / `height` が **退避時に実バイトから測って**入っているので、
実体が無い側は記録を検査すればよい。sha256 が同じである限り記録は実体の性質を指し続ける。
**「ローカルに在る分だけ検査する」形にはしない** —— 全件退避した瞬間に無検査になる（CLAUDE.md §9）。

外部（note / Instagram）へ書き込むスクリプトは `ensureLocal()`（`scripts/lib/asset-storage.mjs`）で
使う直前に取り寄せ、**取れなければ外部へ触れる前に止める**。カバー無しで公開する・
PDF 無しで添付を名乗るのが最悪の結果になる。

## 6. 再生成では代替できない

cover PNG 827 件を全件再生成して追跡中の PNG と突き合わせたところ、byte 不一致が 9 件（1.1%）出た。
うち 8 件は 340 万サブピクセル中 18 個・最大差 12〜16/255 の不可視な揺らぎ、1 件は当時 V4 未移行だった記事。
`sharp` は lock で 0.35.0 に固定されているが `package.json` は `^0.35.0` なので、
**他マシンでの byte 一致はそもそも保証されない**。

note へ上げた実体との同一性が要る用途では、再生成ではなく R2 から取ること。
`asset-hydrate` が generator を提示するだけで自動実行しないのはこのため。

## 7. 取得に失敗したとき

| 症状 | 原因 | 対処 |
|---|---|---|
| `R2 credential が無い` | `.env.local` 未設定、または会社 PC のプロキシ | `--offline` で cache のみ使う。足りないものは一覧で出る |
| `sha256 が manifest と違う` | R2 側の破損 or 差し替え | 一時ファイルのまま捨てられる（壊れたものを正しい名前で置かない）。別端末の実体から `--commit` で上げ直す |
| `解決不能` | cache に無く再生成もできない | 台帳と R2 を `check-asset-storage` と `--verify` で確認する。台帳に無いなら退避されていない |
| 取得が遅い | 直列実行 | `--concurrency`（既定 8）。868 件の直列は約 12 分かかった |

cache は `.local/cache/assets/`（Git 非追跡）。最終アクセス時刻の古い順に上限まで落とすだけで、
**勝手に空にはしない** —— プロキシ不調時に消すと作業不能になる。
壊れたと思ったら手で消せば次回 R2 から作り直される。

## 8. Git 履歴の書換え（2026-08-22 実施済み）

HEAD を軽くしても過去の blob は履歴に残る。2026-08-22 に `git filter-repo` で 2 段階に分けて除去し、
4 ブランチすべてを force-push した。**現在のツリーは 1 バイトも変えていない**
（4 ref すべての `git ls-tree -r | sha256sum`・files 数・commits 数が前後で完全一致）。

| | 容量 |
|---|---|
| 書換え前の履歴 | 11 GB |
| 1 段階目（退避済み資産・reels の wav/mp4・旧ラスタ） | 5.2 GB |
| **2 段階目（教材 PDF）** | **2.6 GB** |
| ローカル `.git`（partial clone へ入替） | 13 GB → **16 MB** |

**消したもの**（すべて実体が R2 にあるか、既存ポリシーが再生成可能と定めているもの）:

- note カバー PNG / SVG、note 配布 PDF、教材ページ画像、IG レンダー画像（現配置と旧配置 `docs/note` `docs/sns` の両方）
- reels の wav / mp4（`sns-archive-policy` が「再生成可能・R2 退避済み」と定義）
- `.local/r2/posts/**` の旧ラスタ画像（webp 変換前の png。**`.mdx` 21,170 版と `.svg` は残した**＝移行前の記事本文履歴は健在）
- 教材 PDF 389 件（`docs/textbook` と `.claude/pdfs`。`.claude/pdfs/guide.pdf` だけは現 HEAD にあるので除外）

> [!warning] 教材 PDF 102 件は git 履歴だけが保管場所だった
> 削除前に突合したところ、履歴上の教材 PDF 389 件のうち **102 件（1.72 GiB）が R2 に無かった**。
> 2026-07 の退避で取りこぼされていたもので、git 履歴が唯一の実体だった。
> ミラーから取り出して R2 へ上げ、389/389 が揃ったことを確認してから履歴を消した。
> **履歴から何かを消す前に「実体が他にあるか」を全件突合すること。** 「R2 に退避済みのはず」で進めない。

> [!warning] GitHub の報告容量は減らない
> `refs/pull/*` が 396 本あり、force-push しても消せない（GitHub が永久保持する読み取り専用 ref）。
> 旧 commit はそこから到達可能なままなので、**GitHub の `size` は 11 GiB のまま**である。
> 減るのは **clone が転送する量**（full clone 11.3 → 2.6 GB / partial clone は 14 MB）であって、サーバの保管量ではない。
> なお `git clone --mirror` は `refs/pull/*` まで取ってくるので、書換え作業には `--bare` を使う。

**手順で詰まる点**: GitHub は 1 回の push が 2 GiB を超えると `pack exceeds maximum allowed size` で
拒否する。一時 ref へ first-parent を分割して送り、オブジェクトが揃ってからブランチを切り替えると、
途中でブランチが壊れた状態にならない。

**検証の型**（次に同じことをするとき）:
1. 書換え前に全 ref の `git ls-tree -r <ref> | sha256sum`・files 数・commit 数を記録する
2. 書換え後に同じ値が出ることを確認する（**ここが一致すれば内容は無傷**）
3. 過去 commit を数点抜き取り、旧リポジトリとの差分が「指定した対象パスだけ」であることを確認する
4. `GIT_NO_LAZY_FETCH=1 git log --all --name-status -M100%` が完走し `.git` が増えないことを確認する
5. ロールバック元として書換え前の clone を、CI と本番の確認が終わるまで残す

`git gc` だけでは到達可能 blob は消えない。Git LFS は R2 と認証・保管先が二重化し、
既存履歴の移行にも結局 rewrite が要るため採らない。

## 9. R2 に何が入っているか（台帳のカバー範囲）

2026-08-22 実測。R2 は **13,672 件 / 7.22 GiB**あり、退避台帳（`manifest.json`）が
その全部を管理しているわけではない。**台帳が真実源なのは「Git から外して R2 へ移したもの」だけ**で、
それ以外は別の仕組みが持っている。

| バケット / prefix | 件数 / 容量 | 真実源 | 復元 |
|---|---|---|---|
| private `textbook/` | 397 / 3.28 GiB | **台帳**（`textbook-source-pdf`） | `asset-hydrate --group textbook-source-pdf` |
| private（退避資産） | 3,487 / 1.10 GiB | **台帳** | `asset-hydrate --group <id>` |
| public `note/covers/` `sns/rendered/` | 784 / 0.66 GiB | **台帳** | 同上 |
| public `posts/` | 5,234 / 0.74 GiB | **Git**（`content/site/**`） | `npm run upload-images-r2` が一方向で同期。R2 は配信コピーなので台帳不要 |
| public `sns/` | 1,194 / 0.96 GiB | `sns-archive-policy` + `upload-sns-r2` | rclone 手動。**hydrate 経路なし** |
| public `content/` | 2,573 / 0.48 GiB | **なし（孤児）** | 2026-03-24 の旧 prefix。リポジトリ全域に参照 0 件だが URL では HTTP 200 で取得できる |
| public `brain/` | 2 | `brain-products.ts` | `upload-brain-dist-r2` |

> [!warning] 台帳に載っていないものは check-asset-storage の監視外
> 「消えても誰も気づかない」状態になる。R2 へ何かを置く仕組みを新しく作るときは、
> **台帳に載せるか、載せない理由（Git が真実源である等）を書く**こと。
> 2026-08-22 の実測では、教材 PDF 397 件が「Git 履歴から消したのに台帳に無い」という
> 二重に無防備な状態だった（同日に登録して解消）。

**取り戻したものを再コミットしない。** `docs/textbook/` は `.gitignore` と
`check-git-binary-policy` の `textbook-source-asset` ルールの両方で塞いである
（実測でこの経路が素通りだったので、復元 → `git add -f` → gate が止まることまで確認済み）。

## 10. 不変条件

- 確認できないものは Git からもローカルからも外さない（dry-run → upload → sha256 照合 → untrack）
- `git rm --cached` はローカル実体を消さない。ローカル削除は常に別操作・別判断
- 台帳に credential・署名 URL・Cookie・ローカル絶対パスを載せない（`sanitizeEntry` の allowlist で機械的に落ちる）
- 公開バケットへ非公開判定のものを載せない（`check-asset-storage` が FAIL にする）
- 判定不能な公開範囲は private へ倒す

関連: [image-policy.md](image-policy.md) / [sns-archive-policy.md](sns-archive-policy.md) / [textbook-pdf-archive.md](textbook-pdf-archive.md) / [information-architecture.md](information-architecture.md)
