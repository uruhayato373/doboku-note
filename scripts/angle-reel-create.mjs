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
 *   character: ブランドマスコット合成（任意）。"pointing" 等の slug 文字列、または
 *             { "pose":"explaining", "side":"left"|"right", "scale":0.42 }。下隅にフェードイン＋
 *             せり上がりで登場。slug は .claude/config/character-poses.json（真実源=character-asset-policy.md）。
 *
 * 使い方:
 *   node scripts/angle-reel-create.mjs --pack cem/angle-reels/<packId> [--speaker 3] [--png-only]
 *   --png-only: PNG だけ描画（VOICEVOX 不要・ビジュアル確認用）
 * 前提: VOICEVOX 起動（localhost:50021）＋ ffmpeg。--png-only は VOICEVOX 不要。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { Resvg } from '@resvg/resvg-js';

const ROOT = resolve(import.meta.dirname, '..');
const IG = join(ROOT, 'content/sns/instagram');
const FONT = join(ROOT, '.claude/skills/conversion/ogp-create/assets/fonts/NotoSansJP-Bold.ttf');
const CHARDIR = join(ROOT, 'content/sns/_assets/character');

// スライドの character 指定（slug 文字列 or {pose,side,scale}）を解決。無ければ null。
function charOf(s) {
  const c = s.character; if (!c) return null;
  const pose = typeof c === 'string' ? c : c.pose;
  if (!pose) return null;
  const path = join(CHARDIR, `${pose}.png`);
  if (!existsSync(path)) { console.warn(`  ⚠ character "${pose}" が無い（${CHARDIR}）: 合成スキップ`); return null; }
  return { path, side: (typeof c === 'object' && c.side) || 'right', scale: (typeof c === 'object' && c.scale) || 0.42 };
}

