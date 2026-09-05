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
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// .claude/skills/social/yt-shorts-create/scripts/lib/ → .claude/skills/conversion/ogp-create/assets/fonts/
const FONT_DIR = resolve(__dirname, '../../../../conversion/ogp-create/assets/fonts');

// Homebrew の通常版 ffmpeg は libass 非搭載。keg-only の ffmpeg-full がある Mac では
// 自動的にそちらを使い、PATH の恒久変更や通常版との link 切替を不要にする。
const HOMEBREW_FULL = '/opt/homebrew/opt/ffmpeg-full/bin';
const FFMPEG_BIN = process.env.FFMPEG_BIN ??
  (existsSync(join(HOMEBREW_FULL, 'ffmpeg')) ? join(HOMEBREW_FULL, 'ffmpeg') : 'ffmpeg');
const FFPROBE_BIN = process.env.FFPROBE_BIN ??
  (existsSync(join(HOMEBREW_FULL, 'ffprobe')) ? join(HOMEBREW_FULL, 'ffprobe') : 'ffprobe');

/**
 * ffmpeg / ffprobe が PATH 上に存在するか確認（同期）。
 * @returns {boolean}
 */
export function ffmpegAvailable() {
  try {
    const r = spawnSync(FFMPEG_BIN, ['-version'], { stdio: 'ignore' });
    return r.status === 0;
  } catch {
    return false;
  }
}

/**
 * 指定したフィルタが ffmpeg に搭載されているか確認（非同期）。
 * @param {string} filterName
 * @returns {Promise<boolean>}
 */
