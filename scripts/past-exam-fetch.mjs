#!/usr/bin/env node
/**
 * past-exam-fetch — 過去問の年度在庫台帳（data/pastexams/inventory.json）の未取得ファイルを
 * 公式 URL（sourceUrl）から取得し、content/sources/past-exams/{資格}/{年度}/ に置いて acquiredAt を書く。
 *
 *   node scripts/past-exam-fetch.mjs [--exam <id>] [--year <西暦>]           # dry-run（取得予定だけ出す）
 *   node scripts/past-exam-fetch.mjs [--exam <id>] [--year <西暦>] --commit  # 取得して台帳を書く
 *
 * 取得は curl --ssl-no-revoke（会社PCプロキシ対策）。HTTP 200 かつ先頭が %PDF- のものだけ採用する。
 * 取得後の Drive 退避・照合・登録は /past-exam-archive の手順（drive-browser-transfer）。
 * exit 0 = 全件成功（または対象 0 件と明示）/ exit 1 = 1 件以上失敗
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { jstDayOf } from './lib/jst-date.mjs';

const NAME = 'past-exam-fetch';
export const INVENTORY_PATH = join(REPO_ROOT, datasetPath('pastexams.inventory'));

/** 取得対象（sourceUrl があり未取得）を列挙する（純関数）。 */
export function pendingFiles(inventory, { exam = null, year = null } = {}) {
  const out = [];
  for (const [id, ex] of Object.entries(inventory.exams || {})) {
    if (exam && id !== exam) continue;
    for (const y of ex.years || []) {
      if (year && y.year !== year) continue;
      for (const f of y.files || []) {
        if (f.acquiredAt || !f.sourceUrl) continue;
        out.push({ exam: id, year: y.year, file: f, repoPath: posix.join(ex.dir, f.file) });
      }
    }
  }
  return out;
}

/** JST の YYYY-MM-DD（Git Bash の TZ 指定は効かないので scripts/lib/jst-date.mjs で取る）。 */
export function jstDate(d = new Date()) {
  return jstDayOf(d);
}

function fetchPdf(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  // curl には ASCII の一時パスを渡す。Windows の curl は引数を ANSI コードページで受けるので、
  // 「鋼」のような字を含む保存先が別の名前に化ける（2026-09-29 実測）。日本語名への付け替えは Node が行う。
  const tmp = join(tmpdir(), `past-exam-${process.pid}-${Date.now()}.part`);
  // 公式ページの URL には日本語・全角空白・【】が素のまま入っていることがある（秋田県）。curl へ渡す前に正規化する
  const safeUrl = new URL(url).href;
  const r = spawnSync('curl', ['-sSL', '--ssl-no-revoke', '--max-time', '180', '-o', tmp, '-w', '%{http_code}', safeUrl], { encoding: 'utf8' });
  const code = (r.stdout || '').trim();
  const ok = r.status === 0 && code === '200' && existsSync(tmp) && readFileSync(tmp).subarray(0, 5).toString('latin1') === '%PDF-';
  if (ok) copyFileSync(tmp, dest);
  rmSync(tmp, { force: true });
  return { ok, detail: ok ? '' : `http=${code} rc=${r.status} ${(r.stderr || '').trim().slice(0, 120)}` };
}

function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const commit = args.includes('--commit');
  const inventory = JSON.parse(readFileSync(INVENTORY_PATH, 'utf8'));
  const targets = pendingFiles(inventory, { exam: opt('--exam'), year: opt('--year') ? Number(opt('--year')) : null });
  console.log(`[${NAME}] 取得対象 ${targets.length} 件${commit ? '' : '（dry-run・--commit で取得）'}`);
  if (!targets.length) { console.log(`[${NAME}] 対象 0 件（未取得で sourceUrl のある行が無い）`); return; }
  let ng = 0;
  for (const t of targets) {
    if (!commit) { console.log(`  PLAN ${t.repoPath} ← ${t.file.sourceUrl}`); continue; }
    const r = fetchPdf(t.file.sourceUrl, join(REPO_ROOT, t.repoPath));
    if (r.ok) { t.file.acquiredAt = jstDate(); console.log(`  OK   ${t.repoPath}`); }
    else { ng++; console.log(`  NG   ${t.repoPath}: ${r.detail}`); }
  }
  if (commit) writeFileSync(INVENTORY_PATH, JSON.stringify(inventory, null, 2) + '\n');
  console.log(`[${NAME}] 成功 ${commit ? targets.length - ng : 0} / 失敗 ${ng} / 対象 ${targets.length}`);
  if (ng) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
