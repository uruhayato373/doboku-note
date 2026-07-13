#!/usr/bin/env node
// audit-katex-warnings.mjs — MDX 数式の KaTeX strict 警告をファイル/行/数式単位で監査。
//
// build（rehype-katex, 既定 strict:'warn'）が出す KaTeX 警告を、ビルド前に一覧化する。
// 抽出は build と同じ remark-math パイプライン（純ロジックは #lib/katex-audit.mjs）。
//
// 使い方:
//   node scripts/audit-katex-warnings.mjs                 # .local/r2/posts 全 MDX を監査（human readable）
//   node scripts/audit-katex-warnings.mjs path/to/a.mdx   # ファイル指定（複数可）
//   node scripts/audit-katex-warnings.mjs --json          # JSON 出力
//   node scripts/audit-katex-warnings.mjs --strict        # 警告 > 0 で exit 1（CI ゲート）
//   node scripts/audit-katex-warnings.mjs --fix-safe       # 低リスク記号置換を適用（writeMdxFile 経由）
//
// 注意: --fix-safe は数式スパン内の全角演算子・全角記号・U+2212・% コメントのみ置換する
//   （数式の意味・prose・正答・公式数値は不変）。CJK in math 等は報告のみ（手修正対象）。

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { auditContent, applySafeFix } from '#lib/katex-audit.mjs';
import { readMdxFile, writeMdxFile } from '#lib/mdx-io.mjs';

const ROOT = '.local/r2/posts';
const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const STRICT = args.includes('--strict');
const FIX_SAFE = args.includes('--fix-safe');
const fileArgs = args.filter((a) => !a.startsWith('--'));

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.mdx')) out.push(p.split('\\').join('/'));
  }
  return out;
}

const suggestionFor = (code) => {
  switch (code) {
    case 'unicodeTextInMathMode':
      return '全角記号（＝＋＜＞／等）は半角へ、日本語は \\text{...} で包む';
    case 'unknownSymbol':
      return 'U+2212(−) 等の未対応記号は半角 - などへ置換';
    case 'commentAtEnd':
      return '数式内の % は \\% にエスケープ（% はコメント開始扱い）';
    case 'newLineInDisplayMode':
      return '表示数式内の改行は \\\\ または適切な環境を使う';
    default:
      return '数式の記法を KaTeX 対応の形へ修正';
  }
};

const files = fileArgs.length > 0 ? fileArgs : walk(ROOT);

let totalWarnings = 0;
let fixedFiles = 0;
const perFile = [];

for (const file of files) {
  const { raw, eol } = readMdxFile(file);

  if (FIX_SAFE) {
    const newRaw = applySafeFix(raw);
    if (newRaw !== null && newRaw !== raw) {
      writeMdxFile(file, newRaw, eol);
      fixedFiles++;
    }
  }

  // fix 後の内容で再監査（残存 warning を正確に数える）
  const current = FIX_SAFE ? readMdxFile(file).raw : raw;
  const findings = auditContent(current);
  if (findings.length > 0) {
    totalWarnings += findings.length;
    perFile.push({ file, findings });
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ totalWarnings, fixedFiles, files: perFile }, null, 2));
} else {
  if (FIX_SAFE) {
    console.log(`[fix-safe] ${fixedFiles} ファイルに低リスク置換を適用\n`);
  }
  const byCode = {};
  for (const { file, findings } of perFile) {
    for (const f of findings) {
      byCode[f.code] = (byCode[f.code] || 0) + 1;
      console.log(`${file}:${f.line} [${f.code}]`);
      console.log(`  math: ${f.math.replace(/\n/g, ' ').slice(0, 120)}`);
      console.log(`  ${f.message}`);
      console.log(`  → ${suggestionFor(f.code)}`);
    }
  }
  console.log(`\nKaTeX warnings: ${totalWarnings}（対象 ${files.length} ファイル）`);
  const codes = Object.entries(byCode).sort((a, b) => b[1] - a[1]);
  if (codes.length > 0) {
    console.log('code 別:');
    for (const [code, n] of codes) console.log(`  ${n}\t${code}`);
  }
}

if (STRICT && totalWarnings > 0) {
  process.exitCode = 1;
}
