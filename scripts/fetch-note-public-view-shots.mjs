#!/usr/bin/env node
/**
 * fetch-note-public-view-shots.mjs — 週次 note-public-view.yml が残した目視確認用の画像を手元へ取ってくる。
 *
 * 週次レビュー（土曜・ローカル・/weekly-review）で、エージェントが note 公開ページの見た目を画像で確かめる
 * ための入口。判定は CI が数値で済ませており、ここで取るのは「数値では決められない見た目の崩れ」を見る材料。
 * 最新の完了した run の成果物 note-public-view を .tmp/note-public-view-review/<runId>/ に展開し、
 * note と YouTube の review/index.json（代表ページ × ブレイクポイントごとの画面幅）の件数を出す。
 *
 * 使い方: node scripts/fetch-note-public-view-shots.mjs [--json] [--run <runId>]（--run は PR の run を含め任意の run を指定）
 * 終了コード: 0 = 取得できた / 2 = gh が使えない・対象の run や成果物が無い（未確認として扱う）
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = process.argv.includes('--json');
const runArg = (() => { const i = process.argv.indexOf('--run'); return i >= 0 ? Number(process.argv[i + 1]) : null; })();
const gh = (args) => execFileSync('gh', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const fail = (msg) => { console.error(`[fetch-note-public-view-shots] 未確認: ${msg}`); process.exit(2); };

let runs;
try {
  runs = JSON.parse(gh(['run', 'list', '--workflow', 'note-public-view.yml', '--limit', '20', '--json', 'databaseId,event,status,conclusion,createdAt']));
} catch (e) {
  fail(`gh run list に失敗（${String(e.stderr || e.message).split('\n')[0]}）`);
}
const run = runArg ? runs.find((r) => r.databaseId === runArg) || { databaseId: runArg, createdAt: '?', conclusion: '?' }
  : runs.find((r) => r.status === 'completed' && r.event !== 'pull_request');
if (!run) fail('完了した定期・手動の run が無い');

// 成果物は .tmp/ 以下の構造のまま展開されるので、review/index.json をすべて探す（note と YouTube）
const findIndexes = (d, acc = []) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) findIndexes(p, acc);
    else if (e.name === 'index.json' && d.endsWith('review')) acc.push(p);
  }
  return acc;
};
const dir = join(ROOT, '.tmp/note-public-view-review', String(run.databaseId));
if (!(existsSync(dir) && findIndexes(dir).length)) {
  mkdirSync(dir, { recursive: true });
  try {
    gh(['run', 'download', String(run.databaseId), '-n', 'note-public-view', '-D', dir]);
  } catch (e) {
    fail(`run ${run.databaseId} の成果物を取れない（保存期間切れの可能性・${String(e.stderr || e.message).split('\n')[0]}）`);
  }
}
const indexes = findIndexes(dir);
if (!indexes.length) fail(`run ${run.databaseId} の成果物に review/index.json が無い（撮影 0 枚）`);
const services = indexes.map((p) => {
  const j = JSON.parse(readFileSync(p, 'utf8'));
  const pages = j.pages || [];
  return {
    service: j.service || 'note',
    reviewDir: dirname(p),
    pages: pages.length,
    viewports: (j.viewports || []).map((v) => v.width),
    shots: pages.reduce((n, pg) => n + (pg.shots?.length || 0), 0),
    missingShots: pages.filter((pg) => !pg.shots?.length).length,
    breakpointDrift: j.breakpoints?.drift || null,
  };
});
const summary = { runId: run.databaseId, createdAt: run.createdAt, conclusion: run.conclusion, services };
if (JSON_OUT) console.log(JSON.stringify(summary, null, 2));
else for (const s of services) console.log(`[fetch-note-public-view-shots] run ${summary.runId}（${summary.createdAt}・${summary.conclusion}）${s.service}: ${s.pages} ページ × ${s.viewports.length} 画面幅・${s.shots} 枚 → ${s.reviewDir}${s.missingShots ? `（撮れなかったページ ${s.missingShots}）` : ''}`);
