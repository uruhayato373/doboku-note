#!/usr/bin/env node
/**
 * angle-reel-create.mjs — 角度駆動リール（discovery）レンダラ。
 *
 * ig-reels-policy §7（mode:"angle"）の script.json から、hook/point/cta の縦型スライドを
 * 自前 SVG→PNG で描画し、VOICEVOX TTS ＋ ffmpeg で 9:16 短尺リールに合成する。
 * figure-reel-create（カルーセル貼り＋読み上げ＝§7 で非推奨）とは別物＝1論点・フック先頭の
 * discovery リール専用。
 *
 * スライド・フィールド（type 別・すべて任意、narration のみ必須）:
 *   hook : chip / lead(白) / punch(アクセント＋下線) / sub(灰のサブ) / anchor(巨大な薄い1字)
 *   point: label(小見出し) / big(アクセントの reveal 語) / onScreen(本文・濃色)
 *   cta  : onScreen(行)  ＋ フォローボタン自動
 *   共通 : narration（読み上げ）。onScreen 等は画面表示用＝narration 全文は載せない。
 *
 * 使い方:
 *   node scripts/angle-reel-create.mjs --pack cem/angle-reels/<packId> [--speaker 3] [--png-only]
 *   --png-only: PNG だけ描画（VOICEVOX 不要・ビジュアル確認用）
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
const C = { brand: '#1858B5', navy: '#0F2742', navyDeep: '#16314f', ink: '#14305A', white: '#FFFFFF', bg: '#F4F7FB', sub: '#7FA3C7', subDark: '#5B7A9D', accent: '#FFC53D' };
const W = 1080, H = 1920;
const CHIP = { experience: '体験談', counter: 'よくある誤解', conclusion: '結論', number: 'データ' };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 文字幅ベースの素朴な改行（日本語 ≈ 1em/字）。明示改行 \n も尊重。
function lines(text, fontSize, usableW = 880) {
  if (!text) return [];
  const max = Math.max(5, Math.floor(usableW / fontSize));
  const out = []; let line = '';
  for (const ch of String(text)) {
    if (ch === '\n') { out.push(line); line = ''; continue; }
    line += ch;
    if ([...line].length >= max) { out.push(line); line = ''; }
  }
  if (line) out.push(line);
  return out;
}
// 行配列を <text> ブロックにし、最終 baseline を返す（baseline 基準で上から積む）
function block({ ls, x = W / 2, y, fontSize, lh, fill, weight = 700, anchor = 'middle', ls2 = 0 }) {
  if (!ls.length) return { svg: '', endY: y };
  const tspans = ls.map((l, i) => `<tspan x="${x}" y="${y + i * lh}">${esc(l)}</tspan>`).join('');
  const svg = `<text font-family="Noto Sans JP" font-weight="${weight}" font-size="${fontSize}" fill="${fill}" text-anchor="${anchor}"${ls2 ? ` letter-spacing="${ls2}"` : ''}>${tspans}</text>`;
  return { svg, endY: y + (ls.length - 1) * lh };
}

function svgHook(s, angle) {
  const chip = s.chip || (CHIP[angle] ? `${CHIP[angle]}｜発注者` : '技術士 総監');
  const lead = lines(s.lead, 104, 900);
  const punch = lines(s.punch || s.onScreen, 124, 900);
  const sub = s.sub;
  const anchor = s.anchor;
  const leadH = lead.length * 140, punchH = punch.length * 152;
  const totalH = leadH + 40 + punchH + (sub ? 120 : 0);
  let y = Math.max(540, (H - totalH) / 2 - 60) + 104;
  const bLead = block({ ls: lead, y, fontSize: 104, lh: 140, fill: C.white, ls2: 1 });
  y = bLead.endY + 40 + 124;
  const bPunch = block({ ls: punch, y, fontSize: 124, lh: 152, fill: C.accent, ls2: 1 });
  const underlineY = bPunch.endY + 44;
  const subSvg = sub ? block({ ls: lines(sub, 46, 940), y: underlineY + 100, fontSize: 46, lh: 64, fill: C.sub }).svg : '';
  const chipW = Math.max(360, [...chip].length * 44 + 80);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.navy}"/>
  <rect x="0" y="0" width="${W}" height="16" fill="${C.brand}"/>
  ${anchor ? `<text x="${W - 30}" y="1520" font-family="Noto Sans JP" font-weight="700" font-size="920" fill="${C.navyDeep}" text-anchor="end" opacity="0.55">${esc(anchor)}</text>` : ''}
  <rect x="90" y="250" width="${chipW}" height="84" rx="42" fill="${C.accent}"/>
  <text x="${90 + chipW / 2}" y="307" font-family="Noto Sans JP" font-weight="700" font-size="40" fill="${C.navy}" text-anchor="middle">${esc(chip)}</text>
  ${bLead.svg}
  ${bPunch.svg}
  <rect x="240" y="${underlineY}" width="600" height="12" rx="6" fill="${C.accent}" opacity="0.85"/>
  ${subSvg}
  <text x="${W / 2}" y="1810" font-family="Noto Sans JP" font-weight="700" font-size="36" fill="${C.sub}" text-anchor="middle">@dobokunotecom</text>
</svg>`;
}

function svgPoint(s) {
  const label = s.label;
  const big = lines(s.big, 130, 920);
  const body = lines(s.onScreen, 58, 900);
  const bigH = big.length * 158, bodyH = body.length * 86;
  const totalH = (label ? 90 : 0) + bigH + (big.length ? 50 : 0) + bodyH;
  let y = Math.max(560, (H - totalH) / 2 - 40);
  const labelSvg = label ? `<rect x="100" y="${y - 56}" width="14" height="60" rx="7" fill="${C.accent}"/><text x="134" y="${y - 8}" font-family="Noto Sans JP" font-weight="700" font-size="44" fill="${C.subDark}" text-anchor="start">${esc(label)}</text>` : '';
  if (label) y += 90;
  y += 130;
  const bBig = block({ ls: big, y, fontSize: 130, lh: 158, fill: C.brand });
  const by = (big.length ? bBig.endY + 50 : y) + 58;
  const bBody = block({ ls: body, y: by, fontSize: 58, lh: 86, fill: C.ink });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect x="0" y="0" width="${W}" height="16" fill="${C.brand}"/>
  ${labelSvg}
  ${bBig.svg}
  ${bBody.svg}
  <text x="${W / 2}" y="1810" font-family="Noto Sans JP" font-weight="700" font-size="34" fill="${C.subDark}" text-anchor="middle">@dobokunotecom</text>
</svg>`;
}

function svgCta(s) {
  const ls = lines(s.onScreen || 'プロフィールのリンクから\nフォローで毎週', 64, 920);
  const h = ls.length * 92;
  const y = (H - h) / 2 - 120 + 64;
  const b = block({ ls, y, fontSize: 64, lh: 92, fill: C.white });
  const btnY = b.endY + 90;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.brand}"/>
  <text x="${W / 2}" y="430" font-family="Noto Sans JP" font-weight="700" font-size="120" fill="#2f6fc7" text-anchor="middle">▶</text>
  ${b.svg}
  <rect x="${W / 2 - 230}" y="${btnY}" width="460" height="104" rx="52" fill="${C.white}"/>
  <text x="${W / 2}" y="${btnY + 68}" font-family="Noto Sans JP" font-weight="700" font-size="46" fill="${C.brand}" text-anchor="middle">＋ フォロー</text>
  <text x="${W / 2}" y="1810" font-family="Noto Sans JP" font-weight="700" font-size="36" fill="${C.white}" text-anchor="middle">@dobokunotecom</text>
</svg>`;
}

function renderSvg(s, angle) {
  const svg = s.type === 'hook' ? svgHook(s, angle) : s.type === 'cta' ? svgCta(s) : svgPoint(s);
  return new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: true, fontFiles: existsSync(FONT) ? [FONT] : [] } }).render().asPng();
}

// ─── 描画 ───
mkdirSync(reelsDir, { recursive: true });
const pngPaths = [];
console.log(`🎬 angle-reel: ${values.pack}  angle=${spec.angle}  slides=${spec.slides.length}`);
for (let i = 0; i < spec.slides.length; i++) {
  const s = spec.slides[i];
  const png = join(reelsDir, `slide-${String(i).padStart(2, '0')}.png`);
  writeFileSync(png, renderSvg(s, spec.angle));
  pngPaths.push(png);
  console.log(`  [${i}] ${s.type}`);
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
