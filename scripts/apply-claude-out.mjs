#!/usr/bin/env node
/**
 * apply-claude-out.mjs — ヘッドレスの Claude Code が .tmp/claude-out/ に書いたファイルを、許可したものだけ .claude/ へ写して commit する（DN-0829）。
 * ---------------------------------------------------------------------------
 * なぜ要るか: Claude Code はパスに `.claude` を含むファイル（skills・agents・commands を除く）を「sensitive file」として扱い、
 * 書くたびに承認を求める。`claude -p`（土曜の週次レビュー）には承認する人がいないので、2026-10-24 の自動実行は
 * `.claude/todo/weekly.md` を書けず、週次レビューを完了にできなかった。Claude には .claude/ を外した相対パスで .tmp/claude-out/ の下に
 * 書かせ（例: .tmp/claude-out/todo/weekly.md → .claude/todo/weekly.md）、Claude が終わった後に scripts/scheduled/weekly-review.sh が
 * このスクリプトで写す。.tmp/claude-out/.claude/… のように途中に `.claude` を含めると、その書き込みも sensitive file として拒否される
 * （2026-10-26 にヘッドレスの試運転で確かめた。10/24 は Write を拒まれた Claude が Bash で書いて通っただけだった）。
 * 旧い書き方（.tmp/claude-out/.claude/…）も受けて同じ所へ写す。
 *
 * 写すのは ALLOWED に当たるファイルだけ。それ以外が置かれていたら写さずに exit 1（ヘッドレスの Claude に .claude/ の任意のファイルを書かせない）。
 * 写したファイルは .tmp/claude-out/ から消す（翌週に古い計画を写し直さない）。
 *
 * CLI（土曜の週次レビューの worktree のルートで実行する）:
 *   node scripts/apply-claude-out.mjs --dry-run   # 写す対象と、許可していないファイルを出すだけ
 *   node scripts/apply-claude-out.mjs             # 写す（commit しない）
 *   node scripts/apply-claude-out.mjs --commit    # 写して commit・push（ブランチに乗った HEAD では拒否）
 * exit: 0 = 写した・写すものが無かった / 1 = 許可していないファイルがある・commit/push の失敗 / 2 = ブランチに乗った HEAD で --commit
 * ---------------------------------------------------------------------------
 */
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

import { parseCliArgs } from './lib/cli-args.mjs';
import { listFiles } from './lib/fs-walk.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { commitAndPush, onBranch } from './lib/routine-commit.mjs';

const TAG = '[apply-claude-out]';
export const OUT_DIR = '.tmp/claude-out';
/**
 * ヘッドレスの週次・月次レビューが書く .claude/ のファイル。backlog は本文の書き換えのときだけ全体を写して直す
 * （起票・完了・削除は todo:add・todo:complete・backlog-edit を使う。2026-10-24 の回は backlog の 3 件を直せなかった）。
 * 写した後の commit は rebase するので、実行中に他の人が backlog を変えていれば衝突で止まり、黙って上書きしない。
 */
export const ALLOWED = [/^\.claude\/todo\/(weekly|backlog)\.md$/, /^\.claude\/state\/proofread-learnings\/\d{4}-\d{2}-\d{2}\.md$/];

/** .tmp/claude-out/ の下の相対パスの写し先（.claude/ の下）。旧い書き方（.claude/ から始まる）はそのまま（pure） */
export const destOf = (rel) => (rel.startsWith('.claude/') ? rel : `.claude/${rel}`);

/** .tmp/claude-out/ の下の相対パスを、写すものと許可していないものに分ける（判定は写し先で行う・pure） */
export function classify(relPaths) {
  const allowed = []; const rejected = [];
  for (const rel of relPaths) (ALLOWED.some((re) => re.test(destOf(rel))) ? allowed : rejected).push(rel);
  return { allowed, rejected };
}

function main() {
  const args = parseCliArgs({ 'dry-run': { type: 'boolean' }, commit: { type: 'boolean' } });
  if (args.commit && onBranch()) { console.error(`${TAG} ブランチに乗った checkout では commit しない（土曜の週次レビューの worktree で回す）`); process.exit(2); }
  const root = join(REPO_ROOT, OUT_DIR);
  const rels = listFiles(root, { allowMissing: true }).map((abs) => relative(root, abs).split(sep).join('/'));
  const { allowed, rejected } = classify(rels);
  console.log(`${TAG} ${OUT_DIR} に ${rels.length} 件 / 写す ${allowed.length} 件 / 許可していない ${rejected.length} 件`);
  for (const rel of allowed) console.log(`  → ${rel} → ${destOf(rel)}`);
  for (const rel of rejected) console.log(`  ✗ 許可していない: ${rel}`);
  if (args.dryRun) { process.exitCode = rejected.length ? 1 : 0; return; }

  for (const rel of allowed) {
    const dest = join(REPO_ROOT, destOf(rel));
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(root, rel), dest);
    rmSync(join(root, rel));
  }
  let problem = null;
  if (args.commit && allowed.length) {
    const r = commitAndPush(allowed.map(destOf), 'chore(weekly-review): ヘッドレスの Claude が書いた週間計画などを .claude/ へ写す [skip ci]');
    console.log(`${TAG} commit: ${r.status}`);
    problem = r.problem ?? null;
  }
  if (problem) console.error(`${TAG} ✗ ${problem}`);
  process.exitCode = rejected.length || problem ? 1 : 0;
}

if (process.argv[1] && process.argv[1].split('\\').join('/').endsWith('scripts/apply-claude-out.mjs')) main();
