/**
 * doc-meta-index.mjs — 公開記事の索引 src/config/doc-meta-index.json を読む（無ければ生成してから読む）。
 *
 * 索引は生成物で git 管理外なので、新しく作った worktree には存在しない。pre-commit から呼ばれる
 * 検査（check-x-campaign-plan 等）が直接 readFileSync していたため、新しい worktree での最初の
 * commit が ENOENT で落ち、毎回手で build-doc-meta-index を実行していた（2026-09-23 に 3 回）。
 * 共有の pre-commit 本体を変えると全 worktree のフック鮮度チェックが止まるので、読む側で補う。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

export const DOC_META_INDEX = 'src/config/doc-meta-index.json';
const BUILDER = '.claude/scripts/build-doc-meta-index.mjs';

export function readDocMetaIndex(root = process.cwd()) {
  const p = join(root, DOC_META_INDEX);
  if (!existsSync(p)) {
    console.error(`[doc-meta-index] ${DOC_META_INDEX} が無い（生成物・git 管理外）ので生成する: node ${BUILDER} --ci`);
    execFileSync(process.execPath, [join(root, BUILDER), '--ci'], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });
  }
  return JSON.parse(readFileSync(p, 'utf8'));
}
