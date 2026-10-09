# YouTube チャネル

このディレクトリは YouTube 派生物（Shorts の `meta.json` 等）の置き場。**現在ローカルに実体が無いのは正常**で、投稿済み Shorts のバイナリ（mp4/サムネ）は R2 へ退避済み（[sns-archive-policy](../../../.claude/knowledge/reference/sns-archive-policy.md)）。

## どこで管理するか

| 見たいもの | 場所 |
|---|---|
| 動画の企画（通常動画の企画バンク） | 管理画面の**動画パック ボード** `/content/video`（資格・段階で絞り込み）。ファイル実体は [`content/sns/video-packs/`](/content/content~sns/video-packs/README)、一覧 README は `npm run build-video-pack-index` で再生成 |
| 全チャネルの企画→下書き→公開の横断 | 管理画面の**ライフサイクル** `/content/lifecycle`（真実源 `.claude/knowledge/reference/content-lifecycle.md`） |
| 旧 Shorts 投稿台帳（公開済み・予約・停止） | コンテンツ台帳 `content/registry/`（作品の kind が `legacy-short`）が正本。2026-10-09 に旧台帳 `youtube-schedule.json` と旧スクリプトを消した。管理画面は [SNS状態板](/sns) |
| 通常動画・Shorts の制作と公開の状態（draft→qa→公開） | コンテンツ台帳 `content/registry/publications/youtube/{exam}.json`（写しの video-content-status.json は 2026-10-09 に消えた。読み手は `loadVideoState`。[content-registry.md](../../../.claude/knowledge/reference/content-registry.md)） |
| 公開実体の照合 | 台帳の予約→公開は `registry-reconcile`（毎日）・動画パックの実体は `npm run check-video-publication` |

## 再びファイルが増えるとき

- Shorts 派生を新規生成すると `content/sns/youtube/<date>-<pack-id>/`（meta.json のみ Git・mp4 は R2）が作られる
- 通常動画（DN-0110）のレンダリング成果物は Git に置かず `.tmp/video-render/` → R2

真実源: [yt-shorts-publisher-policy](../../../.claude/knowledge/reference/yt-shorts-publisher-policy.md)（Shorts）／[video-content-policy](../../../.claude/knowledge/reference/video-content-policy.md)（動画パック）
