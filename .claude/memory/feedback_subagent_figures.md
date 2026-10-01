---
name: subagent-figure-extraction
description: サブエージェントでPDF図抽出する際の運用ルール（dpi、分割数、/tmp命名）
type: feedback
---

サブエージェントでPDFから図を抽出する際は以下を守る：

1. **解像度は150dpi**（200dpiだとA4→2339pxで複数画像閲覧時に2000px制限エラー）
2. **1エージェントあたり3〜6枚**（多すぎるとコンテキスト圧迫+エラー時の損失大）
3. **/tmp名にグループ番号を付与**（`/tmp/fp{編番号}g{グループ番号}-`）
4. **全グループを並列起動**（Agent toolを1メッセージに複数含める）
5. **mode: bypassPermissions** で権限確認を省略

**Why:** 2026-03-21に200dpi+11枚/エージェントで起動したところ、画像が2000px超で「image dimension limit」エラーが発生。150dpi+3〜6枚に変更したら全て成功した。

**How to apply:** PDF→MDX変換スキル（fishery-port-import, river-design-import, noise-manual-import）で図抽出をサブエージェントに委任する場面すべてに適用。
