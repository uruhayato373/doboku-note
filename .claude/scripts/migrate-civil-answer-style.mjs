#!/usr/bin/env node
// .claude/scripts/migrate-civil-answer-style.mjs
//
// !!! DEPRECATED — DO NOT RE-EXECUTE !!!
//
// 本スクリプトの `generateExamPoint()` は ExamPoint の summary を句読点（、。，）で
// 機械分割して items に詰めるバグがあり、約 1,440 個の壊れた ExamPoint を
// civil-construction-1/primary-*/article.mdx 24 本に生成した（2026-04-24 実行）。
// 学習価値ゼロの断片（「ブロック積擁壁工は」「胴込めコンクリートを設けない空積ではなく」等）
// が連なる構造を量産し、AdSense 審査不合格の一因となった。
//
// 再実行禁止。代替手段:
//   - 過去問 ExamPoint の修正は `civil-exampoint-restorer` Generator サブエージェント
//     （.claude/agents/civil-exampoint-restorer.md）を使う
//   - 過去問の解答補完は `civil-secondary-exam-writer` Generator サブエージェント
//     （.claude/agents/civil-secondary-exam-writer.md）を使う
//
// 履歴のために残しているが、削除しても問題ない。
//
// 1級土木施工管理技士 過去問解説スタイル統一スクリプト
// テーブル+水平線 → 番号付きリスト+ExamPoint（技術士総監スタイル）
//
// Usage:
//   node .claude/scripts/migrate-civil-answer-style.mjs --wave=1 [--dry-run]
//   node .claude/scripts/migrate-civil-answer-style.mjs --file=path/to/article.mdx [--dry-run]

import { readMdxFile, transformMdxFile } from './lib/mdx-io.mjs';
import { resolve } from 'node:path';

const BASE = resolve('content/site/civil-construction-1');

const WAVES = {
  1: ['primary-r07-a', 'primary-r07-b'],
  2: ['primary-r06-a', 'primary-r06-b', 'primary-r05-a', 'primary-r05-b',
      'primary-r04-a', 'primary-r04-b'],
  3: ['primary-r03-a', 'primary-r03-b', 'primary-r02-a', 'primary-r02-b',
      'primary-r01-a', 'primary-r01-b'],
  4: ['primary-h30-a', 'primary-h30-b', 'primary-h29-a', 'primary-h29-b',
      'primary-h28-a', 'primary-h28-b', 'primary-h27-a', 'primary-h27-b',
      'primary-h26-a', 'primary-h26-b'],
};

// ── Question type detection ────────────────────────────────────
// NEGATIVE must be tested first (「適当でない」contains「適当」)
const NEGATIVE_RE = /適当でない|誤っている|該当しない|不適切/;

function detectQuestionType(stem) {
  return NEGATIVE_RE.test(stem) ? 'negative' : 'positive';
}

// ── Table row parsing ──────────────────────────────────────────

function parseTableRow(line) {
  // Split by | and trim — handles both bold and non-bold rows
  const cells = line.split('|').map(c => c.trim()).filter(Boolean);
  if (cells.length < 3) return null;

  const num = cells[0].replace(/\*\*/g, '').trim();
  const mark = cells[1].replace(/\*\*/g, '').trim();

  // Strip outer bold from text cell
  let text = cells.slice(2).join('|').trim();          // rejoin in case text had |
  const boldMatch = text.match(/^\*\*(.+)\*\*$/s);
  if (boldMatch) text = boldMatch[1].trim();

  if (!/^\d+$/.test(num)) return null;
  if (mark !== '⭕' && mark !== '❌') return null;

  return { num, isAnswer: mark === '⭕', text };
}

// ── Numbered list formatting ───────────────────────────────────

function formatListItem(row, questionType) {
  const text = row.text === '---' ? '（解説なし）' : row.text;

  if (questionType === 'negative') {
    // 適当でないもの: answer = incorrect statement → bold + ❌
    return row.isAnswer
      ? `${row.num}. **${text} ❌**`
      : `${row.num}. ${text} ✅`;
  }
  // 適当なもの: answer = correct statement → ✅ (no bold)
  return row.isAnswer
    ? `${row.num}. ${text} ✅`
    : `${row.num}. **${text} ❌**`;
}

// ── ExamPoint generation ───────────────────────────────────────

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function generateExamPoint(pointText) {
  if (!pointText || !pointText.trim()) return null;

  const cleaned = pointText.trim().replace(/。$/, '');
  // Split by Japanese comma / period / full-width comma
  const clauses = cleaned.split(/[、。，]/).map(s => s.trim()).filter(Boolean);
  if (clauses.length === 0) return null;

  const summary = esc(cleaned);
  const items = clauses.map(c => `    "${esc(c)}",`);

  return [
    '<ExamPoint',
    `  summary="${summary}"`,
    '  items={[',
    ...items,
    '  ]}',
    '/>',
  ].join('\n');
}

