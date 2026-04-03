---
name: dev-start
description: >
  ポート3020が使用中なら自動的にkillして、npm run devで開発サーバーを起動する。Use when user asks to [開発サーバー起動, npm run dev, /dev-start].
---

ポート3020をチェック・クリーンアップしてから、開発サーバー（Next.js）を起動する。

## 前提

- npm がインストールされていること
- 作業ディレクトリが doboku-note プロジェクトルートであること

## 手順

### Step 1: ポート3020を使用しているプロセスをチェック・停止

```bash
# プロセスを取得
pid=$(netstat -ano 2>/dev/null | grep ':3020' | awk '{print $NF}' | head -1)

# プロセスが存在する場合はkill
if [ -n "$pid" ] && [ "$pid" != "PID" ]; then
  echo "ポート3020を使用しているプロセス (PID: $pid) を停止中..."
  kill -9 "$pid" 2>/dev/null || taskkill /PID "$pid" /F 2>/dev/null
  sleep 1
  echo "✅ プロセス停止完了"
else
  echo "ポート3020は空き状態"
fi
```

### Step 2: 開発サーバーを起動

```bash
npm run dev
```

サーバーが起動すると以下のような出力が表示される：
```
 ⨯ Ready in 1234ms
 ▲ Next.js 15.5.2
 - Local:        http://localhost:3020
```

### Step 3: ブラウザで確認

http://localhost:3020 にアクセスしてサイトが表示されることを確認

## エラー時の対応

- **EADDRINUSE が表示される場合**: 上記 Step 1 が実行されていない可能性。手動で以下を実行：
  ```bash
  # Windows
  netstat -ano | find "3020"  # PIDを確認
  taskkill /PID {PID} /F
  
  # macOS/Linux
  lsof -i :3020  # PIDを確認
  kill -9 {PID}
  ```

- **npm コマンドが見つからない**: Node.js/npm が PATH に含まれていることを確認

## 参考

- 開発サーバーを停止するには Ctrl+C を押す
- ホットリロードは自動的に有効（ファイル変更時に自動再読み込み）
