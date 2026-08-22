#!/usr/bin/env node
// content/note 配下の各ディレクトリに img/cover.png を生成する。
//
// note.com のカバー画像（推奨 1280×670）を、サイト OGP と共通の T06 Mono Tag デザインで出力する。
// 中央 630×630 セーフティゾーン厳守。テンプレロジックは
// .claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs に集約。
//
// content/note 直下の記事（slug/article.md）と、マガジン配下の記事
// （magazines/{magazine}/{RXX}/article.md）の両方を対象とする。
//
// 使い方:
//   node scripts/generate-note-covers.mjs                   # 全件生成
//   node scripts/generate-note-covers.mjs 一般部門との違い      # 1件だけ生成（slug 部分一致）
//   node scripts/generate-note-covers.mjs 自治体道路担当         # マガジン配下も部分一致で対象化
//   node scripts/generate-note-covers.mjs 総監 --debug-safety   # 中央 630×630 の赤枠を重ねる

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';
import matter from 'gray-matter';

import { renderTemplate } from '../.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs';
import { wrapTitle, pickFontSize } from '../.claude/skills/conversion/ogp-create/scripts/lib/ogp-text.mjs';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const NOTE_DIR = join(ROOT, 'content/note');
const CHAR_DIR = join(ROOT, 'content/sns/_assets/character');
const FONTS_DIR = join(ROOT, '.claude/skills/conversion/ogp-create/assets/fonts');
const TEXT_CONFIG = require(join(ROOT, '.claude/config/ogp/text.json'));
// note カバー G2 デザイントークン（試験パレット・系列濃淡）の真実源
const COVER_TOKENS = require(join(ROOT, '.claude/knowledge/design-system/note-cover-tokens.json'));

// note カバーは 1280×670（note 推奨）
const W = 1280;
const H = 670;

const DEFAULT_CATEGORY = '技術士（総合技術監理部門）';

/**
 * dirName（NOTE_DIR からの相対パス）のセグメントから試験 exam キーを解決する。
 * 例: "1級・2級土木/1級土木/magazines/.../安全管理" → "civil-1"（級サブdirで色を維持）。
 *     "1級・2級土木/経験記述-落ちる答案診断-無料" → "civil-1-2"。
 * 級別 dir（1級土木/2級土木）を combined（1級・2級土木）より先に判定するため、segments の
 * 完全一致で照合する（substring 照合は "1級・2級土木" が "2級土木" を含み誤判定する）。
 *
 * **未知 dir は throw する（2026-08-18）**。以前は "pe-comprehensive" へ無言でフォールバック
 * していたため、tokens に未登録の `技術士一次/` が総監紺のまま出荷されていた。同じ tokens を
 * 読む SNS 側（.claude/scripts/sns/lib/exam-palette.mjs:23）は元から throw しており、
 * こちらだけが fail-silent だった＝「緑なのに守っていない」型の穴。色を共有する試験
 * （第一次は総監と同じ濃紺）も tokens に明示的に列挙し、fallback ではなく宣言で解決する。
 */
export function resolveExam(dirName) {
  const segs = String(dirName).split('/');
  const exams = COVER_TOKENS.exams;
  // 級別（civil-1/civil-2 等）を先に、combined（civil-1-2）は最後に判定
  for (const key of Object.keys(exams)) {
    if (key === 'civil-1-2' || typeof exams[key] !== 'object' || !exams[key].dir) continue;
    if (segs.includes(exams[key].dir)) return key;
  }
  if (segs.includes(exams['civil-1-2'].dir)) return 'civil-1-2';
  const known = Object.values(exams)
    .filter((e) => e && typeof e === 'object' && e.dir)
    .map((e) => e.dir)
    .join(' / ');
  throw new Error(
    `generate-note-covers: 未知の試験ディレクトリ "${dirName}"。` +
      `.claude/knowledge/design-system/note-cover-tokens.json の exams に dir を追加すること` +
      `（既知: ${known}）。既存試験と同じ色でよい場合も明示的に列挙する——` +
      `無言のフォールバックは総監色での誤出荷を生む。`,
  );
}

