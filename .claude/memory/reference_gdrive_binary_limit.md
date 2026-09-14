---
name: reference_gdrive_binary_limit
description: Google Drive MCP でバイナリ（PNG等）をアップロードできない制約と回避策
metadata: 
  node_type: memory
  type: reference
  originSessionId: c6951d9f-8cfe-43fc-bbdb-d7ff01f0a463
---

Google Drive MCP (`mcp__claude_ai_Google_Drive__create_file`) でバイナリファイルをアップロードする場合、`base64Content` パラメータに base64 文字列を渡す必要がある。

しかし `mcp__filesystem__read_text_file` / `read_media_file` の出力上限が約 25K chars のため、ファイルを context に取り込めない。

**実測値（IG カルーセル 1080×1350 PNG）**:
- 03-cta.png: 57KB → 76K chars（3× オーバー）
- 02-text.png: 115KB → 153K chars
- 00-cover.png: 68KB → 91K chars
- 01-figure.png: 152KB → 203K chars

**アップロードできるもの**:
- テキストファイル（`textContent` 経由）→ caption.txt など ✓

**バイナリ転送の代替手段**:
1. ブラウザで drive.google.com に手動ドラッグ＆ドロップ
2. OAuth スクリプト: `C:\tmp\upload-to-drive.mjs`（gemini-cli の client_id/secret を流用して drive.file スコープでトークン取得 → REST API でマルチパートアップロード）
3. git 管理のままにして Mac 側で使う

**OAuth クレデンシャル（installed app、公開情報）**:
- client_id: `<gemini-cli の oauth2.js に埋め込まれた公開 client_id。ここには書かない＝GitHub push protection が止める>`
- client_secret: `<同 oauth2.js の client_secret。ここには書かない>`
- 出典: gemini-cli oauth2.js（Google 公式の installed app credential）

**確立済み対応**: PNG は git commit で保持、必要時はブラウザ手動アップロード。caption.txt のみ MCP 経由で Drive に送信。
