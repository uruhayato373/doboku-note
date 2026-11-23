#!/usr/bin/env node
// npm run report-agent-usage -- [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--json] — サブエージェントの起動の記録（~/.claude/usage-log/・hook の record-usage が書く）を集計する。
// エージェントごとの回数・型なし（general-purpose）の割合・呼び出しで明示した model と effort の内訳を出す。読み手は DN-1246（2026-12-16 の前後比較）。
// 罠: 記録はリポジトリの外（DOBOKU_USAGE_LOG_DIR か ~/.claude/usage-log）にあり CI には無い。model・effort・typed は 2026-11-23 以降の記録にだけある
// （それより前は「不明」に数える）。明示が null のときは定義の frontmatter か CLAUDE_CODE_SUBAGENT_MODEL が効いている。
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCliArgs } from '../lib/cli-args.mjs';
import { isCliEntry } from '../lib/cli-run.mjs';

/** 純関数。records は usage-log の 1 行ずつ。{ agents, total, untyped, models, efforts } */
export function summarizeAgentUsage(records, { since = '', until = '9999' } = {}) {
  const rows = records.filter((r) => r?.kind === 'agent' && r.at >= since && r.at.slice(0, 10) <= until);
  const count = (key) => rows.reduce((m, r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1), new Map());
  const sorted = (m) => [...m].sort((a, b) => b[1] - a[1]);
  return {
    total: rows.length,
    agents: sorted(count((r) => r.name)),
    untyped: rows.filter((r) => r.typed === false || (r.typed === undefined && r.name === 'general-purpose')).length,
    models: sorted(count((r) => ('model' in r ? r.model ?? '明示なし' : '不明（11-23 より前）'))),
    efforts: sorted(count((r) => ('effort' in r ? r.effort ?? '明示なし' : '不明（11-23 より前）'))),
  };
}

function readRecords(dir) {
  if (!existsSync(dir)) throw new Error(`記録の置き場が無い: ${dir}`);
  const out = [];
  for (const f of readdirSync(dir).filter((n) => /^doboku-note-\d{4}-\d{2}\.jsonl$/.test(n))) {
    for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { out.push(JSON.parse(line)); } catch { /* 壊れた行は数えない */ }
    }
  }
  return out;
}

function main() {
  const args = parseCliArgs({ since: { type: 'string', default: '' }, until: { type: 'string', default: '9999' }, json: { type: 'boolean' } });
  const dir = process.env.DOBOKU_USAGE_LOG_DIR || join(homedir(), '.claude', 'usage-log');
  const s = summarizeAgentUsage(readRecords(dir), args);
  if (s.total === 0) { console.error(`report-agent-usage: 期間（${args.since || '最初'}〜${args.until}）の起動の記録が 0 件（集計不成立）`); process.exitCode = 1; return; }
  if (args.json) { process.stdout.write(JSON.stringify(s, null, 2) + '\n'); return; }
  console.log(`report-agent-usage: 起動 ${s.total} 回・型なし ${s.untyped} 回（${Math.round((s.untyped / s.total) * 100)}%）・エージェント ${s.agents.length} 種`);
  console.log(`  model の明示: ${s.models.map(([k, v]) => `${k} ${v}`).join('・')}`);
  console.log(`  effort の明示: ${s.efforts.map(([k, v]) => `${k} ${v}`).join('・')}`);
  for (const [name, n] of s.agents) console.log(`  ${String(n).padStart(4)}  ${name}`);
}

if (isCliEntry(import.meta.url)) main();
