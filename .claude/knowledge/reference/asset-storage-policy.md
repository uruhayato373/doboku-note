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
| `content/site/**/ogp.png` | — | `doboku-note`（`posts/`・site-ogp-png group） | 配信中の og:image 実体。1,166 件 607.2MB が Git 追跡容量の過半を占めていたため 2026-08-29 に untrack（詳細 §9） |
| note 配布 PDF | — | `doboku-note-archive` | 購入者限定の配布物を含む。公開バケットへは置かない |
| IG レンダー画像 | — | 投稿済み→`doboku-note` / それ以外→`doboku-note-archive` | slide-data / SVG が SoT のレンダー成果物 |
| 教材ページ画像・教材 PDF | — | `doboku-note-archive` | 書籍が原本 |
| 教材の文字起こし本文（.md/.html/派生 .svg 等） | — | private Google Drive vault（§1-1） | 書籍由来の著作権物。public repo には置かない |
| note カバー SVG | — | — | satori の中間生成物。読むコードが無いので保存しない（`.tmp/` へ出す） |
| IG reels の frames | — | 別系統 | `sns-archive-policy.md` と `upload-sns-r2` が管轄。この仕組みの対象外 |

**公開バケットへ置かないもの**: 教材、購入者限定 PDF、未公開商品、draft 画像。
`doboku-note-archive` にはカスタムドメインを付けない（S3 API だけで扱う）。

### 1-1. 教材の文字起こし本文は private Google Drive vault

Drive 側は `~/Google Drive/マイドライブ/doboku-note/` を単一ルートとして管理する（2026-08-29 統合）:

```
マイドライブ/doboku-note/
├── private-sources/textbook/   # L1 中間産物＝文字起こし md・派生図版（旧 doboku-note-private-sources/）
└── references/                 # L0 原資料＝参考 PDF（読み取り専用）
    ├── 白書/                   # 白書 44 本（総監の白書根拠）
    ├── 資格試験/               # 1級土木テキスト・問題集＋診断士（完全一致の重複4dir含め33本・重複解消は未実施）
    └── 書籍/                   # 土木・建設系の市販書 12 冊（逐語転用禁止）
```

`content/sources/textbook/**` の文字起こし本文（.md/.html）と派生図版は、書籍の著作権物をほぼそのまま
含むため 2026-08-27 に public repo（`doboku-note`）の追跡から外し、`~/Google Drive/マイドライブ/
doboku-note/private-sources/textbook/` へ移設した（stats47 の `stats47-private-sources/` と同じ命名規約）。
`.gitignore` の `content/sources/textbook/**`（README.md だけ `!` で例外）が実体。

- **新しい端末での復元**: Google Drive デスクトップアプリで同アカウントにログインし vault を同期 →
  `content/sources/textbook/{各ディレクトリ}/` へコピー（詳細手順は
  `content/sources/textbook/README.md`）
- **ローカルの読者（`scripts/check-civil-practice-coverage.mjs` 等）**: untrack しても実体はローカルに
  残るため、この Mac 上では従来どおり動く。CI・fresh clone では実体が無い前提でコードを書く
  （現状これらのスクリプトはローカル専用運用で CI には配線されていない）
- PDF・ページ画像（§1 表）は従来どおり private R2。今回動いたのは文字起こしテキスト側だけ
- git 履歴には旧コミットの内容が残る。履歴書換え（force-push）は複数セッション並行環境で危険なため
  未実施 — 必要なら別途、全 worktree 停止の単独作業として計画する

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

**cache にも無いものは CI に代行させる**（2026-08-25 新設）。`.github/workflows/asset-hydrate.yml` を
Actions から dispatch すると、CI 側の credential で R2 から取り出し、artifact `hydrated-assets` として
出す。ダウンロードして repo 直下へ展開すればよい（退避対象は `.gitignore` 済みなので `git status` は汚れない）。

```
group か path を指定 → dry_run で対象確認 → 本実行 → artifact を展開
```

**退避（offload）も CI に代行させられる**（2026-08-25 新設）。CI は checkout で gitignore 済みの
実体を得られないので、`scripts/asset-inbox-push.mjs` が GitHub Release を橋にしてファイルを CI まで運ぶ。

```
npm run asset-inbox-push -- --path '<前方一致>' --commit   # ローカル: R2 credential 不要
  → release asset-inbox-<ts>（prerelease・inbox.tar.gz + inbox.json）
  → .github/workflows/asset-inbox.yml が展開 → asset-offload --commit で R2 へ
  → manifest 更新が develop へ返る → release は削除される
```