/**
 * 系列=濃淡。バナー帯/HiBox に使う試験色トーンを解決する。
 * 優先順: cover.tone > notePricing(paid→deep / free→base) > base。
 * 戻り値は描画用パレット { band, accent, label }。
 */
function resolvePalette(examKey, { tone, pricing }) {
  const ex = COVER_TOKENS.exams[examKey] || COVER_TOKENS.exams['pe-comprehensive'];
  let toneKey = tone;
  if (!toneKey) toneKey = pricing === 'paid' ? 'deep' : 'base';
  const band = ex[toneKey] || ex.base;
  return { band, accent: ex.accent || ex.base, label: ex.label };
}

function loadFonts() {
  const noto = readFileSync(join(FONTS_DIR, 'NotoSansJP-Bold.ttf'));
  const inter = readFileSync(join(FONTS_DIR, 'Inter-Bold.ttf'));
  return [
    { name: 'Noto Sans JP', data: noto, weight: 700, style: 'normal' },
    { name: 'Inter', data: inter, weight: 700, style: 'normal' },
  ];
}

// 資格別ブランド写真プール（サイト OGP 背景と共有・brand-image-system.md §3）。
// V4 の visualAsset 未指定時の既定背景。1280×670 へ center cover crop して dataURL 化。
const OGP_BG_DIR = join(ROOT, '.claude/config/ogp/backgrounds');
const BG_EXAM_ALIAS = { 'civil-1-2': 'civil-1' }; // 1級・2級横断は 1級のプールを流用（色スキームと同じ規約）
const brandPoolCache = new Map();
async function brandPoolVisual(examKey) {
  const key = BG_EXAM_ALIAS[examKey] || examKey;
  if (brandPoolCache.has(key)) return brandPoolCache.get(key);
  let src = null;
  for (const ext of ['png', 'webp', 'jpg']) {
    const p = join(OGP_BG_DIR, `${key}.${ext}`);
    if (existsSync(p)) {
      const buf = await sharp(p).resize({ width: W, height: H, fit: 'cover', position: 'centre' }).png().toBuffer();
      src = `data:image/png;base64,${buf.toString('base64')}`;
      break;
    }
  }
  brandPoolCache.set(key, src); // 無い資格は null キャッシュ（決定論的背景へ）
  return src;
}

/**
 * H1 行から表示用タイトルを抽出する。
 * 旧仕様の「【フック】メイン｜サブ」装飾はすべて剥がしてメイン部分だけ残す。
 */