async function checkFilter(filterName) {
  try {
    const { stdout } = await runCommand(FFMPEG_BIN, ['-help', `filter=${filterName}`]);
    return !stdout.includes(`Unknown filter '${filterName}'`);
  } catch {
    try {
      const r = spawnSync(FFMPEG_BIN, ['-help', `filter=${filterName}`], { encoding: 'utf8' });
      return r.stderr ? !r.stderr.includes(`Unknown filter '${filterName}'`) : false;
    } catch {
      return false;
    }
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
 * @param {boolean}  [args.options.requireSubtitles=false] libass が無ければ字幕なしへ落とさず失敗するか
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
    slideMp4s.map(p => {
      const abs = isAbsolute(p) ? p : resolve(p);
      return `file '${abs.replace(/'/g, "'\\''")}'`;
    }).join('\n') + '\n'
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

  // 4) 字幕焼き込み（libass が必要）
  // ffmpeg-full formula または --enable-libass でビルドした場合のみ動作。
  // libass が利用できない場合は字幕なしで _combined.mp4 をそのままコピーする。
  const absAssPath = isAbsolute(assPath) ? assPath : resolve(assPath);
  const escAssPath = absAssPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
  const escFontDir = FONT_DIR.replace(/\\/g, '\\\\').replace(/:/g, '\\:');

  const hasLibass = await checkFilter('subtitles');
  if (hasLibass) {
    await runFFmpeg([
      '-y',
      '-i', combinedMp4,
      '-vf', `subtitles=${escAssPath}:fontsdir=${escFontDir}`,
      '-c:a', 'copy',
      outPath,
    ]);
  } else {
    if (options.requireSubtitles) {
      throw new Error(
        '字幕必須の動画ですが、ffmpeg に libass がありません。Mac は brew install ffmpeg-full、' +
        '他環境は libass 対応 ffmpeg を FFMPEG_BIN / FFPROBE_BIN で指定してください。'
      );
    }
    // libass 未搭載の場合は字幕なしでコピー（WARN を出す）
    process.stderr.write(
      `[WARN] ffmpeg に libass が搭載されていません。字幕なしで出力します。\n` +
      `       字幕付き出力には: brew install ffmpeg-full\n`
    );
    await runFFmpeg([
      '-y',
      '-i', combinedMp4,
      '-c', 'copy',
      outPath,
    ]);
  }

  return { mp4Path: outPath, durations };
}

/**
 * 静止画＋音声の複数 scene を1回の ffmpeg encode で連結し、字幕を焼き込む。
 * 長尺では scene ごとの mp4 化＋最終再encodeが律速になるため、通常動画はこちらを使う。
 */
export async function composeStaticSlidesVideo({ pngPaths, wavPaths, assPath, outPath }) {
  if (!Array.isArray(pngPaths) || !Array.isArray(wavPaths) || pngPaths.length === 0) {
    throw new Error('pngPaths and wavPaths must be non-empty arrays');
  }
  if (pngPaths.length !== wavPaths.length) {
    throw new Error(`pngPaths/wavPaths length mismatch: ${pngPaths.length} vs ${wavPaths.length}`);
  }
  if (!assPath || !outPath) throw new Error('assPath and outPath are required');

  const durations = [];
  for (const wav of wavPaths) durations.push(await probeDuration(wav));

  const args = ['-y'];
  for (let i = 0; i < pngPaths.length; i++) {
    args.push('-loop', '1', '-framerate', '1', '-t', String(durations[i]), '-i', pngPaths[i], '-i', wavPaths[i]);
  }

  const filters = [];
  const concatInputs = [];
  for (let i = 0; i < pngPaths.length; i++) {
    const videoInput = i * 2;
    const audioInput = videoInput + 1;
    filters.push(`[${videoInput}:v]fps=30,format=yuv420p,setsar=1[v${i}]`);
    filters.push(`[${audioInput}:a]aresample=async=1:first_pts=0[a${i}]`);
    concatInputs.push(`[v${i}][a${i}]`);
  }
  filters.push(`${concatInputs.join('')}concat=n=${pngPaths.length}:v=1:a=1[vcat][aout]`);

  const absAssPath = isAbsolute(assPath) ? assPath : resolve(assPath);
  const escAssPath = absAssPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
  const escFontDir = FONT_DIR.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
  if (await checkFilter('subtitles')) {
    filters.push(`[vcat]subtitles=${escAssPath}:fontsdir=${escFontDir}[vout]`);
  } else {
    throw new Error('字幕必須の通常動画ですが、ffmpeg に libass がありません');
  }

  args.push(
    '-filter_complex', filters.join(';'),
    '-map', '[vout]', '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', outPath,
  );
  await runFFmpeg(args);
  return { mp4Path: outPath, durations };
}

/**
 * ffprobe で audio の duration（秒）を取得。
 */
export async function probeDuration(audioPath) {
  const { stdout } = await runCommand(FFPROBE_BIN, [
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
 * 1280×720 専用サムネイルを Satori で描画する。
 *
 * 縦型スライドのクロップではなく、横型キャンバスを新規作成することで
 * 長いキーワード名でもフォントを自動縮小して全テキストを収める。
 *
 * @param {object} args
 * @param {object} args.storyboard  - { title, management } を含む storyboard オブジェクト
 * @param {string} args.outPath     - 出力先 PNG パス
 */
export async function generateThumbnail({ storyboard, outPath }) {
  const { renderSlide, TEXT_CONFIG_DEFAULTS } = await import('../../../../../scripts/lib/sns-common/slide-render.mjs');
  const { writeFileSync } = await import('node:fs');

  const config = {
    ...TEXT_CONFIG_DEFAULTS.ytShorts,
    breakBefore: ['（', '：', '〜'],
    charCountFallback: 12,
    fontSizeTable: [120, 96, 80, 64, 48],
    safetyWidth: 1040,
  };

  // 「・」を行末で折る（行頭に来ると箇条書きに見えるため）
  const title = (storyboard.title || '').replace(/・/g, '・\n');

  const buf = await renderSlide({
    width: 1280,
    height: 720,
    slide: {
      type: 'cover',
      data: {
        title,
        management: storyboard.management || null,
      },
    },
    textConfig: config,
  });

  writeFileSync(outPath, buf);
  return outPath;
}

function runFFmpeg(args) {
  return runCommand(FFMPEG_BIN, args);
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
