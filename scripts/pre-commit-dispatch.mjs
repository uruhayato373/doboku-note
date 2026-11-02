#!/usr/bin/env node
/**
 * pre-commit-dispatch.mjs — .git/hooks/pre-commit が呼ぶ 1 プロセスのディスパッチャ（DN-0688）。
 *
 * 旧フックは検査ごとの node 行を 73 本並べ、1 commit で node を 67〜77 回起動していた
 * （MDX 1 本で 12〜14 秒。起動費だけで約 4 秒）。ここでは検査の一覧（scripts/lib/pre-commit-steps.mjs）を
 * 旧フックと同じ順・同じ条件で上から回し、**最初に失敗した検査で止める**（commit は exit 1）。
 * run() を export している検査（STEPS の inProcess: true）は import して同じプロセスで呼び、
 * まだ run() が無い検査は従来どおり子プロセスで呼ぶ。出力の文言と SKIP_* による回避は検査側のまま。
 *
 * 検査の一覧・順序・止め方を変えるときは scripts/lib/pre-commit-steps.mjs を直す（フックの再インストールは要らない）。
 * 手元の確認:
 *   PRE_COMMIT_TIMING=1 sh .git/hooks/pre-commit   # 検査ごとの所要時間を最後に出す
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { STEPS, isFailure, planSteps } from './lib/pre-commit-steps.mjs';

/** 旧フックの `xargs` に当たる。1 回の引数が長くなりすぎないよう分けて呼ぶ */
const ARG_CHUNK = 150;

