---
title: NotebookLM CLI のクセ集
---

# NotebookLM CLI のクセ集

`notebooklm`（Python 製 CLI、v0.3.4、`~/bin/notebooklm.bat` 経由、`~/.notebooklm-venv/` に venv）を Bash や Node.js から spawn する際に踏みやすい罠を集約する。

**いつ読むか**: notebooklm CLI を呼ぶ新規スクリプト・skill を設計するとき。既存 wrapper（`notebooklm-cross-query.mjs` / `notebooklm-notebook-builder.mjs`）の挙動を理解するとき。

**真実源**: 既存 wrapper のコメントとここを照合する。CLI バージョン更新時はここを最初に見直す。

---

## 1. venv exe 直叩きでは法人プロキシ通らず 503 になる

**症状**: `~/.notebooklm-venv/Scripts/notebooklm.exe list --json` を spawnSync で直接呼ぶと Google API から `503 Service Unavailable` が返り、操作不能。

**原因**: `notebooklm.exe` 単独実行では Python の `activate.bat` が走らず、`VIRTUAL_ENV` と `PATH` 調整がされない。結果として corporate proxy 設定（HTTPS_PROXY）が SSL コンテキストに正しく伝搬しない。

**回避**: **必ず `~/bin/notebooklm.bat` 経由で呼ぶ**。bat は内部で `activate.bat` を呼んだ後に `notebooklm` を起動する。

```js
// ✓ 正しい（既存 wrapper の pattern）
const NOTEBOOKLM_BIN = (() => {
  if (process.platform === 'win32') {
    const bat = join(homedir(), 'bin', 'notebooklm.bat');
    if (existsSync(bat)) return { path: bat, useShell: true };
  }
  // fallback
})();

// ✗ 間違い（proxy 通らず 503）
spawnSync(join(homedir(), '.notebooklm-venv/Scripts/notebooklm.exe'), ['list', '--json']);
```

加えて wrapper 側でも `NO_PROXY=localhost,127.0.0.1,::1,.local` と `PYTHONIOENCODING=utf-8` を環境変数として明示設定する（bat 内設定と二重に保険）。

---

## 2. 全角括弧含む引数の cmd.exe 引数解析破綻

**症状**: `notebooklm ask "Safety 1.0（安全 1.0）の違いは？"` のように **全角括弧（）を含む引数** を `shell: true` で spawnSync 経由で渡すと、cmd.exe が引数を分割し `Got unexpected extra argument` エラーになる。

**原因**: `shell: true` だと Node.js が args を空白連結して cmd.exe に渡し、cmd 側の独自パースが全角括弧で誤動作する。

**回避**: **明示的に `cmd.exe /c <bat> <args...>` 形式で `shell: false` で spawn**。Node.js 側の args 配列管理に統一する。

```js
// ✓ 正しい
if (NOTEBOOKLM_BIN.useShell && NOTEBOOKLM_BIN.path.endsWith('.bat')) {
  cmd = 'cmd.exe';
  cmdArgs = ['/c', NOTEBOOKLM_BIN.path, ...args];
}
const result = spawnSync(cmd, cmdArgs, { env, encoding: 'utf8', shell: false });

// ✗ 間違い（全角括弧で破綻）
spawnSync(batPath, args, { shell: true });
```

ASCII 半角括弧 `()` は問題なし。問題は全角括弧・連続するピリオド等の Unicode 文字を含む引数。

---

## 3. `notebooklm list` が valid JSON を返しつつ exit 1 を返すケース

**症状**: `notebooklm list --json` を spawnSync で呼ぶと、stdout には正常な notebooks JSON が出力されるが exit code が 1 になることがある（再現条件不明、Python 内部の例外ハンドリング由来と推測）。

**回避**: **exit code に依存せず、stdout の JSON 構造を先に確認**してから判断する。

```js
// ✓ 正しい（JSON parse 優先）
let parsed;
try {
  parsed = JSON.parse(stdout);
} catch {
  console.error(`failed (exit ${code}):\nstdout: ${stdout}\nstderr: ${stderr}`);
  process.exit(3);
}
if (parsed && parsed.error === true) {
  // structured error の場合
  process.exit(3);
}
// valid JSON が取れていれば exit code が 1 でも進む

// ✗ 間違い（false-positive で exit）
if (code !== 0) {
  process.exit(3); // valid JSON があっても落ちる
}
```

