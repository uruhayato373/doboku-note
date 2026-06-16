#!/usr/bin/env node
/**
 * note-publish-magazine.mjs
 * ---------------------------------------------------------------------------
 * 1マガジン分の記事（article-*.md）を直列バッチで note 公開するランナー。
 * note 公開パイプライン Step2（記事公開バッチ）の確立済みツール。1記事ずつ
 * `scripts/note-publish.mjs --article <path> --commit` を呼ぶ（1 Chrome プロファイル＝
 * 直列必須・並行不可）。冪等（frontmatter に noteUrl があればスキップ）・1記事最大2回試行・
 * 失敗で停止（再実行で再開）。
 *
 * 公開順は article 名の昇順（R03→R07→R08-yosou × II1→II2→III）。各記事公開後、
 * note-publish が noteUrl/noteId/notePublishedAt を frontmatter に writeback する
 * （git commit はしない＝呼び側で pathspec commit）。
 *
 * 使い方:
 *   node scripts/note-publish-magazine.mjs --dir <magazineDir>            # dry（対象一覧）
 *   node scripts/note-publish-magazine.mjs --dir <magazineDir> --commit   # 実公開
 *
 * 注意: note の画像(eyecatch)アップロードを伴うが、これは PDF 添付の1日100件上限とは
 *   別枠。PDF 添付の上限管理は note-attach-magazine-pdfs / note-attach-pdf を参照。
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync, appendFileSync, globSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const DIR = getArg('--dir');
const COMMIT = argv.includes('--commit');
if (!DIR) { console.error('--dir <magazineDir> required'); process.exit(1); }
const abs = join(ROOT, DIR);
if (!existsSync(abs)) { console.error('dir not found: ' + abs); process.exit(1); }

const files = globSync(`${abs.replace(/\\/g, '/')}/**/article-*.md`).sort();
const rel = (f) => f.replace(/\\/g, '/').replace(ROOT.replace(/\\/g, '/') + '/', '');
const fmHasUrl = (f) => /noteUrl:\s*"https?:\/\//.test(readFileSync(f, 'utf8'));

console.log(`[対象] ${files.length} 記事 (${DIR})`);
for (const f of files) console.log(`  ${rel(f)}${fmHasUrl(f) ? ' [公開済]' : ''}`);
if (!COMMIT) { console.log('\nDRY（--commit で公開）'); process.exit(0); }

const LOG = join(ROOT, '.tmp', `publish-${basename(abs)}.log`);
appendFileSync(LOG, `[start] ${DIR} ${files.length} files\n`);
let ok = 0, skip = 0, fail = 0;
for (let i = 0; i < files.length; i++) {
  const f = files[i]; const tag = `[${i + 1}/${files.length}] ${rel(f)}`;
  if (fmHasUrl(f)) { console.log(`${tag} SKIP(published)`); appendFileSync(LOG, `SKIP\t${f}\n`); skip++; continue; }
  let done = false, lastErr = '';
  for (let attempt = 1; attempt <= 2 && !done; attempt++) {
    console.log(`${tag} PUBLISH${attempt > 1 ? ` (retry ${attempt})` : ''}`);
    try {
      execFileSync('node', ['scripts/note-publish.mjs', '--article', f, '--commit'], { cwd: ROOT, encoding: 'utf8', timeout: 360000, stdio: ['ignore', 'pipe', 'pipe'] });
      if (fmHasUrl(f)) done = true; else lastErr = 'noteUrl not written after publish';
    } catch (e) { lastErr = ((e.stdout || '') + (e.stderr || '')).trim().split('\n').slice(-2).join(' | '); }
    if (!done && attempt < 2) await new Promise((r) => setTimeout(r, 8000));
  }
  if (done) { console.log('    OK'); appendFileSync(LOG, `OK\t${f}\n`); ok++; }
  else { console.error(`    FAIL :: ${lastErr}`); appendFileSync(LOG, `FAIL\t${f}\t${lastErr.slice(0, 120)}\n`); fail++; console.error(`[停止] ${rel(f)} で失敗。原因確認後に再実行で再開（published skip）`); break; }
  await new Promise((r) => setTimeout(r, 12000)); // pacing
}
console.log(`\n[done] ok=${ok} skip=${skip} fail=${fail} / ${files.length}`);
process.exit(fail ? 1 : 0);
