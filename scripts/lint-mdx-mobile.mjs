#!/usr/bin/env node
/**
 * MDXモバイル視認性リンター
 *
 * review-mobile スキルのチェック項目のうち、機械判定可能なものを強制する。
 *
 * Usage:
 *   node scripts/lint-mdx-mobile.mjs <file.mdx>
 *   node scripts/lint-mdx-mobile.mjs <dir>
 *   node scripts/lint-mdx-mobile.mjs                # git diff で変更された MDX を対象
 *
 * 検出ルール（MVP）:
 *   1-1 HIGH   表セル内に KaTeX 数式（$...$）が含まれる
 *   1-3 MEDIUM 4列以上の表
 *   1-4 MEDIUM 3列以上の表でセル内テキストが15文字超
 *   1-5 HIGH   キーバリュー表（ヘッダーが項目/内容、正式名称/目的 等）
 *   6-1 MEDIUM 表の直前行が見出しのみで導入文がない
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const CELL_MAX = 15;

// ── CLI ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function resolveTargets(args) {
  if (args.length === 0) {
    // git diff モード
    try {
      const out = execSync('git diff --name-only', { encoding: 'utf8' });
      return out
        .split(/\r?\n/)
        .filter((p) => p.endsWith('.mdx') && existsSync(p));
    } catch {
      return [];
    }
  }
  const files = [];
  for (const a of args) {
    if (!existsSync(a)) {
      console.error(`Not found: ${a}`);
      process.exit(2);
    }
    const st = statSync(a);
    if (st.isDirectory()) {
      collectMdx(a, files);
    } else if (a.endsWith('.mdx')) {
      files.push(a);
    }
  }
  return files;
}

function collectMdx(dir, out) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) collectMdx(p, out);
    else if (entry.endsWith('.mdx')) out.push(p);
  }
}

// ── パーサ ───────────────────────────────────────────────────────────────────

/**
 * 行配列から表ブロックを抽出する。
 * 表の条件: 連続する `|` 始まり行のうち、2行目がセパレータ（`|---|---|` 形式）
 * 返値: [{ startLine, endLine, headerLine, separatorLine, dataLines }]
 * 1-based 行番号。
 */
function extractTables(lines) {
  const tables = [];
  const isPipeLine = (s) => /^\s*\|.*\|\s*$/.test(s);
  const isSeparator = (s) => /^\s*\|[-:\s|]+\|\s*$/.test(s) && /-/.test(s);

  let i = 0;
  while (i < lines.length) {
    if (isPipeLine(lines[i]) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      const startLine = i + 1; // 1-based
      const headerLine = lines[i];
      const separatorLine = lines[i + 1];
      let j = i + 2;
      const dataLines = [];
      while (j < lines.length && isPipeLine(lines[j])) {
        dataLines.push({ lineNum: j + 1, text: lines[j] });
        j++;
      }
      tables.push({
        startLine,
        endLine: j, // 1-based inclusive
        headerLine,
        separatorLine,
        dataLines,
      });
      i = j;
    } else {
      i++;
    }
  }
  return tables;
}

/**
 * `| a | b | c |` を ['a', 'b', 'c'] に分解。
 * 先頭末尾の `|` を除去後、`|` で分割。`\|` エスケープは今回考慮しない。
 */
function splitRow(row) {
  const trimmed = row.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((c) => c.trim());
}

/**
 * セル内テキストの実質文字数。
 * - `$...$` を除外（KaTeX 数式は別ルールで検出）
 * - Markdown リンク `[text](url)` は表示テキスト `text` のみ残す
 * - Markdown 記号 `**`, `*`, `` ` `` を除外
 * - 空白は1文字としてカウント（全角半角区別なし）
 */
function cellLength(cell) {
  const withoutMath = cell.replace(/\$[^$]*\$/g, '');
  const withoutLinks = withoutMath.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  const withoutMd = withoutLinks
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '');
  return [...withoutMd.trim()].length;
}

