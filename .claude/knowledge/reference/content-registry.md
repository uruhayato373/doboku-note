---
title: コンテンツ台帳（content/registry）— 全チャネルの公開を ID で管理する正本
---

# コンテンツ台帳（content/registry）

2026-10-09 に運営者が決めた、YouTube・Shorts・Instagram・X（今後の Threads・TikTok を含む）の**公開の事実の正本**。
note・ココナラ・Kindle は対象外（note の公開状態の正本は記事の frontmatter の `noteId`・`noteStatus` で、未公開の一覧は `npm run note-unpublished`）。
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
| 古い投稿 | 2026-11-01 に Instagram の旧公開193件（投稿160・リール33）を実体から削除し、旧台帳80公開行・旧作品262行・旧素材2行・旧パックのソース2279ファイルも撤去した。Instagram のアクティブ台帳は予約済み固定投稿3件だけ。再投稿は新しい公開行の QA・承認から進める |
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
| Media | 採用した、または公開に使うバイナリ 1 つ | `id`・`role`・`type`・`sha256`・寸法・`store`（tier と path）・`provenance`（render・codex・photo）・`review` | 使い捨ての中間生成物（場面ごとの wav・`slide-NN.mp4`）。作品用の採用候補 `work/candidate-*` は素材に含む |

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

- `review.visual.digest`: 画面確認（音声なし）の素材（表紙・締め・場面・全場面シート・コンタクトシート・無音プレビュー・数値）の `role:sha256` を並べたもの。全場面シートのSHA変更もvisual承認を無効にする。
- `approval.contentSha256`（最終）: 完成版の素材の `role:sha256` に、アカウント・形式・`publishAt`・解決した文面（題名・概要欄・タグ／キャプション／本文）を足したもの。
- どれかが変わると承認は無効になる。未公開なら検査と stage が止め、公開済みなら「要同期」として出す（概要欄の表記漏れなどを機械で見つけるため）。
- ハッシュの無い承認は `grandfathered: true`・`contentSha256: null`。今の台帳の `approvedBy: user` を写したもの（過去の承認と、ハッシュつきの承認 CLI（P3）ができるまでの `prepare-youtube-longforms --schedule`）がこれになる。

## 確認画面と承認（P3・2026-10-09）

- 管理画面 `/content/items`（一覧）と `/content/items/{exam}/{work}`（詳細）。形は `scripts/lib/media-review.mjs` だけが組み立て、画面は読むだけ（ボタンはコピーとリンクだけ）。並びは「画面が先、音声は後」（表紙・全場面の画像・締め・画面確認の数値・全場面シート・コンタクトシート・無音プレビュー → 完成動画・字幕）。
- 素材は手元（`/media/cmedia/…`）か Drive のマウント（`/media/vault/…`・名前の sha8 と台帳の bytes が一致するときだけ）から配信する。配信は Range（206・416）と HEAD に対応し、全配信元で realpath を検査する。判定は `scripts/lib/media-serve.mjs`・`http-range.mjs`。Drive の手元に落ちていない素材は 409「要復元」で、画面は pull のコマンドを出す。Drive の絶対パス（メールアドレスを含む）は画面にも応答にも出さない。
- 画面確認の素材は `npm run media -- preview --pub <id> [--commit]`（`scripts/lib/media-preview.mjs`・DN-0603）。無音プレビュー・`contactSheetEverySec` 秒ごとのコンタクトシート（画面遷移用。長尺は `contact-sheet-2` 以降）・全場面を1枚ずつ載せる `scene-sheet`（短い表紙も含む）・数値（`preview-metrics`。冒頭の表紙の秒数・直前と同じ画面の割合・同じ画面が続く箇所。閾値は `config/video-content.json` の `visualCheck`）。
- 承認は運営者が自分の端末で、画面に出るコマンドをコピーして打つ: `npm run registry -- approve --pub <id> --stage visual|final --expect <digest>`。`--expect` が今の中身の digest と違えば書かない。final は visual の承認が先（YouTube）。AI 生成の素材に判定 ok が無ければ書かない。Claude Code の Bash（`CLAUDECODE=1`）からは実行できない。止めるのは `npm run registry -- stop --pub <id> --reason …`（stopped は戻れない終端）。後で予約し直す前提で予約だけを外すのは `npm run registry -- unschedule --pub <id> --reason …`（scheduled → uploaded_private・元の予約日時を reason に残す。YouTube 側は先に `.github/workflows/youtube-unschedule.yml` で外す。2026-10-13 に YouTube を一旦止めたときに足した）。
- 予約解除後の `uploaded_private`・予約日時なしでは、旧承認を履歴として保持する。予定が変わったため旧ハッシュの不一致は R07 の INFO にし、非公開化の記録保存を妨げない。再予約時は不一致を FAIL とし、公開・stage の最終承認ゲートも引き続き止める。
- 初回通常動画のハッシュつき承認は `registry -- publish-youtube` が今の画面・文面・素材と照らし、違えば停止する。転送用の `stage-youtube-renders-r2.mjs` も `finalApprovalGate` を通す。
- 公開済み・非公開アップロード済み動画の概要欄を改める `legacy-funnel` 同期は、新しい文面のハッシュ付き最終承認を運営者本人が記録してから実行する。古い `grandfathered` 承認は使えない。`youtube-sync-funnel.mjs` が旧/新の本文SHA、公開範囲、動画ID、承認を照合し、API更新後に読み戻す。AIは `approval.by=user` を代行記録しない。
- 検査 R07 は比較元（`--base`・CI は PR の base か直前のコミット＝`REGISTRY_BASE`）から状態が変わった行の遷移を見る。`stopped(unverified-legacy)→published` は証拠つきだけ。