既定は **manifest と sha256 が違うものだけ**を送る（同一を上げ直しても転送量が増えるだけ）。
`--all` で全件。R2 キーはパス基準なので**同キー上書き**＝古い世代は自動的に置き換わる。

CI 側は tarball を tar 任せに展開しない。リポジトリ外で作られた入力なので、
`.github/workflows/*.yml` を差し替えられると R2 credential ごと持っていかれる。
`scripts/asset-inbox-ingest.mjs` が 1 エントリずつ (a) 絶対パス・`..` の拒否
(b) 退避 group に該当しないパスの拒否 (c) `inbox.json` の sha256 照合 (d) 過不足の検出
を行い、**1 件でも落ちたら配置しない**。

## 3. 新しいアセットを作ったとき

退避対象は `.gitignore` してあるので **`git status` に出ない**。作ったまま放置すると
ローカルにしか実体が無い状態が続き、気づくのはその端末を失ったときになる。

```bash
node scripts/asset-offload.mjs --group <group> --commit
```

未退避は `npm run check-asset-storage` が検出する（`quality:audit` に同梱）。
この検査だけがワークツリーを走査するので、**CI では走査 0 件になるのが正常**。
0 件を「異常なし」と読まないよう、件数は必ず出力される。

**`site-ogp-png` はこの経路を日常的に使う group** —— 他の group の多くは §4 の一度きりの移行で退避対象が固定されるが、こちらは記事追加のたびに新規 `ogp.png` エントリが生まれ続ける。

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

### 納品 PDF は sha256 が**必ず**変わる（2026-08-25 実測）

cover PNG の「揺らぎで 1.1% が不一致」とは別の、もっと強い性質が PDF にはある。
`magazine-to-pdf.mjs` は Chrome ヘッドレスの `--print-to-pdf` で描くため、生成物に
`creationDate` / `modDate` が埋まる（`Producer: Skia/PDF m151`）。**内容が 1 バイトも
変わっていなくても、再生成すれば sha256 は変わる。**

BK-01_道路/R03 の 3 本を再生成して R2 の記録と突き合わせた実測:

| | サイズ | sha256 |
|---|---|---|
| II-1 / II-2 | R2 と**一致** | 不一致 |
| III | 2,158 bytes 差 | 不一致 |

サイズが一致した 2 本は、タイムスタンプ以外が同一とみなせる（日時フィールドは固定長なので
サイズが保たれる）。つまり **spec 駆動のレンダリング自体は決定的**で、揺らいでいるのは
メタデータだけ。III のサイズ差は実際に原稿が変わったことを意味する。

**運用上の含意**: `asset-offload --verify` はローカル・manifest・R2 の sha256 を突き合わせるので、
**再生成した PDF では必ず落ちる**。再生成物で R2 を更新する場合は、`--verify` を
「同一性の証明」として使えない。サイズとページ数・本文の実検証で代替する。

## 7. 取得に失敗したとき

| 症状 | 原因 | 対処 |
|---|---|---|
| `R2 credential が無い` | `.env.local` 未設定、または会社 PC のプロキシ | `--offline` で cache のみ使う。足りないものは一覧で出る |
| `sha256 が manifest と違う` | R2 側の破損 or 差し替え | 一時ファイルのまま捨てられる（壊れたものを正しい名前で置かない）。別端末の実体から `--commit` で上げ直す |
| `解決不能` | cache に無く再生成もできない | 台帳と R2 を `check-asset-storage` と `--verify` で確認する。台帳に無いなら退避されていない |
| `[WARN] local-newer` | ローカルで作り直した実体が R2 へ反映されていない | `node scripts/asset-inbox-push.mjs --path <該当> --commit` で CI へ送る。§2 の inbox 経路 |
| 取得が遅い | 直列実行 | `--concurrency`（既定 8）。868 件の直列は約 12 分かかった |

cache は `.local/cache/assets/`（Git 非追跡）。最終アクセス時刻の古い順に上限まで落とすだけで、
**勝手に空にはしない** —— プロキシ不調時に消すと作業不能になる。
壊れたと思ったら手で消せば次回 R2 から作り直される。

## 8. Git 履歴（2026-08-22 に単一 commit へ切り詰め済み）

| | 容量 |
|---|---|
| 元の履歴 | 11 GB |
| 段階的な除去後 | 2.6 GB |
| **単一 commit へ切り詰め後** | **959 MB** |
| ローカル `.git` | 13 GB → 974 MB |

