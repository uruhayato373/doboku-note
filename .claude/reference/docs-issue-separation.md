# 情報蓄積ルール → information-architecture.md に統合（移行期スタブ）

このドキュメントが定義していた **md / Issue / JSON の 3 層分離ルール**（2026-04-21）は廃止された。GitHub Issue を Tier 1 とする旧モデルは、Issue 完全廃止に伴い **4 ゾーンモデル**へ統合された。

→ **真実源: [information-architecture.md](./information-architecture.md)**

- **GitHub Issue は使わない**（新規作成全面停止。closed Issue は GitHub 上に履歴として残置）
- やるべきこと（旧 Tier 1）は `.claude/state/task-queue.json` に集約
- Why / 戦略 / 設計（旧 Tier 2）は `docs/` または `.claude/reference/`
- 機械可読データ（旧 Tier 3）は `.claude/state/*.json` / `.claude/config/*.json`

> 本ファイルは移行期の互換のために残されている。全インバウンド参照の張り替え後（移行 Phase 5）に削除予定。