function extractTitle(h1) {
  let raw = h1.replace(/^#\s+/, '').trim();
  // 【...】 を除去
  raw = raw.replace(/^【[^】]+】\s*/, '');
  // ｜以降を切り捨て（サブタイトル相当）
  const pipeIdx = raw.indexOf('｜');
  if (pipeIdx !== -1) raw = raw.slice(0, pipeIdx).trim();
  return raw;
}

async function renderCover({ dirName, title, coverTitle, cover, category, examKey, pricing, debugSafety, fonts, outName = 'cover' }) {
  let element;
  // cover: ブロックがあれば G2/V4（試験色分け）、無ければ従来 mono-tag にフォールバック
  if (cover && (cover.banner || cover.hi || cover.leadIn || cover.variant)) {
    const palette = resolvePalette(examKey, { tone: cover.tone, pricing });
    let coverProps = cover;
    const isV4 = cover.variant === 'crop-safe-v4';
    // V4: chips は描画されない（後方互換のため残置は可・警告のみ）
    if (isV4 && Array.isArray(cover.chips) && cover.chips.length) {
      console.warn(`  warn: ${dirName} は V4 のため chips は描画されません（cover から削除を推奨）`);
    }
    // V4 背景の解決順（2026-07-24 写真プール統一の決定）:
    //   1. cover.visualAsset（記事 dir 相対・個別上書き opt-in）
    //   2. 資格別ブランド写真プール（.claude/config/ogp/backgrounds/<exam-key>.png・サイト OGP と共有）
    //   3. 決定論的背景（紙面グラデ＋グリッド）
    // 真実源: brand-image-system.md §3「note カバー背景 = wide 原版」
    let visualSrc = null;
    if (isV4 && cover.visualAsset) {
      const vpath = join(NOTE_DIR, dirName, cover.visualAsset);
      if (!existsSync(vpath)) {
        console.warn(`  warn: visualAsset が見つかりません（${cover.visualAsset}）→ ブランド写真プールへフォールバック`);
      } else {
        const vmeta = await sharp(vpath).metadata();
        if (vmeta.width !== W || vmeta.height !== H) {
          console.warn(`  warn: visualAsset は ${vmeta.width}×${vmeta.height}（要 ${W}×${H}）→ ブランド写真プールへフォールバック`);
        } else {
          const vbuf = readFileSync(vpath);
          const mime = /\.webp$/i.test(vpath) ? 'image/webp' : /\.jpe?g$/i.test(vpath) ? 'image/jpeg' : 'image/png';
          visualSrc = `data:${mime};base64,${vbuf.toString('base64')}`;
        }
      }
    }
    if (isV4 && !visualSrc) {
      visualSrc = await brandPoolVisual(examKey);
    }
    // cover.character（ポーズ slug）指定時はキャラ立ち絵を data URL 化して合成（opt-in）
    if (cover.character) {
      const cpath = join(CHAR_DIR, `${cover.character}.png`);
      if (existsSync(cpath)) {
        const cmeta = await sharp(cpath).metadata();
        const cbuf = readFileSync(cpath);
        coverProps = { ...coverProps, characterSrc: `data:image/png;base64,${cbuf.toString('base64')}`, characterW: cmeta.width, characterH: cmeta.height };
      } else {
        console.warn(`  warn: cover.character "${cover.character}" の画像が見つかりません（${cpath}）`);
      }
    }
    element = renderTemplate(
      'note-cover-g2',
      isV4
        ? { cover: coverProps, palette, visualSrc, debugSafetyV4: debugSafety } // V4 は三重安全領域オーバーレイ（共通の630赤枠は使わない）
        : { cover: coverProps, palette, debugSafety },
      { width: W, height: H },
    );
  } else {
    let lines;
    if (Array.isArray(coverTitle) && coverTitle.length > 0) {
      lines = coverTitle.map((s) => String(s));
    } else if (typeof coverTitle === 'string' && coverTitle.trim()) {
      lines = await wrapTitle(coverTitle, TEXT_CONFIG);
    } else {
      lines = await wrapTitle(title, TEXT_CONFIG);
    }
    const fontSize = pickFontSize(lines, TEXT_CONFIG);
    element = renderTemplate(
      'mono-tag',
      { lines, categoryLabel: category, fontSize, debugSafety },
      { width: W, height: H },
    );
  }
  const svg = await satori(element, { width: W, height: H, fonts });
  const dir = join(NOTE_DIR, dirName);
  const imgDir = join(dir, 'img');
  mkdirSync(imgDir, { recursive: true });
  writeFileSync(join(imgDir, `${outName}.svg`), svg);
  await sharp(Buffer.from(svg)).png().toFile(join(imgDir, `${outName}.png`));
  console.log(`  ok: ${dirName}${outName === 'cover' ? '' : ` (${outName})`}`);
}

/**
 * content/note 配下を再帰的に走査し、article*.md を持つディレクトリを
 * NOTE_DIR からの相対パスで返す。直下記事（slug/）と
 * マガジン配下記事（magazines/{magazine}/{RXX}/）の両方に対応する。
 * 選択科目の区分1ファイル方式（article.md を持たず article-II1/II2/III.md のみ）の
 * ディレクトリも検出する（2026-06-10、article.md 限定だと選択科目dirを取りこぼす）。
 */
function collectArticleDirs(absDir, relDir) {
  const entries = readdirSync(absDir, { withFileTypes: true });
  let result = [];
  if (entries.some((e) => e.isFile() && /^article(-[A-Za-z0-9][A-Za-z0-9-]*)?\.md$/.test(e.name))) {
    result.push(relDir);
  }
  for (const e of entries) {
    if (e.isDirectory() && e.name !== 'img') {
      const childRel = relDir ? `${relDir}/${e.name}` : e.name;
      result = result.concat(collectArticleDirs(join(absDir, e.name), childRel));
    }
  }
  return result;
}

async function processOne(dirName, args, fonts) {
  const dir = join(NOTE_DIR, dirName);
  // 1 ディレクトリ内の全 article ファイルを対象にする（選択科目は article.md に加え
  // article-II1-1.md 〜 article-II1-4.md / article-II2-1.md 等が同居する。
  // 各々を別 note 記事のカバーとして出力する）。
  const articleFiles = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /^article(-[A-Za-z0-9][A-Za-z0-9-]*)?\.md$/.test(e.name))
    .map((e) => e.name)
    .sort();
  if (articleFiles.length === 0) {
    console.warn(`  skip: article*.md not found in ${dirName}`);
    return;
  }
  const examKey = resolveExam(dirName);
  for (const fname of articleFiles) {
    const content = readFileSync(join(dir, fname), 'utf-8');
    const { data, content: body } = matter(content);
    const h1 = body.split('\n').find((l) => l.startsWith('# '));
    if (!h1) {
      console.warn(`  skip: no H1 in ${dirName}/${fname}`);
      continue;
    }
    // article.md → cover、article-II1.md → cover-II1、article-II1-1.md → cover-II1-1
    const m = fname.match(/^article-([A-Za-z0-9][A-Za-z0-9-]*)\.md$/);
    const outName = m ? `cover-${m[1]}` : 'cover';
    const category = data.category || COVER_TOKENS.exams[examKey]?.label || DEFAULT_CATEGORY;
    await renderCover({
      dirName, title: extractTitle(h1), coverTitle: data.coverTitle, cover: data.cover,
      category, examKey, pricing: data.notePricing, debugSafety: args.debugSafety, fonts, outName,
    });
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const args = { target: null, debugSafety: false };
  for (const a of argv) {
    if (a === '--debug-safety') args.debugSafety = true;
    else if (!a.startsWith('--')) args.target = a;
  }

  const allDirs = collectArticleDirs(NOTE_DIR, '');

  let dirs;
  if (!args.target) {
    dirs = allDirs;
  } else if (allDirs.includes(args.target)) {
    dirs = [args.target];
  } else {
    // slug 部分一致での解決（例: "総監" → "総監択一式17年分分析"、
    // "自治体道路担当" → "magazines/総監模範論文-自治体道路担当/R03" 等）
    dirs = allDirs.filter((d) => d.includes(args.target));
    if (dirs.length === 0) {
      console.error(`no note article directory matches "${args.target}"`);
      process.exit(1);
    }
  }

  console.log(`Generating covers for ${dirs.length} draft(s)...`);
  const fonts = loadFonts();
  // 1 本の失敗で全体を止めないが、**失敗を exit 0 で握り潰さない**（2026-08-18）。
  // 以前はエラーを console.error に出すだけで常に成功終了しており、未知試験のような
  // 設定漏れが CI でもローカルでも緑のまま通っていた（CLAUDE.md §9）。
  const failed = [];
  for (const d of dirs) {
    try {
      await processOne(d, args, fonts);
    } catch (err) {
      console.error(`  error: ${d} → ${err.message}`);
      failed.push(d);
    }
  }
  console.log(`[generate-note-covers] ${dirs.length} 件を実処理 / 失敗 ${failed.length} 件`);
  if (failed.length) {
    console.error(`失敗した記事:${nlIndent(failed)}`);
    process.exitCode = 1;
  }
}

const nlIndent = (xs) => xs.map((x) => `
  - ${x}`).join('');

// import 時に CLI を走らせない（check-note-cover-tokens が resolveExam だけを使うため）。
const isMain = process.argv[1] && process.argv[1].endsWith('generate-note-covers.mjs');
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
