#!/usr/bin/env node
/**
 * check-ogp-title-fit.mjs
 *
 * ガイド（group: guide）OGP の主題フォントを揃えるためのゲート。
 *
 * ルール（真実源: .claude/knowledge/reference/ogp-prompts.md「ガイドOGPタイトルの統一」）:
 *   OGP の主題は横幅にフォントを auto-fit するため、主題が長い／多行ほど小さく
 *   出てカード間でばらつく。ガイドは題が一本ずつ違うので、**手動 `ogp.title` で
 *   短い主題（≤2行・詳細は `ogp.subtitle` へ）**にして大きめフォントに揃える。
 *
 * 検出: 実レンダリングと同じ wrap+pickFontSize で主題フォントを算出し、
 *   FLOOR 未満（長すぎて小さく出る）を NG とする。
 *
 * 使い方:
 *   node scripts/check-ogp-title-fit.mjs            # published guide 全件（CI 用・NG あれば exit 1）
 *   node scripts/check-ogp-title-fit.mjs --staged   # git staged のガイド MDX のみ（pre-commit 用）
 *   node scripts/check-ogp-title-fit.mjs --all      # 全件のフォント一覧（バーンダウン・exit 0）
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { wrapTitle, pickFontSize } from '../.claude/skills/conversion/ogp-create/scripts/lib/ogp-text.mjs';

const FLOOR = 56; // これ未満のフォント（px）は「長すぎて小さく出る」＝NG
const ROOT = '.local/r2/posts';
const STAGED = process.argv.includes('--staged');
const ALL = process.argv.includes('--all');

const __dirname = dirname(fileURLToPath(import.meta.url));
const textConfig = JSON.parse(readFileSync('.claude/config/ogp/text.json', 'utf8'));
const categories = JSON.parse(readFileSync('src/config/categories.json', 'utf8'));
const catLabel = new Map(categories.map((c) => [c.slug, c.label]));

// ogp-create.mjs と同じ主題フォント設定
const MAIN_FONT_TABLE = [88, 80, 72, 64, 56, 48, 42];
const SAFE_W = 1200 - 144 - 8; // LAYOUT_CONSTANTS.WIDTH - 144 - 8
const NEW_WRAP_CFG = { ...textConfig, breakAt: [] };
const EXPLICIT_WRAP = { breakBefore: [], breakAt: [], charCountFallback: 9999, budouX: { enabled: false } };

// deriveTitleParts（資格名を除いた主題）相当
const normJP = (s) => String(s).replace(/[\s　（）()・、。,.\-—–｜|:：]/g, '');
function deriveMain(rawTitle, examLabel) {
  const normLabel = normJP(examLabel);
  let segs = String(rawTitle).split(/\s*[｜|]\s*|\s+[—–]\s+/).map((s) => s.trim()).filter(Boolean);
  const strip = (seg) => {
    const parts = seg.split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < parts.length) { const w = normJP(parts[i]); if (!w) { i++; continue; } if (normLabel && normLabel.includes(w)) { i++; continue; } break; }
    return parts.slice(i).join(' ');
  };
  segs = segs.map(strip).filter((s) => s && normJP(s) !== normLabel);
  if (segs.length === 0) segs = [String(rawTitle)];
  return segs[0];
}

async function mainFontOf(data, cat) {
  let lines;
  if (data.ogp?.title) lines = await wrapTitle(data.ogp.title, EXPLICIT_WRAP);
  else lines = await wrapTitle(deriveMain(data.title || '', catLabel.get(cat) || ''), NEW_WRAP_CFG);
  return { font: pickFontSize(lines, { fontSizeTable: MAIN_FONT_TABLE, safetyWidth: SAFE_W }), lines };
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) { const p = join(dir, e); if (statSync(p).isDirectory()) walk(p, out); else if (e.endsWith('.mdx')) out.push(p.split('\\').join('/')); }
  return out;
}
function stagedMdx() {
  try { return execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter((s) => s.startsWith(ROOT) && s.endsWith('.mdx')); }
  catch { return []; }
}

const files = STAGED ? stagedMdx() : walk(ROOT);
const rows = [];
for (const fp of files) {
  if (!existsSync(fp)) continue;
  let data; try { data = matter(readFileSync(fp, 'utf8')).data; } catch { continue; }
  if (!data.published || data.group !== 'guide') continue;
  const slug = fp.replace(`${ROOT}/`, '').replace(/\/article\.mdx$/, '').replace(/\.mdx$/, '');
  const cat = fp.replace(`${ROOT}/`, '').split('/')[0];
  const { font, lines } = await mainFontOf(data, cat);
  rows.push({ slug, font, manual: !!data.ogp?.title, preview: lines.join(' / ') });
}
const ng = rows.filter((r) => r.font < FLOOR).sort((a, b) => a.font - b.font);

if (ALL) {
  rows.sort((a, b) => a.font - b.font);
  console.log(`[check-ogp-title-fit] guide ${rows.length} 件 / FLOOR=${FLOOR}px 未満 NG ${ng.length} 件`);
  rows.forEach((r) => console.log(`  ${String(r.font).padStart(3)}px ${r.font < FLOOR ? '✗' : ' '} ${r.manual ? '[手動]' : '[自動]'} ${r.slug}  「${r.preview}」`));
  process.exit(0);
}
if (ng.length === 0) { console.log(`[check-ogp-title-fit] ✓ ${STAGED ? 'staged ' : ''}guide の OGP 主題フォントは全て ${FLOOR}px 以上（均一）`); process.exit(0); }
console.error(`[check-ogp-title-fit] ✗ ${ng.length} 件のガイド OGP 主題が ${FLOOR}px 未満で小さく出ます`);
console.error('  真実源: .claude/knowledge/reference/ogp-prompts.md「ガイドOGPタイトルの統一」→ ogp.title を短い2行に・詳細は subtitle へ');
ng.forEach((r) => console.error(`  ${r.font}px  ${r.slug}  「${r.preview}」`));
process.exit(1);
