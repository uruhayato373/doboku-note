/**
 * weekly-collect-commit.mjs — 土曜の収集（scripts/ops/weekly-collect.mjs）が、1 段の記録だけを commit する部品（DN-1195）。
 *
 * 以前は前段・後段の終わりにまとめて 1 回 commit していた。pre-commit の検査は staged 全体で回るので、1 ファイルの違反
 * （2026-11-07 は売上 1 件の資格の未分類）で無関係な記録 19 ファイルが develop に入らなかった。
 * ここでは段ごとに commit し、commit が検査（または add の型の検査）で落ちたら、その段のファイルを index と作業ツリーから
 * 外して keepDir へ退避する。落ちたファイルが staged に残ると次の段の commit も止めるので、必ず外す。
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const tail = (text, n = 3) => String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(-n).join(' / ').slice(0, 400);

/**
 * @param {{ root: string, message: string, stage: () => (string | null), keepDir: string, push?: (() => { problem?: string }) | null }} o
 *   stage は記録を git add し、失敗の理由（型の違反など）か null を返す。push は commit できたときだけ呼ぶ
 * @returns {{ status: 'clean' | 'committed' | 'set-aside', files: string[], problem?: string, keptAt?: string }}
 */
export function commitStageRecords({ root, message, stage, keepDir, push = null }) {
  const git = (a) => spawnSync('git', ['-c', 'core.quotepath=false', ...a], { cwd: root, encoding: 'utf8' });
  if (!git(['status', '--porcelain']).stdout.trim()) return { status: 'clean', files: [] };
  const addProblem = stage();
  const files = git(['diff', '--cached', '--name-only', '--no-renames']).stdout.split('\n').filter(Boolean);
  if (!files.length) return addProblem ? { status: 'set-aside', files, problem: addProblem } : { status: 'clean', files };
  let problem = addProblem;
  if (!problem) {
    const c = git(['commit', '-q', '-m', message]);
    if (c.status === 0) {
      const p = push?.() ?? {};
      return { status: 'committed', files, ...(p.problem ? { problem: p.problem } : {}) };
    }
    problem = `commit が検査で落ちた: ${tail(c.stderr || c.stdout)}`;
  }
  setAside({ git, root, files, keepDir, problem });
  return { status: 'set-aside', files, problem, keptAt: keepDir };
}

/** staged のファイルを keepDir へ写し、index と作業ツリーを HEAD に戻す（HEAD に無いファイルは消す） */
function setAside({ git, root, files, keepDir, problem }) {
  mkdirSync(keepDir, { recursive: true });
  writeFileSync(join(keepDir, 'reason.txt'), `${problem}\n\n${files.join('\n')}\n`);
  for (const f of files) {
    const src = join(root, f);
    if (!existsSync(src)) continue;
    mkdirSync(dirname(join(keepDir, f)), { recursive: true });
    copyFileSync(src, join(keepDir, f));
  }
  git(['reset', '-q', '--', ...files]);
  for (const f of files) {
    if (git(['cat-file', '-e', `HEAD:${f}`]).status === 0) git(['checkout', '-q', 'HEAD', '--', f]);
    else rmSync(join(root, f), { force: true });
  }
}