## 素材の置き場

- 画像生成ツールで完成済みの画像は `npm run media -- plate --pub <公開ID> --role <役割> --prompt-file <生成指示> --input <画像パス> --commit` で画素を保持して採用する。再生成せずAI来歴と未判定の監査行を登録し、`ai-image-fidelity-auditor` の判定を `check-image-origin record-ai` で記録する。入力が欠けた場合は生成へ戻らず停止する。
- 手元 `.tmp/media/{exam}/{work}/{channel}.{format}[.{variant}]/{role}.{sha8}.{ext}` → Drive `制作物/コンテンツ/` の同じ相対パス（drive-vault の group `content-media`・`immutable`）。ブランド共通は `.tmp/media/_brand/{design}/{role}.{sha8}.{ext}`。
- `{sha8}` は中身の sha256 の先頭 8 桁。同じ名前で中身が違うことは起こらない（描き直すと別名になる）。immutable の group では上書きと `--force` を拒否する。
- 描画の作業場 `.tmp/video-render/{packId}/` は使い捨て。成果物だけを `npm run media -- promote` で取り込む。作品内の表示順を表す `scene-NNN` と複数枚の `contact-sheet-N` は役割の連番を許す。render-manifest の全場面PNGは `scene-NNN` として登録し、詳細画面の本文画像ギャラリーと visual digest の対象になる。
- パスの組み立てと分解は `scripts/lib/media-paths.mjs` だけが行う。採用 PNG として読んでよいパスの判定（`isAdoptedPngPath`）もここにあり、表紙・締め画像の読み手（`youtube-approved-cover.mjs`・`stage-youtube-covers.mjs`・`video-cta.mjs`）が使う。
- 2026-10-09 に、2026-09-09 の一括適用で日付フォルダ・連番名に置いた採用表紙 337・締め画像 113・ブランド素材 3（ロゴ・背景・Shorts の締め画像＝`_brand/bridge-notebook-a/`）を、画素を変えずにこの置き場へ移した（`npm run media -- adopt-video-brand`・DN-0607）。Shorts の公開の `media.cta` はブランド共通の素材 `brand/bridge-notebook-a/cta-shorts` を指す。旧 Shorts の 10 件（`content/sns/youtube/cover-design.json`）は台帳の ID ができる P4 で移す。
- CI が読む YouTube の転送用は private R2 の sha 名（`youtube-staging/{sha256}.mp4`）へ P3 で移す。

## YouTube の切り替え（P2・2026-10-09）

