/**
 * codex-image.mjs — codex exec の画像生成を 1 か所に集める（gen-article-photo.mjs・media-plate.mjs が使う）。
 * 実行（spawn）は run で差し替えられる。run は codex --json の出力を返し、画像はその thread_id のフォルダから取る。
 */
import { copyFileSync, existsSync, mkdtempSync, readdirSync, statSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

export const CODEX_TIMEOUT_MS = 15 * 60 * 1000;

const IMAGE = /\.(png|jpe?g|webp)$/i;
/** Codex が生成画像を置く場所。実行ごとに thread_id のフォルダへ入る */
export const codexImagesRoot = () => join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'generated_images');

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
  const threadId = String(stdout ?? '').match(/"thread_id"\s*:\s*"([^"]+)"/)?.[1];
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
export function generateWithCodex(fullPrompt, model, { run = (args) => runCodex(args), tmp = tmpdir(), images = [], imagesRoot } = {}) {
  const dir = mkdtempSync(join(tmp, 'gen-article-photo-'));
  return takeOwnImage(run(codexArgs(dir, fullPrompt, model, images), dir), dir, imagesRoot);
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
export async function generateWithCodexAsync(fullPrompt, model, { run = spawnCodex, tmp = tmpdir(), images = [], imagesRoot } = {}) {
  const dir = mkdtempSync(join(tmp, 'gen-article-photo-'));
  const stdout = await run(codexArgs(dir, fullPrompt, model, images), dir);
  const limit = usageLimitMessage(stdout);
  if (limit) throw new Error(`Codex の利用上限: ${limit}`);
  return takeOwnImage(stdout, dir, imagesRoot);
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
  const args = ['exec', '--json', '--skip-git-repo-check', ...images.flatMap((image) => ['-i', image]), '--sandbox', 'read-only', '-C', dir, ...(model ? ['-m', model] : []), prompt];
  return agentMessage(await run(args, dir));
}
