#!/usr/bin/env node
/**
 * civil-construction-1 を Convention A → Convention B に移行するスクリプト
 *
 * 変換ルール:
 *   guide/strategy.mdx                       → guide-strategy/article.mdx
 *   primary/h26-a.mdx                        → primary-h26-a/article.mdx
 *   secondary/r03.mdx                        → secondary-r03/article.mdx
 *   secondary/concrete/basics.mdx            → secondary-concrete-basics/article.mdx
 *   textbook/...                             → 変更なし (既に Convention B)
 *
 * slug は両 Convention で同一のため、URL は不変 (`src/lib/docs.ts:136-165` の findMdxFiles 挙動による)。
 *
 * Usage:
 *   node scripts/migrate-civil-construction-b.mjs --dry-run   # 計画を表示
 *   node scripts/migrate-civil-construction-b.mjs             # 実行
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMdxFile, writeMdxFile } from './lib/mdx-io.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CATEGORY = 'civil-construction-1';
const CATEGORY_DIR = path.join(PROJECT_ROOT, '.local', 'r2', 'posts', CATEGORY);
const DRY_RUN = process.argv.includes('--dry-run');

// ---- 対象 MDX の収集と新 slug の算出 ----
// textbook は既に Convention B なのでスキップ。
// guide/, primary/, secondary/ 配下の .mdx を収集する。

function collectMdxFiles() {
  const files = [];

  const sections = ['guide', 'primary', 'secondary'];
  for (const section of sections) {
    const dir = path.join(CATEGORY_DIR, section);
    if (!fs.existsSync(dir)) continue;
    walk(dir, [section], files);
  }
  return files;
}

function walk(dir, relParts, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'img' || entry.name === '.DS_Store') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, [...relParts, entry.name], out);
    } else if (entry.name.endsWith('.mdx')) {
      const base = entry.name.replace(/\.mdx$/, '');
      // Convention A: 旧 slug は [...relParts, base].join('-')
      const oldSlugParts = [...relParts, base];
      const slug = oldSlugParts.join('-'); // 例: 'guide-strategy' / 'primary-h26-a' / 'secondary-concrete-basics' / 'secondary-r03'
      out.push({
        oldRel: path.relative(CATEGORY_DIR, full), // 例: 'guide/strategy.mdx'
        oldAbs: full,
        section: relParts[0],                       // 'guide' | 'primary' | 'secondary'
        slug,                                       // category prefix 抜きの slug
        newRel: `${slug}/article.mdx`,              // 例: 'guide-strategy/article.mdx'
        newAbs: path.join(CATEGORY_DIR, slug, 'article.mdx'),
        newDir: path.join(CATEGORY_DIR, slug),
      });
    }
  }
}

// ---- 画像パスの書き換えロジック ----
// 旧パス例: /posts/civil-construction-1/primary/img/h26-b-fig-01.png
// 新パス例: /posts/civil-construction-1/primary-h26-b/img/h26-b-fig-01.png
// MDX の中に現れる旧絶対パスをすべて検出し、owner MDX の new slug 配下に書き換える。

const IMG_REF_RE = /\/posts\/civil-construction-1\/([a-z0-9/-]+?)\/img\/([a-z0-9._-]+\.(?:png|jpg|jpeg|svg|gif|webp))/gi;

// 各 oldImgPath → newImgPath の割り当てを決める。
// 割り当てはその MDX の new slug に基づく（その MDX が参照している画像 = その MDX が所有する画像）。
function planMdxContentRewrite(raw, newSlug) {
  const imageMoves = []; // { oldRel, newRel } — oldRel は .local/r2/posts/civil-construction-1/ からの相対
  const updated = raw.replace(IMG_REF_RE, (_m, oldSection, filename) => {
    const oldRel = `${oldSection}/img/${filename}`;
    const newRel = `${newSlug}/img/${filename}`;
    imageMoves.push({ oldRel, newRel, filename });
    return `/posts/civil-construction-1/${newSlug}/img/${filename}`;
  });
  return { updated, imageMoves };
}

// ---- オーファン画像（どの MDX からも参照されていない）の振り分け ----
// primary/img/: ファイル名プレフィックス `{year}-{ab}` で owner を決定
// secondary/*/img/: 参照スキャン後に残ったオーファンは当該サブディレクトリの basics.mdx 系に寄せる（ログ出力のみ、移動はしない）

const PRIMARY_OWNER_RE = /^([a-z]+[0-9]+-[ab])/i;

function deriveOrphanPlanPrimary(filename) {
  const m = filename.match(PRIMARY_OWNER_RE);
  if (!m) return null;
  const owner = m[1].toLowerCase();
  return `primary-${owner}`;
}