- `config/content-registry.json` の `cutover` に YouTube・Instagram・X が入り、公開状態の正本は台帳になった。YouTube の写し `.claude/state/video-content-status.json` は 2026-10-09 に削除済み（P7）。`derivatives.longform`・`derivatives.shorts` は `loadVideoState` が台帳から作る。Instagram（動画パックのリールを含む）は台帳が正本で、`instagramReel` は派生物に含めない（P5）。IG の旧パックと旧 `status.json`・`posted.json` は 2026-11-01 に撤去済み。X の旧状態ファイルは DN-0629 で撤去する。
- Instagram の新規固定カルーセルは `import-instagram --folder profile-pinned/<key> --commit` で対象1件を台帳へ入れ、`media -- plate`（POP表紙）と `media -- adopt-render`（SVGから描いた図解）で両スライドを素材IDへ結ぶ。Drive同期とAI画像監査の後、`prepare-instagram-pinned --pub <ID> --publish-at <ISO+09:00> --commit` が画像・文面・日時を照合して `qa_passed` にする。運営者本人のハッシュ付き `approve --stage final` を経て `mark-instagram-rendered --pub <ID> --commit` で予約可能にする。`publish-ig-bs` は台帳行・予定日時・現版の承認が揃わなければBusiness Suiteへ進まない。実投稿後のプロフィール固定は実表示を読み戻してから記録する。
- `import-instagram` は `--folder` を必須とし、投稿する新規作品だけを個別に追加する。一括取り込みは旧パックの再登録につながるため使わない。既存行の変更は該当する台帳の書き手で行い、旧キャンペーン計画から投稿を再開しない。
- 実体の削除を確認して `registry -- stop --reason gone` を記録すると、公開状態を `stopped(gone)`、外部側の公開範囲を `platform.privacy=gone` にする。削除済みの Instagram 行はアクティブ台帳から撤去できる。予約中の行は削除ガードを維持する。
- `verify-ig-status` と `fetch-ig-insights --reconcile` は台帳で `stopped(gone)` のパックを照合対象から外す。新しい投稿は新規公開行と素材で準備する。
- 変換は `scripts/lib/registry-video-state.mjs` だけが持つ。派生物の欄と台帳の欄は欠けなく往復し（全パックで往復するテストつき）、知らない欄は投げる。書き手が新しい欄を足すときは、型（`dataset-schemas-content.mjs`）と変換の両方に足す。
- 旧形式の書き手（`publish-video-pack.cjs`・`prepare-youtube-longforms.mts`）は `loadVideoState`（台帳だけから作る・ファイルは読まない）で読み、`saveVideoState` で台帳の行へ書く。初回通常動画の個別投稿は `registry -- publish-youtube` が公開IDの行を排他して保存する。読むだけのスクリプトと管理画面は `loadVideoState` を通す。
- 派生物の無い公開（Shorts を作る前の動画パック）は行を作らない。Shorts の行は `youtube.json` の `shorts` に鍵を決めたときにできる。台帳にだけある素の下書き（`status: draft` だけの行）は写しに出さない。
- 一括の取り込みは `npm run registry -- import-video-packs`（既定 dry-run・2 回目は書く行 0）。公開中の一覧（`youtube.own-videos`）と突き合わせ、公開中なのに published でない本数を出す。

## 初回の YouTube 通常動画を個別予約する

`npm run registry -- mark-rendered --pub <公開ID> --commit` は画面・最終承認と13場面等の完成レンダーを照合して `rendered` に進める。`npm run registry -- publish-youtube --pub <公開ID> --phase upload` は素材SHA・公開文面・承認・未来日時を検査して入力digestを出す（外部通信なし）。

投稿は手動の `youtube-single-publish.yml` に公開IDとそのdigestを渡す。GitHub Actions の YouTube API 資格情報を使い、private R2からSHA照合した動画・表紙を取得する。`upload` は専用markerとprivate R2のintentを先に記録して非公開アップロードし、結果不明なら再投稿せずチャンネル全件照合で回収する。APIの再読取は動画ID・チャンネル・文面を照合し、制作開示の `false` が応答で省略された場合だけ同値として扱う。処理後に尺・容量・映像・音声、表紙のAPI応答と再読取を確認してから `schedule` が予約し、YouTube側の公開範囲と `publishAt` の再読取後にだけ台帳を `scheduled` にする。2MBを超える承認済みPNG表紙はYouTubeの容量制限に合わせてJPEGへ圧縮して送信する。workflow は得た状態を `develop` の公開行へ書き戻す。同名タイトルを探す旧 `publish-video-pack.cjs --phase longform` は実行入口でも停止する。

Actions の checkout には `.tmp/media` がない。`publish-youtube --commit` は公開IDだけを先に確認し、private R2から動画・表紙を取得してSHAを照合した後に投稿計画と承認を検査する。ローカルの素材がある環境だけでdry-runを通しても、この順序は確認できない。

## 照合（registry-reconcile）

- 2026-10-25 に SNS の保留に合わせて、毎日の**状態更新**ワークフロー（`registry-reconcile.yml`）を CI から外した。予約→公開済みへの台帳更新は手動 `youtube-single-publish.yml` の `mode=reconcile` で行う。
- 中身は `npm run registry-reconcile`（台帳の外部 ID を `videos.list` で観測し、予約が public なら `published` へ進める。所見は `.claude/state/registry-reconcile/youtube.json`。exit 0＝照合した・1＝fail の所見・2＝検査不成立）。再開するときは新しいワークフローを作り、自動化の台帳 `config/automations.json` に読み手つきで載せる。
- 状態を書き換えない商品導線・概要欄の読取監査は、別の `youtube-funnel-audit.yml` が毎日08:20 JSTに実行する。旧動画を含む現行通常動画の本文・自社リンクのAPI差分はFAILとし、`automation-failure` Issue（channel `youtube-funnel`）に通知する。

