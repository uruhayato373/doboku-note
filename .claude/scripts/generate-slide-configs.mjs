/**
 * content/sns/instagram/ 配下の全ディレクトリに slide-data.json を一括生成する。
 *
 * - slide-data.json が既に存在するディレクトリはスキップ（--force で上書き）
 * - MDX が存在しないディレクトリはスキップ（エラー扱いしない）
 *
 * 実行: node .claude/scripts/generate-slide-configs.mjs [--force]
 */

import { readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const IG_DIR = resolve(ROOT, 'content/sns/instagram');
const SCRIPT = resolve(ROOT, '.claude/skills/social/ig-post-create/scripts/ig-post-create.mjs');

const forceFlag = process.argv.includes('--force');

const dirs = readdirSync(IG_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

let skippedExist = 0;
let skippedNoMdx = 0;
let generated = 0;
let failed = 0;

for (const dir of dirs) {
  const configPath = resolve(IG_DIR, dir, 'slide-data.json');

  if (existsSync(configPath) && !forceFlag) {
    skippedExist++;
    continue;
  }

  // ディレクトリ名から date と slug を解析（YYYY-MM-DD-slug 形式）
  const match = dir.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  if (!match) {
    console.log(`  [skip] ${dir} — 形式不明`);
    skippedNoMdx++;
    continue;
  }
  const [, date, slug] = match;

  process.stdout.write(`  ${dir} ... `);

  const result = spawnSync(
    'node',
    [SCRIPT, '--slug', slug, '--date', date, '--config-only', '--reset'],
    { cwd: ROOT, encoding: 'utf8' }
  );

  if (result.status === 0) {
    console.log('✓');
    generated++;
  } else {
    // MDX が見つからない場合など — エラーを抑制してスキップ
    console.log('skip (MDX なし)');
    skippedNoMdx++;
  }
}

console.log(`\n完了: 生成 ${generated} / スキップ(既存) ${skippedExist} / スキップ(MDXなし) ${skippedNoMdx} / エラー ${failed}`);
