/**
 * codex-image.mjs — codex exec の画像生成を 1 か所に集める（gen-article-photo.mjs・media-plate.mjs・video-factory.mjs が使う）。
 * 実行（spawn）は run で差し替えられる。run は codex --json の出力を返し、画像はその thread_id のフォルダから取る。
 *
 * 後片付け（2026-11-12）: codex exec は 1 回ごとに会話記録（~/.codex/sessions の rollout-*-<thread_id>.jsonl・添付と生成画像を
 * 埋め込むので 1 件 5〜15MB）と元画像（~/.codex/generated_images/<thread_id>）を残し、自分では消さない。動画の一括生成の 2 日で
 * 1,407 件・9GB たまり、空きが 12GB まで落ちた。画像は呼び出し側が自分の置き場へ写すので、取り出したあとに forgetCodexRun で消す。
 * 調べたいときは DOBOKU_CODEX_KEEP_RUNS=1 で残す。画像を作らない問い合わせ（askCodexAboutImages）は --ephemeral で記録を作らない。
 */
import { copyFileSync, existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

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

/** 既定の実行: codex を同期で呼び、--json の出力を返す。失敗しても投げない（画像が出たかで判断する） */
export function runCodex(args) {
  try {
    return execFileSync('codex', args, { stdio: ['ignore', 'pipe', 'inherit'], timeout: CODEX_TIMEOUT_MS, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) { return String(error?.stdout ?? ''); }
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

/** 既定の非同期実行。標準入力は必ず閉じる（開いたままだと codex exec が入力を待ち続けて止まる・2026-11-04） */
export function spawnCodex(args) {
  return new Promise((done) => {
    const child = spawn('codex', args, { stdio: ['ignore', 'pipe', 'ignore'], timeout: CODEX_TIMEOUT_MS });
    let stdout = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.on('error', () => done(stdout));
    child.on('close', () => done(stdout));
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
  const args = ['exec', '--json', '--ephemeral', '--skip-git-repo-check', ...images.flatMap((image) => ['-i', image]), '--sandbox', 'read-only', '-C', dir, ...(model ? ['-m', model] : []), prompt];
  return agentMessage(await run(args, dir));
}
