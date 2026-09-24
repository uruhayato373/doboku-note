// DN-0277: 目印を `〇〇` から【〇〇】へ置き換えても、答案の字数は変わらない（括弧は答案に書かない）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = 'content/note/1級・2級土木/1級土木/magazines/1級土木-施工経験記述-完成答案集/品質管理/article.md';

// keiken-charcount はリポジトリ相対パスしか受け付けないので、git 管理外の .tmp/ に置く
function counts(body, tag) {
  const rel = join('.tmp', `test-keiken-charcount-${tag}-${process.pid}`, '1級土木', 'magazines', 'fixture-経験記述', 'article.md');
  const abs = join(ROOT, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body);
  try {
    const out = JSON.parse(execFileSync('node', [join(ROOT, 'scripts/keiken-charcount.mjs'), rel, '--json'], { encoding: 'utf8', cwd: ROOT }));
    return out.files.flatMap((f) => f.rows.map((r) => r.chars));
  } finally {
    rmSync(join(ROOT, '.tmp', `test-keiken-charcount-${tag}-${process.pid}`), { recursive: true, force: true });
  }
}

test('keiken-charcount: 【〇〇】の括弧は字数に入れない', () => {
  const raw = readFileSync(join(ROOT, SRC), 'utf8');
  const backquote = raw.replace(/【([〇○]+)】/g, '`$1`');
  const bracket = backquote.replace(/`([〇○]+)`/g, '【$1】');
  assert.notEqual(backquote, bracket, 'fixture に目印が含まれていること');
  const a = counts(backquote, 'a');
  const b = counts(bracket, 'b');
  assert.ok(a.length > 0, '答案段落を 1 つ以上検査していること');
  assert.deepEqual(b, a);
});