/**
 * セル内の KaTeX 数式が「モバイル表示を崩すほど長いか」を判定する。
 * $\alpha$ や $H_0$ のような短い記号は許容（レンダリング上の実害が小さい）。
 * 単一の数式スパンで 7 文字以上、または累積で 10 文字以上を NG とする。
 */
function hasLongMath(cell) {
  const spans = [...cell.matchAll(/\$([^$]*)\$/g)].map((m) => m[1]);
  if (spans.length === 0) return false;
  const maxLen = Math.max(...spans.map((s) => s.length));
  const sumLen = spans.reduce((a, s) => a + s.length, 0);
  return maxLen >= 7 || sumLen >= 10;
}

// ── 個別ルール ───────────────────────────────────────────────────────────────

function lintTable(table, findings) {
  const header = splitRow(table.headerLine);
  const colCount = header.length;

  // 1-5 キーバリュー表
  const kvHeaders = ['項目', '内容', '正式名称', '目的', '所管', '施行', '概要'];
  const isKeyValue =
    colCount === 2 && kvHeaders.includes(header[0]) && kvHeaders.includes(header[1]);
  if (isKeyValue) {
    findings.push({
      severity: 'HIGH',
      rule: '1-5',
      line: table.startLine,
      endLine: table.endLine,
      message: `キーバリュー表は冒頭散文に統合すべき（ヘッダー: ${header.join(' / ')}）`,
    });
  }

  // 1-3 4列以上
  if (colCount >= 4) {
    findings.push({
      severity: 'MEDIUM',
      rule: '1-3',
      line: table.startLine,
      endLine: table.endLine,
      message: `${colCount}列表。3列以下に整理するか、箇条書きへの変換を検討`,
    });
  }

  // 全行（ヘッダー含む）を走査して 1-1, 1-4 を判定
  const allRows = [
    { lineNum: table.startLine, cells: header },
    ...table.dataLines.map((d) => ({ lineNum: d.lineNum, cells: splitRow(d.text) })),
  ];

  for (const row of allRows) {
    for (let k = 0; k < row.cells.length; k++) {
      const cell = row.cells[k];

      // 1-1 KaTeX 数式混入（長い数式のみ）
      if (hasLongMath(cell)) {
        findings.push({
          severity: 'HIGH',
          rule: '1-1',
          line: row.lineNum,
          endLine: row.lineNum,
          message: `表セル内に長い KaTeX 数式 — 列${k + 1} ${trimPreview(cell)}`,
        });
      }

      // 1-4 3列以上のセル15字超
      if (colCount >= 3) {
        const len = cellLength(cell);
        if (len > CELL_MAX) {
          findings.push({
            severity: 'MEDIUM',
            rule: '1-4',
            line: row.lineNum,
            endLine: row.lineNum,
            message: `${colCount}列表の列${k + 1}セル「${trimPreview(cell, 30)}」が${len}字（上限${CELL_MAX}）`,
          });
        }
      }
    }
  }
}

function trimPreview(s, max = 20) {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? `「${flat}」` : `「${flat.slice(0, max)}…」`;
}

/**
 * 8-1: 末尾リスト形式の `関連キーワード:` を検出
 * 関連キーワードは本文中にインラインで埋め込むべき。
 */
function lintRelatedKeywordList(lines, findings, offset) {
  for (let i = 0; i < lines.length; i++) {
    if (/^関連キーワード[:：]/.test(lines[i])) {
      findings.push({
        severity: 'MEDIUM',
        rule: '8-1',
        line: i + 1,
        endLine: i + 1,
        message:
          '末尾に「関連キーワード: ...」の列挙行を作らない。本文中にインラインでリンクを埋め込む',
      });
    }
  }
}

/**
 * 8-2: 法令条文への未リンクを検出
 * 「◯◯法第◯条」のパターンが e-Gov へのインラインリンクになっていない場合に LOW で警告する。
 * 既存の Markdown リンク [text](url) 内にあるパターンは対象外。
 */
