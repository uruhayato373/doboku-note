#!/usr/bin/env node
/**
 * wire-note-funnel-cta --sync-managed の source diff から、公開 note 用の
 * note-update-partial spec を生成する。本文全置換を避け、冒頭の管理 CTA 範囲だけを同期する。
 *
 * npm run build-note-funnel-partial-specs -- --base HEAD --exam tankan
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const getArg = (name) => { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : null; };
const BASE = getArg('--base') || 'HEAD';
const EXAM = getArg('--exam');
const OUT = resolve(ROOT, getArg('--out') || '.tmp/note-funnel-partial');
const CONFIG = JSON.parse(readFileSync(join(ROOT, '.claude/config/note-funnel.json'), 'utf8'));
if (!EXAM || !CONFIG.exams[EXAM]) throw new Error('--exam <config key> が必要');

const rootRel = CONFIG.exams[EXAM].articleGlob;
const MARKER = '<!-- cta:pack-top -->';

function oldFile(path) {
  try {
    return execFileSync('git', ['show', `${BASE}:${path}`], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  }
  catch { return null; }
}

function managedBlock(source) {
  if (!source) return null;
  const content = matter(source).content;
  const at = content.indexOf(MARKER);
  if (at < 0) return null;
  const h2 = content.slice(at).search(/^##\s/m);
  if (h2 < 0) throw new Error('管理 CTA の後ろに H2 がない');
  return content.slice(at, at + h2).trim();
}

function urls(block) {
  if (!block) return [];
  return [...new Set(block.match(/https:\/\/note\.com\/dobokunote\/(?:m|n)\/[0-9a-z]+/g) || [])];
}

function liveText(block) {
  if (!block) return '';
  return block
    .replace(MARKER, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https:\/\/\S+/g, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[*_`]/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

const changed = execFileSync('git', [
  '-c', 'core.quotepath=false', 'diff', '--name-only', '-z', BASE, '--', rootRel,
], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\0').filter((path) => path.endsWith('/article.md'));
mkdirSync(OUT, { recursive: true });
const specs = [];
for (const path of changed) {
  const currentSource = existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path), 'utf8') : null;
  const previousSource = oldFile(path);
  const before = managedBlock(previousSource);
  const after = managedBlock(currentSource);
  const semanticallyEqual = liveText(before) === liveText(after)
    && JSON.stringify(urls(before)) === JSON.stringify(urls(after));
  if (semanticallyEqual || (!before && !after)) continue;
  const parsed = matter(currentSource || previousSource);
  const noteId = parsed.data.noteId || String(parsed.data.noteUrl || '').match(/\/n\/(n[0-9a-z]+)/)?.[1];
  if (!noteId) { console.log(`[skip] noteIdなし: ${path}`); continue; }

  let operation;
  if (!before && after) {
    const newText = liveText(after);
    operation = { type: 'insertTopCta', newText, newUrls: urls(after), probe: newText.slice(0, 40) };
  } else {
    const oldText = liveText(before);
    const newText = liveText(after);
    operation = {
      type: 'replaceTopCta',
      oldStart: oldText.slice(0, 56),
      newText,
      newUrls: urls(after),
      ...(newText ? { probe: newText.slice(0, 40) } : {}),
    };
  }
  const spec = { note: noteId, article: path, operations: [operation] };
  const filename = `${EXAM}-${noteId}.json`;
  writeFileSync(join(OUT, filename), JSON.stringify(spec, null, 2) + '\n');
  specs.push(relative(ROOT, join(OUT, filename)));
  console.log(`[spec] ${path} -> ${filename} (${operation.type})`);
}
const list = join(OUT, `${EXAM}.list.txt`);
writeFileSync(list, specs.join('\n') + (specs.length ? '\n' : ''));
console.log(`[done] specs=${specs.length} list=${relative(ROOT, list)}`);
