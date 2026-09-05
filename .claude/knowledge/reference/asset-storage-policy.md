# アセット置き場ポリシー（public R2 / private R2 / Google Drive）

Git の外に置くアセットを **誰が使うかで 3 つの置き場へ振り分け**、必要なときだけ手元へ戻す運用の SSOT。
機械可読な定義は R2 側が `.claude/config/asset-storage.json`（台帳 `.claude/state/assets/manifest.json`）、
Google Drive 側が `.claude/config/drive-vault.json`（台帳 `.claude/state/assets/drive-manifest.json`）。
迷ったら `/asset-route`（`.claude/skills/dev/asset-route/SKILL.md`）が決定木と正確なコマンドを持つ。

> [!note] 経緯
> 2026-08-21 時点で HEAD は 4.15 GiB あり、CI ランナーが checkout で空きを使い切って落ちるところまで来ていた。
> 原稿・設定の SSOT と、再生成できるカバー・投稿用 PNG・添付 PDF・教材ページ画像が同じ履歴に混ざっていたのが原因。
> DN-0111 で 4,271 件 2.82 GiB を R2 へ移し（うち note カバー SVG 827 件は保存せず生成停止）、HEAD は 1.14 GiB になった。

## 1. 置き場は「誰が使うか」で決める（2026-09-05 制定）

旧ルールは「資産の種類 → Git か R2」の列挙で、**判断軸が無かった**。その結果、スキャン書籍の著作権のために
書いた「教材ページ画像 → private R2」の行が、公的文書で原本から再生成できる共通仕様書のページ画像 3.4GB に
誤適用されかけた（2026-09-05）。private バケットは教材 PDF 3.9GB・旧孤児 1.4GB・配布 PDF・未投稿レンダーなど
「人か手元のスクリプトしか読まないもの」の倉庫になっていた。以後は次の 3 行で決める。

| audience（誰が使うか） | 置き場 | 例 |
|---|---|---|
| **`site`** サイトが配信する | public R2 `doboku-note`（`storage.doboku-note.com`） | 記事図版（`posts/`）・OGP・Brain 配布 ZIP |
| **`ci`** GitHub Actions が読み書きする | R2（public / private / byVisibility） | note カバー PNG（`note-cover-supply.yml` が毎回書く）・git 履歴 bundle（例外・復元経路） |
| **`human`** 人か手元のスクリプトだけが使う | Google Drive vault `マイドライブ/doboku-note/` | 原本 PDF・ページ画像・文字起こし・配布 PDF・未投稿レンダー・Kindle・ココナラ素材 |

- **機械表現**: `asset-storage.json` の全 group に `audience` が必須。`site ⇒ bucket public`、`ci ⇒ private|byVisibility`。
  `human` は原則 `asset-storage.json` に置かず `drive-vault.json` へ。R2 に残す例外は `audienceException` に理由
  （20 字以上）を書く。`loadConfig`・`tests/asset-storage.test.mjs`・`check-drive-vault` の 3 か所が止める。
- **CI は Drive を持たない**。これが 2 行目（`ci`）を分ける唯一の理由。ワークフローから `drive-vault-sync` を呼ばず、
  `asset-inbox-ingest` は Drive 管轄のパスを拒否する。
- **同じパスが両 tier に一致する状態を作らない**。`check-drive-vault` が `git ls-files ∪ ignore 済み` を走査して衝突を FAIL にする。
- **Git に残すもの**は変わらない: 記事・SNS の原本（.md / frontmatter / slide-data / caption / status）、真正ベクター .svg、
  各台帳（`manifest.json` / `drive-manifest.json`）と README。

### 各 group の行き先（2026-09-05 時点）

