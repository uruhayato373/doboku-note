/**
 * 過去問の問題文 JSON（refresh-indexes の build-exam-question-data）を、CRLF で取り出した作業ツリーでも
 * 同じ中身に作るか（DN-0714）。
 *
 * 2026-10-13、Windows（autocrlf で MDX が CRLF）で refresh-indexes を回すと、記事に変更が無くても
 * exam-questions.json・civil-1-exam-questions.json の問題文に \r が入り、数百行の偽の差分になった。
 * パーサは置き場が固定で関数を公開していないので、パーサと読み込む lib をリポジトリ内の一時ディレクトリへ写し
 * （REPO_ROOT はファイルの位置から決まる・npm の依存は親の node_modules から引ける）、
 * 実際の記事 1 本を LF と CRLF で置いて生成し、generatedAt 以外が一致することを確かめる。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const PARSERS = [
  { script: 'scripts/parse-exam-questions.mjs', article: 'content/site/pe-comprehensive-management/r07-primary/article.mdx', out: 'src/config/exam-questions.json' },
  { script: '.claude/scripts/sns/parse-civil-1-questions.mjs', article: 'content/site/civil-construction-1/primary-r07-a/article.mdx', out: 'src/config/civil-1-exam-questions.json' },
  { script: '.claude/scripts/sns/parse-civil-2-questions.mjs', article: 'content/site/civil-construction-2/primary-r07-zenki/article.mdx', out: 'src/config/civil-2-exam-questions.json' },
];

/** script と、そこから相対 import でたどれるファイルを base へ同じ相対位置で写す */
function copyWithImports(rel, base, seen = new Set()) {
  if (seen.has(rel)) return;
  seen.add(rel);
  const src = join(ROOT, rel);
  mkdirSync(dirname(join(base, rel)), { recursive: true });
  copyFileSync(src, join(base, rel));
  for (const m of readFileSync(src, 'utf8').matchAll(/^import[^;]*?from\s+['"](\.{1,2}\/[^'"]+)['"]/gm)) {
    copyWithImports(relative(ROOT, resolve(dirname(src), m[1])), base, seen);
  }
}

const withoutStamp = (json) => ({ ...json, generatedAt: undefined });

for (const p of PARSERS) {
  test(`${p.script}: CRLF の記事からも LF と同じ問題文 JSON を作り、\\r を残さない（DN-0714）`, () => {
    const base = join(ROOT, '.tmp', 'test-exam-parse-crlf', p.script.replace(/[/.]/g, '_'));
    rmSync(base, { recursive: true, force: true });
    try {
      copyWithImports(p.script, base);
      const lf = readFileSync(join(ROOT, p.article), 'utf8').replace(/\r\n/g, '\n');
      const article = join(base, p.article);
      const out = join(base, p.out);
      mkdirSync(dirname(article), { recursive: true });
      mkdirSync(dirname(out), { recursive: true });

      const generate = (text) => {
        writeFileSync(article, text);
        rmSync(out, { force: true });
        execFileSync(process.execPath, [join(base, p.script)], { cwd: base, stdio: 'pipe' });
        assert.ok(existsSync(out), '出力が書かれていない');
        return JSON.parse(readFileSync(out, 'utf8'));
      };
      const fromLf = generate(lf);
      const fromCrlf = generate(lf.replace(/\n/g, '\r\n'));

      const questions = fromCrlf.years.reduce((s, y) => s + y.questions.length, 0);
      assert.ok(questions >= 20, `問題を ${questions} 問しか読めていない（検査不成立）`);
      // 文字列の中の CR（U+000D）を数える。JSON の文字列化で探すと LaTeX の \right なども当たる
      let withCr = 0;
      JSON.stringify(fromCrlf, (_, v) => { if (typeof v === 'string' && v.includes('\r')) withCr++; return v; });
      assert.equal(withCr, 0, 'CRLF の記事から作った JSON の文字列に \\r が残っている');
      assert.deepEqual(withoutStamp(fromCrlf), withoutStamp(fromLf));
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
}
