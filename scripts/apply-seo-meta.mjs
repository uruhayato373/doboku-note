#!/usr/bin/env node
/**
 * apply-seo-meta.mjs — 記事 MDX の frontmatter の seoTitle・description の行だけを置き換える（本文と他の欄は触らない）。
 *
 * 入力は [{ file, seoTitle?, description? }] の JSON（file はリポジトリ相対の article.mdx）。候補は report-seo-rewrite-targets.mjs が出す。
 * description は H1 の下のリード文にも出る（DocPage → ArticleHeader）ので、検索の問いに 1 文目で答える形にする。
 * 書込みは transformMdxFile（改行コードを保つ）。matter.stringify は使わない（frontmatter 全体を整形し直すため）。
 *
 *   node scripts/apply-seo-meta.mjs --input .tmp/seo-targets/edits.json [--root <別の作業ツリー>] [--apply]
 *   既定は dry-run。長さは config/seo-meta-config.json の thresholds（seo-thresholds.mjs）で検査し、外れたら書かずに exit 1。
 */
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { transformMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { replaceFrontmatterField } from './lib/frontmatter-field.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { DESCRIPTION_LINT_MAX, DESCRIPTION_MIN, TITLE_MAX } from './lib/seo-thresholds.mjs';

const args = parseCliArgs({ input: { type: 'string' }, root: { type: 'string' }, apply: { type: 'boolean' } });
if (!args.input) { console.error('usage: --input <edits.json> [--root <dir>] [--apply]'); process.exit(2); }
const root = args.root ? resolve(args.root) : REPO_ROOT;
const inputPath = isAbsolute(args.input) ? args.input : join(REPO_ROOT, args.input);
const edits = JSON.parse(readFileSync(inputPath, 'utf8'));

const len = (s) => [...s].length;
let ok = 0; let bad = 0; let wrote = 0;
for (const e of edits) {
  const file = join(root, e.file);
  const problems = [];
  if (!existsSync(file)) problems.push('ファイルが無い');
  if (e.seoTitle != null && (len(e.seoTitle) === 0 || len(e.seoTitle) > TITLE_MAX)) problems.push(`seoTitle が ${len(e.seoTitle)} 字（上限 ${TITLE_MAX}）`);
  if (e.description != null && (len(e.description) < DESCRIPTION_MIN || len(e.description) > DESCRIPTION_LINT_MAX)) problems.push(`description が ${len(e.description)} 字（${DESCRIPTION_MIN}〜${DESCRIPTION_LINT_MAX}）`);
  if (problems.length) { bad++; console.log(`NG ${e.file}: ${problems.join(' / ')}`); continue; }
  ok++;
  if (!args.apply) { console.log(`dry ${e.file}`); continue; }
  const changed = transformMdxFile(file, (raw) => {
    let out = raw;
    for (const key of ['seoTitle', 'description']) {
      if (e[key] == null) continue;
      const next = replaceFrontmatterField(out, key, e[key]);
      if (next == null) throw new Error(`${e.file}: frontmatter に ${key} が無い`);
      out = next;
    }
    return out;
  });
  if (changed) wrote++;
}
console.log(`[apply-seo-meta] 入力 ${edits.length} 件 / 検査 OK ${ok} 件・NG ${bad} 件 / ${args.apply ? `書いた ${wrote} 件` : 'dry-run（--apply で書く）'}`);
if (bad > 0 || edits.length === 0) process.exit(1);