| group | audience | 置き場 | 備考 |
|---|---|---|---|
| `site-ogp-png` | site | public R2 `posts/` | `ogp-supply.yml` が生成・供給 |
| `note-cover-png` | ci | private R2 `note/covers/` | `note-cover-supply.yml` が書く。2026-09-05（DN-0171）まで byVisibility で公開済みを public にも置いていたが、サイトも note も読まないので private 一本化 |
| `git-history-bundle` | human（例外） | private R2 | 2.65GB 書き込み一回・復元時だけ。ストリーミングマウント越しの単一巨大 blob は脆い |
| `sns-archived-media` | human | Drive `制作物/SNS音声動画/` | reels の wav/mp4・YouTube Shorts mp4。投稿は人の JIT。`post-youtube-scheduled.yml` の Shorts 台帳は手動投入へ切替済み（pending 0・参照キー `sns/youtube-shorts/` は R2 に 0 件）なので CI は読んでいない。2026-09-05 DN-0170 で旧 `upload-sns-r2` 系統を廃止（[sns-archive-policy.md](sns-archive-policy.md)） |
| `standards-page-image` | human | Drive `原資料PDF/共通仕様書/{整備局}/{PDF名}/{pages,text}/` | 原本 PDF の隣（§1-2） |
| `textbook-source-pdf` / `textbook-page-image` | human | Drive `原資料PDF/教材/{書名}/**` | `content/sources/textbook/{書名}/` の 1:1 ミラー。既存の手動配置 63 本は sha256 で adopt |
| `note-delivery-pdf` | human | Drive `制作物/note配布PDF/` | 添付は人が `note-attach-file` で実行 |
| `ig-rendered-image` | human | Drive `制作物/IGレンダー/` | 投稿は人が `publish-ig-bs` で実行。投稿済みを public R2 に置いていたのは旧目標の名残 |
| `video-render-artifact` | human | Drive `制作物/動画レンダー/` | render-longform を回す CI は存在しない |
| `kindle-dist` | human | Drive `制作物/Kindle/`（Git が正本） | CI の check-kindle-format が blob を読むので Git 追跡は維持。Drive は控え |
| `coconala-asset` | human | Drive `制作物/ココナラ/` | |
| `note-magazine-cover-png` | human | Drive `制作物/マガジンカバー/` | |
| `repo-archive` | human | Drive `アーカイブ/repo/` | |
| ~~`legacy-r2-orphan`~~ | human | 記事画像 2,573 件は削除済み（参照 0 を確認）・SNS 素材 1,146 件は Drive `アーカイブ/旧R2/sns/` | 2026-09-05 に R2 から消し group を削除 |

**公開バケットへ置かないもの**: 教材、購入者限定 PDF、未公開商品、draft 画像、そして **人しか読まないもの全部**。
`doboku-note-archive` にはカスタムドメインを付けない（S3 API だけで扱う）。

### 1-1. Google Drive vault のレイアウト

