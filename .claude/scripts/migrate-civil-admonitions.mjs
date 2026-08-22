#!/usr/bin/env node
// .claude/scripts/migrate-civil-admonitions.mjs
//
// 1級土木施工管理技士 (civil-construction-1) の Docusaurus admonition (:::note 等) を
// doboku-note 標準 <Callout> に一括変換。
//
// 変換マッピング:
//   :::note     → <Callout type="note">
//   :::tip      → <Callout type="tip">
//   :::warning  → <Callout type="warn">
//   :::caution  → <Callout type="warn">
//   :::danger   → <Callout type="danger">
//   :::info     → <Callout type="note">
//
// title 付きパターン:
//   :::tip[学習のポイント]   → <Callout type="tip" title="学習のポイント">
//
// 閉じ ::: → </Callout>
//
// AdSense 不合格対策プラン P2-2。詳細: /Users/minamidaisuke/.claude/plans/gentle-questing-sketch.md
//
// Usage:
//   node .claude/scripts/migrate-civil-admonitions.mjs --dry-run
//   node .claude/scripts/migrate-civil-admonitions.mjs            # 実行

import { transformMdxFile, readMdxFile } from './lib/mdx-io.mjs';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const baseArg = process.argv.find((a) => a.startsWith('--base='));
const BASE = resolve(baseArg ? baseArg.slice('--base='.length) : 'content/site/civil-construction-1');
const DRY_RUN = process.argv.includes('--dry-run');

const TYPE_MAP = {
  note: 'note',
  tip: 'tip',
  warning: 'warn',
  caution: 'warn',
  danger: 'danger',
  info: 'note',
};

function collectMdx(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) collectMdx(p, out);
    else if (entry === 'article.mdx') out.push(p);
  }
  return out;
}

function migrateAdmonitions(raw) {
  // frontmatter を除外して本文だけ処理
  const fmMatch = raw.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n?)/);
  const fm = fmMatch ? fmMatch[1] : '';
  const body = raw.slice(fm.length);

  // 各 admonition ブロックを順に処理
  // パターン:
  //   :::TYPE[TITLE]\n...\n:::     (Docusaurus 角括弧形式)
  //   :::TYPE TITLE\n...\n:::      (Docusaurus スペース区切り形式)
  //   :::TYPE\n...\n:::            (タイトル無し)
  const types = Object.keys(TYPE_MAP).join('|');
  // 角括弧形式 or スペース区切り形式（末尾までを title として取得）
  const blockRe = new RegExp(`:::(${types})(?:\\[([^\\]]*)\\]|[ \\t]+([^\\r\\n]+))?\\s*(\\r?\\n)`, 'g');

  let result = body;
  let opened = 0;
  let migrated = 0;
  const conversions = [];

  // 開きタグを置換
  result = result.replace(blockRe, (match, type, titleBracket, titleSpace, eol) => {
    opened++;
    migrated++;
    const calloutType = TYPE_MAP[type];
    const title = titleBracket || titleSpace || '';
    const titleAttr = title ? ` title="${title.trim()}"` : '';
    conversions.push(`:::${type}${title ? ` (${title.trim()})` : ''} → <Callout type="${calloutType}"${titleAttr}>`);
    return `<Callout type="${calloutType}"${titleAttr}>${eol}`;
  });

  // 閉じ ::: を </Callout> に置換（開いた数だけ）
  // 注意: 単純な ::: は行頭にあって直前が空行 or 内容のあとの行であるべき
  let closed = 0;
  const closeLines = result.split(/(\r?\n)/);
  for (let i = 0; i < closeLines.length && closed < opened; i++) {
    if (/^:::\s*$/.test(closeLines[i])) {
      closeLines[i] = '</Callout>';
      closed++;
    }
  }
  result = closeLines.join('');

  if (opened === 0) return null;
  if (opened !== closed) {
    return {
      newRaw: fm + result,
      conversions,
      warning: `open ${opened} != close ${closed} — manual check needed`,
    };
  }
  return { newRaw: fm + result, conversions, warning: null };
}

function main() {
  const files = collectMdx(BASE);
  let changedCount = 0;
  let totalConversions = 0;
  const warnings = [];

  for (const file of files) {
    const { raw } = readMdxFile(file);
    const result = migrateAdmonitions(raw);
    if (!result) continue;

    const rel = file.replace(BASE + '/', '');
    if (DRY_RUN) {
      console.log(`[dry-run] ${rel}: ${result.conversions.length} block(s)`);
      result.conversions.forEach((c) => console.log(`  ${c}`));
    } else {
      transformMdxFile(file, () => result.newRaw);
      console.log(`[migrated] ${rel}: ${result.conversions.length} block(s)`);
    }
    if (result.warning) {
      warnings.push(`${rel}: ${result.warning}`);
    }
    changedCount++;
    totalConversions += result.conversions.length;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files ${DRY_RUN ? 'would-change' : 'changed'}: ${changedCount}`);
  console.log(`Admonition blocks ${DRY_RUN ? 'would-convert' : 'converted'}: ${totalConversions}`);
  if (warnings.length > 0) {
    console.log(`\n!! Warnings (manual check needed):`);
    warnings.forEach((w) => console.log(`  ${w}`));
  }
  if (DRY_RUN) console.log('\n(--dry-run mode, no files modified)');
}

main();
