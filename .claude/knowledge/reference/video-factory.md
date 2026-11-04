---
title: 通常動画の量産工程
---

# 通常動画の量産工程

動画パックの台本ができたあと、画像・動画・確認までを同じ手順で回す。入口は `npm run video-factory`、まとめて回すときは Workflow `video-factory`。承認・予約・公開は運営者の仕事で、この工程には入れない。

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
| ready-for-approval | 承認する | 運営者 |

`fix-script` は内容QAの不合格、`images-exhausted` は作り直しの上限、`review-failed` は画面確認の fail で、どれも人が見る。

## 品質の守り方

- **作る側と判定する側を分ける**。監査には作った側の説明を渡さず、原稿と指示だけを渡す。
- **判定は画像の sha に付ける**。ok の後に画像が変わると判定は無効で、`adopt` は止まる。
- **原稿が変わったら作り直す**。`plan` は原稿が同じ項目だけ生成済みを引き継ぐ。
- **fail は理由を次の指示へ渡す**。1 項目 3 回までで、上限に達したら通さずに残す。
- **基準を満たさない採用は残さない**。`adopt` は最後に予約と同じ検査（`requirePopDiagramStandard`）を走らせ、落ちたら書き戻す。
- **検査ゼロを合格にしない**。`status` は対象数と判定数を出し、対象 0 件は exit 2。

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
```

表紙だけ作り直すときは `plan` に `--scope cover` を付ける。作業の記録は `.tmp/media/<資格>/<作品>/work/factory/plan.json`。

## Workflow で回す

Workflow `video-factory` に `{ root, packs: [{ pack, scope }], commit: true }` を渡す。工程は同じで、画像の並行は 2 本まで、描画と台帳の書き込みは直列。止まったパックは理由を返し、他のパックは進む。

いきなり全件を流さない。3〜5 本で通してから広げる。1 本で 12 枚前後を生成するので、Codex の利用枠も確かめる。

## 罠

- `codex exec` は標準入力を閉じないと入力を待って止まる（2026-11-04）。`spawnCodex` は閉じている。
- sharp の `stats()` は加工前の入力を見る。切り出した範囲を測るときは一度バイト列にする（2026-11-04）。
