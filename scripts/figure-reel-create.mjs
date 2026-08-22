#!/usr/bin/env node
/**
 * figure カルーセルパック → IG リール動画ジェネレータ
 *
 * 図解カルーセル（content/sns/instagram/cem/<topic>/carousel/img/*.png, 4:5 1080x1350）を
 * ナレーション付きの 9:16 1080x1920 解説リールに変換する。
 *
 * フロー:
 *   1. carousel/img/*.png を昇順取得（00-cover, 01-figure, ..., NN-cta）
 *   2. 各 PNG を 1080x1920 に白パディング（4:5 を中央配置）→ reels/img/NN.png
 *   3. reels/script.txt（[NN] 1行=1スライドのナレーション）を VOICEVOX TTS → reels/wav/NN.wav
 *   4. composeShortsVideo で各スライドをナレーション尺ぶん表示して連結 → reels/video.mp4
 *   5. パディング済みカバー → reels/cover.png（publish-ig-bs が編集ステップでサムネ設定）
 *
 * 前提: ffmpeg / VOICEVOX(127.0.0.1:50021) 起動。script.txt はパックに事前作成しておく。
 *
 * Usage:
 *   node scripts/figure-reel-create.mjs --pack maslow-hierarchy-of-needs [--speaker 1]
 *   node scripts/figure-reel-create.mjs --pack cem/maslow-hierarchy-of-needs
 *
 * 出力（reels/video.mp4 / wav / img は gitignore 派生物。script.txt + caption.txt のみコミット）
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { synthesize } from '../.claude/scripts/lib/sns-common/tts-client.mjs';
import { applyReadingDict } from '../.claude/scripts/lib/sns-common/reading-dict.mjs';
import { composeShortsVideo } from '../.claude/skills/social/yt-shorts-create/scripts/lib/ffmpeg-compose.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const IG = join(ROOT, 'content/sns/instagram');

const { values } = parseArgs({
  options: {
    pack: { type: 'string' },
    speaker: { type: 'string', default: '1' }, // VOICEVOX 1=四国めたん（既存リールと統一）
  },
});

if (!values.pack) { console.error('🚨 --pack <topic|cem/topic> を指定'); process.exit(1); }
// cem/ 接頭辞は許容
const rel = values.pack.includes('/') ? values.pack : join('cem', values.pack);
const dir = join(IG, rel);
if (!existsSync(dir)) { console.error(`🚨 パックが見つからない: ${dir}`); process.exit(1); }

const imgDir = join(dir, 'carousel', 'img');
const pngs = readdirSync(imgDir).filter(f => /^\d+.*\.png$/.test(f)).sort();
if (pngs.length === 0) { console.error(`🚨 carousel/img に PNG が無い: ${imgDir}`); process.exit(1); }
console.log(`🎬 figure→reel: ${rel} （スライド ${pngs.length} 枚）`);

const reelsDir = join(dir, 'reels');
const reelImg = join(reelsDir, 'img');
const reelWav = join(reelsDir, 'wav');
mkdirSync(reelImg, { recursive: true });
mkdirSync(reelWav, { recursive: true });

// 1. ナレーション原稿（reels/script.txt） — [NN] 行 or 非空行=1スライド
const scriptPath = join(reelsDir, 'script.txt');
if (!existsSync(scriptPath)) { console.error(`🚨 ナレーション原稿が無い: ${scriptPath}\n  [00]〜の行を slide 順に用意してください`); process.exit(1); }
const lines = readFileSync(scriptPath, 'utf-8').split('\n')
  .map(l => l.replace(/^\s*\[\d+\]\s*/, '').trim())
  .filter(l => l.length > 0 && !l.startsWith('#'));
if (lines.length !== pngs.length) {
  console.error(`🚨 ナレーション行数(${lines.length}) ≠ スライド枚数(${pngs.length})。script.txt を見直してください`);
  process.exit(1);
}

function ff(args) {
  const r = spawnSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
  if (r.status !== 0) { console.error('🚨 ffmpeg 失敗'); process.exit(1); }
}

// 2. 9:16 パディング + 3. TTS
const pngPaths = [];
const wavPaths = [];
for (let i = 0; i < pngs.length; i++) {
  const src = join(imgDir, pngs[i]);
  const outPng = join(reelImg, `${String(i).padStart(2, '0')}.png`);
  // 4:5(1080x1350) を 1080x1920 の白キャンバス中央へ（sns-image-policy §13）
  ff(['-y', '-loglevel', 'error', '-i', src,
      '-vf', 'scale=1080:-1,pad=1080:1920:0:(oh-ih)/2:color=white', '-frames:v', '1', outPng]);
  pngPaths.push(outPng);

  const wav = join(reelWav, `${String(i).padStart(2, '0')}.wav`);
  const buf = await synthesize({ text: applyReadingDict(lines[i]), speaker: Number(values.speaker) });
  writeFileSync(wav, buf);
  wavPaths.push(wav);
  console.log(`  [${String(i).padStart(2, '0')}] ${basename(pngs[i])}  ナレ${[...lines[i]].length}字`);
}

// 4. 空 ASS（字幕なし）+ 合成
const assPath = join(reelsDir, '_empty.ass');
writeFileSync(assPath, '[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\n\n[V4+ Styles]\nFormat: Name\n\n[Events]\nFormat: Layer, Start, End, Style, Text\n');

const outMp4 = join(reelsDir, 'video.mp4');
const { durations } = await composeShortsVideo({ pngPaths, wavPaths, assPath, outPath: outMp4, options: { tmpDir: reelsDir } });
const total = durations.reduce((a, b) => a + b, 0);

// 5. カバー（パディング済み 00）→ reels/cover.png（publish-ig-bs サムネ用）
copyFileSync(pngPaths[0], join(reelsDir, 'cover.png'));

console.log(`✅ 完了: ${rel}/reels/video.mp4  尺 ${total.toFixed(1)}s  ${pngs.length}スライド`);
console.log(`   cover.png 出力済 / 投稿: node scripts/publish-... or publish-ig-bs post ${rel} --reel --schedule <dt>`);