Drive 側は `マイドライブ/doboku-note/` を単一ルートとして管理する（2026-08-29 統合・2026-09-05 に 4 フォルダへ拡張）。
マウント先は端末ごとに違う（Mac `~/Library/CloudStorage/GoogleDrive-<account>/マイドライブ/`、Windows `G:\マイドライブ\` など）
ので、コードは `scripts/lib/drive-vault.mjs` の `resolveVaultRoot()` で解決し、台帳には vault 相対パスだけを書く
（環境変数 `DOBOKU_DRIVE_VAULT` で上書き可）:

```
マイドライブ/doboku-note/
├── README.md                    # 貼り紙。Drive を開いた人が最初に読む
├── 原資料PDF/                   # L0 原本。その隣にページ画像
│   ├── 白書/ 書籍/ 資格試験/     # 手で整えた既存（白書 44・書籍 23・資格試験 97）
│   ├── 共通仕様書/{整備局}/      # 国交省の共通仕様書・工事必携 PDF 72 本を 10 局へ
│   │   ├── common__xxx.pdf
│   │   └── common__xxx/{pages,text}/   # ← 原本と同名フォルダ＝隣（standards-page-image）
│   └── 教材/{書名}/**            # content/sources/textbook/{書名}/ の 1:1 ミラー（PDF と img/pages が同居）
├── 文字起こし/                  # L1 中間産物の .md（content/sources/textbook/ 直下と 1:1）
├── 制作物/                      # 人が使う成果物
│   ├── note配布PDF/ IGレンダー/ 動画レンダー/ Kindle/ ココナラ/ マガジンカバー/
└── アーカイブ/
    ├── repo/                    # repo-archive
    └── 旧R2/sns/                # legacy-r2-orphan の SNS 素材
```

`原資料PDF/` と `文字起こし/` は同じ内訳で並べる（`共通仕様書/東北地方整備局/` の PDF に
`文字起こし/共通仕様書/東北地方整備局/` の md が対応）。共通仕様書のファイル名先頭が文書種別で、
`common__`＝共通仕様書・`hikkei__`＝土木請負工事必携・`special__`＝特記・`local__`＝地方版・
`manual__`＝手引き。各枝の `_収集メタデータ/` は収集台帳と QA 記録で本文ではない。

`文字起こし/` の直下の名前は `content/sources/textbook/` の直下と 1 対 1 で対応させる（復元がコピー
1 回で済む前提）。2026-09-05 に英語 2 階層（`private-sources/textbook/`・`references/`）を日本語 1 階層へ
畳み、`資格試験/` 直下にあった完全一致の重複 4 dir（156MB・84 ファイル）と Word の `~$` 一時ファイル
12 個を削除した（正本は `資格試験/１級土木施工管理技士/` 配下に現存）。同日、`資格試験/１級土木施工
管理技士/` の下に埋もれていた共通仕様書を `共通仕様書/` として独立させ、地方整備局ごとに整理した
（近畿だけ二重にあった PDF 2 本と文字起こし 36 ファイルは削除。照合証跡 zip と qa-report.md は正本側へ退避）。
整理後の実数は 白書 44・書籍 23・資格試験 97・共通仕様書 78（PDF 側）／文字起こし 502（共通仕様書）
ほかの計 905 ファイル。

**`文字起こし/共通仕様書/` は `content/sources/textbook/` に対応先を持たない**（1 対 1 の例外）。
成果物は `content/site/standards-articles/` として公開済みで、repo へ戻す必要が無いため。
`build-standard-articles` の入力は repo 側の `content/site/standards-library/catalog.json` で、
Drive のパスは参照しない＝この移動でビルドは壊れない。

`content/sources/textbook/**` の文字起こし本文（.md/.html）と派生図版は、書籍の著作権物をほぼそのまま
含むため 2026-08-27 に public repo（`doboku-note`）の追跡から外し、`~/Google Drive/マイドライブ/
doboku-note/文字起こし/` へ移設した。
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

### 1-2. 公的基準のページ画像は「1 ページ = 1 画像 + 1 テキスト」

章記事（`content/site/standards-articles/`）の本文は `part-NN.md`（50 ページ束）までしかページ情報を
持たず、「この記述は原本の何ページか」を機械で言えなかった。2026-09-05 に共通仕様書 10 文書
（9 ユニーク・5,949 ページ）をページ単位へ割り、`content/sources/standards/{agencyId}/{documentId}/`
へ置いた。ID 体系は `standards-library/catalog.json` と同じで、章記事・カタログ・ページ画像が同じキーで引ける。

```
repo:  content/sources/standards/{agencyId}/{documentId}/manifest.json   # git 追跡。原本 sha256・描画条件・parts のページ範囲・各ページの sha256
vault: 原資料PDF/共通仕様書/{整備局}/{原本PDF名}/pages/p0001.jpg           # 原本 PDF の隣（同名フォルダ）。pdftoppm 270dpi（2233px）JPEG q85
       原資料PDF/共通仕様書/{整備局}/{原本PDF名}/text/p0001.txt            # pdftotext -layout をページ境界(\f)で割ったもの
台帳:  .claude/state/assets/drive-manifest.json（drive-vault.json の standards-page-image group）
```

実体を private R2 でなく Drive に置くのは §1 の置き場ルール（人か手元のスクリプトだけが使う → Drive）による。
2026-09-05 に途中まで private R2 へ上げた 2,550 件は、vault 側の全件照合（11,898/11,898 一致）の後に撤去した。

- **原本の同定はファイル名でなく sha256**。Drive 側のファイル名は整理で動くがハッシュは動かない。
  catalog の `sourceSha256` と引き当たらない PDF は 1 バイトも書かずに落とす（fail-closed）
- **出典は `section` + 版面ページ番号で指す**。PDF の通しページ（p0120）と版面に刷られたページ
  （1-42）は一致せず、さらに目次が 1-1..1-77 と進んだあと本文が再び 1-1 から始まるため版面番号だけ
  では一意にならない。各ページに `section`（front=目次 / body=本文）を持たせ、境界は「同じ編で番号が
  減った最初の地点」で機械判定する。`check-standards-page-images` は組の重複を FAIL にする
- **対象 PDF は全て born-digital**（`pdfimages -list` が空＝ラスタ埋め込み無しの純ベクタ）。
  `text/` は OCR ではなく PDF 自身のテキスト層なので取り違えが原理的に起きない。OCR が要るのは
  スキャン教材（`content/sources/textbook/`）side で、そちらは `/pdf-to-mdx --scanned` が扱う
- **沖縄総合事務局は中国地方整備局と原本 sha256 が一致**する。画像は重複生成せず
  `okinawa/common/manifest.json` に `sameAs: "chugoku/common"` を持たせる（catalog も同じ扱い）
- 生成には Drive vault の原本と poppler が要る。手元に作業コピーが要るときは
  `npm run drive-vault-sync -- --pull --path content/sources/standards/{agencyId}/`
- 整合ゲートは `npm run check-standards-page-images`（`quality:audit` 同梱）。実体が無い端末では
  manifest だけを検査し「実体検査 0 件」を緑と言わずその旨を出力する

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

Drive vault 側（human tier）は台帳が別で、取り戻しは `drive-vault-sync --pull`（マウントが要る・ネット不要）:

```bash
npm run drive-vault-sync -- --pull --group note-delivery-pdf
npm run drive-vault-sync -- --pull --path 'content/sources/textbook/{書名}/'
```

credential が無い端末（会社 PC はプロキシで外部 API が遮断される）は `--offline` を付ける。
何が足りないかが一覧で出るので、「取れたつもり」にならない。

**cache にも無いものは CI に代行させる**（2026-08-25 新設）。`.github/workflows/asset-hydrate.yml` を
Actions から dispatch すると、CI 側の credential で R2 から取り出し、artifact `hydrated-assets` として
出す。artifact は **tar.gz 1 個**なので、ダウンロードして repo 直下で展開する
（退避対象は `.gitignore` 済みなので `git status` は汚れない）。

```bash
# group か path を指定 → dry_run で対象確認 → 本実行 → artifact をダウンロード
tar -xzf hydrated-assets.tar.gz
```

> tar に固めてあるのは、`upload-artifact` の glob が**ドット始まりを拾わない**ため。
> 素の path 指定だと `.claude/config/**` のアセットはコピー済みでも「No files were found」で
> 落ちる（2026-08-31、ココナラ模試の原稿 4 件が取り出せず発覚）。
> Git Bash では `tar -xzf 'C:/...'` が `C:` をリモートhost と解釈して失敗するので、
> `/c/Users/...` 形式のパスを使う。

**退避（offload）も CI に代行させられる**（2026-08-25 新設）。CI は checkout で gitignore 済みの
実体を得られないので、`scripts/asset-inbox-push.mjs` が GitHub Release を橋にしてファイルを CI まで運ぶ。

**例外は CI 自身が実体を生成できるアセット**——`site-ogp-png` がその第一号で、`ogp-supply.yml` が
CI 内で `ogp-create.mjs` を実行して `ogp.png` を作ってから供給するため、この Release 橋を経由しない
（詳細 §3）。この「CI が生成できる」は `asset-storage.json` の `regenerable` フィールド（byte 再現を
保証するかの意味・§6）とは別概念——`site-ogp-png` の `regenerable` は引き続き `false`。
第二号は `note-cover-png`（2026-09-02・`note-cover-supply.yml`）。develop への `content/note/**/article*.md`
push で `scripts/check-note-cover-coverage.mjs --json` が欠落 dir を拾い、`generate-note-covers.mjs <dir>` で
生成 → **欠落として検出したカバー以外の生成物は削除**（同居記事の再描画分を上げると既存 R2 カバーを別バイトで
上書きし manifest の sha256 が動く）→ `asset-offload --group note-cover-png --include-untracked --commit` →
manifest を develop へ commit する。R2 creds の無い環境（会社 PC・Claude Code Remote）で書いた記事は、
ローカルで Release 橋を使わなくても develop へマージされれば供給される（PR 上の unit-tests は
マージ後の manifest commit を取り込んだ次の push から緑）。

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

**`site-ogp-png` は記事追加のたびに新規 `ogp.png` エントリが生まれ続ける group** —— 他の group の多くは §4 の一度きりの移行で退避対象が固定されるが、こちらは違う。日常経路は develop push 契機の CI 自動供給（`.github/workflows/ogp-supply.yml`）に変わった（2026-08-29）。この節の手動コマンドは即時反映したいときのオプション。

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

外部（note / Instagram）へ書き込むスクリプトは `ensureLocalAny()`（`scripts/lib/asset-locate.mjs`＝R2 台帳 → Drive 台帳の順に
引く。tier を意識させない入口）で使う直前に取り寄せ、**取れなければ外部へ触れる前に止める**。Drive のマウントが無い端末では
pull が失敗して止まる。それが正しい挙動で、マウント無しで外部へ書かない。カバー無しで公開する・
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

## 9. R2 と Drive に何が入っているか（台帳のカバー範囲）

2026-09-05 の Drive 移行後の実測（`rclone size` / `rclone lsf`）。R2 のオブジェクトは **台帳 `manifest.json`
（4 group・2,696 エントリ）か Git（`posts/` の記事図版）か `brain-products.ts`** のどれかが持つ。人 tier は
**Drive vault の台帳 `drive-manifest.json`（11 group・19,236 エントリ）**が持つ。

| 置き場 / prefix | 件数 | 真実源 | 復元 |
|---|---|---|---|
| private `archive/git-history/` | 1（2.65GiB） | 台帳 `git-history-bundle`（human 例外） | `rclone copy` → `git clone <bundle>` |
| private `note/covers/` | 840（772MiB） | 台帳 `note-cover-png`（全カバー。2026-09-05 DN-0171 で public 複製 823 件を private へ server-side copy → md5 照合 → public 側削除） | `asset-hydrate --group note-cover-png` |
| public `posts/`（記事図版） | 4,298（149MiB） | **Git**（`content/site/**/img`） | `r2-sync.yml` が一方向で同期。配信コピーなので台帳不要 |
| public `posts/`（ogp.png） | 1,586（662MiB） | 台帳 `site-ogp-png`（1,574） | `ogp-supply.yml` が生成・供給 |
| public `brain/dist/` | 2 | `brain-products.ts` | `upload-brain-dist-r2` |
| Drive `マイドライブ/doboku-note/` | 20,078（11.4GiB） | 台帳 `drive-manifest.json` 19,236 ＋ 手で置いた原本・文字起こし | `drive-vault-sync --pull --group <id>` |

**2026-09-05 に Drive へ移したもの（DN-0169 完了）**: 11 group 19,236 件＝共通仕様書ページ 11,898 / 教材 PDF 417
（うち 63 は Drive に手で置いてあった原本を sha256 で adopt）/ 教材ページ画像 868 / note 配布 PDF 598 / IG レンダー 2,155 /
動画レンダー 1,939 / Kindle 76 / ココナラ 79 / マガジンカバー 47 / repo アーカイブ 13 / 旧 R2 孤児の SNS 素材 1,146。
全 group を `--verify --deep --cloud`（台帳・vault・Drive API md5 の 3 者一致・不一致 0）で通してから
`delete-r2-objects --from-manifest-group` で R2 側を消した（12 実行・不在 0・失敗 0）。旧孤児の記事画像 2,573 件は
参照 0 を再確認し保全せず削除。private バケットは 13,700 超 → 59 オブジェクト、public は 9,128 → 6,988（同日 DN-0171 で public の note カバー 823 件を private へ寄せ、DN-0170 で `sns/` 281 件を Drive へ移し、public は 5,884）。
`delete-r2-objects --from-manifest-group` の保全判定は **Drive 台帳の同 sha256 だけ**を認める（R2 台帳自身は循環するので
使わない。動画レンダー 1,724 件が Drive 未同期のまま purge に進めた穴を同日に塞いだ）。

**2026-08-29 に追加したもの**: `site-ogp-png` / `note-magazine-cover-png` / `coconala-asset` /
`repo-archive` / `kindle-dist` の 5 group を新設し R2 へ退避した（`kindle-dist` は Git 追跡を
維持したままの R2 バックアップ）。`note-cover-png` は前回棚卸し（2026-08-22・777 件）から
813 件へ増加している。

`kindle-dist` は2026-09-04に76件を再同期し、ローカル・manifest・private R2のbytes/sha256三者一致を
確認した。ただし `e-01` を `.tmp` へ直接再生成して展開比較すると、UUID・日付以外にも本文からの
`CareerAffiliate` 除去と画像寸法変更があり、公開版と実内容が一致しなかった。この反例で全冊の内容一致
条件は不成立と確定したため、Git追跡は維持する。Drive vault（`制作物/Kindle/`・2026-09-05 に R2 から移設）は完全バックアップであり、現行generatorを公開済み
配布版のbyte/内容再現手段とは扱わない。

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

- **置き場は audience で決める**（§1）。`human` を R2 に置くなら `audienceException` に理由を書く。同じパスを両 tier に置かない
- **マウントへ書けた ≠ クラウドへ上がった**。Drive 側を唯一の実体にする前（R2 やローカルを消す前）は
  `drive-vault-sync --verify --cloud`（rclone で Drive API の md5 照合）を通す。rclone リモート未設定は fail-closed
- 確認できないものは Git からもローカルからも外さない（dry-run → upload → sha256 照合 → untrack）
- `git rm --cached` はローカル実体を消さない。ローカル削除は常に別操作・別判断
- 台帳に credential・署名 URL・Cookie・ローカル絶対パスを載せない（`sanitizeEntry` の allowlist で機械的に落ちる）
- 公開バケットへ非公開判定のものを載せない（`check-asset-storage` が FAIL にする）
- 判定不能な公開範囲は private へ倒す

関連: [image-policy.md](image-policy.md) / [sns-archive-policy.md](sns-archive-policy.md) / [textbook-pdf-archive.md](textbook-pdf-archive.md) / [information-architecture.md](information-architecture.md)