// ── Details block transformation ───────────────────────────────

function transformDetails(innerLines, questionType) {
  let answerLine = '';
  let pointText = '';
  const tableRows = [];
  let state = 'init';

  for (const line of innerLines) {
    const t = line.trim();
    if (t === '') continue;
    if (t === '---') continue;

    if (/^\*\*正答[：:]/.test(t)) {
      answerLine = line;
      state = 'after_answer';
      continue;
    }
    if (t === '**ポイント**') {
      state = 'in_point';
      continue;
    }
    if (t === '**各選択肢の検証**') {
      state = 'in_table';
      continue;
    }
    // Table header / separator rows → skip
    if (/^\|\s*選択肢/.test(t) || /^\|[\s:|-]+\|$/.test(t)) continue;

    const row = parseTableRow(t);
    if (row) {
      tableRows.push(row);
      continue;
    }

    if (state === 'in_point') {
      pointText += (pointText ? '\n' : '') + t;
    }
  }

  // Build output lines
  const out = [''];
  out.push(answerLine);
  out.push('');

  for (const row of tableRows) {
    out.push(formatListItem(row, questionType));
  }

  const ep = generateExamPoint(pointText);
  if (ep) {
    out.push('');
    out.push(ep);
  }

  out.push('');
  return out;
}

// ── File-level transformation ──────────────────────────────────

function transformContent(raw) {
  // Normalize to LF for processing (writeMdxFile restores original EOL)
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const result = [];
  let stemBuf = '';
  let i = 0;
  let stats = { total: 0, negative: 0, positive: 0 };

  while (i < lines.length) {
    const line = lines[i];

    // Reset stem buffer at each question heading
    if (/^## 問題/.test(line)) stemBuf = '';
    stemBuf += line + '\n';

    // Detect answer <details> block
    if (
      line.trim() === '<details>' &&
      i + 1 < lines.length &&
      lines[i + 1].includes('解答・解説')
    ) {
      // Collect all lines of the block
      const block = [];
      while (i < lines.length) {
        block.push(lines[i]);
        if (lines[i].trim() === '</details>') { i++; break; }
        i++;
      }

      const qType = detectQuestionType(stemBuf);
      stats.total++;
      stats[qType]++;

      // Inner = everything between <summary> line and </details>
      const inner = block.slice(2, -1);
      const transformed = transformDetails(inner, qType);

      result.push('<details>');
      result.push('<summary>解答・解説</summary>');
      result.push(...transformed);
      result.push('</details>');
      continue;
    }

    result.push(line);
    i++;
  }

  // Attach stats for reporting
  transformContent._lastStats = stats;
  return result.join('\n');
}

// ── CLI ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const waveArg = args.find(a => a.startsWith('--wave='));
const fileArg = args.find(a => a.startsWith('--file='));

let files = [];
if (waveArg) {
  const n = parseInt(waveArg.split('=')[1]);
  const dirs = WAVES[n];
  if (!dirs) {
    console.error(`Unknown wave: ${n}. Valid waves: 1, 2, 3, 4`);
    process.exit(1);
  }
  files = dirs.map(d => resolve(BASE, d, 'article.mdx'));
} else if (fileArg) {
  files = [resolve(fileArg.split('=')[1])];
} else {
  console.log('Usage: node .claude/scripts/migrate-civil-answer-style.mjs --wave=N [--dry-run]');
  console.log('Waves: 1=R07, 2=R06-R04, 3=R03-R01, 4=H30-H26');
  process.exit(0);
}

let grandTotal = 0;
for (const fp of files) {
  const rel = fp.replace(process.cwd() + '/', '');
  if (dryRun) {
    const { raw } = readMdxFile(fp);
    const out = transformContent(raw);
    const s = transformContent._lastStats;
    grandTotal += s.total;
    console.log(`${rel}: ${s.total} questions (negative=${s.negative}, positive=${s.positive}) [DRY RUN]`);

    // Show first transformed block as sample
    const m = out.match(/<details>[\s\S]*?<\/details>/);
    if (m) {
      console.log('  --- sample ---');
      m[0].split('\n').forEach(l => console.log('  | ' + l));
      console.log('  --- end ---');
    }
  } else {
    const changed = transformMdxFile(fp, transformContent);
    const s = transformContent._lastStats;
    grandTotal += s.total;
    console.log(`${rel}: ${s.total} questions ${changed ? '✓' : '(no change)'} (neg=${s.negative}, pos=${s.positive})`);
  }
}

console.log(`\nTotal: ${files.length} files, ${grandTotal} questions${dryRun ? ' [DRY RUN]' : ''}`);
