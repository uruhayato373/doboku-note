# YouTube チャネル

このディレクトリは YouTube 派生物（Shorts の `meta.json` 等）の置き場。**現在ローカルに実体が無いのは正常**で、投稿済み Shorts のバイナリ（mp4/サムネ）は R2 へ退避済み（[sns-archive-policy](../../../.claude/knowledge/reference/sns-archive-policy.md)）。

## どこで管理するか

| 見たいもの | 場所 |
|---|---|
| 動画の企画（通常動画の企画バンク） | [`content/sns/video-packs/`](/content/content~sns/video-packs/README) — 一覧 README は `npm run build-video-pack-index` で再生成 |
| Shorts 投稿台帳（公開済み・pending・予約） | `.claude/state/youtube-schedule.json` — 管理画面は [SNS状態板](/sns) |
| 通常動画の制作状態（draft→qa→公開） | `.claude/state/video-content-status.json` |
| 公開実体の照合 | `npm run verify-yt-status` |

## 再びファイルが増えるとき

- Shorts 派生を新規生成すると `content/sns/youtube/<date>-<pack-id>/`（meta.json のみ Git・mp4 は R2）が作られる
- 通常動画（DN-0110）のレンダリング成果物は Git に置かず `.tmp/video-render/` → R2

真実源: [yt-shorts-publisher-policy](../../../.claude/knowledge/reference/yt-shorts-publisher-policy.md)（Shorts）／[video-content-policy](../../../.claude/knowledge/reference/video-content-policy.md)（動画パック）
