---
name: note-lint-quotepath-bypass
description: git のパス列挙は日本語パスを引用符+8進エスケープで返す→JS のフィルタが不一致で記事が全ゲート素通り。2026-08-30 に 36 スクリプトで再発を確認し機械ゲート化
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 007dd616-fdf1-4d4b-ba54-ea6e058032e8
---

**pre-commit の staged チェッカーで、docs/note 配下の日本語パス記事が全ゲートを素通りしていた**（2026-07-04 発見）。note-lint（pipe表 BLOCK ルール等）は配線済みなのに一度も発火せず、二次学科記述9記事の markdown テーブルが無検出のまま note 本番公開され、note 非対応で生パイプ表示になっていた。

**根因**: `git diff --cached --name-only` は既定 `core.quotepath=true` により非ASCIIパスを `"docs/note/1\347\264\232..."`（引用符始まり＋8進エスケープ）で出力する。これを JS の `.filter(f => f.startsWith('docs/note/'))` や `/^docs\/note\//.test(f)` で絞ると**引用符始まりで不一致→日本語パス記事が空振り**（`existsSync(quotedPath)` も false）。ASCII slug の .mdx（.local/r2/posts）や .tsx は無影響のため気づきにくい。`git diff --cached --name-only -z`（NUL区切り）を使う check-note-charlimits は無傷だった。

**Why**: 「ゲートが配線されている＝効いている」ではない。日本語パス × name-only × JS フィルタの組合せは静かに全件バイパスする。テーブル無検出で本番到達 = 実害。

**How to apply**:
- staged 一覧を取る git コマンドは **`git -c core.quotepath=false diff --cached --name-only`** を使う（または `-z`）。修正済み: note-lint.mjs / check-note-cover-fit.mjs / check-note-site-utm.mjs（execFileSync は `['-c','core.quotepath=false','diff',...]`）。
- 新規 staged チェッカーを書くときは日本語パスでの発火をダミー記事で必ず実証（`docs/note/1級・2級土木/__linttest__/article.md` にテーブルを置いて BLOCK を確認 → 削除）。
- バックストップとして本体（note-publish.mjs）にも pipe表 ABORT を追加済み（lint 迂回経路の保険）。
- note は markdown テーブル非対応 [[feedback_note_html_unsupported]]。表は箇条書き化（既存規範 note-publish-enhancement.md）。関連: [[project_civil_niji_gakka_line]]


---

**2026-08-30 追記: 直っていたのは 3 本だけで、同じ穴が 36 スクリプトに残っていた。**
このリポジトリは追跡 .md の **38%（975/2553）** が日本語パス配下なので影響は広い。実測:

| スクリプト | 症状 |
|---|---|
| check-dead-handles | 5,769 件しか見ずに ✓（正しくは 7,728 件＝**25% を素通り**） |
| note-essay-charcount | 対象の模範論文が全件「ファイルなし」。それでも exit 0 |
| asset-inbox-push | 選択 0 件。check-asset-storage が案内する復旧コマンドが無反応 |

**記憶と個別修正では止まらない**（2026-07 に規則を書いた後も、新規スクリプトが同じ形で増えた）ので
`tests/git-exec-maxbuffer.test.mjs` に機械ゲートを追加した——「ls-files / --name-only /
--name-status / ls-tree を含む同期 git 呼び出しは core.quotepath=false を明示している」。
既存の maxBuffer 検査と同じ作りで、抽出器が壊れていないことを確かめる負検証つき。
**新しい検査スクリプトを書くとき、もうこれを覚えていなくてよい。テストが落とす。**

同じセッションで見つかった近縁の 2 件（どちらも「実行系が黙って何もしない」）:
- tar の --force-local は GNU tar 専用。macOS の bsdtar には無く、asset-inbox-push の
  --commit はこの Mac で一度も通っていなかった → win32 のときだけ渡す
- 退避済みアセットの実在検査は「ローカル実体 **または** 退避台帳」で見る。ローカルだけ見ると
  退避済み端末と CI で「生成しろ」と言われても既に在る、という直せない赤になる
  （check-coconala-wiring で実際に発生）→ [[untrack-ondisk-vs-tracked]]
