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
 * 偽成功ガード（2026-07-01）: 即時公開は「noteUrl が書けた」だけで OK とせず、書き戻した
 *   noteId が note API v3 で実在するかを照合する（幻 id=確定404 なら fail で停止）。writeback は
 *   ページ URL から id を抜くだけで、公開未完了でも幻 id を書きうるため fmHasUrl だけでは
 *   偽成功を素通りさせる（工事82-87 が fail=0 のまま未公開だった再発防止）。予約投稿は go-live が
 *   後刻ゆえ実在検証しない（weekly `verify-note-status` が担保）。バッチ後も同 reconciler で全件照合推奨。
 *
 * 公開順は article 名の昇順（R03→R07→R08-yosou × II1→II2→III）。各記事公開後、
 * note-publish が noteUrl/noteId/notePublishedAt を frontmatter に writeback する
 * （git commit はしない＝呼び側で pathspec commit）。
 *
 * 使い方:
 *   node scripts/note-publish-magazine.mjs --dir <magazineDir>            # dry（対象一覧）
 *   node scripts/note-publish-magazine.mjs --dir <magazineDir> --commit   # 即時公開
 *   # 時間ずらし予約投稿（無料記事 article.md を1日1本 07:00 JST から）:
 *   node scripts/note-publish-magazine.mjs --dir <dir> --pattern article.md \
 *     --schedule-start 2026-06-20T07:00 --interval-hours 24 --commit
 *   # --pattern 既定=article-*.md（BKマガジン）。--schedule-start で予約投稿（slot i は start+i*interval）。
 *
 * 注意: note の画像(eyecatch)アップロードを伴うが、これは PDF 添付の1日100件上限とは
 *   別枠。PDF 添付の上限管理は note-attach-magazine-pdfs / note-attach-pdf を参照。
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import * as nodeFs from 'node:fs'; // globSync は Node 22+ のみ。--dir 経路でだけ参照（--list は不要）
import { execFileSync } from 'node:child_process';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const DIR = getArg('--dir');
const LIST = getArg('--list'); // 明示リスト（1行1記事パス・先頭# コメント可）。--dir glob より優先。順序=公開順=予約slot順。
const COMMIT = argv.includes('--commit');
const PATTERN = getArg('--pattern') || 'article-*.md'; // 無料記事(article.md)は --pattern article.md
// 時間ずらし予約投稿: --schedule-start "YYYY-MM-DDTHH:MM"（JST）＋ --interval-hours N（既定24）。
// 公開対象（未公開）を昇順に start, start+N, start+2N... へ割り当てる。
const SCHED_START = getArg('--schedule-start');
const INTERVAL_H = parseInt(getArg('--interval-hours') || '24', 10);
if (!DIR && !LIST) { console.error('--dir <magazineDir> または --list <file> が必要'); process.exit(1); }

// wall-clock に hours を足す（マシンTZ非依存・日付繰り上げ対応）
const addHours = (startStr, hours) => {
  const m = startStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/);
  if (!m) { console.error('--schedule-start format: YYYY-MM-DDTHH:MM'); process.exit(1); }
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  d.setUTCHours(d.getUTCHours() + hours);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

