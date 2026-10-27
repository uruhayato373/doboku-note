/**
 * backlog-text-guards.mjs — origin/develop へ直接積む backlog の書き換え（todo:add・search-improvement）で、
 * pre-commit が backlog.md に当てる本文の検査を先に当てる（DN-0893）。
 *
 * なぜ要るか: lib/git-direct-commit.mjs は一時 index と commit-tree で積むので pre-commit フックが走らない。
 * 2026-10-27 に todo:add の本文が試験日の誤記パターン（check-exam-calendar・走査対象に .claude/todo を含む）に
 * 当たったまま push され、develop の CI（ci:true）を赤くした。backlog.md の本文で落ちうる ci:true の検査は
 * check-exam-calendar と check-relative-links の 2 つ（形式は check-backlog-schema と同じ検査を todo-add が持つ）。
 *
 * 見るのは書き換えで増えた行だけ（既存の行の違反は CI 側の全量検査が見る）。
 */
import { execFileSync } from 'node:child_process';
import { auditLinks } from '../check-relative-links.mjs';
import { findForbidden } from './exam-calendar-guards.mjs';

const BACKLOG_PATH = '.claude/todo/backlog.md';

/** after にあって before に無い行（同じ行が複数あるときは増えた分だけ）を返す（純関数） */
export function addedLines(before, after) {
  const left = new Map();
  for (const l of before.split(/\r?\n/)) left.set(l, (left.get(l) ?? 0) + 1);
  const out = [];
  for (const l of after.split(/\r?\n/)) {
    const n = left.get(l) ?? 0;
    if (n > 0) left.set(l, n - 1);
    else out.push(l);
  }
  return out;
}

/** ref の tree にパス（ファイルかディレクトリ）があるか。積む土台は origin/develop なので手元の作業ツリーでは判定しない */
export function existsInRef(root, ref) {
  return (p) => {
    try {
      execFileSync('git', ['cat-file', '-e', `${ref}:${p}`], { cwd: root, stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };
}

/**
 * backlog の書き換えで増えた行の違反を返す（空なら合格）。
 * @param {string} before 書き換え前の backlog
 * @param {string} after 書き換え後の backlog
 * @param {{ exists: (path: string) => boolean }} o 相対リンクの宛先の実在判定（existsInRef で作る）
 * @returns {string[]}
 */
export function backlogTextProblems(before, after, { exists }) {
  const added = addedLines(before, after).join('\n');
  const problems = findForbidden(added).map((reason) => `[exam-calendar] ${reason}（check-exam-calendar が CI で止める書き方）`);
  for (const b of auditLinks(BACKLOG_PATH, added, exists)) problems.push(`[relative-links] ${b.link} が origin/develop に無い（check-relative-links が CI で止める）`);
  return problems;
}
