---
title: 通常動画の量産工程
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

`fix-script` は内容QAの不合格、`images-exhausted` は作り直しの上限、`review-failed` は画面確認の fail で、どれも人が見る。

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
- 画像の基準、AI 画像の判定、完成動画の照合、内容QA（平均 2 以上・BLOCK 0）、今の digest の画面確認 pass
- `check-youtube-funnels --pub`（商品リンクと関連サイト記事の導線）。予約後の監査で初めて落ちる事故を防ぐ
- 音声の照合（文字起こしと台本の一致、音量、尺。動画の sha に結ぶ）
- 公開まで 24 時間以上ある。人が止める猶予として残す

音声の照合で分かるのは発話の欠落・崩れ・音量・尺までで、1 語の読み間違いは分からない。方針の承認は `approval.by: 'policy'` で記録し、受け付けるのは YouTube の通常動画だけ（`acceptedApproval`）。他のチャネルは運営者の承認のまま。トークンを節約するため、機械の検査を先に通し、LLM は内容QAと画面確認だけに使う。白書の数値の照合が要る動画は `notebooklm-cross-query.mjs` で引く。

## 手で回す

```bash
npm run video-factory -- plan --pack <資格>/<作品>
npm run video-factory -- generate --pack <資格>/<作品>
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
```

表紙だけ作り直すときは `plan` に `--scope cover` を付ける。作業の記録は `.tmp/media/<資格>/<作品>/work/factory/plan.json`。

## Workflow で回す

Workflow `video-factory` に `{ root, packs: [{ pack, scope }], commit: true }` を渡す。工程は同じで、画像の並行は 2 本まで、描画と台帳の書き込みは直列。止まったパックは理由を返し、他のパックは進む。

いきなり全件を流さない。3〜5 本で通してから広げる。1 本で 12 枚前後を生成するので、Codex の利用枠も確かめる。

## 罠

- 予約の検査に要る `channel`・`r2Key`・`thumbnailR2Key` は `wire` が入れる。手で足さない（2026-11-05）。
- 予約後に概要欄を直すと digest が変わり、承認が無効になる。承認の前に関門で導線を見る（2026-11-05）。
- `registry-reconcile` は公開範囲だけを見て、予約日時は比べない。日時の実体は `mode=audit-funnel` で読み戻す（2026-11-05）。
- `codex exec` は標準入力を閉じないと入力を待って止まる（2026-11-04）。`spawnCodex` は閉じている。
- 表紙だけ作り直すときの本文の画像は Drive にしか無い。`render` が先に揃える（2026-11-04）。
- 原稿を変えると、その場面の図の判定は無効になる。語句の修正でも図の作り直しと再監査が要る（`popSceneHash` が narration を含む）。
- 初回の実地では 13 枚中 8 枚が 1 回目の監査で ok だった。生成枚数は監査の不合格の分だけ増える（2026-11-04）。
- sharp の `stats()` は加工前の入力を見る。切り出した範囲を測るときは一度バイト列にする（2026-11-04）。
