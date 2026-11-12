---
title: 動画の量産工程（通常動画・ショート）
---

# 通常動画の量産工程

動画パックの台本ができたあと、画像・動画・確認・関門・予約までを同じ手順で回す。入口は `npm run video-factory`、まとめて回すときは Workflow `video-factory`。通常動画は関門を通れば人の承認なしで予約する（運営者の判断 2026-11-05・`config/video-auto-publish.json`）。`stop` は運営者だけ。

## 今どの工程か

`npm run video-factory -- status` が全パックの次の工程を出す。推測せずここから始める。末尾には、パックがまだ無い企画（台本待ち）と内容QAで止まった行を、確認期限の近い順に出す（`--all` で全部。期限超過は `check-youtube-plan --due` が週次で赤にする・DN-1069）。状態は台帳と実ファイルから毎回作るので、別の台帳は持たない。

| 工程 | やること | 担当 |
|---|---|---|
| qa | 台本を 6 軸で採点し `record-qa --file` で記録する。合格は原稿の digest に付き、原稿を直すと古くなる（`qa-check` が見る・DN-1067） | `video-content-qa` |
| plan | 原稿から生成指示を作る | スクリプト |
| generate | 画像を作る。比率と字幕の帯（字幕が載る下端 13%。生成の指示は 18% を空けさせる）は機械で検査する | Codex |
| audit | 1 枚ずつ、原稿と文字を照合する | `ai-image-fidelity-auditor` |
| adopt | 全項目が ok なら採用する | スクリプト |
| render | 音声・動画を作り、照合して台帳へ取り込む | スクリプト |
| review | 画面と文面を確認して pass か fail を記録する | `video-review` |
| ready-for-approval | 音声を照合し、関門を通ったら方針の承認を書く | スクリプト |
| 予約 | R2 へ転送し `youtube-single-publish.yml` で予約する | スクリプト |

`unregistered` は台本はあるが台帳に公開行が無いパックで、`npm run registry -- import-video-pack --pack-dir <パック> --commit` で載せ、年間計画の行に `publicationId` を結ぶ。`publish-pending` は承認したが予約の段（`publish`）へ進んでいない行で、`publish` を回す。`slot-expired` は公開日時まで 24 時間を切った（または過ぎた）未予約の行で、`unapprove` で承認を外し、`wire` で日時を付け直してから関門・承認・予約をやり直す（承認しただけの行は棚卸しで予約済みに数えない・DN-1066）。`fix-script` は内容QAの不合格、`images-exhausted` は作り直しの上限、`generate-stalled` は同じ項目で画像が出ない試行が続いたもの、`review-failed` は画面確認の fail で、どれも人が見る。`status` は止まった項目の理由も出す。原稿を変えずにやり直すときは `plan --retry <項目 id|all>` で回数と理由を戻す。画像が出なかった試行は作り直しの回数に数えず、試した全項目で出なければ `generate` は exit 2（検査不成立）で止まる（生成の経路を確かめて同じコマンドを打ち直す・DN-1065）。

## 品質の守り方

- **作る側と判定する側を分ける**。監査には作った側の説明を渡さず、原稿と指示だけを渡す。
- **判定は画像の sha に付ける**。ok の後に画像が変わると判定は無効で、`adopt` は止まる。
- **原稿が変わったら作り直す**。`plan` は原稿が同じ項目だけ生成済みを引き継ぐ。
- **fail は理由を次の指示へ渡す**。1 項目 3 回までで、上限に達したら通さずに残す。
- **基準を満たさない採用は残さない**。`adopt` は最後に予約と同じ検査（`requirePopDiagramStandard`）を走らせ、落ちたら書き戻す。
- **検査ゼロを合格にしない**。`status` は対象数と判定数を出し、対象 0 件は exit 2。

## 関門

`gate` は次の全項目を機械で確かめる。1 つでも欠けると `auto-approve` は書かない。

- 方針が有効で、YouTube の通常動画である
- 年間の枠に入っている（`config/channel-annual-plan.json`。計画にない動画は在庫にもしない）。枠の立ち位置と材料は `npm run competitor-position -- --slot <枠 id>`
- 画像の基準、AI 画像の判定、完成動画の照合、内容QA（平均 2 以上・BLOCK 0）、今の digest の画面確認 pass
- `check-youtube-funnels --pub`（商品リンクと関連サイト記事の導線）。予約後の監査で初めて落ちる事故を防ぐ
- 音声の照合（文字起こしと台本の一致、音量、尺。動画の sha に結ぶ）
- 公開まで 24 時間以上ある。人が止める猶予として残す

