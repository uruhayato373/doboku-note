/**
 * main-workflow-paths.mjs — main の workflow の定義が、develop を checkout して呼ぶパス・npm script の抜き出しと照合（純関数）。
 *
 * 定期実行（schedule）と手動実行の workflow は定義が default ブランチ（main）のもので走る。その中で `ref: develop` を
 * checkout するジョブは、main の定義に書かれたパスを develop のツリーで呼ぶ。develop でスクリプトを移動・改名・削除すると、
 * main へ deploy するまでの間そのジョブが「ファイルが無い」で落ちる（2026-11-19 のスクリプトの置き場の集約で人が気づいた）。
 */
import { posix } from 'node:path';
import { checkoutRefs, runSteps } from './workflow-yaml.mjs';

/** develop を checkout する workflow か（`ref: develop` と、式の中で 'develop' を選ぶ形の両方）。 */
export function checksOutDevelop(doc) {
  return checkoutRefs(doc).some((ref) => /\bdevelop\b/.test(ref));
}

// 実行時に作られる場所・リポジトリの外は対象にしない
const SKIP_PREFIX = /^(?:\.tmp\/|tmp\/|out\/|node_modules\/|\.next\/|\/)/;
const RUNNERS = new Set(['node', 'bash', 'sh', 'python', 'python3', 'tsx']);
const FILE_PATH = /^(?:[\w.-]+\/)*[\w.-]+\.(?:mjs|cjs|js|mts|ts|sh|py)$/;
const unwrap = (t) => t.replace(/^[;&|(`"']+/, '').replace(/[;&|)`"']+$/, '');

/** run の本文で、実行系（node・bash など）がオプションの次に受け取るファイル。語に分けて読む（正規表現の入れ子にしない）。 */
function filesInRun(run) {
  const tokens = run.split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    if (!RUNNERS.has(unwrap(tokens[i]))) continue;
    let j = i + 1;
    while (j < tokens.length && tokens[j].startsWith('-')) j++;
    const target = unwrap(tokens[j] ?? '');
    if (FILE_PATH.test(target)) out.push(target);
  }
  return out;
}
const NPM_CMD = /\bnpm run (?:-s |--silent )?([A-Za-z0-9:._-]+)/g;

/** 1 本の workflow が呼ぶリポジトリ内のファイルと npm script。重複なし。 */
export function calledByWorkflow(doc) {
  const files = new Set();
  const npm = new Set();
  for (const { run, cwd } of runSteps(doc)) {
    for (const f of filesInRun(run)) {
      const p = posix.normalize(posix.join(cwd, f));
      if (!SKIP_PREFIX.test(f) && !p.startsWith('..')) files.add(p);
    }
    if (!cwd) for (const m of run.matchAll(NPM_CMD)) npm.add(m[1]);
  }
  return { files: [...files], npm: [...npm] };
}

/**
 * main の workflow 群と、いまのツリーの照合。
 * @param {{name:string, doc:object}[]} workflows main の定義
 * @param {(path:string)=>boolean} exists いまのツリーにファイルがあるか
 * @param {Record<string,string>} npmScripts いまの package.json の scripts
 */
export function auditMainWorkflows(workflows, exists, npmScripts) {
  const inScope = workflows.filter((w) => checksOutDevelop(w.doc));
  const missing = [];
  let files = 0;
  let npm = 0;
  for (const w of inScope) {
    const called = calledByWorkflow(w.doc);
    files += called.files.length;
    npm += called.npm.length;
    for (const f of called.files) if (!exists(f)) missing.push({ workflow: w.name, kind: 'file', target: f });
    for (const n of called.npm) if (!(n in npmScripts)) missing.push({ workflow: w.name, kind: 'npm', target: n });
  }
  return { inScope: inScope.map((w) => w.name), files, npm, missing };
}
