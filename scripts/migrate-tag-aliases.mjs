#!/usr/bin/env node
/**
 * migrate-tag-aliases.mjs — 記事 frontmatter の tags を正規表記（tags.json の canonical）へ書き換える codemod。
 *
 * check-content-taxonomy は読み取り専用なので、書き換えはこの script が担う。
 *   node scripts/migrate-tag-aliases.mjs                 # dry-run: 変更予定を列挙（既定）
 *   node scripts/migrate-tag-aliases.mjs --write         # 適用
 *   node scripts/migrate-tag-aliases.mjs --drop          # 未登録タグも削除する（既定は残す）
 *   node scripts/migrate-tag-aliases.mjs --json
 *   node scripts/migrate-tag-aliases.mjs content/site/pe-construction/**  # 対象ファイルを絞る
 *
 * 書き換えは frontmatter の tags 行だけ（YAML を再シリアライズしない・引用符とインデント保持・重複除去）。
 * 改行コードは mdx-io が保持する（civil-1 textbook 32 本の CRLF を LF に変えない）。
 * 規則: .claude/knowledge/reference/content-taxonomy.md §5 / §10
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { buildAliasMap, rewriteFrontmatterTags } from './lib/content-taxonomy.mjs';
import { readMdxFile, writeMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';

const ARGS = process.argv.slice(2);
const WRITE = ARGS.includes('--write');
const DROP = ARGS.includes('--drop');
const JSON_OUT = ARGS.includes('--json');
const targets = ARGS.filter((a) => !a.startsWith('--'));

const aliasMap = buildAliasMap(JSON.parse(readFileSync(join(REPO_ROOT, 'src/config/tags.json'), 'utf8')));

function walk(dir, out) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.mdx')) out.push(p);
  }
  return out;
}
let files = [];
if (targets.length) {
  for (const t of targets) { const p = join(REPO_ROOT, t); files.push(...(statSync(p).isDirectory() ? walk(p, []) : [p])); }
} else files = walk(join(REPO_ROOT, 'content/site'), []);
files.sort();

const mapTag = (tag) => {
  const c = aliasMap.toCanonical.get(tag);
  if (c !== undefined) return c;
  return DROP ? null : tag;
};

const report = [];
let changedFiles = 0; let changeCount = 0;
for (const file of files) {
  const { raw, eol } = readMdxFile(file);
  const r = rewriteFrontmatterTags(raw, mapTag);
  if (!r.changed) continue;
  changedFiles += 1; changeCount += r.changes.length;
  report.push({ file: relative(REPO_ROOT, file), changes: r.changes });
  if (WRITE) writeMdxFile(file, r.text, eol);
}

if (JSON_OUT) console.log(JSON.stringify({ write: WRITE, drop: DROP, files: files.length, changedFiles, changeCount, report }, null, 2));
else {
  for (const r of report.slice(0, 60)) console.log(`${r.file}: ${r.changes.map((c) => `${c.from}→${c.to ?? '(削除)'}`).join(', ')}`);
  if (report.length > 60) console.log(`… 他 ${report.length - 60} ファイル`);
  console.log(`[migrate-tag-aliases${WRITE ? ' --write' : ' (dry-run)'}] 走査 ${files.length} 件 / 変更 ${changedFiles} 件・${changeCount} 箇所${WRITE ? '' : '。適用は --write'}`);
}