function lintLegalCitations(lines, findings) {
  // 法令名パターン: 「◯◯法」「憲法」「民法」「刑法」「下請法」等
  const lawCitationRe = /([一-龥ぁ-んァ-ヶー]{1,12}法|憲法|民法|刑法|下請法)\s*第\s*[\d０-９]+\s*条(?:\s*第\s*[\d０-９]+\s*項)?/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    lawCitationRe.lastIndex = 0;
    while ((m = lawCitationRe.exec(line)) !== null) {
      const matchStart = m.index;
      // 該当マッチが既存の Markdown リンク [...](url) 内にあるかチェック
      // 簡易判定: マッチ位置より前の「[」と「]」の数を数え、開き括弧が閉じ括弧より多ければリンクテキスト内
      const before = line.slice(0, matchStart);
      const opens = (before.match(/\[/g) || []).length;
      const closes = (before.match(/\]/g) || []).length;
      if (opens > closes) continue; // リンクテキスト内はスキップ
      findings.push({
        severity: 'LOW',
        rule: '8-2',
        line: i + 1,
        endLine: i + 1,
        message: `法令条文「${m[0]}」が e-Gov へのインラインリンクになっていない`,
      });
    }
  }
}

/**
 * 6-1: 表の直前行が見出しのみで導入文がない
 * 表開始行の直前にある非空行が `##` / `###` で始まる場合は違反。
 */
function lintHeadingBeforeTable(table, lines, findings) {
  let idx = table.startLine - 2; // 直前行の0-based index
  while (idx >= 0 && lines[idx].trim() === '') idx--;
  if (idx < 0) return;
  const prev = lines[idx];
  if (/^#{2,4}\s/.test(prev)) {
    findings.push({
      severity: 'MEDIUM',
      rule: '6-1',
      line: table.startLine,
      endLine: table.startLine,
      message: `表の直前に導入文がない（直前行: ${trimPreview(prev, 30)}）`,
    });
  }
}

// ── メイン ───────────────────────────────────────────────────────────────────

function lintFile(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  // frontmatter を除外
  const content = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  const offset = (raw.length - content.length > 0)
    ? raw.slice(0, raw.length - content.length).split(/\r?\n/).length - 1
    : 0;
  const lines = content.split(/\r?\n/);
  const findings = [];

  const tables = extractTables(lines);
  for (const t of tables) {
    lintTable(t, findings);
    lintHeadingBeforeTable(t, lines, findings);
  }

  lintRelatedKeywordList(lines, findings);
  lintLegalCitations(lines, findings);

  // 行番号を frontmatter 分シフト
  for (const f of findings) {
    f.line += offset;
    f.endLine += offset;
  }

  return findings;
}

function severityRank(s) {
  return { HIGH: 0, MEDIUM: 1, LOW: 2 }[s] ?? 3;
}

function main() {
  const targets = resolveTargets(args);
  if (targets.length === 0) {
    console.log('No MDX files to lint.');
    process.exit(0);
  }

  let totalHigh = 0;
  let totalMedium = 0;
  let totalLow = 0;
  let anyFindings = false;

  for (const file of targets) {
    const findings = lintFile(file);
    if (findings.length === 0) continue;
    anyFindings = true;

    findings.sort(
      (a, b) => severityRank(a.severity) - severityRank(b.severity) || a.line - b.line,
    );

    console.log(`\n=== ${file} ===`);
    for (const f of findings) {
      const range = f.line === f.endLine ? `L${f.line}` : `L${f.line}-${f.endLine}`;
      console.log(`[${f.severity}] ${range} (${f.rule}) ${f.message}`);
      if (f.severity === 'HIGH') totalHigh++;
      else if (f.severity === 'MEDIUM') totalMedium++;
      else totalLow++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  if (!anyFindings) {
    console.log(`✓ ${targets.length} file(s) passed.`);
    process.exit(0);
  }
  console.log(`Summary: HIGH ${totalHigh} / MEDIUM ${totalMedium} / LOW ${totalLow}`);
  process.exit(totalHigh > 0 ? 1 : 0);
}

main();
