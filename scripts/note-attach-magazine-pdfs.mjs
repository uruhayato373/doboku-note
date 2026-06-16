#!/usr/bin/env node
/**
 * note-attach-magazine-pdfs.mjs
 * ---------------------------------------------------------------------------
 * 1マガジン分の公開済み note 記事すべてに、各記事末尾（有料エリア内）の印刷用 PDF を
 * 添付する直列バッチランナー。note-attach-file.mjs を1記事ずつ呼ぶ（1 Chrome プロファイル
 * ＝直列必須・並行不可）。冪等（done-log でスキップ）・失敗で停止（再実行で再開）。
 *
 * マッピング: <magazineDir>/<year>/article-<type>.md の frontmatter noteId と、同 dir 内の
 *   PDF（II1→/-II-1-/, II2→/-II-2-/, III→/-III-/）を突合。noteId 無し（未公開）はスキップ。
 *
 * 使い方:
 *   node scripts/note-attach-magazine-pdfs.mjs --dir <magazineDir>            # dry（対象一覧のみ）
 *   node scripts/note-attach-magazine-pdfs.mjs --dir <magazineDir> --commit   # 実添付
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, appendFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const DIR = getArg('--dir');
if (!DIR) { console.error('--dir <magazineDir> required'); process.exit(1); }
const magAbs = join(ROOT, DIR);
if (!existsSync(magAbs)) { console.error('dir not found: ' + magAbs); process.exit(1); }

const TYPE_PDF = { II1: /-II-1-/, II2: /-II-2-/, III: /-III-/ };
const fmField = (raw, k) => { const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ''; return (fm.match(new RegExp('^' + k + ':\\s*(?:"(.*?)"|\'(.*?)\'|(.+?))\\s*$', 'm')) || []).slice(1).find(Boolean) || ''; };

// 対象収集: 各 year dir の article-*.md
const tasks = [];
for (const year of readdirSync(magAbs, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
  const yearDir = join(magAbs, year);
  const files = readdirSync(yearDir).filter((f) => /^article-.+\.md$/.test(f));
  const pdfs = readdirSync(yearDir).filter((f) => /\.pdf$/i.test(f));
  for (const f of files) {
    const type = (f.match(/^article-(.+)\.md$/) || [])[1];
    const raw = readFileSync(join(yearDir, f), 'utf8');
    const noteId = fmField(raw, 'noteId');
    const re = TYPE_PDF[type];
    const pdf = re ? pdfs.find((p) => re.test(p)) : null;
    tasks.push({ year, type, rel: join(DIR, year, f).replace(/\\/g, '/'), noteId, pdf: pdf ? join(DIR, year, pdf).replace(/\\/g, '/') : null });
  }
}
tasks.sort((a, b) => (a.year + a.type).localeCompare(b.year + b.type));

console.log(`[対象] ${tasks.length} 記事 (${DIR})`);
const bad = tasks.filter((t) => !t.noteId || !t.pdf);
for (const t of tasks) console.log(`  ${t.year}/${t.type}: note=${t.noteId || 'なし(未公開?)'} pdf=${t.pdf ? basename(t.pdf) : 'なし'}`);
if (bad.length) console.log(`[警告] noteId/PDF 欠落 ${bad.length} 件はスキップされます`);

if (!COMMIT) { console.log('\nDRY（--commit で添付実行）'); process.exit(0); }

// done-log（再開用）
const LOG = join(ROOT, '.tmp', `attach-${basename(magAbs)}.log`);
const doneSet = new Set(existsSync(LOG) ? readFileSync(LOG, 'utf8').split(/\r?\n/).filter((l) => l.startsWith('OK\t')).map((l) => l.split('\t')[1]) : []);
appendFileSync(LOG, `[start] ${DIR} commit\n`);

let ok = 0, skip = 0, fail = 0;
const runnable = tasks.filter((t) => t.noteId && t.pdf);
for (let i = 0; i < runnable.length; i++) {
  const t = runnable[i];
  const tag = `[${i + 1}/${runnable.length}] ${t.year}/${t.type} ${t.noteId}`;
  if (doneSet.has(t.noteId)) { console.log(`${tag} … SKIP(done)`); skip++; continue; }
  // transient（account ゲート・描画遅延）対策: 最大2回試行。per-article は冪等なので再試行安全。
  let done = false, lastErr = '';
  for (let attempt = 1; attempt <= 2 && !done; attempt++) {
    console.log(`${tag} … 添付${attempt > 1 ? `(retry ${attempt})` : ''}`);
    try {
      const out = execFileSync('node', ['scripts/note-attach-file.mjs', '--note', t.noteId, '--file', t.pdf, '--commit'], { cwd: ROOT, encoding: 'utf8', timeout: 300000, stdio: ['ignore', 'pipe', 'pipe'] });
      const tail = (out || '').trim().split('\n').slice(-4).join(' | ');
      console.log(`    OK :: ${tail}`);
      appendFileSync(LOG, `OK\t${t.noteId}\t${t.rel}\n`);
      ok++; done = true;
    } catch (e) {
      lastErr = ((e.stdout || '') + (e.stderr || '')).trim().split('\n').slice(-3).join(' | ');
      console.error(`    ${attempt < 2 ? 'WARN(retry)' : 'FAIL'} :: ${lastErr}`);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 8000));
    }
  }
  if (!done) {
    appendFileSync(LOG, `FAIL\t${t.noteId}\t${t.rel}\t${lastErr.slice(0, 120)}\n`);
    fail++;
    console.error(`\n[停止] ${t.year}/${t.type} で2回失敗。原因確認後に再実行で再開します（done はスキップ）。`);
    break;
  }
  await new Promise((r) => setTimeout(r, 12000)); // pacing
}
console.log(`\n[done] ok=${ok} skip=${skip} fail=${fail} / runnable=${runnable.length}`);
process.exit(fail ? 1 : 0);