let files, srcLabel;
if (LIST) {
  const lf = join(ROOT, LIST);
  if (!existsSync(lf)) { console.error('list not found: ' + lf); process.exit(1); }
  files = readFileSync(lf, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#')).map((p) => join(ROOT, p));
  const missing = files.filter((f) => !existsSync(f));
  if (missing.length) { console.error('list 内に存在しないパス:\n  ' + missing.join('\n  ')); process.exit(1); }
  srcLabel = LIST;
} else {
  const abs = join(ROOT, DIR);
  if (!existsSync(abs)) { console.error('dir not found: ' + abs); process.exit(1); }
  if (typeof nodeFs.globSync !== 'function') { console.error('--dir は Node 22+（fs.globSync）が必要。Node 20 では --list を使うこと'); process.exit(1); }
  files = nodeFs.globSync(`${abs.replace(/\\/g, '/')}/**/${PATTERN}`).sort();
  srcLabel = DIR;
}
const rel = (f) => f.replace(/\\/g, '/').replace(ROOT.replace(/\\/g, '/') + '/', '');
const fmHasUrl = (f) => /noteUrl:\s*"https?:\/\//.test(readFileSync(f, 'utf8'));
const fmNoteId = (f) => (readFileSync(f, 'utf8').match(/^noteId:\s*"?([a-z0-9]+)"?/mi) || [])[1] || '';

// 偽成功ガード: 公開直後に noteId が note API で実在するか検証する。writeback は「ページから
//   拾った URL に id があれば書く」ため、公開が実際は未完了でも幻 id を書き込みうる（2026-06-30
//   工事82-87 が fail=0 のまま未公開＝[[project_civil1_flagship_pack]]）。fmHasUrl だけでは
//   検出できない。'ok'=実在 / '404'=確定不在(幻ID) / 'unknown'=network揺れ(判定保留)。
//   即時公開のみ検証（予約は go-live 後刻で API 404 が正常＝weekly verify-note-status が担保）。
function liveNoteStatus(noteId) {
  let confirmed404 = false;
  for (let i = 0; i < 3; i++) {
    let out = '';
    try { out = execFileSync('curl', ['-s', '--ssl-no-revoke', '--max-time', '20', `https://note.com/api/v3/notes/${noteId}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }); } catch { out = ''; }
    try { const d = JSON.parse(out); const data = d.data || d; if (data && data.status) return 'ok'; confirmed404 = true; } catch { /* 空/非JSON=throttle → retry */ }
    if (i < 2) { try { execFileSync('sleep', [String(2 + i)]); } catch {} } // 新規公開の eventual-consistency ラグも吸収
  }
  return confirmed404 ? '404' : 'unknown';
}

console.log(`[対象] ${files.length} 記事 (${srcLabel})${LIST ? '' : ` pattern=${PATTERN}`}${SCHED_START ? `  予約: ${SCHED_START} から ${INTERVAL_H}h 間隔` : ''}`);
let previewSlot = 0;
for (const f of files) {
  const pub = fmHasUrl(f);
  const when = (!pub && SCHED_START) ? `  @${addHours(SCHED_START, previewSlot * INTERVAL_H)}` : '';
  if (!pub) previewSlot++;
  console.log(`  ${rel(f)}${pub ? ' [公開済]' : when}`);
}
if (!COMMIT) { console.log(`\nDRY（--commit で${SCHED_START ? '予約投稿' : '即時公開'}）`); process.exit(0); }

const LOG = join(ROOT, '.tmp', `publish-${basename(srcLabel).replace(/[^\w.-]/g, '_')}.log`);
appendFileSync(LOG, `[start] ${srcLabel} ${files.length} files\n`);
let ok = 0, skip = 0, fail = 0, slot = 0;
for (let i = 0; i < files.length; i++) {
  const f = files[i]; const tag = `[${i + 1}/${files.length}] ${rel(f)}`;
  if (fmHasUrl(f)) { console.log(`${tag} SKIP(published)`); appendFileSync(LOG, `SKIP\t${f}\n`); skip++; continue; }
  const schedArgs = SCHED_START ? ['--schedule', addHours(SCHED_START, slot * INTERVAL_H)] : [];
  slot++;
  let done = false, lastErr = '';
  for (let attempt = 1; attempt <= 2 && !done; attempt++) {
    console.log(`${tag} ${SCHED_START ? `RESERVE @${schedArgs[1]}` : 'PUBLISH'}${attempt > 1 ? ` (retry ${attempt})` : ''}`);
    try {
      execFileSync('node', ['scripts/note-publish.mjs', '--article', f, '--commit', ...schedArgs], { cwd: ROOT, encoding: 'utf8', timeout: 360000, stdio: ['ignore', 'pipe', 'pipe'] });
      if (!fmHasUrl(f)) { lastErr = 'noteUrl not written after publish'; }
      else if (SCHED_START) { done = true; } // 予約=go-live 後刻・実在検証しない（weekly verify-note-status が担保）
      else {
        // 偽成功ガード（即時公開）: 書き戻した noteId が note API で実在するか照合
        const id = fmNoteId(f);
        const live = id ? liveNoteStatus(id) : 'unknown';
        if (live === 'ok') done = true;
        else if (live === '404') { lastErr = `偽成功検出: 公開後 noteId ${id} が note API で実在せず（幻ID）。frontmatter をリセットして再公開が必要`; break; } // retry しても skip されるだけ→即停止
        else { done = true; console.warn(`    WARN: noteId ${id} 実在未確認(network揺れ)。バッチ後に npm run verify-note-status で要照合`); }
      }
    } catch (e) { lastErr = ((e.stdout || '') + (e.stderr || '')).trim().split('\n').slice(-2).join(' | '); }
    if (!done && attempt < 2) await new Promise((r) => setTimeout(r, 8000));
  }
  if (done) { console.log('    OK'); appendFileSync(LOG, `OK\t${f}\n`); ok++; }
  else { console.error(`    FAIL :: ${lastErr}`); appendFileSync(LOG, `FAIL\t${f}\t${lastErr.slice(0, 120)}\n`); fail++; console.error(`[停止] ${rel(f)} で失敗。原因確認後に再実行で再開（published skip）`); break; }
  await new Promise((r) => setTimeout(r, 12000)); // pacing
}
console.log(`\n[done] ok=${ok} skip=${skip} fail=${fail} / ${files.length}`);
if (!SCHED_START) console.log('[偽成功ガード] 即時公開分は noteId 実在を照合済み。全件確証は `npm run verify-note-status`（fm=published↔ライブ404 を検出）を推奨。');
process.exit(fail ? 1 : 0);
