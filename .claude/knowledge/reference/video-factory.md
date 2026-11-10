---
title: 動画の量産工程（通常動画・ショート）
---

# 通常動画の量産工程

動画パックの台本ができたあと、画像・動画・確認・関門・予約までを同じ手順で回す。入口は `npm run video-factory`、まとめて回すときは Workflow `video-factory`。通常動画は関門を通れば人の承認なしで予約する（運営者の判断 2026-11-05・`config/video-auto-publish.json`）。`stop` は運営者だけ。

## 今どの工程か

`npm run video-factory -- status` が全パックの次の工程を出す。推測せずここから始める。状態は台帳と実ファイルから毎回作るので、別の台帳は持たない。

| 工程 | やること | 担当 |
|---|---|---|
| plan | 原稿から生成指示を作る | スクリプト |
| generate | 画像を作る。比率と字幕の帯は機械で検査する | Codex |
| audit | 1 枚ずつ、原稿と文字を照合する | `ai-image-fidelity-auditor` |
| adopt | 全項目が ok なら採用する | スクリプト |
| render | 音声・動画を作り、照合して台帳へ取り込む | スクリプト |
| qa | 6 軸で採点する | `video-content-qa` |
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
npm run video-factory -- record-qa --pack <資格>/<作品> --avg <平均> --blocks <件数>
npm run video-factory -- commit --pack <資格>/<作品>
npm run video-factory -- audio-check --pack <資格>/<作品>
npm run video-factory -- wire --pack <資格>/<作品>
npm run video-factory -- gate --pack <資格>/<作品>
npm run video-factory -- auto-approve --pack <資格>/<作品>
npm run video-factory -- unapprove --pack <資格>/<作品>   # slot-expired の行の承認を外す（次に wire）
```

表紙だけ作り直すときは `plan` に `--scope cover` を付ける。作業の記録は `.tmp/media/<資格>/<作品>/work/factory/plan.json`。

## Workflow で回す

Workflow `video-factory` に `{ root, packs: [{ pack, scope, rendered }] }` を渡す。`rendered: true` は制作済みの動画で、画像と描画を飛ばす。`from: "audit"` と `from: "review"` はその段から再開し、内容QAは飛ばす。内容QAは画像の生成より前に行い、BLOCK ならそこで止める（描画のあとに止まると画像の費用が無駄になる）。工程は同じで、画像の並行は 2 本まで、描画と台帳の書き込みは直列。止まったパックは理由を返し、他のパックは進む。最後の `finish` が音声照合・関門・コミットを回す。

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
- 台本の監査は台本の中身の sha に付く。語りや図の指示を変えると `plan` が止まる。
- 判定は通常動画と同じく画像の sha に付き、画面確認と音声の検査は動画の sha に付く。描き直すと全部やり直す。
- `stock` はクラウドの照合が通ってから手元の画像と動画を消す。確認用の一覧は `.tmp/shorts-stock/` に残す。在庫の判断材料はこの一覧で見る。
- 予約は別の判断。`restore` は `youtube-shorts:stage` が自動で行う分と同じで、手動の確認に使う。
- 再開する公開行は `check-youtube-shorts` が `pop-poster-v3`・描画の記録・画面確認の pass を要求する。停止中の行は数えるだけで検査しない。
- 投稿は既存の `youtube-shorts:stage` と `publish-video-pack`。ショートの投稿の CI はまだ無く、手元に YouTube の認証情報も無い。方針の自動承認の対象は通常動画だけで、ショートは運営者が承認する。
- 2級土木は `diagram-led` を優先するので対象外。Instagram リールの描画はまだこの工程に載っていない。

## 罠

- `wire` の空き枠は年間計画の週の上限を守り、計画の目標日より前に置かない。在庫を前倒しするときは計画の枠と目標日を先に直す（2026-11-06）。

- 予約の検査に要る `channel`・`r2Key`・`thumbnailR2Key` は `wire` が入れる。手で足さない（2026-11-05）。
- 予約後に概要欄を直すと digest が変わり、承認が無効になる。承認の前に関門で導線を見る（2026-11-05）。
- `whisper-cli` に全編を渡すと途中を飛ばす。`-mc 0` でも安定しない。一定秒数で切っても文の途中で飛ぶので、文の間で 12 秒以上ごとに切る（2026-11-05 に 0.62 の誤判定を確認。実際は 0.8 台）。
- `youtube-single-publish.yml` の同時実行グループは待機を 1 本しか持たない。まとめて流すと途中が取り消されるので `publish` は 1 本ずつ待つ（2026-11-05）。
- YouTube API は投稿 1 本 1,600 ユニット・日次 10,000。`publish` は太平洋時間の 0 時からの投稿を数え、1 日 4 本までに止める。割当の超過は結果不明になり再送できない（2026-11-05）。
- エージェントの `npm run` はセッションの場所で動く。worktree で回すときは `( cd <root> && … )` を指示しないと、判定がメインのチェックアウトへ書かれる（2026-11-05）。
- 件数をモデルに申告させない。監査で 2 枚の不合格を 0 件と返した例がある。判定の中身から数える（2026-11-05）。
- 改訂版の `wire` は `--refresh-draft` で日時を変え、文面と素材が同じなので同じ QA を記録し直す（2026-11-05）。
- `wire` は `youtube.json` が無ければ描画の実体から作る。主 CTA が `links-hub`・`site-article` のパックは導線の検査で止まるので、商品を決めてから流す（2026-11-05）。
- `registry-reconcile` は公開範囲だけを見て、予約日時は比べない。日時の実体は `mode=audit-funnel` で読み戻す（2026-11-05）。
- `codex exec` は標準入力を閉じないと入力を待って止まる（2026-11-04）。`spawnCodex` は閉じている。
- 表紙だけ作り直すときの本文の画像は Drive にしか無い。`render` が先に揃える（2026-11-04）。
- 原稿を変えると、その場面の図の判定は無効になる。語句の修正でも図の作り直しと再監査が要る（`popSceneHash` が narration を含む）。
- 初回の実地では 13 枚中 8 枚が 1 回目の監査で ok だった。生成枚数は監査の不合格の分だけ増える（2026-11-04）。
- sharp の `stats()` は加工前の入力を見る。切り出した範囲を測るときは一度バイト列にする（2026-11-04）。