音声の照合は、台本と文字起こしを VOICEVOX の読み仮名で比べる。表記で比べると `whisper` の同音の誤変換（圧密→厚密）で正常な音声が落ち、`II-1` を「アイアイ」と読む誤りも見逃す（2026-11-06）。基準は 0.85。公開までの 24 時間で運営者が抜き打ちで聞く。方針の承認は `approval.by: 'policy'` で記録し、受け付けるのは YouTube の通常動画だけ（`acceptedApproval`）。他のチャネルは運営者の承認のまま。トークンを節約するため、機械の検査を先に通し、LLM は内容QAと画面確認だけに使う。白書の数値の照合が要る動画は `notebooklm-cross-query.mjs` で引く。

## 手で回す

```bash
npm run video-factory -- plan --pack <資格>/<作品>
npm run video-factory -- generate --pack <資格>/<作品>
npm run video-factory -- plan --pack <資格>/<作品> --retry <項目 id|all>   # 上限・停止の項目を原稿を変えずにやり直す
npm run video-factory -- audit-queue --pack <資格>/<作品>
npm run video-factory -- record-audit --pack <資格>/<作品> --file <判定の JSON> --by ai-image-fidelity-auditor
npm run video-factory -- adopt --pack <資格>/<作品>
npm run video-factory -- render --pack <資格>/<作品>
npm run video-factory -- ledger --pack <資格>/<作品>
npm run video-factory -- record-qa --pack <資格>/<作品> --file <採点 JSON>   # { scores: { 軸: 0〜3 }, blocks: [理由…] }
npm run video-factory -- qa-check --pack <資格>/<作品>   # 台帳の QA が今の原稿で合格なら exit 0
npm run video-factory -- preflight --pack <資格>/<作品>  # 画像の前に公開行・年間の枠・主CTA・表紙の設計を見る（Workflow の最初の段・DN-1068）
npm run video-factory -- save --pack <資格>/<作品>       # 止まったパックの台帳と原稿の変更を commit（Workflow の最後。push は親）
npm run video-factory -- commit --pack <資格>/<作品>
npm run video-factory -- audio-check --pack <資格>/<作品>
npm run video-factory -- wire --pack <資格>/<作品>
npm run video-factory -- gate --pack <資格>/<作品>
npm run video-factory -- auto-approve --pack <資格>/<作品>
npm run video-factory -- unapprove --pack <資格>/<作品>   # slot-expired の行の承認を外す（次に wire）
```

表紙だけ作り直すときは `plan` に `--scope cover` を付ける。作業の記録は `.tmp/media/<資格>/<作品>/work/factory/plan.json`。

## Workflow で回す

Workflow `video-factory` に `{ root, packs: [{ pack, scope, rendered }] }` を渡す。`rendered: true` は制作済みの動画で、画像と描画を飛ばす。`from: "audit"` と `from: "review"` はその段から再開し、内容QAは飛ばす。台帳の QA が今の原稿で合格なら（`qa-check`）、別の PC で採点済みでも採点し直さない。内容QAは画像の生成より前に行い、BLOCK ならそこで止める（描画のあとに止まると画像の費用が無駄になる）。工程は同じで、画像の並行は 2 本まで、描画と台帳の書き込みは直列。止まったパックは理由を返し、他のパックは進む。最後の `finish` が音声照合・関門・コミットを回す。

通ったパックは親が予約する。Workflow の中では外へ出さない。

```bash
node --env-file=<.env.local> scripts/video-factory.mjs publish --packs <a,b>
node --env-file=<.env.local> scripts/video-factory.mjs cleanup --packs <a,b>  # audit-funnel で実体を確かめたあと
```

在庫にするときは Workflow へ `stock: true` を渡す。関門を検査してコミットするところで止まり、承認も公開日時も書かない。予約するときに次を実行する。画面確認の判定は公開日時に左右されないので、やり直しは要らない。

```bash
node scripts/video-factory.mjs schedule --packs <a,b>
node --env-file=<.env.local> scripts/video-factory.mjs publish --packs <a,b>
```

トークンの大半は代理エージェントの起動にかかる（2026-11-05 の実測: 13 体で約 100 万・1 体約 8 万）。機械の工程は `produce`・`finish` のようにコマンド 1 本へまとめ、代理を増やさない。判定の記録は監査役・QA 役が自分で行う。1 本で 12 枚前後を生成するので、Codex の利用枠も確かめる。

## 生成ルールの正本

