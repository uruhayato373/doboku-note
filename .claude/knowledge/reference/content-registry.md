---
title: コンテンツ台帳（content/registry）— 全チャネルの公開を ID で管理する正本
---

# コンテンツ台帳（content/registry）

2026-10-09 に運営者が決めた、YouTube・Shorts・Instagram・X（今後の Threads・TikTok を含む）の**公開の事実の正本**。
公開済みも含めて 1 件の投稿を 1 つの ID で引き、その ID から台本・状態・承認・外部 ID・素材・観測値・確認画面までたどれるようにする。
段階の進め方はバックログの P1〜P7（DN-0614・DN-0608〜DN-0613）。

## 決定事項

| 項目 | 決定 |
|---|---|
| 正本の置き場 | 公開の事実（ID・状態・予定・外部 ID・承認・素材の参照）は `content/registry/`。作品の中身（台本・文面・デザインの指定）は今の作品フォルダ（`content/sns/**`）に残し、台帳はパスで指すだけ。観測（再生数・一覧・反応）は `data/` に残して状態は持たせない |
| DB | DB サーバーは置かない。型つき JSON（zod・`scripts/lib/datasets.mjs` の台帳に登録）が正本で、SQLite・JSON の索引は作り直せる生成物（`config/products.json` と同じ形・data-storage-decision.md） |
| 分け方 | チャネル×資格ごとの JSON。CI の照合と手元の承認が書くので全件 1 ファイルにはせず、作品ごと（約 1,000 ファイル）は管理画面が遅くなるので避ける |
| 承認 | 管理画面で目視し、CLI で承認する（見た版の digest 入りのコマンドをコピーして実行）。管理画面は読むだけ |
| 公開前の動画 ID | 公開リポジトリの台帳に置いてよい（運営者の判断）。移行中の旧→新の対応表は今どおり非公開 R2 の delivery-state だけ |
| 古い投稿 | 全件を取り込む。公開の証拠があるものだけ `published`、無いものは理由つきの `stopped`。古いフォルダ名は変えず ID だけ付ける |
| 素材 | Drive の `制作物/コンテンツ/{exam}/{work}/{channel}.{format}[.{variant}]/{role}.{sha8}.{ext}`（手元は `.tmp/media/` の同じ相対パス）。一度置いたら書き換えない。描き直すと名前が変わる |
| Codex 画像 | 動画ごとに使うかを決める。どの役割の素材にも使えるが、使ったら来歴（モデル・指示文・ハッシュ）と `ai-image-fidelity-auditor` の判定 ok を必須にする。文字入りなら文字の誤りも監査する。Gemini は使わない |

## 3 つの表

```text
content/registry/
  works/{exam}.json                   作品（Work）
  publications/{channel}/{exam}.json  公開（Publication）: 1 チャネル 1 投稿
  media/{exam}.json  media/brand.json 素材（Media）
config/content-registry.json          チャネル×形式・アカウント・ID 規則・状態の語彙と遷移・切り替え済みのチャネル
```

| 表 | 1 行 | 持つもの | 持たないもの |
|---|---|---|---|
| Work | 1 つの主題の制作単位（動画パック・IG テーマパック・X の下書きの束・旧 Shorts の 1 問） | `id`・`kind`・`definition`（作品フォルダ）・`qa`・`theme` | 台本・文面 |
| Publication | 1 チャネル・1 アカウントへの 1 投稿 | `id`・`work`・`account`・`format`・`copy`（`file#key`）・`status`・`publishAt`・`approval`・`review.visual`・`platform`（外部 ID・公開範囲・証拠・関連動画）・`media`（役割→素材 ID）・`sync`・`times`（描画・アップロード・予約・同期の時刻）・`disclosure`・`thumbnail`・`campaigns` | 文面そのもの・再生数 |
| Media | 採用した、または公開に使うバイナリ 1 つ | `id`・`role`・`type`・`sha256`・寸法・`store`（tier と path）・`provenance`（render・codex・photo）・`review` | 途中の生成物（場面ごとの wav・`slide-NN.mp4`・`work/`） |

作品の状態は持たない（その作品の公開から導く）。

## ID 規則

