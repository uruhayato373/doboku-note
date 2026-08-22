#!/usr/bin/env node
// SessionStart hook: weekly.md / monthly.md の鮮度チェック
// 古ければセッション開始時に1行警告を出す（ブロックしない）

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function currentISOWeek() {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const warnings = [];

// weekly.md チェック
try {
  const content = fs.readFileSync(path.join(ROOT, '.claude/todo/weekly.md'), 'utf-8');
  const match = content.match(/^# 週間計画 — (\d{4}-W\d{2})/m);
  const cur = currentISOWeek();
  if (!match) {
    warnings.push(`weekly.md: 週番号が見つかりません`);
  } else if (match[1] !== cur) {
    warnings.push(`weekly.md が ${match[1]} のまま（今週: ${cur}）→ .claude/todo/weekly.md を更新してください`);
  }
} catch { /* ファイルなし等はスキップ */ }

// monthly.md チェック
try {
  const content = fs.readFileSync(path.join(ROOT, '.claude/todo/monthly.md'), 'utf-8');
  const match = content.match(/^# 月間計画 — (\d{4})年(\d{1,2})月/m);
  const [cy, cm] = currentYearMonth().split('-');
  if (match) {
    const fileMon = `${match[1]}-${String(match[2]).padStart(2, '0')}`;
    if (fileMon !== `${cy}-${cm}`) {
      warnings.push(`monthly.md が ${match[1]}年${match[2]}月のまま（今月: ${cy}年${Number(cm)}月）→ .claude/todo/monthly.md を更新してください`);
    }
  }
} catch { /* スキップ */ }

if (warnings.length > 0) {
  console.log('');
  console.log('─── 計画ファイル更新リマインダー ───────────────');
  warnings.forEach(w => console.log(`  ${w}`));
  console.log('────────────────────────────────────────────────');
  console.log('');
}

// ── deploy ドリフト検知 ─────────────────────────────
// CI が main へ自動 deploy した後、todo 側の「残: /deploy で本番反映」注記が
// 消し忘れられる drift を検出する。参照 PR 番号が origin/main に入っていれば
// その項目は既に本番反映済みのはず → WARN（非ブロック・SessionStart 助言）。
function mergedPrSet() {
  try {
    // origin/main の squash 件名 "... (#NNN)" から merged PR 番号を集める（fetch はしない＝高速・助言用）
    // execFileSync＋引数配列でシェルを経由しない（静的引数だが injection 回避のベストプラクティス）
    // 履歴が切り詰められていたら「PR 0 件」ではなく **判定不能** を返す。
    // 2026-08-22 に履歴を単一 commit へ切り詰めたので、ここで 0 件を返すと
    // 全 PR が未 merge 扱いになり、助言が丸ごと嘘になる（CLAUDE.md §9）。
    const total = Number(execFileSync('git', ['rev-list', '--count', 'origin/main'], {
      cwd: ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1024 * 1024,
    }).trim() || '0');
    if (total < 50) return null; // 履歴が浅い/切り詰め済み → 判定できないのでスキップ

    const log = execFileSync('git', ['log', 'origin/main', '--format=%s', '-n', '400'], {
      cwd: ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024,
    });
    const set = new Set();
    for (const m of log.matchAll(/\(#(\d+)\)/g)) set.add(m[1]);
    return set;
  } catch {
    return null; // origin/main 参照なし（浅い clone 等）→ スキップ
  }
}

// 未反映マーカー（PENDING）を示す行か。「本番反映済」等の解決済み表現は除外。
function isDeployPending(line) {
  if (/本番反映済|deploy\s*済み|反映済/.test(line)) return false;
  return (
    /残[：:\s].{0,20}\/deploy/.test(line) ||
    /\/deploy\s*で(の)?本番反映/.test(line) ||
    /develop\s*済[＝=].{0,10}\/deploy/.test(line) ||
    /未deploy/.test(line) ||
    /deploy\s*待ち/.test(line)
  );
}

const deployWarnings = [];
const merged = mergedPrSet();
if (merged && merged.size) {
  let todoFiles = [];
  try {
    todoFiles = fs.readdirSync(path.join(ROOT, '.claude/todo'))
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.join('.claude/todo', f));
  } catch { /* dir なし */ }

  for (const rel of todoFiles) {
    let lines;
    try { lines = fs.readFileSync(path.join(ROOT, rel), 'utf-8').split(/\r?\n/); }
    catch { continue; }
    lines.forEach((line, i) => {
      if (!isDeployPending(line)) return;
      const prs = [...line.matchAll(/#(\d+)/g)].map((m) => m[1]).filter((n) => merged.has(n));
      if (prs.length) {
        deployWarnings.push(`${rel}:${i + 1} 「残:/deploy」だが PR ${prs.map((n) => `#${n}`).join('/')} は origin/main 入り済＝deploy 済のはず → 注記を「本番反映済」に更新`);
      }
    });
  }
}

if (deployWarnings.length > 0) {
  console.log('');
  console.log('─── todo deploy ドリフト検知 ───────────────────');
  deployWarnings.forEach((w) => console.log(`  ${w}`));
  console.log('────────────────────────────────────────────────');
  console.log('');
}
