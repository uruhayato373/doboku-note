#!/usr/bin/env node
// 年度表現の陳腐化検出（DN-0243）。
//
// 背景: ガイド・keyword 記事の title/seoTitle/description に当年度の表現（「令和8年度」
// 「2026年度」）が多数あるが、年明けに一斉に古くなる。既存の check-exam-calendar は
// 試験日程 JSON だけを見ており、記事本文の年度表現は検査していない。
//
// スコープ: frontmatter の title/seoTitle/description のみ（本文は過去問・白書の年度引用が
// 桁違いに多く、regex では「その年の出来事を正しく書いている文」と「陳腐化した文」を
// 区別できないため対象外。frontmatter は検索結果・SNS カードに出る面でここが陳腐化の実害）。
// group（past-exam/primary/secondary）と、ディレクトリ名が特定年度を表す記事
// （r05-essay-*, primary-r07-a 等＝その年度自体が主題）は除外する。
//
// 判定: 当年度は .claude/config/exam-calendar.json の exams[*].year の最大値。
// 「前年度以前」の年度表現（西暦 YYYY年度・令和N年度・令和N年）を warn で列挙する（report・
// ci:false）。年度切替（毎年1月）の直後は quality-audit.mjs でこのエントリを ci:true へ
// 一時的に上げ、2週間以内に 0 件になるまで週次レビューで追い、収束したら ci:false へ戻す。
//
// 使い方:
//   node scripts/check-year-staleness.mjs            # content/site 全体
//   node scripts/check-year-staleness.mjs --check    # 起動確認のみ（CI・ブラウザ/認証不要）

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import {
  currentFiscalYearFrom,
  buildStalePattern,
  isStaleMatch,
  isYearEncodedSlug,
  isExcludedGroup,
  extractFrontmatterFields,
} from './lib/year-staleness.mjs';

const CHECK_MODE = process.argv.includes('--check');
const CALENDAR_PATH = '.claude/config/exam-calendar.json';
const SCAN_DIR = 'content/site';
const SCAN_EXT = /\.mdx?$/;

if (CHECK_MODE) {
  // fixture 相当: 実ファイルを読まず、判定ロジックだけが正しく動くかを確認する
  // （ネットワーク・ファイルシステム走査なしで CI が完走できることの担保）。
  const fixtureCalendar = { exams: { a: { year: 2026 }, b: { year: 2026 } } };
  const year = currentFiscalYearFrom(fixtureCalendar);
  const { pattern } = buildStalePattern(year);
  const samples = ['令和8年度', '令和7年度', '2025年度', '2026年度', '令和5年'];
  let matched = 0;
  for (const s of samples) {
    pattern.lastIndex = 0;
    const m = pattern.exec(s);
    if (m && isStaleMatch(m[0], year)) matched++;
  }
  // fixture 内の「前年度以前」表現は 令和7年度・2025年度・令和5年 の3件が stale と判定されるはず
  // （令和8年度・2026年度は当年度なので非該当）
  if (matched !== 3) {
    console.error(`[check-year-staleness --check] ✗ 判定ロジックの想定外（stale判定 ${matched} 件 / 期待 3 件）`);
    process.exit(1);
  }
  console.log(`[check-year-staleness --check] 当年度判定・正規表現・除外ロジックが fixture で完走（当年度=${year}）`);
  process.exit(0);
}

if (!existsSync(CALENDAR_PATH)) {
  console.error(`[check-year-staleness] ${CALENDAR_PATH} が無いため検証不成立`);
  process.exit(2);
}

const calendar = JSON.parse(readFileSync(CALENDAR_PATH, 'utf8'));
const currentFiscalYear = currentFiscalYearFrom(calendar);
const { pattern } = buildStalePattern(currentFiscalYear);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (SCAN_EXT.test(p)) out.push(p);
  }
  return out;
}

const files = walk(SCAN_DIR);
let scanned = 0;
const findings = [];

for (const file of files) {
  const dirName = basename(dirname(file));
  if (isYearEncodedSlug(dirName)) continue;

  const text = readFileSync(file, 'utf8');
  const fm = extractFrontmatterFields(text);
  if (isExcludedGroup(fm.group)) continue;

  scanned++;
  for (const [field, value] of [
    ['title', fm.title],
    ['seoTitle', fm.seoTitle],
    ['description', fm.description],
  ]) {
    if (!value) continue;
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(value)) !== null) {
      if (isStaleMatch(m[0], currentFiscalYear)) {
        findings.push({ file, field, text: m[0] });
      }
    }
  }
}

if (findings.length > 0) {
  console.warn(
    `[check-year-staleness] ⚠ 前年度以前の年度表現を ${findings.length} 件検出（対象 ${scanned} 件 / 全 ${files.length} 件中）`,
  );
  for (const f of findings) {
    console.warn(`  ${f.file}  [${f.field}]  「${f.text}」`);
  }
  console.warn(
    '  → 当年度（の表現）へ更新するか、その年度自体が主題なら記事ディレクトリ名に年度を含めて除外対象にする。',
  );
  console.warn('  → 年度切替直後の運用は本スクリプト冒頭コメントと quality-audit.mjs の note を参照。');
  // report（ci:false）のため、通常運用では warn のみで exit 0。年度切替直後だけ
  // quality-audit.mjs 側の ci フラグを一時的に true へ上げて赤落ちさせる。
  process.exit(0);
}

console.log(
  `[check-year-staleness] ✓ 前年度以前の年度表現なし（対象 ${scanned} 件 / 全 ${files.length} 件中・当年度=${currentFiscalYear}）`,
);