| ID | 形 | 例 |
|---|---|---|
| exam | `qualification-registry.json` の資格 id か group id | `civil-construction-2` |
| Work | `[a-z][a-z0-9-]{2,59}`。全チャネルで一意（`utm_campaign` と同じ値） | `matome-2kyu-chokuzen` |
| Publication | `{exam}/{work}/{channel}.{format}[.{variant}]` | `civil-construction-2/matome-2kyu-chokuzen/youtube.longform` |
| Media | `{pubId}/{role}`・作品で共有は `{exam}/{work}/work/{role}`・ブランド共通は `brand/{design}/{role}`（置き場は `_brand/{design}/{role}.{sha8}.{ext}`） | `civil-construction-2/matome-2kyu-chokuzen/youtube.longform/cover` |

- channel.format の語彙は `config/content-registry.json`（youtube＝longform・short、instagram＝carousel・reel・story・highlight、x＝post・thread・article、threads＝post、tiktok＝video）。
- 新しく作る ID では、日付（`\d{8}`・`20\d{2}`・`\d{4}-\d{2}`）・先頭の `NNN-`・`pack-NN`・末尾の連番を使わない。中身を表す数字（`r03`・`7items`）は単語にくっつけてよい。
- 予約（`scheduled`）以上になった ID は変えない。改名は新しい行を作り、古い行に `renamedTo` を書く。消した ID は再利用しない。
- 規則に合わない既存の ID は `idException: imported-before-cutover` を付けて残す。件数は `config/content-registry.json` の上限でラチェットにする（2026-10-09 の取り込みで Shorts の鍵 223 件。上限 223 から増やさない）。

## 状態

`config/content-registry.json` の `status` が全チャネル共通の語彙。

| status | 誰が動かすか | 必須の欄（**太字**は検査済み） |
|---|---|---|
| `draft` | 作り手 | — |
| `qa_blocked`・`qa_passed` | QA | `qa`（作品側） |
| `approved` | **運営者だけ**（CLI） | **`approval.by='user'`**（approved 以降すべて）・`approval.contentSha256` |
| `rendered` | 描画スクリプト | 役割の素材がそろっている |
| `uploaded_private` | 投稿スクリプト | `platform.id` |
| `scheduled` | 投稿スクリプト | **`publishAt`**・`platform.id` |
| `published` | **CI の照合**（観測の証拠）か、即時投稿のライブ確認、今の台帳からの取り込み（`import`・証拠つき） | **`platform.id`**・`platform.publishedAt`・**`platform.evidence`** |
| `failed` | 投稿スクリプト | `error` |
| `refresh_due` | 運営者・エージェント | `reason` |
| `stopped` | 運営者だけ | **`stopReason`**（`user-decision`・`superseded`・`gone`・`unverified-legacy`） |

- `measured` は保存しない（計測があるかは `data/` から導く）。
- 照合の書き込みは前進（`scheduled→published`）だけ。後戻り・結び付かない公開・重複は `.claude/state/registry-reconcile/` に所見として出し、人が決める。資格情報が無いときは記録を書かずに exit 2。
- 期日を過ぎても公開にならない予約は `check-registry-due`（ops）が出す。

## 承認（2 段階）

ハッシュは `scripts/lib/content-registry.mjs` の `approvalHash()` だけが計算する（CLI・検査・管理画面が同じ関数を使う）。

- `review.visual.digest`: 画面確認（音声なし）の素材（表紙・締め・場面・コンタクトシート）の `role:sha256` を並べたもの。
- `approval.contentSha256`（最終）: 完成版の素材の `role:sha256` に、アカウント・形式・`publishAt`・解決した文面（題名・概要欄・タグ／キャプション／本文）を足したもの。
- どれかが変わると承認は無効になる。未公開なら検査と stage が止め、公開済みなら「要同期」として出す（概要欄の表記漏れなどを機械で見つけるため）。
- ハッシュの無い承認は `grandfathered: true`・`contentSha256: null`。今の台帳の `approvedBy: user` を写したもの（過去の承認と、ハッシュつきの承認 CLI（P3）ができるまでの `prepare-youtube-longforms --schedule`）がこれになる。

## 確認画面と承認（P3・2026-10-09）

