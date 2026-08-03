#!/usr/bin/env node
/**
 * note-attach-batch.mjs
 * ---------------------------------------------------------------------------
 * `.claude/state/note-attachments-missing.json`（check-note-attachments --live が生成）を
 * 食べて、PDF 添付を直列で復旧するドライバ。既存の note-attach-magazine-pdfs は
 * 「1マガジン単位」なので、マガジンを跨いだ復旧リストには合わない。
 *
 * note の制約: **ファイルアップロードは 1日100件**（2026-06-16 実証）。超えると以降が
 *   全て「ファイルカード未検出」で ABORT する。既定 --limit 100 で切り、翌日再開する。
 *
 * done-log は **`.claude/state/note-attach-done.json`（git 追跡下）** に置く。
 *   従来 done-log は `.tmp/attach-<マガジン>.log` ＝ git 管理外で、過去にどの記事へ添付したかの
 *   記録が失われていた（2026-07-28 の原因究明で判明）。同じ轍を踏まない。
 *
 * 使い方:
 *   node scripts/note-attach-batch.mjs                    # dry（今夜やる分の一覧）
 *   node scripts/note-attach-batch.mjs --commit           # 実添付（既定 100 件で打ち切り）
 *   node scripts/note-attach-batch.mjs --commit --limit 40
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MISSING = join(ROOT, '.claude/state/note-attachments-missing.json');
const DONE = join(ROOT, '.claude/state/note-attach-done.json');

const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const LIMIT = Number((argv.indexOf('--limit') >= 0 ? argv[argv.indexOf('--limit') + 1] : '100'));

if (!existsSync(MISSING)) {
  console.error(`欠落リストがありません: ${MISSING}`);
  console.error('先に実査する: node scripts/check-note-attachments.mjs --live');
  process.exit(1);
}
const { measuredAt, missing } = JSON.parse(readFileSync(MISSING, 'utf8'));
const done = existsSync(DONE) ? JSON.parse(readFileSync(DONE, 'utf8')) : { attached: [] };
const doneSet = new Set(done.attached.map((d) => `${d.noteId}\t${d.pdf}`));

// 有料境界は記事ごとに違う。PDF と同じディレクトリの article*.md から noteId で引き当て、
// frontmatter の paidBoundary を取る。これを渡さないと note-attach-file が既定パターンで
// 境界を探して全件 exit 8 になる。
function boundaryOf(pdfRel, noteId) {
  // missing[].pdfs は**リポジトリ相対**（docs/note/… を含む）。docs/note を足さない。
  const dir = dirname(join(ROOT, pdfRel));
  if (!existsSync(dir)) return null;
  for (const f of readdirSync(dir)) {
    if (!/^article.*\.md$/.test(f)) continue;
    const t = readFileSync(join(dir, f), 'utf8');
    if (!t.includes(noteId)) continue;
    const m = t.match(/^paidBoundary:\s*["']?(.+?)["']?\s*$/m);
    return m ? m[1] : null;
  }
  return null;
}

// 1件 = 1アップロード。売れ筋（土木・総監模範論文）を先に、建設部門を後ろに。
const jobs = [];
for (const m of missing) for (const pdf of m.pdfs) jobs.push({ noteId: m.noteId, title: m.title, pdf, boundary: boundaryOf(pdf, m.noteId) });
const rank = (j) => (/建設部門/.test(j.title) ? 1 : 0);
jobs.sort((a, b) => rank(a) - rank(b));

const todo = jobs.filter((j) => !doneSet.has(`${j.noteId}\t${j.pdf}`));
console.log(`[note-attach-batch] 実測日 ${measuredAt} / 総アップロード ${jobs.length} 件 / 済 ${jobs.length - todo.length} / 残 ${todo.length}`);
const batch = todo.slice(0, LIMIT);
console.log(`今回の対象: ${batch.length} 件（--limit ${LIMIT}・note の1日100件上限に合わせる）\n`);

if (!COMMIT) {
  for (const [i, j] of batch.entries()) console.log(`  ${String(i + 1).padStart(3)}. ${j.noteId}  ${j.title.slice(0, 44)}`);
  console.log(`\n--commit で実添付。残 ${todo.length - batch.length} 件は翌日以降。`);
  process.exit(0);
}

let ok = 0; let fail = 0; let consecutiveUploadFail = 0;
for (const [i, j] of batch.entries()) {
  console.log(`\n===== [${i + 1}/${batch.length}] ${j.noteId} ${j.title.slice(0, 40)}`);
  // note-attach-file は frontmatter の paidBoundary を読まない。渡さないと既定の
  // `試験問題|予想問題` で境界を探して見つからず exit 8 で全件中断する
  // （2026-08-03: 42 件試して成功 0・41 件が「境界検証 NG」。done が 1 件しか無い理由）。
  const args = ['scripts/note-attach-file.mjs', '--note', j.noteId, '--file', j.pdf, '--commit'];
  if (j.boundary) args.push('--boundary-regex', j.boundary);
  const r = spawnSync('node', args,
    { cwd: ROOT, encoding: 'utf8', timeout: 300000, stdio: ['ignore', 'pipe', 'pipe'] });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  if (r.status === 0) {
    ok++; consecutiveUploadFail = 0;
    done.attached.push({ noteId: j.noteId, pdf: j.pdf, at: measuredAt });
    writeFileSync(DONE, JSON.stringify(done, null, 2) + '\n');   // 1件ごとに永続化（途中で落ちても再開できる）
    console.log(`  ✓ 添付＋ライブ実測OK`);
  } else {
    fail++;
    const capHit = /ファイルカード未検出/.test(out);
    if (capHit) consecutiveUploadFail++; else consecutiveUploadFail = 0;
    console.error(`  ✗ exit=${r.status}${capHit ? '（アップロード不成立）' : ''}`);
    console.error(out.split('\n').filter((l) => /ABORT|★|FAIL/.test(l)).slice(0, 4).map((l) => '     ' + l).join('\n'));
    if (consecutiveUploadFail >= 3) {
      console.error('\n★ アップロード不成立が3連続 → note の1日100件上限に達した可能性が高い。ここで打ち切る。');
      console.error('  翌日、同じコマンドを再実行すれば done-log から再開する。');
      break;
    }
  }
}

console.log(`\n[note-attach-batch] 成功 ${ok} / 失敗 ${fail} / 残 ${todo.length - ok}`);
console.log(`done-log: .claude/state/note-attach-done.json（commit すること）`);
console.log(`確認: node scripts/check-note-attachments.mjs --live`);
process.exit(fail && ok === 0 ? 1 : 0);
