/**
 * codex-image.mjs — codex exec の画像生成を 1 か所に集める（gen-article-photo.mjs・media-plate.mjs・video-factory.mjs が使う）。
 * 実行（spawn）は run で差し替えられる。run は codex --json の出力を返し、画像はその thread_id のフォルダから取る。
 *
 * 後片付け（2026-11-12）: codex exec は 1 回ごとに会話記録（~/.codex/sessions の rollout-*-<thread_id>.jsonl・添付と生成画像を
 * 埋め込むので 1 件 5〜15MB）と元画像（~/.codex/generated_images/<thread_id>）を残し、自分では消さない。動画の一括生成の 2 日で
 * 1,407 件・9GB たまり、空きが 12GB まで落ちた。画像は呼び出し側が自分の置き場へ写すので、取り出したあとに forgetCodexRun で消す。
 * 調べたいときは DOBOKU_CODEX_KEEP_RUNS=1 で残す。画像を作らない問い合わせ（askCodexAboutImages）は --ephemeral で記録を作らない。
 */
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { datasetPath } from './datasets.mjs';
import { REPO_ROOT } from './repository-paths.mjs';

export const CODEX_TIMEOUT_MS = 15 * 60 * 1000;

const IMAGE = /\.(png|jpe?g|webp)$/i;
const codexHome = () => process.env.CODEX_HOME || join(homedir(), '.codex');
/** Codex が生成画像を置く場所。実行ごとに thread_id のフォルダへ入る */
export const codexImagesRoot = () => join(codexHome(), 'generated_images');
/** Codex が会話記録を置く場所（sessions/YYYY/MM/DD/rollout-<日時>-<thread_id>.jsonl） */
export const codexSessionsRoot = () => join(codexHome(), 'sessions');

const threadIdOf = (stdout) => String(stdout ?? '').match(/"thread_id"\s*:\s*"([^"]+)"/)?.[1] ?? null;

/**
 * この実行が残した会話記録と元画像を消す（画像を取り出したあとに呼ぶ）。消した数を返す。
 * thread_id が読めない・形が違う・DOBOKU_CODEX_KEEP_RUNS=1 のときは何も消さない（他の実行のものに触らない）。
 */
export function forgetCodexRun(stdout, { imagesRoot = codexImagesRoot(), sessionsRoot = codexSessionsRoot(), keep = process.env.DOBOKU_CODEX_KEEP_RUNS === '1' } = {}) {
  const id = threadIdOf(stdout);
  if (keep || !id || !/^[0-9a-f][0-9a-f-]{15,}$/i.test(id)) return 0;
  let removed = 0;
  const own = join(imagesRoot, id);
  if (existsSync(own)) { rmSync(own, { recursive: true, force: true }); removed++; }
  if (existsSync(sessionsRoot)) {
    for (const rel of readdirSync(sessionsRoot, { recursive: true })) {
      if (!String(rel).endsWith(`-${id}.jsonl`)) continue;
      rmSync(join(sessionsRoot, String(rel)), { force: true });
      removed++;
    }
  }
  return removed;
}

/**
 * codex を起動できなかった（実行ファイルが無い・起動できない）。「起動したが画像が出なかった」とは別に投げる（DN-0991）。
 * 以前は起動の失敗も空の出力として返し、呼び出し側が「生成なし」と数えて作り直しを繰り返していた。
 */
export class CodexLaunchError extends Error {
  constructor(cause) {
    super(`codex を起動できない（${cause?.code ?? cause?.message ?? cause}）。codex CLI が PATH にあるか確かめる（Windows は npm の codex.cmd の隣の node_modules/@openai/codex を探す）`);
    this.name = 'CodexLaunchError';
    this.code = cause?.code;
  }
}

const LAUNCH_ERRORS = new Set(['ENOENT', 'EINVAL', 'EACCES', 'EPERM']);
/** 子プロセスの誤りが「起動できなかった」ものか（終了コードの誤りや時間切れは含めない） */
export const isLaunchError = (error) => LAUNCH_ERRORS.has(error?.code) && error?.status == null;

