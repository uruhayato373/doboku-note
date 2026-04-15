#!/usr/bin/env node
/**
 * civil-construction-1/textbook/{name}/ をフラット化: textbook-{name}/ に移動する
 *
 * 既存: civil-construction-1/textbook/construction-machinery-01/article.mdx
 *              → slug: civil-construction-1-textbook-construction-machinery-01
 * 新規: civil-construction-1/textbook-construction-machinery-01/article.mdx
 *              → slug: 同上（不変）
 *
 * OGP コロケーション方式は `category/{local-slug-flat}/ogp.png` を前提とするので、
 * ネストされたディレクトリ構造を解消しておく必要がある。
 *
 * Usage:
 *   node scripts/migrate-civil-textbook-flat.mjs --dry-run
 *   node scripts/migrate-civil-textbook-flat.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMdxFile, writeMdxFile } from './lib/mdx-io.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CATEGORY_DIR = path.join(PROJECT_ROOT, '.local', 'r2', 'posts', 'civil-construction-1');
const TEXTBOOK_DIR = path.join(CATEGORY_DIR, 'textbook');
const DRY_RUN = process.argv.includes('--dry-run');

function main() {
  if (!fs.existsSync(TEXTBOOK_DIR)) {
    console.log('textbook ディレクトリが存在しない。既にフラット化済みか？');
    return;
  }

  const subdirs = fs.readdirSync(TEXTBOOK_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);

  console.log(DRY_RUN ? '[DRY-RUN] textbook フラット化計画' : 'textbook フラット化を開始');
  console.log('');
  console.log(`対象: ${subdirs.length} サブディレクトリ`);
  console.log('');

  const plan = [];
  for (const name of subdirs) {
    const oldDir = path.join(TEXTBOOK_DIR, name);
    const newDir = path.join(CATEGORY_DIR, `textbook-${name}`);
    const oldImgPrefix = `/posts/civil-construction-1/textbook/${name}/`;
    const newImgPrefix = `/posts/civil-construction-1/textbook-${name}/`;
    plan.push({ oldDir, newDir, oldImgPrefix, newImgPrefix, name });
  }

  for (const p of plan) {
    console.log(`  textbook/${p.name}/  →  textbook-${p.name}/`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('[DRY-RUN] 実行せずに終了。');
    return;
  }

  // ---- 実行 ----
  for (const p of plan) {
    // article.mdx 内の画像パスを書き換え
    const articleMdx = path.join(p.oldDir, 'article.mdx');
    if (fs.existsSync(articleMdx)) {
      const { raw, eol } = readMdxFile(articleMdx);
      if (raw.includes(p.oldImgPrefix)) {
        const updated = raw.split(p.oldImgPrefix).join(p.newImgPrefix);
        writeMdxFile(articleMdx, updated, eol);
      }
    }
    // ディレクトリごと移動
    fs.renameSync(p.oldDir, p.newDir);
  }

  // 空になった textbook ディレクトリを削除
  const remaining = fs.readdirSync(TEXTBOOK_DIR);
  if (remaining.length === 0) {
    fs.rmdirSync(TEXTBOOK_DIR);
  } else {
    console.warn(`  textbook/ に ${remaining.length} 件残存`);
  }

  console.log(`完了: ${plan.length} ディレクトリをフラット化`);
}

main();