- 管理画面 `/content/items`（一覧）と `/content/items/{exam}/{work}`（詳細）。形は `scripts/lib/media-review.mjs` だけが組み立て、画面は読むだけ（ボタンはコピーとリンクだけ）。並びは「画面が先、音声は後」（表紙・締め・画面確認の数値・コンタクトシート・無音プレビュー → 完成動画・字幕）。
- 素材は手元（`/media/cmedia/…`）か Drive のマウント（`/media/vault/…`・名前の sha8 と台帳の bytes が一致するときだけ）から配信する。配信は Range（206・416）と HEAD に対応し、全配信元で realpath を検査する。判定は `scripts/lib/media-serve.mjs`・`http-range.mjs`。Drive の手元に落ちていない素材は 409「要復元」で、画面は pull のコマンドを出す。Drive の絶対パス（メールアドレスを含む）は画面にも応答にも出さない。
- 画面確認の素材は `npm run media -- preview --pub <id> [--commit]`（`scripts/lib/media-preview.mjs`・DN-0603）。無音プレビュー・`contactSheetEverySec` 秒ごとのコンタクトシート（長尺は `contact-sheet-2` 以降）・数値（`preview-metrics`。冒頭の表紙の秒数・直前と同じ画面の割合・同じ画面が続く箇所。閾値は `config/video-content.json` の `visualCheck`）。
- 承認は運営者が自分の端末で、画面に出るコマンドをコピーして打つ: `npm run registry -- approve --pub <id> --stage visual|final --expect <digest>`。`--expect` が今の中身の digest と違えば書かない。final は visual の承認が先（YouTube）。AI 生成の素材に判定 ok が無ければ書かない。Claude Code の Bash（`CLAUDECODE=1`）からは実行できない。止めるのは `npm run registry -- stop --pub <id> --reason …`。
- ハッシュつきの最終承認は、`publish-video-pack.cjs`（longform・thumbnail）と `stage-youtube-renders-r2.mjs` が今の中身と照らし、違えば止める（`finalApprovalGate`。ハッシュの無い承認は今どおり通す）。
- 検査 R07 は比較元（`--base`・CI は PR の base か直前のコミット＝`REGISTRY_BASE`）から状態が変わった行の遷移を見る。`stopped(unverified-legacy)→published` は証拠つきだけ。

## 素材の置き場

- 手元 `.tmp/media/{exam}/{work}/{channel}.{format}[.{variant}]/{role}.{sha8}.{ext}` → Drive `制作物/コンテンツ/` の同じ相対パス（drive-vault の group `content-media`・`immutable`）。ブランド共通は `.tmp/media/_brand/{design}/{role}.{sha8}.{ext}`。
- `{sha8}` は中身の sha256 の先頭 8 桁。同じ名前で中身が違うことは起こらない（描き直すと別名になる）。immutable の group では上書きと `--force` を拒否する。
- 描画の作業場 `.tmp/video-render/{packId}/` は使い捨て。成果物だけを `npm run media -- promote` で取り込む。
- パスの組み立てと分解は `scripts/lib/media-paths.mjs` だけが行う。採用 PNG として読んでよいパスの判定（`isAdoptedPngPath`）もここにあり、表紙・締め画像の読み手（`youtube-approved-cover.mjs`・`stage-youtube-covers.mjs`・`video-cta.mjs`）が使う。
- 2026-10-09 に、2026-09-09 の一括適用で日付フォルダ・連番名に置いた採用表紙 337・締め画像 113・ブランド素材 3（ロゴ・背景・Shorts の締め画像＝`_brand/bridge-notebook-a/`）を、画素を変えずにこの置き場へ移した（`npm run media -- adopt-video-brand`・DN-0607）。Shorts の公開の `media.cta` はブランド共通の素材 `brand/bridge-notebook-a/cta-shorts` を指す。旧 Shorts の 10 件（`content/sns/youtube/cover-design.json`）は台帳の ID ができる P4 で移す。
- CI が読む YouTube の転送用は private R2 の sha 名（`youtube-staging/{sha256}.mp4`）へ P3 で移す。

## YouTube の切り替え（P2・2026-10-09）

