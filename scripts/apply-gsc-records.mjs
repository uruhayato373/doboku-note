#!/usr/bin/env node
/**
 * apply-gsc-records.mjs — GSC の記録層の断片を検査して gsc-management.md へ追記し、commit・push する（DN-0849）。
 * ---------------------------------------------------------------------------
 * 土曜の Mac（scripts/scheduled/weekly-review.sh の run_gsc_record）が、ヘッドレスの Claude に
 * .tmp/claude-out/gsc/ へ断片（weekly-entry.md・coverage-entry.md・improvements.md）を書かせた後に呼ぶ。
 * Claude は .claude/ に書けないので、追記・commit・push はここで決定的に行う（旧 gsc-auto-review.yml の後段を移した）。
 *
 *   1. モデルがリポジトリを書いていないか（config・data・src・content・scripts に差分があれば止める）
 *   2. 断片の見出し・行数を検査し（lib/gsc-record.mjs）、gsc-management.md へ append-only で足す。改善候補は state.improvements へ写す
 *   3. commit・push（lib/routine-commit.mjs）
 *   4. 実行前のゲート（--before）と今のゲートを比べ、週次が要ったのに書かれていなければ失敗（check-gsc-auto-review --json）
 *
 * CLI（専用 worktree のルートで実行）:
 *   node scripts/apply-gsc-records.mjs --before .tmp/gsc-gates-before.json [--no-push] [--dry-run]
 *   node scripts/apply-gsc-records.mjs --needed --before .tmp/gsc-gates-before.json   # Claude を回す要があるか（0 要る / 3 要らない）
 *   --dry-run  検査と判定だけ（書かない・commit しない）
 * exit: 0 合格 / 1 断片の不正・モデルの直書き・書き戻しの失敗・週次の欠け / 2 使い方の誤り / 3（--needed）記録は要らない
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { parseCliArgs } from './lib/cli-args.mjs';
import { datasetDir } from './lib/datasets.mjs';
import { FRAGMENTS, appendEntry, judgeRecord, recordNeeded, validateFragment } from './lib/gsc-record.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { commitAndPush } from './lib/routine-commit.mjs';

const TAG = '[apply-gsc-records]';
const OUT_DIR = join('.tmp', 'claude-out', 'gsc');
const args = parseCliArgs({ before: { type: 'string' }, needed: { type: 'boolean' }, 'no-push': { type: 'boolean' }, 'dry-run': { type: 'boolean' } });
if (!args.before) { console.error(`${TAG} --before <実行前の check-gsc-auto-review --json> が要る`); process.exit(2); }

const git = (a) => spawnSync('git', a, { cwd: REPO_ROOT, encoding: 'utf8' });
function gates() {
  const r = spawnSync(process.execPath, ['scripts/check-gsc-auto-review.mjs', '--json'], { cwd: REPO_ROOT, encoding: 'utf8' });
  try { return JSON.parse(r.stdout); } catch { console.error(`${TAG} ✗ 検査不成立: check-gsc-auto-review --json を読めない（exit ${r.status}）`); process.exit(1); }
}
const read = (p) => (existsSync(join(REPO_ROOT, p)) ? readFileSync(join(REPO_ROOT, p), 'utf8') : null);

let before;
try { before = JSON.parse(readFileSync(resolve(REPO_ROOT, args.before), 'utf8')); } catch (e) { console.error(`${TAG} ✗ 検査不成立: ${args.before} を読めない（${e.message}）`); process.exit(1); }
if (!before?.gates || !before.logPath) { console.error(`${TAG} ✗ 検査不成立: ${args.before} に gates と logPath が無い`); process.exit(1); }
if (args.needed) {
  const g = before.gates;
  const need = recordNeeded(g);
  console.log(`${TAG} 記録が${need ? '要る' : '要らない'}（週次 ${g.weeklyAlreadyLogged ? '記録済み' : '未'}・coverage ${g.monthlyAlreadyLogged ? '記録済み' : '未'}・GSC のデータ ${g.gscDataStale ? `古い（${g.daysSinceGscQuery} 日前）` : '新しい'}）`);
  process.exit(need ? 0 : 3);
}
const problems = [];

// 1. モデルはリポジトリを書かない約束（.claude/ の外は Claude Code の保護が効かない）
const direct = git(['-c', 'core.quotepath=false', 'status', '--porcelain', '--', 'config', 'data', 'src', 'content', 'scripts']).stdout.trim();
if (direct) problems.push(`モデルがリポジトリのファイルを書いた（追記しない）: ${direct.split('\n').slice(0, 5).join(' / ')}`);

// 2. 断片の検査と追記
const logPath = before.logPath;
const today = todayJst();
const touched = [];
if (!problems.length) {
  let log = read(logPath);
  if (log == null) problems.push(`${logPath} が無い`);
  for (const [name, spec] of Object.entries(FRAGMENTS)) {
    const v = validateFragment(read(join(OUT_DIR, spec.file)), spec);
    console.log(`${TAG} ${name}: ${v.status}${v.lines ? `（${v.lines} 行）` : ''}${v.warning ? ` ⚠ ${v.warning}` : ''}${v.reason ? ` ✗ ${v.reason}` : ''}`);
    if (v.status === 'bad') problems.push(`${spec.file}: ${v.reason}`);
    if (v.status === 'ok' && log != null) log = appendEntry(log, read(join(OUT_DIR, spec.file)));
  }
  const improvements = join(OUT_DIR, 'improvements.md');
  const weeklyOk = validateFragment(read(join(OUT_DIR, FRAGMENTS.weekly.file)), FRAGMENTS.weekly).status === 'ok';
  if (!problems.length && log != null && log !== read(logPath)) {
    if (!args.dryRun) writeFileSync(join(REPO_ROOT, logPath), log);
    touched.push(logPath);
    if (weeklyOk && read(improvements)?.trim()) {
      const dest = join(datasetDir('state.improvements'), `${today}.md`);
      if (!args.dryRun) { mkdirSync(join(REPO_ROOT, datasetDir('state.improvements')), { recursive: true }); copyFileSync(join(REPO_ROOT, improvements), join(REPO_ROOT, dest)); }
      touched.push(dest);
    }
  }
  if (!touched.length) console.log(`${TAG} 書く断片が無い`);
}

// 3. commit・push
if (!problems.length && touched.length && !args.dryRun) {
  const r = commitAndPush(touched, `docs(gsc): 土曜の記録層 ${today}（週次観測・coverage・改善候補）[skip ci]`, { push: !args.noPush });
  console.log(`${TAG} commit: ${r.status}`);
  if (r.problem) problems.push(r.problem);
}

// 4. 書けたかの判定（実行前に要った週次が、いま記録されているか）
const after = args.dryRun ? before : gates();
const judged = judgeRecord(before.gates, after.gates);
for (const w of judged.warnings) console.log(`${TAG} ⚠ ${w}`);
problems.push(...judged.problems);

for (const p of problems) console.error(`${TAG} ✗ ${p}`);
console.log(problems.length ? `${TAG} ✗ 不合格` : `${TAG} ✓ 合格（週次が要った: ${judged.weeklyDue ? 'はい' : 'いいえ'}・書いた: ${touched.join(', ') || 'なし'}）`);
process.exitCode = problems.length ? 1 : 0;