**現在のツリーは 1 バイトも変わっていない**（切り詰め前後で全 ref の
`git ls-tree -r | sha256sum` と files 数が完全一致）。

> [!important] 切り詰め前の履歴は R2 にある
> `doboku-note-archive:archive/git-history/doboku-note-history-2026-08-22.bundle`
> （2.59 GB・sha256 `59b3a073…`・台帳の `git-history-bundle` グループ）。
> **R2 が唯一の保管場所**で、失えば 6,577 commit 分の log / blame / 個別 diff が永久に失われる。
>
> ```bash
> rclone copy doboku-r2:doboku-note-archive/archive/git-history/ /tmp/
> git clone /tmp/doboku-note-history-2026-08-22.bundle old-history
> ```
> 上げた直後に **R2 から取り直して sha256 照合し、実際に clone できること**を確認済み。
> 履歴を消す前にこの検証を通すこと。「上げたはず」で消さない。

**手順**（次に同じことをするとき）:

1. 切り詰め前の `--bare` clone を取る（`--mirror` は `refs/pull/*` まで取るので使わない）
2. `git bundle create <name>.bundle --all` → `git bundle verify` で「完全な履歴」を確認
3. R2 へ上げ、**取り直して sha256 照合 + clone 成功**まで見る
4. `git commit-tree <tree>` で orphan root を作る。PR ブランチは
   `git commit-tree <branch^{tree}> -p <root>` で root の上に 1 commit として畳む
   （ブランチを旧履歴に残すと旧 blob が固定されて容量が減らない）
5. 全 ref の `ls-tree -r | sha256sum` が前後で一致することを確認してから force-push
6. ローカルは `git fetch && git reset --soft origin/develop && git read-tree HEAD`
   （作業ツリーを触らずに済む。`.gitignore` された退避アセットが消えない）

**先に塞いでおくもの**: git 履歴を読む surfacer は、切り詰め後に**例外にならず間違った答えを返す**。
`check-plan-staleness`（merged PR を 0 件と誤報）と `check-backlog-health`
（全カードが今日更新・ID 再利用 0 件）は commit 総数で検出して「判定不能」を出すようにした。
記事の日付は §5 のとおり frontmatter へ移してあるので影響しない。

> [!note] GitHub の報告容量も下がった（2026-08-22 実測で訂正）
> 作業中は「`refs/pull/*` が旧 commit を固定するので GitHub の `size` は減らない」と判断していたが、
> **実測すると 11,623,642 KB → 948,521 KB（約 0.93 GB）まで下がった**。判断は誤りだった。
>
> 古い PR ref のオブジェクト自体は残っており、`git fetch origin refs/pull/97/head` で
> 実際に取得できる。だが **GitHub の `size` には計上されず、通常の clone でも落ちてこない**
> （clone は `refs/heads/*` と `refs/tags/*` しか交渉しない）。
>
> 実測（切り詰め後）:
>
> | | 値 |
> |---|---|
> | GitHub 報告容量 | 0.93 GB |
> | full clone（`--bare`） | 961 MB / 1 分 39 秒 |
> | partial clone（`--filter=blob:none --no-checkout`） | 1.0 MB |
>
> 旧オブジェクトを**完全に消す**唯一の方法はリポジトリの削除と作り直しで、
> issue・PR・レビューコメント・Actions 履歴・secrets・Cloudflare Pages 連携・
> ブランチ保護がすべて失われる。private リポジトリで外部露出は無いため、割に合わない。
>
> GitHub は 1 回の push が 2 GiB を超えると `pack exceeds maximum allowed size` で拒否する。
> 超える場合は一時 ref へ first-parent を分割して送り、最後にブランチを切り替える。

## 9. R2 に何が入っているか（台帳のカバー範囲）

2026-08-29 の全ストレージ最適化のあと。**台帳（`manifest.json`）が R2 の全オブジェクトを管理している**
状態になっている（`check-asset-storage` の走査で該当 5,633 件すべてが「Git 追跡 0 / 退避済み 5,633 /
どちらでもない 0」・`kindle-dist` の 76 件は Git 追跡を維持したままの意図的な併存で、この件数には
含まれない）。