## 検査

`npm run check-content-registry`（`ci: true`）。切り替え前のチャネル（`config/content-registry.json` の `cutover` に無いもの）は、台帳に無い動画パックを INFO、件数の不一致を WARN に留める（youtube は切り替え済みで FAIL）。

| id | 検査 |
|---|---|
| R01 | 件数（台帳全体が 0 件、または切り替え済みのチャネルが 0 件なら FAIL。型は check-datasets） |
| R02 | ID の一意と形・禁止の語・`idException` の上限 |
| R03 | 予約以上の行の削除・改名（`--base <ref>` と比べる）。Instagram の `stopped` は実体削除後のアクティブ台帳撤去を許す。予約中は保護 |
| R04 | 参照（公開→作品・作品の定義フォルダ・素材→公開・文面の鍵）と孤児。全公開が `stopped` の退役済み `legacy-short` だけ、旧定義フォルダの削除を許す |
| R05 | `video-pack.json` の `outputs` と元の公開の数の一致（`revisionOf` の改訂行は別枠。Shorts が 1 本も無いのは未作成の INFO） |
| R06 | 素材の sha と Drive 台帳（`drive-manifest.json`）の一致・置き場の名前の sha8 |
| R07 | 状態の必須欄（状態表の太字）・承認ハッシュ。遷移は比較元から変わった行だけ見る（P3） |
| R08 | 外部 ID の重複・Shorts の関連動画 |
| R09 | 欠番（写しの video-content-status.json との一致を見ていた検査。写しを 2026-10-09 に消したので廃止） |
| R10 | AI 生成の素材は AI 台帳（鍵 `media:<id>`）の判定 ok がある |
| R11 | 同資格・同アカウントの別作品IDの通常動画で、両台本の80%以上・5場面以上・200字以上が一致する並行投入を止める（承認以降・停止済みを除外）。実比較組数も出す |
| R12 | 完成動画の制作時台本hashがある素材と現行台本を比較し、古ければFAIL。hashのない旧成果物は実照合数へ数えない |
| R13 | YouTube の公開行（published・scheduled・uploaded_private・qa_passed・draft。stopped は除く）の概要欄（copy の description。改訂版は `youtube.revision-*.json`）に VOICEVOX の利用条件のクレジット（`VOICEVOX:青山龍星`）が無ければ FAIL。話者は動画の素材の来歴 `provenance.tts` から、無ければ `config/character-poses.json` の `identity.voicevoxSpeaker` から決め（表記は `scripts/lib/voicevox-credit.mjs`）、来歴の音声が VOICEVOX 以外なら対象外。copy の無い行は照合できなかった件数（INFO）として出す（2026-10-22: 2級 土工の 6 本で欠落） |

## コマンド

```bash
npm run registry -- list --channel youtube --exam civil-construction-2
npm run registry -- show civil-construction-2/matome-2kyu-chokuzen/youtube.longform
npm run registry -- import-video-pack --pack-dir content/sns/video-packs/civil-construction-2/matome-2kyu-chokuzen
npm run registry -- prepare-youtube --pub <公開ID> --publish-at <ISO日時> --commit  # 文面・予定だけ。承認は変えない
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

### 公開済み素材と未反映の改訂版

`media promote --candidate --pub <公開ID> --commit` は `{exam}/{work}/work/candidate-{role}` の作品用素材だけを upsert する。Shorts候補は `pop-image.json.candidateShortsRevision` の再現記録を検査し、`candidate-point-…-video` 等のvariant別の役割で保存する。公開行の素材参照、予定、外部ID、承認は保持する。作品詳細の「改訂版（YouTube未反映）」から確認できる。入力照合済みの通常動画の候補もR12の対象で、台本・採用画像・表紙等の変更後は再生成が必要。公開・再予約は別の実操作として扱う。

候補を個別投稿用に準備する入口は `npm run registry -- prepare-youtube-revision --pub <元の公開ID> --variant <新版名>`。既定dry-runで全候補の実ファイルSHAを確認し、表示されたdigestを `--commit --expect <digest>` へ渡すと、別公開IDのdraft行と `youtube.revision-<新版名>.json` を作る。`revisionOf` で旧公開行を参照し、旧外部ID・旧承認・旧R2キーは複製しない。素材ID・パス・SHAを入力に固定し、R12で台帳との漂流を検出する。旧行・既存入力は上書きしない。予定は明示した未来の `--publish-at` のみ、Shortsは同作品の改訂版通常動画を `--related-to` に指定する。

新版文面を別入力から指定する場合は `--copy <同作品内のJSON#fragment>` を付ける。作品ディレクトリ内の実パスだけを受け付け、参照元を新版入力の `copySource` に記録する。指定文面もdigestに含むため、dry-run後に文面を変えた場合は再検査が必要。旧公開行・旧入力は変更しない。

