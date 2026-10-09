/**
 * codex-image.mjs — codex exec の画像生成を 1 か所に集める（gen-article-photo.mjs・media-plate.mjs が使う）。
 * 実行（spawn）は run で差し替えられる。テストは偽の run で「画像ができた」「できなかった」を固定する。
 */
import { mkdtempSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const CODEX_TIMEOUT_MS = 15 * 60 * 1000;

/** 既定の実行: codex を同期で呼ぶ。失敗しても投げない（画像が出たかで判断する） */
export function runCodex(args) {
  try { execFileSync('codex', args, { stdio: ['ignore', 'ignore', 'inherit'], timeout: CODEX_TIMEOUT_MS }); } catch { /* 画像が出たかで判断する */ }
}

/** codex exec に渡す引数 */
export function codexArgs(dir, fullPrompt, model) {
  return ['exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', '-C', dir, ...(model ? ['-m', model] : []),
    `Use your image generation tool. ${fullPrompt} After generating, copy the generated image file into the current working directory as out.png. Reply with only the saved path.`];
}

/**
 * 一時フォルダで codex exec の画像生成を 1 回行い、出た最初の png・jpg・webp のパスを返す（出なければ null）。
 * @param {string} fullPrompt 指示文の全文
 * @param {string|null} [model]
 * @param {{ run?: (args: string[], dir: string) => void, tmp?: string }} [opts] run を差し替えると codex を呼ばない
 */
export function generateWithCodex(fullPrompt, model, { run = (args) => runCodex(args), tmp = tmpdir() } = {}) {
  const dir = mkdtempSync(join(tmp, 'gen-article-photo-'));
  run(codexArgs(dir, fullPrompt, model), dir);
  const out = readdirSync(dir).find((f) => /\.(png|jpe?g|webp)$/i.test(f));
  return out ? join(dir, out) : null;
}
