---
title: Knowledge SSOT
---

# Knowledge SSOT

エージェント・スキル・人が共有する恒久知識の単一正源（SSOT）。

- `reference/`: 運用ポリシー、runbook、アーキテクチャ、台帳
- `design-system/`: ブランド、画像、UIの設計規約と機械可読トークン

人は `npm run admin` でAdminを起動し、`/knowledge` から検索・HTML閲覧する。Adminはこのディレクトリを直接読む読み取り専用ビューであり、HTMLの複製は保存しない。

配置判断と参照更新ルールは [情報アーキテクチャ](./reference/information-architecture.md) を参照。