既定では既存の改訂入力の不一致を拒否する。未承認の `draft`・`qa_passed`・`qa_blocked` 入力を更新する場合だけ `--refresh-draft` を指定する（初回作成には使用不可）。未来の `--publish-at` 変更もこの経路で行う。QA済み行の入力を変えた場合は `draft` に戻してQAをやり直す。公開行は予定draft行と状態・予定以外が一致することを条件とし、承認・外部情報・操作記録等の追加情報がある行は拒否する。更新前JSONをSHA付きhistoryファイルへ完全保存し、dry-runのdigestにも更新前入力SHAを含める。元の公開行・元の入力は変更しない。

この準備入口はローカルの下書き作成だけで、承認・転送・投稿を行わない。`loadVideoState` は改訂行を旧投稿処理へ流さず、`publish-video-pack.cjs` はこの改訂入力には未対応。旧IDの上書きや、承認をコピーして既存経路へ通す方法は使わない。

独立した `video-content-qa` の採点後は `npm run registry -- record-youtube-revision-qa --pub <新公開ID> --avg <0〜3> --blocks <件数> --commit` で作品のQA値と改訂公開行の `qa_passed` / `qa_blocked` を記録する。これは画面・最終承認を代行しない。

改訂版の個別投稿は `npm run registry -- publish-youtube-revision --pub <新公開ID> --phase upload|schedule|verify` を使う。既定は外部通信のないローカル検査で、作品・素材ID・実ファイルSHA・制作入力・承認・予定を照合する。`--commit --expect <digest>` でのみ既存のYouTube環境変数を使用する。`upload` は承認済みの現素材と5分以上先の予定を必要とし、非公開で投入する。`schedule` は処理完了（サイズ・尺・映像/音声stream）と表紙のAPI応答/読取を確認してから指定日時を予約し、実際の状態・日時の再読取後にだけ成功を保存する。Shortsは新版通常動画へのStudio関連先確認記録と、その動画がpublic/unlistedで視聴可能であることも必要。関連先の設定・確認自体はこのコマンドでは行わない。承認生成・旧動画変更・自動配信再開は行わない。

改訂版通常動画を CI から予約する場合は、手元で `npm run registry -- stage-youtube-revision --pub <新公開ID> --commit --expect <digest>` を実行する。全候補素材のSHAを手元で照合し、YouTube API が使う MP4 と表紙の2ファイルだけを private R2 へ一時転送して読み戻す。投稿時のCIは `.tmp/media` の無い checkout へその2ファイルをSHA照合して復元し、ほかの素材は台帳・生成記録のメタデータと照合する。`youtube-single-publish.yml` に改訂版公開IDと `publish-youtube-revision` dry-run の digest を渡す。改訂版Shortsはこの workflow の対象外。

外部操作前に新公開行の `delivery` へ入力digest・一意なmarker・開始記録を保存し、応答を受けた新YouTube IDを即記録する。応答消失時は `--phase verify` のローカル検査でdigestを確認し、`--commit --expect <digest>` で外部の読取とローカルへの結果保存だけを行う。アップロードの結果は所有チャンネル全件からmarkerで一意に照合し、題名一致では採用しない。0件・複数件、表紙応答不明、予約未反映は再送しない。API応答が失われても実際の予約が要求日時と一致すれば、verifyで記録を確定できる。入力変更・処理失敗・未解決の結果は停止し、開始記録や外部IDを消して再投入しない。

台帳保存は専用lock、並行変更の検出、一時ファイルの同期とatomic置換を使う。残存lockを自動回収せず、他の書き手の変更を検知した場合も停止する。照合はAPIが返した情報の範囲であり、表紙URL一致は画像の目視・YouTubeプレイヤー確認・全編試聴の代用にはならない。制作担当が個別実行前に検査結果を読み、必要な品質確認と現素材の承認が済んでから実行する。