| バケット / prefix | 件数 | 真実源 | 復元 |
|---|---|---|---|
| private `textbook/` | 397 | 台帳 `textbook-source-pdf` | `asset-hydrate --group textbook-source-pdf` |
| private（退避資産 4 群） | 3,487 | 台帳 | `asset-hydrate --group <id>` |
| private `archive/git-history/` | 1 | 台帳 `git-history-bundle` | `rclone copy` → `git clone <bundle>` |
| private `archive/legacy-r2/` | 3,719 | 台帳 `legacy-r2-orphan` | `asset-hydrate --group legacy-r2-orphan` |
| private `note/magazine-covers/` | 46（45.1MB） | 台帳 `note-magazine-cover-png` | `asset-hydrate --group note-magazine-cover-png` |
| private `coconala/assets/` | 59（28.3MB） | 台帳 `coconala-asset` | `asset-hydrate --group coconala-asset` |
| private `archive/repo/` | 13（27.0MB） | 台帳 `repo-archive` | `asset-hydrate --group repo-archive` |
| private `kindle/dist/` | 76（56.8MB） | Git ＋ 台帳 `kindle-dist`（バックアップのみ） | 通常は Git。R2 は `asset-hydrate --group kindle-dist`（バックアップ確認用） |
| public `posts/` | 5,234 | **Git**（`content/site/**`） | `upload-images-r2` が一方向で同期。配信コピーなので台帳不要 |
| public `posts/`（ogp.png） | 1,166（607.2MB） | 台帳 `site-ogp-png` | `asset-hydrate --group site-ogp-png` |
| public `note/covers/` | 813 | 台帳 `note-cover-png` | `asset-hydrate` |
| public `sns/` | 150 | 台帳 `sns-archived-media` / `ig-rendered-image` | `asset-hydrate --group sns-archived-media` |
| public `brain/` | 2 | `brain-products.ts` | `upload-brain-dist-r2` |

**2026-08-29 に追加したもの**: `site-ogp-png` / `note-magazine-cover-png` / `coconala-asset` /
`repo-archive` / `kindle-dist` の 5 group を新設し R2 へ退避した（`kindle-dist` は Git 追跡を
維持したままの R2 バックアップ）。`note-cover-png` は前回棚卸し（2026-08-22・777 件）から
813 件へ増加している。

`content/site/**/ogp.webp`（1,166 件 39.9MB）は **R2 に入っていない**。og:image が参照しない
未使用の派生ファイルで、prebuild のたび `generate-webp.mjs` が ogp.png から再生成する中間物のため、
git 追跡のみ解除し退避はしていない。

**2026-08-22 に片付けたもの（DN-0116）**:

- 公開バケットの孤児 **3,719 件 1.43 GiB** を削除（`content/` の旧記事画像 2,573 +
  消えた SNS 構造 `sns/_exam-packs` 等 1,146）。リポジトリ全域に参照 0 件で、`posts/` にも
  対応が無かった＝**唯一の実体**だったので、消す前に private の `archive/legacy-r2/` へ
  全件コピーし sha256 つきで台帳へ登録した。削除後に公開 URL が 404 になること、
  退避先から byte 一致で取り戻せることを実機確認済み。公開バケットは 2.84 → 1.52 GiB。
- reels の音声動画 **95 件 77 MiB がローカルにしか無かった**のを検出して退避。
  グループを作るまで誰も見ていなかった領域で、`check-asset-storage` が初めて可視化した。

> [!warning] 台帳に載っていないものは監視外
> 「消えても誰も気づかない」状態になる。R2 へ何かを置く仕組みを新しく作るときは、
> **台帳に載せるか、載せない理由（Git が真実源である等）を書く**こと。
>
> `asset-offload` は既定で追跡ファイルしか対象にしない。reels の wav/mp4 のように
> **最初から gitignore されている group** は `--include-untracked` が要る
> （これを付け忘れると、check-asset-storage が案内するコマンドが「対象 0 件」で
> 落ちるという状態になる。2026-08-22 に実際に作ってしまった）。

**取り戻したものを再コミットしない。** `docs/textbook/` は `.gitignore` と
`check-git-binary-policy` の `textbook-source-asset` ルールの両方で塞いである
（復元 → `git add -f` → gate が止まることまで確認済み）。

## 10. 不変条件

- 確認できないものは Git からもローカルからも外さない（dry-run → upload → sha256 照合 → untrack）
- `git rm --cached` はローカル実体を消さない。ローカル削除は常に別操作・別判断
- 台帳に credential・署名 URL・Cookie・ローカル絶対パスを載せない（`sanitizeEntry` の allowlist で機械的に落ちる）
- 公開バケットへ非公開判定のものを載せない（`check-asset-storage` が FAIL にする）
- 判定不能な公開範囲は private へ倒す

関連: [image-policy.md](image-policy.md) / [sns-archive-policy.md](sns-archive-policy.md) / [textbook-pdf-archive.md](textbook-pdf-archive.md) / [information-architecture.md](information-architecture.md)
