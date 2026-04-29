/**
 * ffmpeg / ffprobe を呼んで PNG 列 + wav 列 + .ass 字幕 → mp4 を生成する。
 *
 * 戦略（approach A: 各スライドを個別動画化 → concat → 字幕焼き込み）:
 *   1. ffprobe で各 wav の duration を計測
 *   2. 各 (PNG, wav) を loop 動画 + 音声で個別 mp4 化（slide-NN.mp4）
 *   3. concat list で連結 → _combined.mp4
 *   4. .ass 字幕を焼き込み → 最終 mp4
 *
 * デバッグしやすさを優先（個別 slide-NN.mp4 を確認できる）。
 * ffmpeg / ffprobe が PATH に無い場合は明示的なエラー。
 */

import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// .claude/skills/social/yt-shorts-create/scripts/lib/ → .claude/skills/conversion/ogp-create/assets/fonts/
const FONT_DIR = resolve(__dirname, '../../../../conversion/ogp-create/assets/fonts');

/**
 * ffmpeg / ffprobe が PATH 上に存在するか確認（同期）。
 * @returns {boolean}
 */
export function ffmpegAvailable() {
  try {
    const r = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return r.status === 0;
  } catch {
    return false;
  }
}

/**
 * @param {object} args
 * @param {string[]} args.pngPaths   各スライドの PNG パス（順番通り）
 * @param {string[]} args.wavPaths   各スライドの wav パス（順番通り）
 * @param {string}   args.assPath    字幕 .ass ファイルパス
 * @param {string}   args.outPath    最終 mp4 出力パス
 * @param {object}   [args.options]
 * @param {string}   [args.options.tmpDir] 中間ファイル置き場（既定: dirname(outPath)）
 * @param {boolean}  [args.options.keepIntermediates=false] 中間 mp4 を残すか
 * @returns {Promise<{ mp4Path: string, durations: number[] }>}
 */
export async function composeShortsVideo({
  pngPaths,
  wavPaths,
  assPath,
  outPath,
  options = {},
}) {
  if (!Array.isArray(pngPaths) || !Array.isArray(wavPaths)) {
    throw new Error('pngPaths and wavPaths must be arrays');
  }
  if (pngPaths.length === 0) {
    throw new Error('pngPaths must not be empty');
  }
  if (pngPaths.length !== wavPaths.length) {
    throw new Error(
      `pngPaths/wavPaths length mismatch: ${pngPaths.length} vs ${wavPaths.length}`
    );
  }
  if (!assPath) throw new Error('assPath is required');
  if (!outPath) throw new Error('outPath is required');

  const tmpDir = options.tmpDir ?? dirname(outPath);
  mkdirSync(tmpDir, { recursive: true });

  // 1) 各 wav の duration を計測
  const durations = [];
  for (const wav of wavPaths) durations.push(await probeDuration(wav));

  // 2) 各スライドを個別 mp4 化
  const slideMp4s = [];
  for (let i = 0; i < pngPaths.length; i++) {
    const slideMp4 = join(tmpDir, `slide-${String(i).padStart(2, '0')}.mp4`);
    await runFFmpeg([
      '-y',
      '-loop', '1',
      '-t', String(durations[i]),
      '-i', pngPaths[i],
      '-i', wavPaths[i],
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      slideMp4,
    ]);
    slideMp4s.push(slideMp4);
  }

  // 3) concat list 作成 → 連結
  const concatTxt = join(tmpDir, 'concat.txt');
  writeFileSync(
    concatTxt,
    slideMp4s.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n'
  );

  const combinedMp4 = join(tmpDir, '_combined.mp4');
  await runFFmpeg([
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatTxt,
    '-c', 'copy',
    combinedMp4,
  ]);

  // 4) 字幕焼き込み（fontsdir で Noto Sans JP Bold を解決）
  await runFFmpeg([
    '-y',
    '-i', combinedMp4,
    '-vf', `subtitles=${assPath}:fontsdir=${FONT_DIR}`,
    '-c:a', 'copy',
    outPath,
  ]);

  return { mp4Path: outPath, durations };
}

/**
 * ffprobe で audio の duration（秒）を取得。
 */
export async function probeDuration(audioPath) {
  const { stdout } = await runCommand('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    audioPath,
  ]);
  const seconds = parseFloat(stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`ffprobe returned invalid duration for ${audioPath}: "${stdout.trim()}"`);
  }
  return seconds;
}

/**
 * cover PNG を 1280×720 のサムネイルにリサイズ（sharp 利用、center crop）。
 */
export async function generateThumbnail({ coverPngPath, outPath, width = 1280, height = 720 }) {
  const { default: sharp } = await import('sharp');
  await sharp(coverPngPath)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .toFile(outPath);
  return outPath;
}

function runFFmpeg(args) {
  return runCommand('ffmpeg', args);
}

function runCommand(cmd, args) {
  return new Promise((resolveP, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('error', err => {
      if (err.code === 'ENOENT') {
        reject(new Error(`${cmd} not found in PATH. Install with: brew install ffmpeg`));
      } else {
        reject(err);
      }
    });
    proc.on('close', code => {
      if (code === 0) resolveP({ stdout, stderr });
      else reject(new Error(`${cmd} exited with code ${code}\n${stderr.slice(-2000)}`));
    });
  });
}
