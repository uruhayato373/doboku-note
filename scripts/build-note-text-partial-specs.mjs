#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { relative, resolve, join } from 'node:path';
import { parseNoteArticle } from './lib/note-frontmatter.mjs';

/**
 * 公開済み note の同一文言を部分更新する spec 群を、ローカル原稿から生成する。
 * 生成物は .tmp 配下だけ。記事本文や note.com は変更しない。
 *
 * npm run build-note-text-partial-specs -- \
 *   --scope content/note/1級・2級土木 --from '旧文言' --to '新文言' --name civil-150
 */

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const getArg = (name) => { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : null; };
const SCOPE_ARG = getArg('--scope');
const FROM = getArg('--from');
const TO = getArg('--to');
const NAME = getArg('--name') || 'text-update';

if (!SCOPE_ARG || !FROM || TO === null) {
  console.error('required: --scope <dir> --from <old> --to <new> [--name <safe-name>]');
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9-]*$/i.test(NAME)) throw new Error('--name は英数字とハイフンだけ');
if (FROM === TO) throw new Error('--from と --to が同一');

const scope = resolve(ROOT, SCOPE_ARG);
if (!existsSync(scope) || !statSync(scope).isDirectory()) throw new Error(`scope がディレクトリではない: ${SCOPE_ARG}`);
if (!scope.startsWith(resolve(ROOT, 'content/note') + '/')) throw new Error('--scope は content/note 配下に限定');

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.isFile() && entry.name === 'article.md') files.push(path);
  }
  return files;
}

const outDir = join(ROOT, '.tmp', 'note-partial-text', NAME);
mkdirSync(outDir, { recursive: true });
const specs = [];
let occurrences = 0;

for (const path of walk(scope).sort()) {
  const article = parseNoteArticle(path);
  const count = article.body.split(FROM).length - 1;
  if (count === 0) continue;
  const noteId = article.noteId || String(article.data.noteUrl || '').match(/\/n\/(n[0-9a-z]+)/)?.[1];
  if (!noteId) throw new Error(`noteId/noteUrl なし: ${relative(ROOT, path)}`);
  const spec = {
    note: noteId,
    article: relative(ROOT, path),
    operations: [{ type: 'replaceText', old: FROM, new: TO, expected: count }],
  };
  const specPath = join(outDir, `${noteId}.json`);
  writeFileSync(specPath, JSON.stringify(spec, null, 2) + '\n');
  specs.push(relative(ROOT, specPath));
  occurrences += count;
}

const listPath = join(outDir, `${NAME}.list.txt`);
writeFileSync(listPath, specs.join('\n') + (specs.length ? '\n' : ''));
console.log(`[done] specs=${specs.length} occurrences=${occurrences} list=${relative(ROOT, listPath)}`);
