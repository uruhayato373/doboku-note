---
name: feedback_note_lint_quotepath_bypass
description: "gitのパス列挙は日本語パスを引用符+8進エスケープで返しJSフィルタ不一致で記事が全ゲート素通り。2026-08-30に36スクリプトで再発を確認し機械ゲート化"
metadata:
  type: feedback
---

**pre-commit の staged チェッカーで、docs/note 配下の日本語パス記事が全ゲートを素通りしていた**（2026-07-04 発見）。note-lint（pipe表 BLOCK 等）は配線済みなのに一度も発火せず、二次学科記述9記事の markdown テーブルが無検出で note 本番公開され、note 非対応で生パイプ表示になっていた。

**根因**: `git diff --cached --name-only` は既定 `core.quotepath=true` により非ASCIIパスを `"docs/note/1\347\264\232..."`（引用符始まり＋8進エスケープ）で出力する。JS の `.filter(f => f.startsWith('docs/note/'))` や `/^docs\/note\//.test(f)` は引用符始まりで不一致→日本語パス記事が空振り（`existsSync(quotedPath)` も false）。ASCII slug の .mdx（.local/r2/posts）や .tsx は無影響で気づきにくい。`-z`（NUL区切り）を使う check-note-charlimits は無傷だった。

**Why**: 「ゲートが配線されている＝効いている」ではない。日本語パス × name-only × JS フィルタの組合せは静かに全件バイパスする。テーブル無検出で本番到達＝実害。

**How to apply**:
- staged 一覧は **`git -c core.quotepath=false diff --cached --name-only`**（または `-z`）。修正済み: note-lint.mjs / check-note-cover-fit.mjs / check-note-site-utm.mjs（execFileSync は `['-c','core.quotepath=false','diff',...]`）。
- 新規 staged チェッカーは日本語パスでの発火をダミー記事で実証（`docs/note/1級・2級土木/__linttest__/article.md` にテーブルを置いて BLOCK 確認→削除）。
- バックストップとして note-publish.mjs にも pipe表 ABORT を追加済み。note は markdown テーブル非対応（[[feedback_note_cta_no_price_linkcard]]）。表は箇条書き化（note-publish-enhancement.md）。関連: [[project_civil_niji_gakka_line]]

## 2026-08-30 追記: 直っていたのは3本だけで同じ穴が36スクリプトに残っていた
追跡 .md の **38%（975/2553）** が日本語パス配下で影響は広い。実測:

| スクリプト | 症状 |
|---|---|
| check-dead-handles | 5,769件しか見ずに ✓（正しくは7,728件＝25%を素通り） |
| note-essay-charcount | 対象の模範論文が全件「ファイルなし」でも exit 0 |
| asset-inbox-push | 選択0件。check-asset-storage が案内する復旧コマンドが無反応 |

記憶と個別修正では止まらない（2026-07 に規則を書いた後も新規スクリプトが同じ形で増えた）ので `tests/git-exec-maxbuffer.test.mjs` に機械ゲートを追加: 「ls-files / --name-only / --name-status / ls-tree を含む同期 git 呼び出しは core.quotepath=false を明示している」（既存 maxBuffer 検査と同じ作り・抽出器が壊れていないことの負検証つき）。**新しい検査スクリプトを書くとき覚えていなくてよい。テストが落とす。**

同セッションで見つかった近縁2件（どちらも「実行系が黙って何もしない」）:
- tar の `--force-local` は GNU tar 専用。macOS の bsdtar には無く asset-inbox-push の `--commit` はこの Mac で一度も通っていなかった→win32 のときだけ渡す。
- 退避済みアセットの実在検査は「ローカル実体 **または** 退避台帳」で見る。ローカルだけ見ると退避済み端末と CI で「生成しろ」と言われても既に在る直せない赤になる（check-coconala-wiring で実発生）→ [[reference_quality_audit_system]]
