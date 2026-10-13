/**
 * pre-commitフック設置スクリプト
 *
 * .git/hooks/pre-commit にMDX検証フックを、.git/hooks/post-commit に pathspec commit 後の
 * index 同期（scripts/sync-index-after-commit.mjs）を設置する。
 *
 * Usage:
 *   npm run pre-commit:install
 */

import { writeFileSync, chmodSync, existsSync, mkdirSync, renameSync, readFileSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";
import { hookBodyHash, installedHookHash, decideHookInstall } from "./lib/hook-install-guard.mjs";

// worktree 対応: worktree では .git はファイル（gitdir ポインタ）なので
// 相対 ".git/hooks" は解決できない。共有フックの実体パスを git に問い合わせる。
function resolveHooksDir() {
  // テスト用の差し替え（共有フックに触れずに書き込み方を確かめる）
  if (process.env.DOBOKU_HOOKS_DIR) return process.env.DOBOKU_HOOKS_DIR;
  try {
    const p = execFileSync("git", ["rev-parse", "--git-path", "hooks"], {
      encoding: "utf8",
    }).trim();
    if (p) return p;
  } catch {
    /* fall through */
  }
  return join(".git", "hooks");
}

const HOOKS_DIR = resolveHooksDir();
const HOOK_PATH = join(HOOKS_DIR, "pre-commit");

const HOOK_CONTENT_BODY = `#!/bin/sh
# Pre-commit hooks
# Installed by: npm run pre-commit:install

# 検査の一覧・順序・止め方は scripts/lib/pre-commit-steps.mjs、実行は scripts/pre-commit-dispatch.mjs（DN-0688）。
# 以前はここに node scripts/… を 73 行並べ、1 commit で node を 67〜77 回起動していた
# （MDX 1 本で 12〜14 秒）。いまは node を 1 回だけ起動し、最初に失敗した検査で exit 1 にする。
# 検査を足す・外すときは steps 側だけを直す（このフックの本文を変えなければ再インストールは要らない）。
# 緊急回避は従来どおり SKIP_*（SKIP_MDX_DATES=1 など）を環境変数で渡す。
exec node scripts/pre-commit-dispatch.mjs
`;

if (!existsSync(HOOKS_DIR)) {
  mkdirSync(HOOKS_DIR, { recursive: true });
}

if (existsSync(HOOK_PATH)) {
  console.log(`Existing pre-commit hook found at ${HOOK_PATH}.`);
  console.log("Overwriting with MDX validation hook.");
}

// 導入済みフックが古いまま走り続ける事故の再発防止（2026-08-13）。
// フックの再インストールは `npm install`（prepare）でしか走らないため、ゲートを追加しても
// 各 worktree / 各マシンの .git/hooks は古いままになる。実際にこの日、CTA 到達検査を
// ソースへ足したのに導入済みフックには入っておらず、無言で素通りしていた。
// 内容ハッシュを印として埋め、フック自身が「自分が古い」ことを検知して落ちるようにする。
import { createHash } from 'node:crypto';
import { readFileSync as _readSelf } from 'node:fs';
// Windows では new URL(...).pathname が "/C:/..." を返し、C:\C:\... に解決されて ENOENT になる。
import { fileURLToPath } from 'node:url';
// ハッシュは **ソーステキスト**（テンプレートリテラルの生の中身）から取る。
// 評価後の文字列から取ると、シェル側が同じ計算を再現できず必ず不一致になる
// （2026-08-13 に一度その実装で誤検知＝全 commit がブロックされた）。
const _selfSrc = _readSelf(fileURLToPath(import.meta.url), 'utf8');
const _bodyMatch = _selfSrc.match(/const HOOK_CONTENT_BODY = `([\s\S]*?)`;/);
const HOOK_HASH = createHash('sha256').update(_bodyMatch ? _bodyMatch[1] : '').digest('hex').slice(0, 12);
const DRIFT_GUARD = `
# --- フック鮮度チェック（install-pre-commit.mjs が埋め込む） ---
# ソース側のゲート構成が変わったのに再インストールしていないと、古いフックが静かに走る。
HOOK_HASH_INSTALLED="${HOOK_HASH}"
HOOK_HASH_SOURCE=$(node -e "
const {createHash}=require('node:crypto');
const s=require('fs').readFileSync('scripts/install-pre-commit.mjs','utf8');
const m=s.match(/const HOOK_CONTENT_BODY = \\\`([\\s\\S]*?)\\\`;/);
process.stdout.write(m?createHash('sha256').update(m[1]).digest('hex').slice(0,12):'unknown');
" 2>/dev/null)
if [ -n "$HOOK_HASH_SOURCE" ] && [ "$HOOK_HASH_SOURCE" != "unknown" ] && [ "$HOOK_HASH_INSTALLED" != "$HOOK_HASH_SOURCE" ]; then
  HOOK_HASH_DEVELOP=$(git show origin/develop:scripts/install-pre-commit.mjs 2>/dev/null | node -e "
const {createHash}=require('node:crypto');
const s=require('fs').readFileSync(0,'utf8');
const m=s.match(/const HOOK_CONTENT_BODY = \\\`([\\s\\S]*?)\\\`;/);
process.stdout.write(m?createHash('sha256').update(m[1]).digest('hex').slice(0,12):'unknown');
" 2>/dev/null)
  if [ "$HOOK_HASH_INSTALLED" = "$HOOK_HASH_DEVELOP" ]; then
    echo "[pre-commit] 導入済みフックは origin/develop と同じ版で、このツリーの install-pre-commit.mjs が古い（installed=$HOOK_HASH_INSTALLED source=$HOOK_HASH_SOURCE）。"
    echo "             pre-commit:install は実行しない（共有フックが古い版に戻り、他セッションのゲートが消える）。"
    echo "             git fetch してこのツリーへ origin/develop を取り込んでから commit してください。"
  else
    echo "[pre-commit] 導入済みフックが古い（installed=$HOOK_HASH_INSTALLED source=$HOOK_HASH_SOURCE）。"
    echo "             npm run pre-commit:install を実行してから commit してください。"
  fi
  exit 1
fi
# --- ここまで ---
`;
const HOOK_CONTENT = HOOK_CONTENT_BODY.replace(
  '# Installed by: npm run pre-commit:install\n',
  '# Installed by: npm run pre-commit:install\n' + DRIFT_GUARD,
);
// 古いツリーから共有フックを入れ直すと、他セッションが足した新しいゲートが消える（DN-0506）。
// 導入済み＝origin/develop の版で、このツリーの版が develop の過去の版なら上書きしない。
// 自分の版が develop に無い（＝ゲートを足している途中）なら入れる。--force で判定を飛ばす。
const FORCE = process.argv.includes("--force");
function gitText(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}
if (!FORCE && !process.env.DOBOKU_HOOKS_DIR && existsSync(HOOK_PATH)) {
  const SRC = "scripts/install-pre-commit.mjs";
  const developSrc = gitText(["show", `origin/develop:${SRC}`]);
  const historyCommits = (gitText(["log", "-n", "40", "--format=%H", "origin/develop", "--", SRC]) ?? "").split("\n").filter(Boolean);
  const developHistory = historyCommits.map((c) => hookBodyHash(gitText(["show", `${c}:${SRC}`]))).filter(Boolean);
  const decision = decideHookInstall({
    installedHash: installedHookHash(readFileSync(HOOK_PATH, "utf8")),
    sourceHash: HOOK_HASH,
    developHash: developSrc ? hookBodyHash(developSrc) : null,
    developHistory,
  });
  if (decision === "refuse-stale") {
    console.error("✗ 共有フックを上書きしません: 導入済みフックは origin/develop と同じ版で、このツリーの install-pre-commit.mjs は develop の過去の版です。");
    console.error("  入れ直すと共有フックが古い版に戻り、他セッションのゲートが消えます。");
    console.error("  git fetch してこのツリーへ origin/develop を取り込んでから commit してください（どうしても入れるなら --force）。");
    // npm install の prepare では止めない（依存の導入まで失敗させない）
    process.exit(process.env.npm_lifecycle_event === "prepare" ? 0 : 1);
  }
}

// 一時ファイルに書いてから入れ替える。実行中のシェルは元のファイル（inode）を読み続けるので、
// 書き換えの途中で読み込み位置がずれて構文エラーになる事故（2026-10-02・同日 4 回）を防ぐ。
const HOOK_TMP = `${HOOK_PATH}.tmp-${process.pid}`;
writeFileSync(HOOK_TMP, HOOK_CONTENT, { mode: 0o755 });
renameSync(HOOK_TMP, HOOK_PATH);

// Windows doesn't use chmod, but set it for cross-platform compatibility
try {
  chmodSync(HOOK_PATH, 0o755);
} catch {
  // Ignore chmod errors on Windows
}

console.log(`✓ pre-commit hook installed at ${HOOK_PATH}`);
console.log("  MDX files will be validated before each commit.");

// post-commit: pathspec commit（git commit -- <path>）では、pre-commit が書き換えて stage した内容
// （backfill-mdx-dates の dateModified 等）が本物の index に入らず、index にだけ古い版が残る（2026-10-06 実測）。
// 今 commit したファイルのうち「作業ツリー＝HEAD なのに index だけ違う」ものを HEAD に揃える。
// スクリプトが無い古いツリー（worktree）では何もしない。
const POST_COMMIT_PATH = join(HOOKS_DIR, "post-commit");
const POST_COMMIT_CONTENT = `#!/bin/sh
# Installed by: npm run pre-commit:install
if [ -f scripts/sync-index-after-commit.mjs ]; then
  node scripts/sync-index-after-commit.mjs || true
fi
`;
const POST_COMMIT_TMP = `${POST_COMMIT_PATH}.tmp-${process.pid}`;
writeFileSync(POST_COMMIT_TMP, POST_COMMIT_CONTENT, { mode: 0o755 });
renameSync(POST_COMMIT_TMP, POST_COMMIT_PATH);
try {
  chmodSync(POST_COMMIT_PATH, 0o755);
} catch {
  // Ignore chmod errors on Windows
}
console.log(`✓ post-commit hook installed at ${POST_COMMIT_PATH}`);

// dispatch-log.json の merge driver（DN-0635）。.gitattributes の merge=dispatch-log が指す。
// git config はクローンごと（worktree は共有）。テスト用の DOBOKU_HOOKS_DIR のときは触れない。
if (!process.env.DOBOKU_HOOKS_DIR) {
  try {
    execFileSync("git", ["config", "--local", "merge.dispatch-log.name", "dispatch-log.json の末尾追記を両方残して合わせる"], { maxBuffer: 1024 * 1024 });
    execFileSync("git", ["config", "--local", "merge.dispatch-log.driver", "node scripts/merge-dispatch-log.mjs %O %A %B"], { maxBuffer: 1024 * 1024 });
    console.log("✓ merge driver 'dispatch-log' registered (scripts/merge-dispatch-log.mjs)");
  } catch (e) {
    console.warn(`! merge driver の登録に失敗（dispatch-log.json の衝突は手で解消）: ${e.message}`);
  }
}