先生の特徴、画風、媒体別の安全域、文字の禁止事項、参照画像、生成経路の一覧は `config/image-generation.json` にあり、通常動画とショートの生成指示はここから組み立てる。資格の色は `note-cover-tokens.json`。工程のコードへ文面を書き足さない（`npm run check-image-rules`）。

## ショートの工程

ショートは通常動画とは別に、`npm run shorts-factory` で作る。入口は `shorts-design.json`（論点の分割）で、`beats` の語りをつなぐと承認済みの台本の場面に一致しないと止まる。導入の `hook` だけが足せる語り。画面は表紙・論点ごとの図解・締めの全面画像で、尺は 20〜60 秒。

ショートの型と、表紙・題名・冒頭のコピーで使ってよい線は `config/youtube-shorts-formats.json` が正本（2026-11-11・運営者の決定）。通常動画は検索で来た人に答えを出し、ショートは見つけてもらって本編へ送る入口という役割の分担もここにある。型は「誤解を壊す・1 問で確かめる・ビフォーアフター・N 点チェック・結論の一言」の 5 つで、枠ごとに使う型は年間計画の `slots[].shorts.types`。`shorts-design.json` の各ショートは `type` と、使ったコピーの技法 `copy`（断言・損失回避・奇数の法則・バンドワゴン・バーナム。2 つまで）を書く。語りはショート用に書き直してよく、そのときは `sources` に台本の場面 id を挙げ、事実はその場面の中だけにする。締めの語りは本編で何が分かるかを言う（`本編` を含む）。表紙は型ごとの見出しの形と図（`types[].cover`）で作り、締めの画面の文字は締めの語りに合わせる。同じ枠のショートで、冒頭の形（`hookForms`）・コピーの技法・先生の仕草（`gestures` から各ショートが `gesture` で選ぶ）はそれぞれ半分を超えて同じにしない。ショートの表紙には ✕ などの記号を足さず、肩書きの帯（総監が制作など）も入れない（肩書きは概要欄の制作表記・通常動画の表紙は従来どおり）。`record-script-qa` と `plan` がこの型と偏りを機械で検査し、`yt-shorts-publisher-qa` が型・コピーの線・書き直しの出典・2 秒で止まるか・単体の価値・本編への引きを見る。

ショートは通常動画の展開に合わせて作る（2026-11-10・運営者の決定）。在庫までは親が `stockParentStatus`（内容QAの合格以降）に進めば作ってよく、公開は親が予約・公開に進んでから（2026-11-11）。決まりは `config/channel-annual-plan.json` の `shortsRule` にあり、`plan` の関門と `check-youtube-plan` が同じ判定（`shortsSlotFill`）で止める。
- 親の通常動画（改訂版を含む）が公開済みか予約済みになってから作る
- 通常動画 1 本につき `perLongform` 本まで。枠に `shorts` の割り当てがある親は枠の上限、割り当ての無い公開済みの親は `trial.max` の合計まで
- 上限は `trial.reviewAt` と、通常動画の計画の見直しのときに一緒に見直す

表紙の見出し（`headline`・1〜3 行）と締めの語り（`cta`・6〜20 字）は `shorts-design.json` に書ける。書いたときは `cover-design.json`・`cta-design.json` を読まず、採用（`adopt`）でも書き換えない。この 2 つは通常動画の入力ハッシュに入るので、公開済みの通常動画から派生させるショートでは必ず台本側に書く。

```bash
npm run shorts-factory -- status --exam <資格>                         # 全本の工程の位置
npm run shorts-factory -- record-script-qa --pack <資格>/<作品> --key <key> --verdict pass --by yt-shorts-publisher-qa --reason "…"
npm run shorts-factory -- plan --pack <資格>/<作品> --key <key>
npm run shorts-factory -- generate --pack <資格>/<作品> --key <key>
npm run shorts-factory -- audit-queue --pack <資格>/<作品> --key <key>   # ai-image-fidelity-auditor へ渡す
npm run shorts-factory -- record-audit --pack <資格>/<作品> --key <key> --file <判定の JSON> --by ai-image-fidelity-auditor
npm run shorts-factory -- adopt --pack <資格>/<作品> --key <key>
npm run shorts-factory -- render --pack <資格>/<作品> --key <key>
npm run shorts-factory -- record-review --pack <資格>/<作品> --key <key> --verdict pass --by yt-shorts-publisher-qa --reason "…"
npm run shorts-factory -- audio-check --pack <資格>/<作品> --key <key>
npm run shorts-factory -- stock --pack <資格>/<作品> --key <key>         # Drive へ入れ、クラウド照合の後に手元を消す
npm run shorts-factory -- restore --pack <資格>/<作品> --key <key>       # 在庫を手元へ戻して sha を照合する
```

