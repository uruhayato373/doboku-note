#!/usr/bin/env node
// SessionStart hook: weekly.md / monthly.md の鮮度チェック
// 古ければセッション開始時に1行警告を出す（ブロックしない）

import fs from 'fs';
import path from 'path';
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
  const content = fs.readFileSync(path.join(ROOT, 'docs/todo/weekly.md'), 'utf-8');
  const match = content.match(/^# 週間計画 — (\d{4}-W\d{2})/m);
  const cur = currentISOWeek();
  if (!match) {
    warnings.push(`weekly.md: 週番号が見つかりません`);
  } else if (match[1] !== cur) {
    warnings.push(`weekly.md が ${match[1]} のまま（今週: ${cur}）→ docs/todo/weekly.md を更新してください`);
  }
} catch { /* ファイルなし等はスキップ */ }

// monthly.md チェック
try {
  const content = fs.readFileSync(path.join(ROOT, 'docs/todo/monthly.md'), 'utf-8');
  const match = content.match(/^# 月間計画 — (\d{4})年(\d{1,2})月/m);
  const [cy, cm] = currentYearMonth().split('-');
  if (match) {
    const fileMon = `${match[1]}-${String(match[2]).padStart(2, '0')}`;
    if (fileMon !== `${cy}-${cm}`) {
      warnings.push(`monthly.md が ${match[1]}年${match[2]}月のまま（今月: ${cy}年${Number(cm)}月）→ docs/todo/monthly.md を更新してください`);
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