// ---- メイン ----
async function main() {
  console.log(DRY_RUN ? '[DRY-RUN] civil-construction-1 Convention B 移行計画' : 'civil-construction-1 Convention B 移行を開始');
  console.log('');

  const files = collectMdxFiles();
  console.log(`対象 MDX: ${files.length} 件`);
  console.log('');

  // 1. 全 MDX の content rewrite 計画を作成し、参照されている画像の移動先を決定
  const imageMovePlan = new Map(); // oldRel → newRel
  const mdxPlans = []; // { file, newContent, eol, imageMoves }

  for (const file of files) {
    const { raw, eol } = readMdxFile(file.oldAbs);
    const { updated, imageMoves } = planMdxContentRewrite(raw, file.slug);

    for (const m of imageMoves) {
      const existing = imageMovePlan.get(m.oldRel);
      if (existing && existing !== m.newRel) {
        console.error(`[ERROR] 画像 ${m.oldRel} が複数の MDX から参照されている: ${existing} vs ${m.newRel}`);
        process.exit(1);
      }
      imageMovePlan.set(m.oldRel, m.newRel);
    }

    mdxPlans.push({ file, newContent: updated, eol });
  }

  // 2. primary/img/ のオーファン画像を filename プレフィックスで追加
  const primaryImgDir = path.join(CATEGORY_DIR, 'primary', 'img');
  if (fs.existsSync(primaryImgDir)) {
    for (const name of fs.readdirSync(primaryImgDir)) {
      const oldRel = `primary/img/${name}`;
      if (imageMovePlan.has(oldRel)) continue;
      const ownerSlug = deriveOrphanPlanPrimary(name);
      if (!ownerSlug) {
        console.warn(`[WARN] primary/img/${name}: オーナーを特定できないためスキップ`);
        continue;
      }
      imageMovePlan.set(oldRel, `${ownerSlug}/img/${name}`);
    }
  }

  // 3. secondary 配下のオーファン画像をチェック（どの MDX からも参照されていない）
  const secondarySubs = ['concrete', 'construction-plan', 'earthwork', 'experience-writing', 'quality-management'];
  for (const sub of secondarySubs) {
    const imgDir = path.join(CATEGORY_DIR, 'secondary', sub, 'img');
    if (!fs.existsSync(imgDir)) continue;
    for (const name of fs.readdirSync(imgDir)) {
      const oldRel = `secondary/${sub}/img/${name}`;
      if (imageMovePlan.has(oldRel)) continue;
      console.warn(`[WARN] ${oldRel}: MDX から参照されていないオーファン画像。移動せず残します`);
    }
  }

  // ---- 計画サマリ ----
  console.log('=== MDX 移動計画 ===');
  for (const { file } of mdxPlans) {
    console.log(`  ${file.oldRel}  →  ${file.newRel}`);
  }
  console.log('');
  console.log(`=== 画像移動計画 (${imageMovePlan.size} 件) ===`);
  if (DRY_RUN) {
    let i = 0;
    for (const [oldRel, newRel] of imageMovePlan) {
      if (i++ < 20) console.log(`  ${oldRel}  →  ${newRel}`);
    }
    if (imageMovePlan.size > 20) console.log(`  ...(残り ${imageMovePlan.size - 20} 件)`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('[DRY-RUN] 実行せずに終了。確認後 `node scripts/migrate-civil-construction-b.mjs` で実行してください。');
    return;
  }

  // ---- 実行 ----
  console.log('=== 実行中 ===');

  // MDX を新パスに書き出し
  for (const { file, newContent, eol } of mdxPlans) {
    fs.mkdirSync(file.newDir, { recursive: true });
    writeMdxFile(file.newAbs, newContent, eol);
  }
  console.log(`  MDX 書き出し: ${mdxPlans.length} 件`);

  // 画像を新パスに移動
  let moved = 0;
  for (const [oldRel, newRel] of imageMovePlan) {
    const oldAbs = path.join(CATEGORY_DIR, oldRel);
    const newAbs = path.join(CATEGORY_DIR, newRel);
    if (!fs.existsSync(oldAbs)) {
      console.warn(`[WARN] 画像が見つからない: ${oldRel}`);
      continue;
    }
    fs.mkdirSync(path.dirname(newAbs), { recursive: true });
    fs.renameSync(oldAbs, newAbs);
    moved++;
  }
  console.log(`  画像移動: ${moved} 件`);

  // 旧 MDX を削除
  for (const { file } of mdxPlans) {
    if (fs.existsSync(file.oldAbs)) fs.unlinkSync(file.oldAbs);
  }

  // 空になった旧ディレクトリを再帰的に削除（guide/, primary/, secondary/{sub}/, secondary/）
  removeEmptyDirs(path.join(CATEGORY_DIR, 'guide'));
  removeEmptyDirs(path.join(CATEGORY_DIR, 'primary'));
  for (const sub of secondarySubs) removeEmptyDirs(path.join(CATEGORY_DIR, 'secondary', sub));
  removeEmptyDirs(path.join(CATEGORY_DIR, 'secondary'));

  console.log('');
  console.log('完了。次は npm run type-check と npm run build で検証してください。');
}

function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      removeEmptyDirs(path.join(dir, entry.name));
    }
  }
  const remaining = fs.readdirSync(dir);
  if (remaining.length === 0 || (remaining.length === 1 && remaining[0] === '.DS_Store')) {
    if (remaining[0] === '.DS_Store') fs.unlinkSync(path.join(dir, '.DS_Store'));
    fs.rmdirSync(dir);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