const { values } = parseArgs({ options: {
  pack: { type: 'string' }, speaker: { type: 'string' }, 'png-only': { type: 'boolean', default: false },
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

// hook のレイアウトを 1 度計算し、レイヤー別の SVG 片を返す（キネティック分割用）。
function hookLayout(s, angle) {
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
  const chipW = Math.max(360, [...chip].length * 44 + 80);
  return {
    hasPunch: punch.length > 0,
    bg: `<rect width="${W}" height="${H}" fill="${C.navy}"/><rect x="0" y="0" width="${W}" height="16" fill="${C.brand}"/>`,
    chip: `<rect x="90" y="250" width="${chipW}" height="84" rx="42" fill="${C.accent}"/><text x="${90 + chipW / 2}" y="307" font-family="Noto Sans JP" font-weight="700" font-size="40" fill="${C.navy}" text-anchor="middle">${esc(chip)}</text>`,
    lead: bLead.svg,
    anchor: anchor ? `<text x="${W - 30}" y="1520" font-family="Noto Sans JP" font-weight="700" font-size="920" fill="${C.navyDeep}" text-anchor="end" opacity="0.55">${esc(anchor)}</text>` : '',
    punch: bPunch.svg + `<rect x="240" y="${underlineY}" width="600" height="12" rx="6" fill="${C.accent}" opacity="0.85"/>` + (sub ? block({ ls: lines(sub, 46, 940), y: underlineY + 100, fontSize: 46, lh: 64, fill: C.sub }).svg : ''),
    handle: `<text x="${W / 2}" y="1810" font-family="Noto Sans JP" font-weight="700" font-size="36" fill="${C.sub}" text-anchor="middle">@dobokunotecom</text>`,
  };
}
const wrapSvg = (inner, transparent = false) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${inner}</svg>`;
function svgHook(s, angle) { const L = hookLayout(s, angle); return wrapSvg(L.bg + L.anchor + L.chip + L.lead + L.punch + L.handle); }
// キネティック: base=lead 先行（punch/anchor なし）/ punch=遅延フェードイン層（透明背景）
function svgHookBase(s, angle) { const L = hookLayout(s, angle); return wrapSvg(L.bg + L.chip + L.lead + L.handle); }
function svgHookPunch(s, angle) { const L = hookLayout(s, angle); return wrapSvg(L.anchor + L.punch, true); }

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

function renderSvgRaw(svg) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: true, fontFiles: existsSync(FONT) ? [FONT] : [] } }).render().asPng();
}
function renderSvg(s, angle) {
  return renderSvgRaw(s.type === 'hook' ? svgHook(s, angle) : s.type === 'cta' ? svgCta(s) : svgPoint(s));
}

// ─── 描画 ───
mkdirSync(reelsDir, { recursive: true });
const pngPaths = [];     // ズーム対象のベース層（hook キネティック時は lead 先行のベース）
const kinetic = [];      // hook の punch 遅延フェードイン層（透明 PNG）or null
let coverSrc = null;
console.log(`🎬 angle-reel: ${values.pack}  angle=${spec.angle}  slides=${spec.slides.length}`);
for (let i = 0; i < spec.slides.length; i++) {
  const s = spec.slides[i];
  const ii = String(i).padStart(2, '0');
  if (s.type === 'hook') {
    const L = hookLayout(s, spec.angle);
    const full = join(reelsDir, `slide-${ii}.png`); writeFileSync(full, renderSvgRaw(svgHook(s, spec.angle)));
    coverSrc = full; // カバーは punch まで入った完成フック（ラスタライズ済み PNG）
    if (L.hasPunch && s.lead) { // lead と punch が揃うときだけキネティック分割
      const base = join(reelsDir, `slide-${ii}-base.png`); writeFileSync(base, renderSvgRaw(svgHookBase(s, spec.angle)));
      const punch = join(reelsDir, `slide-${ii}-punch.png`); writeFileSync(punch, renderSvgRaw(svgHookPunch(s, spec.angle)));
      pngPaths.push(base); kinetic.push(punch); console.log(`  [${i}] hook（キネティック: lead→punch）`);
    } else { pngPaths.push(full); kinetic.push(null); console.log(`  [${i}] hook`); }
  } else {
    const png = join(reelsDir, `slide-${ii}.png`); writeFileSync(png, renderSvg(s, spec.angle));
    pngPaths.push(png); kinetic.push(null); console.log(`  [${i}] ${s.type}`);
  }
}
copyFileSync(coverSrc ?? pngPaths[0], join(reelsDir, 'cover.png'));
console.log('  cover.png = 完成フック');

if (values['png-only']) { console.log('✅ PNG のみ描画（--png-only）。VOICEVOX 起動後に外して動画化。'); process.exit(0); }

// ─── TTS（VOICEVOX 必要）───
const { synthesize } = await import('../.claude/scripts/lib/sns-common/tts-client.mjs');
const { applyReadingDict } = await import('../.claude/scripts/lib/sns-common/reading-dict.mjs');
// 声: CLI --speaker > script.json speaker > 既定 13（青山龍星・成熟男性。発注者の一人称体験に合う）
const speaker = values.speaker !== undefined ? Number(values.speaker) : (spec.speaker ?? 13);

const wavPaths = [];
for (let i = 0; i < spec.slides.length; i++) {
  const wav = join(reelsDir, `slide-${String(i).padStart(2, '0')}.wav`);
  const buf = await synthesize({ text: applyReadingDict(spec.slides[i].narration), speaker });
  writeFileSync(wav, buf);
  wavPaths.push(wav);
}

// ─── モーション合成（各スライドに緩いズーム＋冒頭フェードを付与し concat） ───
const ff = (args) => { const r = spawnSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] }); if (r.status !== 0) { console.error('🚨 ffmpeg 失敗'); process.exit(1); } };
const probeDur = (f) => { const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }); return parseFloat(r.stdout) || 3; };
const FPS = 60;                         // 60fps で緩慢ズームを滑らかに
const ZSTEP = (0.021 / FPS).toFixed(5); // ズーム速度は fps 非依存（30fps×0.0007 相当）
const segPaths = [];
let total = 0;
for (let i = 0; i < pngPaths.length; i++) {
  const dur = probeDur(wavPaths[i]);
  total += dur;
  const frames = Math.max(2, Math.round(dur * FPS));
  // 偶数スライドはズームイン、奇数はズームアウト（単調さ回避）。冒頭 0.35s フェードイン。
  const zin = (i % 2 === 0);
  const z = zin ? `min(zoom+${ZSTEP},1.12)` : `if(eq(on,1),1.12,max(zoom-${ZSTEP},1.0))`;
  // 入力を 3 倍（3240×5760）に拡大してから zoompan→出力縮小。整数ピクセル丸めが出力で
  // サブピクセル化し、ズーム中のテキスト段差（カクつき）を解消する。
  const baseVf = `scale=3240:5760,zoompan=z='${z}':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS},fade=t=in:st=0:d=0.35`;
  const seg = join(reelsDir, `seg-${String(i).padStart(2, '0')}.mp4`);

  // 入力を順に積む（背景 → [punch] → 音声 → [character]）。index を後で参照。
  const inputs = [['-loop', '1', '-i', pngPaths[i]]];
  let punchIdx = -1;
  if (kinetic[i]) { inputs.push(['-loop', '1', '-i', kinetic[i]]); punchIdx = inputs.length - 1; }
  inputs.push(['-i', wavPaths[i]]); const audioIdx = inputs.length - 1;
  const ch = charOf(spec.slides[i]);
  let charIdx = -1;
  if (ch) { inputs.push(['-loop', '1', '-i', ch.path]); charIdx = inputs.length - 1; }

  // filtergraph をレイヤー順に組む（ズーム背景 → punch reveal → キャラ登場）。
  const parts = [`[0:v]${baseVf}[bg]`];
  let last = 'bg';
  if (punchIdx >= 0) {
    const revealT = Math.min(dur * 0.42, 2.2).toFixed(2);
    parts.push(`[${punchIdx}:v]format=yuva420p,fade=t=in:st=${revealT}:d=0.5:alpha=1[pl]`);
    parts.push(`[${last}][pl]overlay=0:0[k]`); last = 'k';
  }
  if (charIdx >= 0) {
    const charH = Math.round(H * ch.scale);
    const x = ch.side === 'left' ? '40' : 'main_w-overlay_w-40';
    const yT = 'main_h-overlay_h+10';                 // 足元を下端へ（やや見切れOK）
    const y = `if(lt(t,0.5),(${yT})+(0.5-t)/0.5*80,${yT})`; // 0.5s でせり上がり
    parts.push(`[${charIdx}:v]scale=-2:${charH},format=yuva420p,fade=t=in:st=0.15:d=0.45:alpha=1[ch]`);
    parts.push(`[${last}][ch]overlay='${x}':'${y}'[c]`); last = 'c';
  }
  parts.push(`[${last}]format=yuv420p[v]`);

  ff(['-y', '-loglevel', 'error', ...inputs.flat(), '-filter_complex', parts.join(';'),
      '-map', '[v]', '-map', `${audioIdx}:a`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
      '-r', String(FPS), '-t', dur.toFixed(3), seg]);
  segPaths.push(seg);
}
const listPath = join(reelsDir, '_concat.txt');
writeFileSync(listPath, segPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
const outMp4 = join(reelsDir, 'video.mp4');
ff(['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outMp4]);
console.log(`✅ 完了: ${values.pack}/reels/video.mp4  尺 ${total.toFixed(1)}s（角度=${spec.angle}・speaker ${speaker}・ズーム/フェード付き）`);
console.log(`   投稿: publish-ig-bs post ${values.pack} --reel --schedule <dt>（cover.png をサムネ設定）`);