- 下端の無地帯、9:16 以外、解像度不足は生成の時点で落ちる（`inspectShortImage`）。
- 本文の画面は、ラベル・見出し・図を収める範囲（左から 8%〜80%・上から 8%〜64%）を `config/image-generation.json` の `formats.shorts.bodyFrame` で最初から指示する。字幕（下 32%）と右端の操作ボタンの外に収めるためで、作り直しの指示で後から足すと縦横比や絵柄が崩れた（2026-11-10・1 枚に 7 回）。
- 上限（3 回）に達した項目は `plan --retry <項目 id,…|all>` で回数を戻す。`plan` を作り直すと、合格済みの画像は引き継ぎ、生成の指示は今の決まりから組み直す。
- 台本の監査は台本の中身の sha に付く。語りや図の指示を変えると `plan` が止まる。
- 判定は通常動画と同じく画像の sha に付き、画面確認と音声の検査は動画の sha に付く。描き直すと全部やり直す。
- `stock` はクラウドの照合が通ってから手元の画像と動画を消す。確認用の一覧は `.tmp/shorts-stock/` に残す。在庫の判断材料はこの一覧で見る。
- 予約は別の判断。`restore` は `youtube-shorts:stage` が自動で行う分と同じで、手動の確認に使う。
- 再開する公開行は `check-youtube-shorts` が `pop-poster-v3`・描画の記録・画面確認の pass を要求する。停止中の行は数えるだけで検査しない。
- 投稿と予約は通常動画と同じ CI（youtube-single-publish の mode=publish）で行う（2026-11-11・DN-1002）。2026-11-12 からショートも方針で承認する（`config/video-auto-publish.json` の `shorts.autoApprove`・`npm run registry -- auto-approve-short` が prepare-short の判定と表紙の画像の判定を通し直して書く）。ふだんは次の「毎日の予約」が下の順番をまとめて回す。順番は次のとおり。
  1. `npm run registry -- prepare-short --pub <ショートの公開 ID> --publish-at <時差つきの日時> --commit` — 在庫の素材（動画・表紙・画面の一覧・字幕）を台帳に結び、関連動画（同じ作品の予約済みか公開済みの通常動画・改訂版を含む）と公開日時を入れる。日時は親の公開より後・24 時間以上先・同時刻なし・1 日 3 本まで
  2. `npm run registry -- auto-approve-short --pub …`（運営者が承認するときは `approve --stage visual` → `--stage final`。表紙の画像の判定は shorts-factory の監査を写してある）
  3. `npm run shorts-factory -- restore` で手元に戻し、`npm run registry -- stage-youtube --pub … --commit` で CI へ渡す R2 に置く。`npm run registry -- publish-youtube --pub … --phase upload` の digest を `expect` にして publish を流すと、非公開でアップロードして止まる
  4. 運営者が Studio でショートの関連動画に親の通常動画を設定し、`npm run registry -- record-related --pub … --video-id <親の動画 ID>` で記録する（API では設定できない。親が公開されてから）
  5. もう一度 publish を流すと予約する
- 2級土木は `diagram-led` を優先するので対象外。Instagram リールの描画はまだこの工程に載っていない。

## 毎日の予約

在庫を前倒しで出す（2026-11-12・運営者の決定）。通常動画は 1 日 2 本（12:15・20:30）、ショートは 1 日 2 本（7:30・17:30）、合わせて 1 日 4 本まで。時刻と本数は `config/video-auto-publish.json`（`slot`・`shorts`・`maxPublishPerDay`）、前倒しの期間は `config/channel-annual-plan.json` の `cycle.frontLoad`（この間は枠の時期を問わず、週の上限を `weeklyMax` にする）。

```bash
npm run youtube-daily -- queue   # 今日の作業（通常動画・ショートの候補、関連動画の設定待ち、予約待ち）。書かない
npm run youtube-daily -- run     # 関連動画を記録したショートの予約 → 通常動画の予約 → ショートの非公開の投稿
```