/**
 * codex の起動方法。macOS・Linux は PATH の codex。Windows の npm は codex.cmd を置き、Node 20 以降は .cmd を
 * shell なしで起動できない（EINVAL）うえ、shell 経由では日本語の指示文の引用が崩れる。そこで codex.cmd の隣の
 * node_modules/@openai/codex/bin/codex.js を node で直接起動する（DN-0991）。
 */
export function codexLaunch({ platform = process.platform, path = process.env.PATH ?? '', exists = existsSync, separator = delimiter } = {}) {
  if (platform !== 'win32') return { command: 'codex', prefix: [] };
  for (const dir of path.split(separator).filter(Boolean)) {
    if (!exists(join(dir, 'codex.cmd'))) continue;
    const script = join(dir, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
    if (exists(script)) return { command: process.execPath, prefix: [script] };
  }
  return { command: 'codex.exe', prefix: [] };
}

let defaultModel;
/** 既定のモデル。config/image-generation.json の codexModel（null なら codex の設定に任せる・-m を付けない） */
export function defaultCodexModel() {
  if (defaultModel === undefined) {
    try { defaultModel = JSON.parse(readFileSync(join(REPO_ROOT, datasetPath('config.image-generation')), 'utf8')).codexModel ?? null; } catch { defaultModel = null; }
  }
  return defaultModel;
}

/** 既定の実行: codex を同期で呼び、--json の出力を返す。起動できなければ CodexLaunchError、それ以外の失敗は出力を返す（画像が出たかで判断する） */
export function runCodex(args, { launch = codexLaunch(), exec = execFileSync } = {}) {
  try {
    return exec(launch.command, [...launch.prefix, ...args], { stdio: ['ignore', 'pipe', 'inherit'], timeout: CODEX_TIMEOUT_MS, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    if (isLaunchError(error)) throw new CodexLaunchError(error);
    return String(error?.stdout ?? '');
  }
}

/**
 * この実行の画像だけを dir へ取り出す。Codex に探させると、並列時に別の実行の最新画像を取る（DN-1036）。
 * thread_id が読めない、または自分の画像が無いときは null。
 */
export function takeOwnImage(stdout, dir, imagesRoot = codexImagesRoot()) {
  const threadId = threadIdOf(stdout);
  if (!threadId) return null;
  const own = join(imagesRoot, threadId);
  if (!existsSync(own)) return null;
  const newest = readdirSync(own).filter((f) => IMAGE.test(f)).map((f) => join(own, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
  if (!newest) return null;
  const dest = join(dir, `out${newest.slice(newest.lastIndexOf('.'))}`);
  copyFileSync(newest, dest);
  return dest;
}

/**
 * codex exec に渡す引数。images は指示に添付する画像（描き直しの元の写真など・-i）。
 * -i は続けて複数の画像を受けるので、直後にフラグ（--sandbox）を置いて指示文が画像として読まれないようにする。
 */
export function codexArgs(dir, fullPrompt, model, images = []) {
  model = model ?? defaultCodexModel();
  return ['exec', '--json', '--skip-git-repo-check', ...images.flatMap((image) => ['-i', image]), '--sandbox', 'workspace-write', '-C', dir, ...(model ? ['-m', model] : []),
    `Use your image generation tool. ${fullPrompt} Generate exactly one image. Do not search for or copy image files. Reply with only: done.`];
}

/**
 * 一時フォルダで codex exec の画像生成を 1 回行い、出た最初の png・jpg・webp のパスを返す（出なければ null）。
 * @param {string} fullPrompt 指示文の全文
 * @param {string|null} [model]
 * @param {{ run?: (args: string[], dir: string) => void, tmp?: string, images?: string[] }} [opts] run を差し替えると codex を呼ばない
 */
export function generateWithCodex(fullPrompt, model, { run = (args) => runCodex(args), tmp = tmpdir(), images = [], imagesRoot, sessionsRoot } = {}) {
  const dir = mkdtempSync(join(tmp, 'gen-article-photo-'));
  const stdout = run(codexArgs(dir, fullPrompt, model, images), dir);
  const image = takeOwnImage(stdout, dir, imagesRoot);
  forgetCodexRun(stdout, { ...(imagesRoot ? { imagesRoot } : {}), ...(sessionsRoot ? { sessionsRoot } : {}) });
  return image;
}

/**
 * 生成の一時フォルダ（generateWithCodex が os.tmpdir() に作る gen-article-photo-*）を、画像を写し終えたあとに消す（DN-1013）。
 * 呼び出し側が置き場の形を知らなくてよいように、ここだけが判定する。対象外のパスには触らない。
 */
export function discardGenerated(image, tmp = tmpdir()) {
  if (!image) return false;
  const dir = dirname(image);
  if (!dir.startsWith(tmp) || !/[\\/]gen-article-photo-[^\\/]+$/.test(dir)) return false;
  rmSync(dir, { recursive: true, force: true });
  return true;
}

/** 既定の非同期実行。標準入力は必ず閉じる（開いたままだと codex exec が入力を待ち続けて止まる・2026-11-04） */
export function spawnCodex(args, _dir, { launch = codexLaunch(), start = spawn } = {}) {
  return new Promise((done, fail) => {
    const child = start(launch.command, [...launch.prefix, ...args], { stdio: ['ignore', 'pipe', 'ignore'], timeout: CODEX_TIMEOUT_MS });
    let stdout = '';
    let settled = false;
    child.stdout?.on('data', (chunk) => { stdout += chunk; });
    // 起動できなかったときは error だけが来る（close も来ることがある）。出力が空の「画像なし」と区別して投げる
    child.on('error', (error) => { if (settled) return; settled = true; if (LAUNCH_ERRORS.has(error?.code)) fail(new CodexLaunchError(error)); else done(stdout); });
    child.on('close', () => { if (settled) return; settled = true; done(stdout); });
  });
}

/** Codex の利用上限の応答（ChatGPT のプランの上限）。画像が出ないだけと区別して止める */
export function usageLimitMessage(stdout) {
  return String(stdout ?? '').match(/"message"\s*:\s*"([^"]*usage limit[^"]*)"/i)?.[1] ?? null;
}

/** generateWithCodex の並列用。出た最初の画像のパスを返す（出なければ null）。利用上限なら投げる（2026-11-11・上限の空振りを「画像が出なかった」と数えて作り直しを繰り返した） */
export async function generateWithCodexAsync(fullPrompt, model, { run = spawnCodex, tmp = tmpdir(), images = [], imagesRoot, sessionsRoot } = {}) {
  const dir = mkdtempSync(join(tmp, 'gen-article-photo-'));
  const stdout = await run(codexArgs(dir, fullPrompt, model, images), dir);
  const roots = { ...(imagesRoot ? { imagesRoot } : {}), ...(sessionsRoot ? { sessionsRoot } : {}) };
  const limit = usageLimitMessage(stdout);
  if (limit) { forgetCodexRun(stdout, roots); throw new Error(`Codex の利用上限: ${limit}`); }
  const image = takeOwnImage(stdout, dir, imagesRoot);
  forgetCodexRun(stdout, roots);
  return image;
}

/** codex --json の出力から最後の応答文を取り出す */
export function agentMessage(stdout) {
  let last = '';
  for (const line of String(stdout ?? '').split('\n')) {
    if (!line.includes('agent_message')) continue;
    try { const event = JSON.parse(line); if (event.item?.type === 'agent_message') last = event.item.text ?? last; } catch { /* JSON でない行 */ }
  }
  return last;
}

/** 画像を添付して Codex に文章で答えさせる（読み取り専用）。監査など、画像を作らない用途 */
export async function askCodexAboutImages(prompt, images, { run = spawnCodex, model = null, tmp = tmpdir() } = {}) {
  const dir = mkdtempSync(join(tmp, 'codex-review-'));
  // 文章で答えるだけなので会話記録を残さない（--ephemeral。添付画像を埋め込んだ記録が 1 件数 MB になる）
  const chosen = model ?? defaultCodexModel();
  const args = ['exec', '--json', '--ephemeral', '--skip-git-repo-check', ...images.flatMap((image) => ['-i', image]), '--sandbox', 'read-only', '-C', dir, ...(chosen ? ['-m', chosen] : []), prompt];
  return agentMessage(await run(args, dir));
}
