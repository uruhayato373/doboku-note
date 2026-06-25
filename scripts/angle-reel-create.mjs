#!/usr/bin/env node
/**
 * angle-reel-create.mjs — 角度駆動リール（discovery）レンダラ。
 *
 * ig-reels-policy §7（mode:"angle"）の script.json から、hook/point/cta の縦型スライドを
 * 自前 SVG→PNG で描画し、VOICEVOX TTS ＋ ffmpeg で 9:16 短尺リールに合成する。
 * figure-reel-create（カルーセル貼り＋読み上げ＝§7 で非推奨）とは別物＝1論点・フック先頭の
 * discovery リール専用。
 *
 * 入力: <pack>/reels/script.json（mode:"angle"・slides[].{type,onScreen,narration,durationSec}）
 *   - type: "hook" | "point" | "cta"
 *   - onScreen: 画面に出す短文（フック/要点/CTA。narration とは別＝narration 全文は載せない）
 *   - narration: VOICEVOX で読み上げる文（尺はナレ長で決まる）
 * 出力: <pack>/reels/{video.mp4, cover.png}（gitignore・JIT）。SoT は script.json + caption.txt。
 *
 * 使い方:
 *   node scripts/angle-reel-create.mjs --pack cem/angle-reels/<packId> [--speaker 3] [--png-only]
 *   --png-only: PNG だけ描画（VOICEVOX 不要・ビジュアル確認用）
 *
 * 前提: VOICEVOX 起動（localhost:50021）＋ ffmpeg。--png-only は VOICEVOX 不要。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { Resvg } from '@resvg/resvg-js';

const ROOT = resolve(import.meta.dirname, '..');
const IG = join(ROOT, 'docs/sns/instagram');
const FONT = join(ROOT, '.claude/skills/conversion/ogp-create/assets/fonts/NotoSansJP-Bold.ttf');

const { values } = parseArgs({ options: {
  pack: { type: 'string' }, speaker: { type: 'string', default: '3' }, 'png-only': { type: 'boolean', default: false },
} });
if (!values.pack) { console.error('🚨 --pack <cem/angle-reels/packId> を指定'); process.exit(1); }

const dir = join(IG, values.pack.includes('/') ? values.pack : join('cem', values.pack));
const reelsDir = join(dir, 'reels');
const scriptPath = join(reelsDir, 'script.json');
if (!existsSync(scriptPath)) { console.error(`🚨 script.json が無い: ${scriptPath}`); process.exit(1); }
const spec = JSON.parse(readFileSync(scriptPath, 'utf-8'));
if (spec.mode !== 'angle' || !Array.isArray(spec.slides)) { console.error('🚨 mode:"angle" の script.json ではない'); process.exit(1); }

// ─── ブランド（instagram-carousel-tokens 準拠） ───
const C = { brand: '#1858B5', navy: '#0F2742', ink: '#14305A', white: '#FFFFFF', bg: '#F4F7FB', sub: '#5B7A9D', accent: '#FFC53D' };
const W = 1080, H = 1920;

// 文字幅ベースの素朴な改行（日本語 ≈ 1em/字）。maxChars = 使用幅 / フォントサイズ。
function wrap(text, fontSize, usableW = 840) {
  const max = Math.max(6, Math.floor(usableW / fontSize));
  const out = []; let line = '';
  for (const ch of String(text)) {
    if (ch === '\n') { out.push(line); line = ''; continue; }
    line += ch;
    if ([...line].length >= max) { out.push(line); line = ''; }
  }
  if (line) out.push(line);
  return out;
}
function tspans(lines, x, startY, lh) {
  return lines.map((l, i) => `<tspan x="${x}" y="${startY + i * lh}">${esc(l)}</tspan>`).join('');
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ─── スライド SVG（type 別テンプレ。IG UI セーフエリア＝下部 y>1500 と右端は避ける） ───
function svgHook(onScreen) {
  const fs = 76, lines = wrap(onScreen, fs, 860), lh = fs * 1.45;
  const blockH = lines.length * lh, startY = (H - blockH) / 2 + fs;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.navy}"/>
  <rect x="0" y="0" width="${W}" height="14" fill="${C.brand}"/>
  <rect x="110" y="180" width="180" height="64" rx="32" fill="${C.brand}"/>
  <text x="200" y="223" font-family="Noto Sans JP" font-weight="700" font-size="30" fill="${C.white}" text-anchor="middle">技術士 総監</text>
  <text font-family="Noto Sans JP" font-weight="700" font-size="${fs}" fill="${C.white}" text-anchor="middle" letter-spacing="1">${tspans(lines, W/2, startY, lh)}</text>
  <text x="${W/2}" y="1760" font-family="Noto Sans JP" font-weight="700" font-size="34" fill="${C.sub}" text-anchor="middle">@dobokunotecom</text>
</svg>`;
}
function svgPoint(onScreen) {
  const fs = 60, lines = wrap(onScreen, fs, 860), lh = fs * 1.5;
  const blockH = lines.length * lh, startY = (H - blockH) / 2 + fs;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect x="110" y="${startY - fs - 70}" width="120" height="12" rx="6" fill="${C.accent}"/>
  <text font-family="Noto Sans JP" font-weight="700" font-size="${fs}" fill="${C.ink}" text-anchor="middle">${tspans(lines, W/2, startY, lh)}</text>
  <text x="${W/2}" y="1760" font-family="Noto Sans JP" font-weight="700" font-size="32" fill="${C.sub}" text-anchor="middle">@dobokunotecom</text>
</svg>`;
}
function svgCta(onScreen) {
  const fs = 66, lines = wrap(onScreen || 'フォローで毎週\nプロフィールのリンクから', fs, 860), lh = fs * 1.5;
  const blockH = lines.length * lh, startY = (H - blockH) / 2 + fs - 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.brand}"/>
  <text font-family="Noto Sans JP" font-weight="700" font-size="${fs}" fill="${C.white}" text-anchor="middle">${tspans(lines, W/2, startY, lh)}</text>
  <rect x="${W/2 - 200}" y="${startY + blockH - fs + 40}" width="400" height="92" rx="46" fill="${C.white}"/>
  <text x="${W/2}" y="${startY + blockH - fs + 100}" font-family="Noto Sans JP" font-weight="700" font-size="40" fill="${C.brand}" text-anchor="middle">＋ フォロー</text>
  <text x="${W/2}" y="1760" font-family="Noto Sans JP" font-weight="700" font-size="34" fill="${C.white}" text-anchor="middle">@dobokunotecom</text>
</svg>`;
}
function renderSvg(type, onScreen) {
  const svg = type === 'hook' ? svgHook(onScreen) : type === 'cta' ? svgCta(onScreen) : svgPoint(onScreen);
  return new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: true, fontFiles: existsSync(FONT) ? [FONT] : [] } }).render().asPng();
}

// ─── 描画 ───
mkdirSync(reelsDir, { recursive: true });
const pngPaths = [];
console.log(`🎬 angle-reel: ${values.pack}  angle=${spec.angle}  slides=${spec.slides.length}`);
for (let i = 0; i < spec.slides.length; i++) {
  const s = spec.slides[i];
  const onScreen = s.onScreen || s.narration || '';
  const png = join(reelsDir, `slide-${String(i).padStart(2, '0')}.png`);
  writeFileSync(png, renderSvg(s.type, onScreen));
  pngPaths.push(png);
  console.log(`  [${i}] ${s.type.padEnd(5)} onScreen="${onScreen.replace(/\n/g, ' ').slice(0, 28)}"`);
}
copyFileSync(pngPaths[0], join(reelsDir, 'cover.png'));
console.log('  cover.png = hook スライド');

if (values['png-only']) { console.log('✅ PNG のみ描画（--png-only）。VOICEVOX 起動後に外して動画化。'); process.exit(0); }

// ─── TTS + 合成（VOICEVOX 必要） ───
const { synthesize } = await import('../.claude/scripts/lib/sns-common/tts-client.mjs');
const { applyReadingDict } = await import('../.claude/scripts/lib/sns-common/reading-dict.mjs');
const { composeShortsVideo } = await import('../.claude/skills/social/yt-shorts-create/scripts/lib/ffmpeg-compose.mjs');

const wavPaths = [];
for (let i = 0; i < spec.slides.length; i++) {
  const wav = join(reelsDir, `slide-${String(i).padStart(2, '0')}.wav`);
  const buf = await synthesize({ text: applyReadingDict(spec.slides[i].narration), speaker: Number(values.speaker) });
  writeFileSync(wav, buf);
  wavPaths.push(wav);
}
const assPath = join(reelsDir, '_empty.ass');
writeFileSync(assPath, '[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\n\n[V4+ Styles]\nFormat: Name\n\n[Events]\nFormat: Layer, Start, End, Style, Text\n');
const outMp4 = join(reelsDir, 'video.mp4');
const { durations } = await composeShortsVideo({ pngPaths, wavPaths, assPath, outPath: outMp4, options: { tmpDir: reelsDir } });
const total = durations.reduce((a, b) => a + b, 0);
console.log(`✅ 完了: ${values.pack}/reels/video.mp4  尺 ${total.toFixed(1)}s（角度=${spec.angle}）`);
console.log(`   投稿: publish-ig-bs post ${values.pack} --reel --schedule <dt>（cover.png をサムネ設定）`);