- `config/content-registry.json` の `cutover` に `youtube` が入り、動画パックの YouTube の状態の正本は台帳になった。`.claude/state/video-content-status.json` の YouTube の部分（`derivatives.longform`・`derivatives.shorts`）は台帳から作り直す写しで、手で直さない。`instagramReel` は P5 まで今の台帳が正本。
- 変換は `scripts/lib/registry-video-state.mjs` だけが持つ。派生物の欄と台帳の欄は欠けなく往復し（全パックで往復するテストつき）、知らない欄は投げる。書き手が新しい欄を足すときは、型（`dataset-schemas-content.mjs`）と変換の両方に足す。
- 書き手（`publish-video-pack.cjs`・`prepare-youtube-longforms.mts`）は `loadVideoState` で読み、`saveVideoState` で書く。台帳の行を先に書き、写しを作り直して書く。読むだけのスクリプトと管理画面は今のまま写しを読んでよい（R09 が一致を保証する）。
- 派生物の無い公開（Shorts を作る前の動画パック）は行を作らない。Shorts の行は `youtube.json` の `shorts` に鍵を決めたときにできる。台帳にだけある素の下書き（`status: draft` だけの行）は写しに出さない。
- 一括の取り込みは `npm run registry -- import-video-packs`（既定 dry-run・2 回目は書く行 0）。公開中の一覧（`youtube.own-videos`）と突き合わせ、公開中なのに published でない本数を出す。

## 照合（registry-reconcile）

- `.github/workflows/registry-reconcile.yml`（毎日 00:43 JST）が `npm run registry-reconcile` を動かし、台帳の外部 ID を `videos.list` で観測する。
- 予約（`scheduled`）の動画が public なら `published` へ進め、`platform.evidence`（`youtube-api`・`videos.list@時刻`）と `platform.publishedAt` を書く。台帳と写しを develop へ書き戻す（`ci-data add`）。
- published なのに非公開・消えた動画は fail の所見、期日（`publishAt`＋`reconcileGraceDays`）を過ぎても非公開の予約と、予約を経ずに public の動画は warn の所見。所見は `.claude/state/registry-reconcile/youtube.json` に残し、状態は人が決める。
- exit 0＝照合した・1＝fail の所見あり（automation-failure Issue の channel `registry-reconcile`）・2＝検査不成立（認証が無い・API の失敗。何も書かない）。手元に YouTube の認証は無いので、CI でだけ動く。

## 検査

`npm run check-content-registry`（`ci: true`）。切り替え前のチャネル（`config/content-registry.json` の `cutover` に無いもの）は、台帳に無い動画パックを INFO、件数の不一致を WARN に留める（youtube は切り替え済みで FAIL）。

| id | 検査 |
|---|---|
| R01 | 件数（台帳全体が 0 件、または切り替え済みのチャネルが 0 件なら FAIL。型は check-datasets） |
| R02 | ID の一意と形・禁止の語・`idException` の上限 |
| R03 | 予約以上の行の削除・改名（`--base <ref>` と比べる） |
| R04 | 参照（公開→作品・作品の定義フォルダ・素材→公開・文面の鍵）と孤児 |
| R05 | `video-pack.json` の `outputs` と公開の数の一致（Shorts が 1 本も無いのは未作成の INFO） |
| R06 | 素材の sha と Drive 台帳（`drive-manifest.json`）の一致・置き場の名前の sha8 |
| R07 | 状態の必須欄（状態表の太字）・承認ハッシュ。遷移は比較元から変わった行だけ見る（P3） |
| R08 | 外部 ID の重複・Shorts の関連動画 |
| R09 | 今の台帳（`video-content-status.json`）の YouTube の部分が、台帳から作り直したものと全欄で一致。切り替えの前後とも FAIL（前は台帳を写し直す・後は書き手で書く）。今の台帳にだけあるパックは切り替え前 INFO・後 FAIL |
| R10 | AI 生成の素材は AI 台帳（鍵 `media:<id>`）の判定 ok がある |

## コマンド

```bash
npm run registry -- list --channel youtube --exam civil-construction-2
npm run registry -- show civil-construction-2/matome-2kyu-chokuzen/youtube.longform
npm run registry -- import-video-pack --pack-dir content/sns/video-packs/civil-construction-2/matome-2kyu-chokuzen
npm run registry -- import-video-packs          # 全動画パック（own-videos と件数を突き合わせる）
npm run registry-reconcile -- --dry             # YouTube の観測と照合（認証は CI。手元は exit 2）
npm run registry -- index
npm run check-content-registry
npm run media -- promote --pub civil-construction-2/matome-2kyu-chokuzen/youtube.longform
npm run media -- sync --work civil-construction-2/matome-2kyu-chokuzen
npm run media -- verify --work civil-construction-2/matome-2kyu-chokuzen   # 台帳・vault・クラウドの 3 者照合
npm run media -- pull --work civil-construction-2/matome-2kyu-chokuzen
```

`import-video-pack`・`import-video-packs`・`promote` は既定で dry-run（`--commit` で書く）。
