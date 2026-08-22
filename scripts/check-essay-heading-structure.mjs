#!/usr/bin/env node
// 総監模範論文ペルソナの見出し構成を、構造不変条件で検査する（正準=自治体道路担当）。
// 位置ベース差分はドメイン固有タイトル・案数差で誤検知するため、
// 「実際に事故が起きたパターン」を狙い撃つ不変条件チェックにしている。
//
// 検査する不変条件:
//   R03-R07: ## 試験問題 / ## A 案 / ## B 案 / ## 採点者… が存在し、各案に設問（１）(２)(３)がある
//   R08予想: 独立した「## 試験問題」を持たない（問題文は予想問題配下）/ ## 予想問題 N ごとに
//            ### 問題文・### 出題予想根拠・フル模範論文見出しがある / 「### A案:/B案:/C案:」直下ラベルを使わない
//
// 使い方:
//   node scripts/check-essay-heading-structure.mjs                      # 全ペルソナ
//   node scripts/check-essay-heading-structure.mjs 自治体河川担当 [--strict]
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'content/note/技術士総監/magazines';
const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const only = args.find((a) => !a.startsWith('--'));

function headings(file) {
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, 'utf8').split('\r\n').join('\n');
  return raw.split('\n').filter((l) => /^#{2,4}\s/.test(l)).map((l) => l.replace(/^#+\s*/, '').trim());
}
const H2 = (hs, re) => hs.some((h) => re.test(h)); // 任意レベルで存在チェック（簡易）

function checkPastYear(hs) {
  const issues = [];
  if (!hs.some((h) => /^試験問題/.test(h))) issues.push('「## 試験問題」見出しがない');
  if (!hs.some((h) => /^A 案/.test(h))) issues.push('A 案がない');
  if (!hs.some((h) => /^B 案/.test(h))) issues.push('B 案がない');
  if (!hs.some((h) => /採点者/.test(h))) issues.push('採点者視点がない');
  for (const an of ['A', 'B']) {
    for (const q of ['１', '２', '３']) {
      if (!hs.some((h) => new RegExp(`^${an} 案 設問（${q}）`).test(h))) issues.push(`${an}案 設問（${q}）がない`);
    }
  }
  return issues;
}

function checkR08(hs) {
  const issues = [];
  // 独立した試験問題セクション（予想問題を束ねる）を持たない
  if (hs.some((h) => /^試験問題/.test(h))) issues.push('独立「## 試験問題」がある（問題文は各予想問題配下の「### 問題文」へ）');
  // A案:/B案:/C案: の直下ラベルを使わない（→ ### …フル模範論文（…版）にする）
  const labels = hs.filter((h) => /^[ABC]案[:：]/.test(h));
  if (labels.length) issues.push(`非正準ラベル「${labels.join(' / ')}」（→「…フル模範論文（…版）」へ）`);
  // 予想問題が2つ、各々に問題文・出題予想根拠・フル模範論文
  const yosou = hs.filter((h) => /^予想問題\s*\d/.test(h));
  if (yosou.length < 2) issues.push(`予想問題見出しが${yosou.length}個（2個必要）`);
  for (const k of ['問題文', '出題予想根拠', 'フル模範論文']) {
    if (!hs.some((h) => h.includes(k))) issues.push(`「${k}」見出しがない`);
  }
  if (!hs.some((h) => /試験当日|選択フロー/.test(h))) issues.push('試験当日の選択フローがない');
  return issues;
}

const personas = only
  ? [`総監模範論文-${only.replace(/^総監模範論文-/, '')}`]
  : readdirSync(ROOT).filter((d) => d.startsWith('総監模範論文-'));

let total = 0;
for (const p of personas) {
  const lines = [];
  for (const y of ['R03', 'R04', 'R05', 'R06', 'R07']) {
    const hs = headings(join(ROOT, p, y, 'article.md'));
    if (!hs) { lines.push(`  ${y}: 記事欠落`); total++; continue; }
    const iss = checkPastYear(hs);
    if (iss.length) { lines.push(`  ${y}: ${iss.join(' / ')}`); total += iss.length; }
  }
  // R08予想（新標準）: 予想問題ごとに R08-yosou-1 / R08-yosou-2 の2記事・各 過去問型(A/B案)。
  // 旧形式（単一 R08-yosou に2問併記）は要2記事化として違反扱い。
  const r1 = headings(join(ROOT, p, 'R08-yosou-1', 'article.md'));
  const r2 = headings(join(ROOT, p, 'R08-yosou-2', 'article.md'));
  if (r1 && r2) {
    for (const [slug, hs] of [['R08-yosou-1', r1], ['R08-yosou-2', r2]]) {
      const iss = checkPastYear(hs); // R08記事も過去問型（試験問題/A案/B案/設問1-3/採点者）
      if (iss.length) { lines.push(`  ${slug}: ${iss.join(' / ')}`); total += iss.length; }
    }
  } else if (headings(join(ROOT, p, 'R08-yosou', 'article.md'))) {
    lines.push('  R08: 旧単一記事（R08-yosou）。新標準=予想問題ごと R08-yosou-1/-2 の2記事×A/B案へ分割が必要');
    total++;
  } else {
    lines.push('  R08予想: 記事欠落（R08-yosou-1 / R08-yosou-2）'); total++;
  }

  if (lines.length) { console.log(`\n✗ ${p.replace('総監模範論文-', '')}`); lines.forEach((l) => console.log(l)); }
  else if (only) console.log(`✓ ${p.replace('総監模範論文-', '')}: 構造不変条件すべて満たす`);
}
console.log(`\n見出し構成 違反: ${total}`);
if (STRICT && total > 0) process.exit(1);