- 毎晩、親の 20:30 の公開の後に回す。先に `queue` の `needRelated` を Studio で設定し（ショートの編集画面の「関連動画」で親を選んで保存し、画面を読み直して親が出ていることを確かめる）、`npm run registry -- record-related --pub … --video-id <親の動画 ID>` で記録してから `run` を流す。
- 投稿は太平洋時間の 1 日の割当（`maxUploadsPerDay` 4 本）の範囲。`uploadPriority: longform`（2026-11-12 の決定）の間は、在庫の通常動画が尽きるまで割当を全部通常動画に使い、先の日付の予約を早く埋める（公開は 1 日 2 本のまま）。ショートの投稿はその後に回る。ショートの在庫がある作品の通常動画を先に出す。
- ショートの公開は親の公開の 10 時間後以降の枠（`SHORT_AFTER_PARENT_HOURS`）。親が公開されてから、その夜の実行で関連動画を設定して予約できる間を空ける。
- `run` は develop へ commit・push する。他のセッションと作業ツリーを共有しない専用の worktree で回す（未コミットの変更があると止まる）。
- `expired` は関連動画を設定できないまま公開日時を過ぎたショート。日時を付け直す。
- 前倒しの間は、前倒しより前に承認して未投稿の通常動画（`toReplace`）の承認を `run` が外し、空き枠から日時を付け直して同じ流れに乗せる（承認は予約の前に関門で書き直す）。改訂版（diagram-led）は DN-0670 の判断待ちで対象外。

## 罠

- 会社の Windows PC では画像の工程が通らない（2026-11-10）。参照画像は Drive の `制作物/コンテンツ/` にあり、Google ドライブのアプリが起動していないと `plan` が「参照画像が無い」で止まる。Codex はプロキシを越えて届くが、`~/.codex/config.toml` の既定のモデル（`gpt-6.1-sol`）は ChatGPT アカウントでは使えず、画像が出ない（`generate` は回数を使わず exit 2）。会社 PC は台本・QA・台帳まで、画像から先は Mac で回す。
- `wire` の空き枠は年間計画の週の上限を守り、計画の目標日より前に置かない。在庫を前倒しするときは `cycle.frontLoad` に期間を書く（この間は目標日を待たない・2026-11-06、2026-11-12）。

- 予約の検査に要る `channel`・`r2Key`・`thumbnailR2Key` は `wire` が入れる。手で足さない（2026-11-05）。
- 予約後に概要欄を直すと digest が変わり、承認が無効になる。承認の前に関門で導線を見る（2026-11-05）。
- `whisper-cli` に全編を渡すと途中を飛ばす。`-mc 0` でも安定しない。一定秒数で切っても文の途中で飛ぶので、文の間で 12 秒以上ごとに切る（2026-11-05 に 0.62 の誤判定を確認。実際は 0.8 台）。
- `youtube-single-publish.yml` の同時実行グループは待機を 1 本しか持たない。まとめて流すと途中が取り消されるので `publish` は 1 本ずつ待つ（2026-11-05）。
- YouTube API は投稿 1 本 1,600 ユニット・日次 10,000。`publish` は太平洋時間の 0 時からの投稿を数え、1 日 4 本までに止める。割当の超過は結果不明になり再送できない（2026-11-05）。
- エージェントの `npm run` はセッションの場所で動く。worktree で回すときは `( cd <root> && … )` を指示しないと、判定がメインのチェックアウトへ書かれる（2026-11-05）。
- 件数をモデルに申告させない。監査で 2 枚の不合格を 0 件と返した例がある。判定の中身から数える（2026-11-05）。
- 改訂版の `wire` は `--refresh-draft` で日時を変え、文面と素材が同じなので同じ QA を記録し直す（2026-11-05）。
- `wire` は `youtube.json` が無ければ描画の実体から作る。主 CTA が `links-hub` のパックは新規公開の導線の検査で止まるので、商品か関連記事を決めてから流す（2026-11-05）。`site-article` は集客の枠の主 CTA として通り、概要欄の先頭のリンクが `targetPath` の公開 URL であることを検査する（targetPath はリポジトリのパスで、`siteArticleUrl` が公開 URL に直す・2026-11-10）。
- `registry-reconcile` は公開範囲だけを見て、予約日時は比べない。日時の実体は `mode=audit-funnel` で読み戻す（2026-11-05）。
- `codex exec` は標準入力を閉じないと入力を待って止まる（2026-11-04）。`spawnCodex` は閉じている。
- 表紙だけ作り直すときの本文の画像は Drive にしか無い。`render` が先に揃える（2026-11-04）。
- 原稿を変えると、その場面の図の判定は無効になる。語句の修正でも図の作り直しと再監査が要る（`popSceneHash` が narration を含む）。
- 初回の実地では 13 枚中 8 枚が 1 回目の監査で ok だった。生成枚数は監査の不合格の分だけ増える（2026-11-04）。
- sharp の `stats()` は加工前の入力を見る。切り出した範囲を測るときは一度バイト列にする（2026-11-04）。