function git(args) {
  return execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/** staged の一覧と、記事品質ラチェットの対象（published: true の記事）を集める */
export function collectContext(env = process.env) {
  const split = (out) => out.split('\0').filter(Boolean);
  const staged = split(git(['diff', '--cached', '--name-only', '-z']));
  // 全量を見る検査の絞り込み用（改名は削除＋追加に割る＝旧パスも入力として見える）
  const status = split(git(['diff', '--cached', '--name-status', '-z', '--no-renames']));
  const entries = [];
  for (let i = 0; i + 1 < status.length; i += 2) entries.push({ status: status[i][0], path: status[i + 1] });
  // 旧フック: git diff --cached --name-only -z --diff-filter=ACMR -- 'content/site/**/*.mdx' → grep -l '^published: *true'
  const mdx = split(git(['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR', '--', 'content/site/**/*.mdx']));
  const contentQualityFiles = mdx.filter((f) => {
    try {
      return /^published: *true/m.test(readFileSync(join(REPO_ROOT, f), 'utf8'));
    } catch {
      return false;
    }
  });
  return { staged, stagedAny: staged, entries, contentQualityFiles, env, exists: (script) => existsSync(join(REPO_ROOT, script)) };
}

/** 子プロセスで検査を呼ぶ。capture 指定なら出力を捕まえて返す（成功時は捨てる＝旧フックの `> log 2>&1`） */
function execChild(step, argv, { capture = false } = {}) {
  const [bin, ...pre] = step.bin ? step.bin.split(' ') : ['node'];
  const chunks = [];
  if (step.id === 'content-quality') {
    const head = argv.filter((a) => a.startsWith('--'));
    const files = argv.filter((a) => !a.startsWith('--'));
    for (let i = 0; i < files.length; i += ARG_CHUNK) chunks.push([...head, ...files.slice(i, i + ARG_CHUNK)]);
  } else {
    chunks.push(argv);
  }
  let code = 0;
  let captured = '';
  const dir = capture ? mkdtempSync(join(tmpdir(), 'doboku-precommit-')) : null;
  try {
    for (const chunk of chunks) {
      const opts = { cwd: REPO_ROOT, shell: process.platform === 'win32' && bin === 'npx' };
      if (capture) {
        const log = join(dir, 'out.log');
        const fd = openSync(log, 'a');
        try {
          const r = spawnSync(bin, [...pre, step.script, ...chunk], { ...opts, stdio: ['ignore', fd, fd] });
          if ((r.status ?? 1) !== 0) code = r.status ?? 1;
        } finally {
          closeSync(fd);
        }
      } else {
        const r = spawnSync(bin, [...pre, step.script, ...chunk], { ...opts, stdio: 'inherit' });
        if ((r.status ?? 1) !== 0) code = r.status ?? 1;
      }
    }
    if (capture) captured = readFileSync(join(dir, 'out.log'), 'utf8');
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
  return { code, captured };
}

/** 出力を捕まえる（旧フックの `> log 2>&1`）。console も process.stdout/stderr.write を通るので 2 つ差し替えれば足りる */
async function captureOutput(fn) {
  const chunks = [];
  const { write: outWrite } = process.stdout;
  const { write: errWrite } = process.stderr;
  const sink = (chunk, enc, cb) => {
    chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());
    (typeof enc === 'function' ? enc : cb)?.();
    return true;
  };
  process.stdout.write = sink;
  process.stderr.write = sink;
  try {
    return { result: await fn(), output: chunks.join('') };
  } finally {
    process.stdout.write = outWrite;
    process.stderr.write = errWrite;
  }
}

/** run() を export している検査を同じプロセスで呼ぶ。投げたら旧フックで node が落ちたときと同じく失敗 */
async function execInProcess(step, argv, { capture = false } = {}) {
  const call = async () => {
    const mod = await import(pathToFileURL(resolve(REPO_ROOT, step.script)).href);
    if (typeof mod.run !== 'function') throw new Error(`${step.script} が run() を export していない（STEPS の inProcess を外すか run() を足す）`);
    return mod.run({ argv, quiet: false, root: REPO_ROOT });
  };
  try {
    if (capture) {
      const { result, output } = await captureOutput(call);
      return { code: result?.code ?? 0, captured: output };
    }
    const r = await call();
    return { code: r?.code ?? 0, captured: '' };
  } catch (e) {
    console.error(e?.stack || String(e));
    return { code: 1, captured: '' };
  }
}

/** PRECOMMIT_VERBOSE=1 なら従来どおり全検査の出力をそのまま出す（DN-0934） */
export function isVerbose(env = process.env) {
  return env.PRECOMMIT_VERBOSE === '1';
}

export function defaultExec(step, argv) {
  // 既定は全検査の出力を捕まえる（成功時は捨て、失敗時と keepOutput だけ出す＝DN-0934）。VERBOSE は tail 指定の検査だけ従来どおり捕まえる
  const capture = Boolean(step.tail) || !isVerbose();
  if (step.inProcess) return execInProcess(step, argv, { capture });
  return execChild(step, argv, { capture });
}

/** `tail -N` と同じ: 改行で終わる最後の N 行（末尾の空行も 1 行として数える） */
export function tailLines(text, n) {
  const body = text.endsWith('\n') ? text.slice(0, -1) : text;
  return body.split('\n').slice(-n).join('\n');
}

/** 出力の中の WARN 行の数（成功した検査の警告を件数だけ要約に載せる） */
export function countWarns(text) {
  return text.split('\n').filter((l) => /\bWARN(ING)?\b|警告/.test(l)).length;
}

/** 最後に出す要約 1 行（WARN を出した検査は名前と件数だけ） */
export function summarize(r, seconds) {
  const warns = r.warns ?? [];
  const warnTotal = warns.reduce((a, w) => a + w.count, 0);
  const warnPart = warnTotal ? `・WARN ${warnTotal} 件（${warns.map((w) => `${w.id} ${w.count}`).join(', ')}）` : '';
  if (r.failed) return `[pre-commit] ${r.failed} で失敗（${r.ran.length} 本目・${seconds} 秒）${warnPart}`;
  return `[pre-commit] ${r.ran.length} 本を実行・OK（${seconds} 秒）${warnPart}`;
}

/** 成功した検査の出力は捨てる。人に読ませる意図のもの（keepOutput）と WARN の件数だけ残す */
function recordSuccess(step, captured, warns, log) {
  if (step.keepOutput && captured.trim() !== '') {
    log(captured.replace(/^\n+|\s+$/g, ''));
    return;
  }
  const n = countWarns(captured);
  if (n > 0) warns.push({ id: step.id, count: n });
}

/**
 * 計画した検査を順に回し、最初の失敗で止める。
 * @returns {Promise<{ code: number, ran: { id: string, ms: number, code: number }[], failed: string|null, warns: { id: string, count: number }[] }>}
 */
export async function dispatch(ctx, { steps = STEPS, exec = defaultExec, log = console.log } = {}) {
  const plan = planSteps(ctx, steps);
  const ran = [];
  const warns = [];
  for (const { step, argv } of plan) {
    const t0 = Date.now();
    const { code, captured } = await exec(step, argv);
    ran.push({ id: step.id, ms: Date.now() - t0, code });
    if (!isFailure(step, code)) recordSuccess(step, captured, warns, log);
    if (!isFailure(step, code)) continue;
    if (captured !== '') log(step.tail ? tailLines(captured, step.tail) : captured.replace(/\s+$/, ''));
    if (step.failHint) log(step.failHint);
    if (step.failMessage) log(step.failMessage);
    return { code: 1, ran, failed: step.id };
  }
  return { code: 0, ran, failed: null, warns };
}

async function main() {
  process.chdir(REPO_ROOT);
  const t0 = Date.now();
  const r = await dispatch(collectContext());
  console.log(summarize(r, ((Date.now() - t0) / 1000).toFixed(1)));
  if (process.env.PRE_COMMIT_TIMING) {
    const slow = [...r.ran].sort((a, b) => b.ms - a.ms).slice(0, 8).map((x) => `${x.id} ${x.ms}ms`).join(', ');
    console.error(`[pre-commit-dispatch] ${r.ran.length} 検査 / ${Date.now() - t0}ms / 遅い順: ${slow}${r.failed ? ` / 失敗: ${r.failed}` : ''}`);
  }
  return r.code;
}

// 検査が残したタイマーなどのハンドルで終わらないことがあるので、書き切ってから明示的に終える
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().then(
    (code) => process.stdout.write('', () => process.stderr.write('', () => process.exit(code))),
    (e) => { console.error(e?.stack || String(e)); process.exit(1); },
  );
}