`source list` ではこの問題は再現していないが、防御として同じ pattern を適用するのが安全。

---

## 4. `source add --title` が file source で無視される

**症状**: `notebooklm source add ./r07-primary.md --title "R07一次択一40問"` で file を投入すると、source の title は `--title` の値ではなく **filename（`r07-primary.md`）**になる。

**原因**: CLI ヘルプ `--title  Title for text sources` の通り、`--title` は inline text source 向けで、file upload 時は使われない（auto-detect で `text` type だがソース内部では `MARKDOWN` 等に変換される）。

**回避**: **add 直後に `source rename` で title を明示設定**する。

```bash
# add → 自動的に filename が title になる
SID=$(notebooklm source add ./r07-primary.md -n $NB --json | jq -r '.id')

# 後から明示的に rename
notebooklm source rename "$SID" "R07一次択一40問" -n "$NB"
```

`notebooklm-notebook-builder.mjs` の `addSource()` は ready 確認後に list で実 title を取得し、引数 title と異なれば自動 rename する実装になっている（参考実装）。

---

## 5. `source wait` が ready なのに exit 1 を返す false-positive

**症状**: `notebooklm source wait <source-id>` を呼ぶと、source list で確認すると `status: "ready"` になっているにも関わらず wait コマンドが exit 1 で終了する（stderr 空）。

**原因**: wait コマンドの内部 polling が結果判定時に何らかの race condition で「処理中→失敗」と誤認するケース。CLI のバグ寄り。

**回避**: **`source wait` の exit code を信頼せず、`source list` で status を直接ポーリング**する。

```js
// ✓ 正しい（list で status を直接確認）
const pollDeadline = Date.now() + waitTimeout * 1000;
while (Date.now() < pollDeadline) {
  const sources = listSources(notebookId);
  const target = sources.find((s) => s.id === sourceId);
  if (target?.status === 'ready') break;
  if (target?.status === 'failed') process.exit(4);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 4000); // 4s sleep
}

// ✗ 間違い（false-positive で exit）
const r = runNotebooklm(['source', 'wait', sourceId]);
if (r.code !== 0) process.exit(4); // ready なのに落ちる
```

`source list` ベースのポーリングは数秒単位だが、wait 内部 polling と同程度の頻度で問題なし。

---

## 6. `list-notebooks` と `source-list` で JSON 出力構造が異なる

**症状**: 同じ `--json` フラグでも出力ラッパー構造がコマンド間で異なる:
- `notebooklm list --json` → `{ "notebooks": [...] }`
- `notebooklm source list --json` → `{ "sources": [...] }` または直接配列
- `notebooklm create --json` → notebook オブジェクト直接（`{ id, title, ... }`）
- `notebooklm source add --json` → source オブジェクト直接（`{ id, title, ... }`）

**回避**: **配列ラップを共通ヘルパーで吸収**する。

```js
function unwrap(parsed, arrayKey) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed[arrayKey])) return parsed[arrayKey];
  console.error(`Unexpected shape: ${JSON.stringify(parsed).slice(0, 200)}`);
  process.exit(3);
}

const notebooks = unwrap(parseJson(listOut), 'notebooks');
const sources = unwrap(parseJson(srcListOut), 'sources');
```

---

## 認証期限切れの検出（横断）

すべての notebooklm 呼び出しで、stderr または stdout に以下のパターンを含んだら認証期限切れとして exit code 2 で抜ける運用を統一する:

```js
function detectAuthExpired(text) {
  return /Authentication expired|Run 'notebooklm login'/i.test(text);
}
```

期限切れ時はユーザーがインタラクティブに `notebooklm login` を実行する必要があり、wrapper 側では復旧不可。エラーメッセージで明示誘導する。

---

## 参考実装

| ファイル | 用途 | 実装している pattern |
|---|---|---|
| `.claude/scripts/notebooklm-cross-query.mjs` | 複数 notebook 横断クエリ | 1 / 2 / 3 / 6 |
| `.claude/scripts/notebooklm-notebook-builder.mjs` | notebook/source 操作 | 1 / 2 / 3 / 4 / 5 / 6 |
| `~/bin/notebooklm.bat` | venv activate ラッパー | 1（proxy / encoding 設定） |

新規 wrapper を書く時は notebook-builder.mjs を雛形にすると最も安全。
