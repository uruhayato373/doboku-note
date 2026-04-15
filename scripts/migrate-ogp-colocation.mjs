#!/usr/bin/env node
/**
 * OGP 画像を中央ディレクトリから記事ディレクトリにコロケーションする
 *
 * 旧: .local/r2/posts/ogp/pe-comprehensive-management-iso-14000.png
 * 新: .local/r2/posts/pe-comprehensive-management/iso-14000/ogp.png
 *
 * category は `src/config/categories.json` の slug でプレフィックスマッチする。
 *
 * Usage:
 *   node scripts/migrate-ogp-colocation.mjs --dry-run
 *   node scripts/migrate-ogp-colocation.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(PROJECT_ROOT, '.local', 'r2', 'posts');
const OGP_DIR = path.join(POSTS_DIR, 'ogp');
const DRY_RUN = process.argv.includes('--dry-run');

const categories = JSON.parse(
  fs.readFileSync(path.join(PROJECT_ROOT, 'src', 'config', 'categories.json'), 'utf-8'),
);

/**
 * カテゴリディレクトリを再帰的に歩いて `{category-prefix-付き slug}` → dir のマップを構築する。
 * src/lib/docs.ts の findMdxFiles のロジックに準拠: article.mdx ならディレクトリパスが slug、
 * そうでなければ dir + fileName が slug。
 */
function buildSlugToDirMap() {
  const map = new Map();
  for (const c of categories) {
    const catDir = path.join(POSTS_DIR, c.slug);
    if (!fs.existsSync(catDir)) continue;
    walk(catDir, [], c.slug, map);
  }
  return map;
}

function walk(currentDir, relParts, categorySlug, map) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (entry.name === 'img' || entry.name === '.DS_Store') continue;
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, [...relParts, entry.name], categorySlug, map);
    } else if (entry.name === 'article.mdx') {
      // article.mdx: ディレクトリパスが slug
      const fullSlug = `${categorySlug}-${relParts.join('-')}`;
      map.set(fullSlug, currentDir);
    } else if (entry.name.endsWith('.mdx')) {
      // 個別ファイル（Convention A）: 現時点では存在しない想定だが念のため対応
      const base = entry.name.replace(/\.mdx$/, '');
      const fullSlug = `${categorySlug}-${[...relParts, base].join('-')}`;
      map.set(fullSlug, currentDir);
    }
  }
}

async function main() {
  console.log(DRY_RUN ? '[DRY-RUN] OGP コロケーション移行計画' : 'OGP コロケーション移行を開始');
  console.log('');

  if (!fs.existsSync(OGP_DIR)) {
    console.error(`中央 OGP ディレクトリが存在しない: ${OGP_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(OGP_DIR).filter(n => n.endsWith('.png'));
  console.log(`対象ファイル: ${files.length} 件`);
  console.log('');

  const plan = []; // { oldAbs, newAbs, oldDisplay, newDisplay }
  const unresolved = [];
  const missingTargetDir = [];

  for (const name of files) {
    const fileBase = name.replace(/\.png$/, '');
    const resolved = resolveCategoryAndLocal(fileBase);
    if (!resolved) {
      unresolved.push(name);
      continue;
    }
    const targetDir = path.join(POSTS_DIR, resolved.category, resolved.localSlug);
    if (!fs.existsSync(targetDir)) {
      // 対応する記事ディレクトリが存在しない → 記事が削除された孤児 OGP
      missingTargetDir.push({ name, expectedDir: path.relative(POSTS_DIR, targetDir) });
      continue;
    }
    const oldAbs = path.join(OGP_DIR, name);
    const newAbs = path.join(targetDir, 'ogp.png');
    plan.push({
      oldAbs,
      newAbs,
      oldDisplay: `ogp/${name}`,
      newDisplay: `${resolved.category}/${resolved.localSlug}/ogp.png`,
    });
  }

  console.log(`=== 移行計画: ${plan.length} 件 ===`);
  if (DRY_RUN) {
    for (let i = 0; i < Math.min(plan.length, 10); i++) {
      console.log(`  ${plan[i].oldDisplay}  →  ${plan[i].newDisplay}`);
    }
    if (plan.length > 10) console.log(`  ...(残り ${plan.length - 10} 件)`);
  }
  console.log('');

  if (unresolved.length > 0) {
    console.warn(`[WARN] category が判定できないファイル: ${unresolved.length} 件`);
    for (const n of unresolved.slice(0, 5)) console.warn(`  ${n}`);
    if (unresolved.length > 5) console.warn(`  ...`);
  }

  if (missingTargetDir.length > 0) {
    console.warn(`[WARN] 記事ディレクトリが存在しないファイル（孤児 OGP）: ${missingTargetDir.length} 件`);
    for (const m of missingTargetDir.slice(0, 10)) console.warn(`  ${m.name} (期待 dir: ${m.expectedDir})`);
    if (missingTargetDir.length > 10) console.warn(`  ...(残り ${missingTargetDir.length - 10} 件)`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('[DRY-RUN] 実行せずに終了。');
    return;
  }

  // ---- 実行 ----
  console.log('=== 実行中 ===');
  let moved = 0;
  for (const p of plan) {
    fs.renameSync(p.oldAbs, p.newAbs);
    moved++;
  }
  console.log(`  移動: ${moved} 件`);

  // 孤児・未解決は手動対応に委ねるため、OGP_DIR は空でなければ削除しない
  const remaining = fs.readdirSync(OGP_DIR);
  if (remaining.length === 0) {
    fs.rmdirSync(OGP_DIR);
    console.log(`  中央 OGP ディレクトリ削除: ${path.relative(PROJECT_ROOT, OGP_DIR)}`);
  } else {
    console.warn(`  中央 OGP ディレクトリに ${remaining.length} 件残存（孤児/未解決）。手動で確認してください`);
  }

  console.log('');
  console.log('完了。次は generate-ogps.mjs を新ロジックに更新し --force で再生成してください。');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
