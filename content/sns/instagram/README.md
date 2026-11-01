# Instagram 投稿素材

公開状態の正本は `content/registry/publications/instagram/`。このディレクトリには、これから投稿する作品の原稿と図解を置く。アカウントのプロフィール文面は `profile.md`、固定投稿の現行素材は `profile-pinned/` にある。

2026-11-01 に旧投稿160件・リール33件をInstagramから削除し、旧パックの公開行80件・作品262件・ソースファイル2279件を整理した。旧キャンペーンの一括投稿は終了。新しい作品は投稿すると決めた時点で個別に台帳へ登録する。

同日に Google Drive の旧Instagram素材4569ファイルも削除した。内訳は旧レンダー3290・旧音声動画533・旧R2アーカイブ746。Drive台帳から旧素材3726行を撤去し、予約済み固定投稿の表紙・図解6画像は保持した。

## 新しい投稿の手順

1. 資格・作品ごとに新しい素材フォルダを作る。旧パックの `posted.json`・`status.json` をコピーしない。
2. `npm run registry -- import-instagram --folder <content/sns/instagram からの相対パス>` で対象を dry-run し、`--commit` で台帳に追加する。一括取り込みは受け付けない。
3. 現行の投稿スキル [publish-ig-bs](../../../.claude/skills/social/publish-ig-bs/SKILL.md) で画像・文面・予約時刻を確認し、台帳の承認ゲートを通してからMeta Business Suiteへ予約する。
4. 投稿後はBusiness Suiteの実体と台帳の状態を照合する。削除した投稿は台帳の停止記録を確認してからアクティブ台帳から外す。

固定投稿の画像・リンクは `npm run check-instagram-profile-funnel` で検査する。旧パックのフォルダや旧キャンペーン計画から投稿を再開しない。
