#!/usr/bin/env node
/**
 * Instagram Reels 自動生成 CLI（カルーセルパック → VOICEVOX TTS → mp4）
 *
 * Usage:
 *   node ig-reel-create.mjs --exam r07-pack-01
 *
 * 工程:
 *   1. ffmpeg / VOICEVOX チェック
 *   2. slide-data.json 読み込み
 *   3. PNG を reels サイズ (1080×1920) で生成（既存 ig-post-create.mjs を内部呼出）
 *   4. 各スライドの台本生成（cover/problem/answer/cta 型別）
 *   5. VOICEVOX で WAV 生成
 *   6. ffmpeg で連結 → mp4
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../../../');

// 共通モジュールを動的 import（Windows 絶対パスのため pathToFileURL）
const { isRunning, synthesize } = await import(
  pathToFileURL(resolve(ROOT, '.claude/scripts/lib/sns-common/tts-client.mjs')).href
);
const { composeShortsVideo, ffmpegAvailable } = await import(
  pathToFileURL(resolve(ROOT, '.claude/skills/social/yt-shorts-create/scripts/lib/ffmpeg-compose.mjs')).href
);

// ─── 引数 ────────────────────────────────────────────────────

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    exam: { type: 'string' },
    'exam-dir': { type: 'string' },  // 試験軸（既定: 技術士総監）。多資格は 1級土木 / 2級土木 等を明示
    speaker: { type: 'string', default: '1' },
    'skip-png': { type: 'boolean' },
    'script-only': { type: 'boolean' },  // 台本だけ事前生成（VOICEVOX/ffmpeg 不要）
    'problem-pause': { type: 'string', default: '3' },  // problem 後の沈黙秒数
  },
});

const problemPauseSec = Number(args['problem-pause']);
if (!Number.isFinite(problemPauseSec) || problemPauseSec < 0) {
  console.error('--problem-pause は 0 以上の数値で指定してください');
  process.exit(1);
}

if (!args.exam) {
  console.error('Usage: node ig-reel-create.mjs --exam r07-pack-01');
  process.exit(1);
}

// 2級土木は年度に前期(z)/後期(k)接尾辞が付く（例: r07k-pack-01）
const m = args.exam.match(/^([hr]\d+[kz]?)-pack-(\d+)$/);
if (!m) {
  console.error('--exam の形式は <year>-pack-<NN> (例: r07-pack-01 / r07k-pack-01)');
  process.exit(1);
}
const [, year, packNum] = m;

// ─── 環境チェック（script-only モードはスキップ） ──────────────

const scriptOnly = !!args['script-only'];
if (!scriptOnly) {
  if (!ffmpegAvailable()) {
    console.error('Error: ffmpeg が PATH に見つかりません');
    console.error('       台本だけ事前生成したい場合は --script-only フラグを使ってください');
    process.exit(1);
  }
  if (!(await isRunning())) {
    console.error('Error: VOICEVOX エンジンが起動していません');
    console.error('       docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-latest');
    console.error('       台本だけ事前生成したい場合は --script-only フラグを使ってください');
    process.exit(1);
  }
}

// ─── パック情報 ──────────────────────────────────────────────

// 試験軸: --exam-dir 省略時=技術士総監（既定）。多資格は 1級土木 / 2級土木 等を明示。
const examDir = (typeof args['exam-dir'] === 'string' && args['exam-dir']) || '技術士総監';
const packDir = resolve(ROOT, `content/sns/instagram/cem/exam-packs/${examDir}/${year}/pack-${packNum}`);
const slideDataPath = join(packDir, 'slide-data.json');
if (!existsSync(slideDataPath)) {
  console.error(`Error: ${slideDataPath} not found`);
  process.exit(1);
}
const slideData = JSON.parse(readFileSync(slideDataPath, 'utf8'));
const slides = slideData.slides;

console.log(`\n[ig-reel-create] ${args.exam}`);
console.log(`  slides: ${slides.length}`);
console.log(`  speaker: ${args.speaker}`);

// ─── 1) PNG 生成（reels サイズ） ─────────────────────────────

if (!args['skip-png']) {
  console.log('\n[1/4] PNG 1080×1920 を生成中...');
  execSync(
    `node ".claude/skills/social/ig-post-create/scripts/ig-post-create.mjs" --exam ${args.exam} --size reels`,
    { stdio: 'inherit', cwd: ROOT },
  );
} else {
  console.log('\n[1/4] PNG 生成スキップ（--skip-png）');
}

// ─── 2) 台本生成 ─────────────────────────────────────────────

console.log('\n[2/4] 台本生成中...');

function buildScript(sl, idx, meta) {
  if (sl.type === 'cover') {
    const packN = String(packNum).replace(/^0+/, '') || '1';
    if (examDir === '技術士総監') {
      // cover-title が「令和7年度／択一式 過去問 #N」に統一されたので、台本も同じ形に。
      // 旧 sl.title（管理名）は使わない。
      const yearN = year.replace(/^[rR]0?/, '');
      return `令和${yearN}年度の択一式過去問、${packN}番です。全4問、答えは動画内で発表します。`;
    }
    // 土木（1級/2級）: 年度末尾 k=後期 / z=前期、先頭 h=平成 / r=令和
    const era = /^[hH]/.test(year) ? '平成' : '令和';
    const eraN = year.replace(/^[hHrR]0?/, '').replace(/[kz]$/, '');
    const kikan = /k$/.test(year) ? '後期' : /z$/.test(year) ? '前期' : '';
    return `${era}${eraN}年度${kikan}の第一次検定 過去問、${packN}番です。全4問、答えは動画内で発表します。`;
  }
  if (sl.type === 'problem') {
    const body = (sl.bodyLines || [])
      .flatMap((l) => l.split(/\r?\n/))
      .filter((l) => l.trim() && !l.includes('|'))
      .join('')
      .replace(/[\s　]+/g, '');
    return `問題${sl.qNum}。${body}`;
  }
  if (sl.type === 'answer') {
    const point = sl.pointText || '';
    return `正答は${sl.correctNum}番。${sl.correctText}。${point}`;
  }
  if (sl.type === 'cta') {
    // Reels はリーチ獲得器のため、保存より新規フォロー誘導を主にする（ig-reels-policy.md）。
    return 'フォローすると毎週、過去問解説が届きます。全問解説はドボクノートでチェック。';
  }
  return '';
}

const scripts = slides.map((sl, i) => buildScript(sl, i, slideData._meta));

const reelsDir = join(packDir, 'reels');
mkdirSync(reelsDir, { recursive: true });
writeFileSync(
  join(reelsDir, 'script.txt'),
  scripts.map((s, i) => `[${String(i).padStart(2, '0')}] ${s}`).join('\n\n'),
  'utf8',
);
scripts.forEach((s, i) => console.log(`  [${String(i).padStart(2, '0')}] ${s.slice(0, 60)}${s.length > 60 ? '…' : ''}`));

if (scriptOnly) {
  console.log(`\n✓ 台本のみ生成完了 → ${join(reelsDir, 'script.txt')}`);
  console.log('  TTS / mp4 生成は VOICEVOX + ffmpeg 環境準備後に --script-only なしで再実行してください');
  process.exit(0);
}

// ─── 3) TTS（VOICEVOX） ──────────────────────────────────────

console.log('\n[3/4] VOICEVOX で TTS 生成中...');
const wavDir = join(reelsDir, 'wav');
mkdirSync(wavDir, { recursive: true });

const wavPaths = [];
for (let i = 0; i < scripts.length; i++) {
  const text = scripts[i];
  if (!text) {
    console.warn(`  [${i}] 台本が空、スキップ`);
    continue;
  }
  const wav = await synthesize({ text, speaker: Number(args.speaker) });
  const wavPath = join(wavDir, `slide-${String(i).padStart(2, '0')}.wav`);
  writeFileSync(wavPath, wav);

  // problem スライドのみ、末尾に無音 padding を追加
  let finalWavPath = wavPath;
  if (slides[i]?.type === 'problem' && problemPauseSec > 0) {
    const paddedPath = join(wavDir, `slide-${String(i).padStart(2, '0')}-padded.wav`);
    execSync(
      `ffmpeg -y -i "${wavPath}" -af "apad=pad_dur=${problemPauseSec}" "${paddedPath}"`,
      { stdio: 'pipe' },
    );
    finalWavPath = paddedPath;
    process.stdout.write(`  ✓ slide-${String(i).padStart(2, '0')}.wav (${(wav.length / 1024).toFixed(0)}KB) + ${problemPauseSec}s silence\n`);
  } else {
    process.stdout.write(`  ✓ slide-${String(i).padStart(2, '0')}.wav (${(wav.length / 1024).toFixed(0)}KB)\n`);
  }
  wavPaths.push(finalWavPath);
}

// ─── 4) ffmpeg で連結 ──────────────────────────────────────

console.log('\n[4/4] ffmpeg で連結中...');

const imgDir = join(reelsDir, 'img');
// スライド種別から PNG ファイル名を決定（00-cover / 01-problem / 02-answer / ...）
function slideFileName(sl, idx) {
  const num = String(idx).padStart(2, '0');
  const map = { cover: 'cover', problem: 'problem', answer: 'answer', cta: 'cta' };
  return `${num}-${map[sl.type] || sl.type}.png`;
}
const pngPaths = slides.map((sl, i) => join(imgDir, slideFileName(sl, i)));

// 全 PNG の存在チェック
for (const p of pngPaths) {
  if (!existsSync(p)) {
    console.error(`Error: PNG が見つかりません: ${p}`);
    console.error('  --skip-png を外して PNG を生成してください');
    process.exit(1);
  }
}

// 空の字幕ファイル（字幕は不要だが composeShortsVideo の引数として必須）
const assPath = join(reelsDir, '_empty.ass');
writeFileSync(
  assPath,
  '[Script Info]\nScriptType: v4.00+\n\n[V4+ Styles]\n\n[Events]\n',
  'utf8',
);

const outPath = join(reelsDir, 'video.mp4');
const { mp4Path, durations } = await composeShortsVideo({
  pngPaths,
  wavPaths,
  assPath,
  outPath,
});

const totalDuration = durations.reduce((a, b) => a + b, 0);
console.log(`\n✓ ${mp4Path} 生成完了`);
console.log(`  合計: ${totalDuration.toFixed(1)} 秒（${slides.length} スライド）`);
console.log(`  各 slide:`);
durations.forEach((d, i) => console.log(`    [${String(i).padStart(2, '0')}] ${d.toFixed(1)}s`));
