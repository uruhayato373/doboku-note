#!/usr/bin/env node
/**
 * coconala-cover.mjs — ココナラ出品者プロフィールのカバー画像（バナー）を satori で生成
 * 差別化タグライン（技術士/総監を持つ元自治体土木）を civil 背景に重ねる。文字は satori で正確に。
 * 出力: .claude/config/coconala/assets/cover-profile.png（1600×450・約3.5:1 の広めバナー）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = path.join(ROOT, '.claude/skills/conversion/ogp-create/assets/fonts');
// ココナラのカバー crop は約 2560×840（≈3.05:1）。同比率で作り左右トリムを無くす（文字クリップ防止）。
const W = 1600, H = 525;
const NAVY = '#243b63', INK = '#1a1d24', AMBER = '#d4a017';

const bg = `data:image/png;base64,${fs.readFileSync(path.join(ROOT, '.claude/config/coconala/assets/bg-civil.png')).toString('base64')}`;
const el = (type, props, ...ch) => ({ type, props: { ...props, children: ch.length <= 1 ? ch[0] : ch } });
const div = (style, ...ch) => el('div', { style }, ...ch);

const tree = div(
  { width: W, height: H, display: 'flex', position: 'relative', fontFamily: 'Noto Sans JP' },
  el('img', { src: bg, width: W, height: H, style: { position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover' } }),
  div({ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', backgroundImage: 'linear-gradient(100deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 45%, rgba(255,255,255,0.5) 66%, rgba(255,255,255,0) 82%)' }),
  div({ position: 'absolute', top: 0, left: 0, width: W, height: 10, display: 'flex', backgroundColor: NAVY }),
  div({ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', width: 1180, height: H, paddingLeft: 80 },
    div({ display: 'flex', alignItems: 'center', marginBottom: 20 },
      div({ width: 44, height: 6, backgroundColor: AMBER, marginRight: 16, display: 'flex' }),
      div({ fontSize: 30, color: NAVY, letterSpacing: 1 }, '技術士（建設・総監） × 元・自治体土木職（発注者）'),
    ),
    div({ fontSize: 46, lineHeight: 1.3, color: INK, marginBottom: 18, display: 'flex', flexDirection: 'column' },
      div({ display: 'flex' }, '工事書類を確認してきた読み手の視点で'),
      div({ display: 'flex' }, '1級・2級土木の経験記述を診断・添削'),
    ),
    div({ fontSize: 27, color: '#41485a', display: 'flex' }, 'R8対応｜予想模試3回・教材フルパック・ヒアリング構成'),
  ),
);

const fonts = [
  { name: 'Noto Sans JP', data: fs.readFileSync(path.join(FONTS, 'NotoSansJP-Bold.ttf')), weight: 700, style: 'normal' },
  { name: 'Inter', data: fs.readFileSync(path.join(FONTS, 'Inter-Bold.ttf')), weight: 700, style: 'normal' },
];
const svg = await satori(tree, { width: W, height: H, fonts });
const out = path.join(ROOT, '.claude/config/coconala/assets/cover-profile.png');
await sharp(Buffer.from(svg)).png().toFile(out);
console.log('[cover] →', out, `(${W}x${H})`);
