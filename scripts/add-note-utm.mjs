#!/usr/bin/env node
// docs/note/{slug}/article.md の doboku-note.com 向けリンクに UTM
// パラメータを一括付与する。note 公開直前に実行する想定。
//
// 使い方:
//   node scripts/add-note-utm.mjs 総監択一式17年分分析       # slug 1 件、frontmatter.utmCampaign を読む
//   node scripts/add-note-utm.mjs 総監 --campaign 90-soukan  # slug 前方一致＋campaign を引数で上書き
//   node scripts/add-note-utm.mjs 総監 --dry-run             # 変更内容を表示するだけ
//
// 仕様:
// - frontmatter.utmCampaign を campaign 名のソースとする（無ければ --campaign 引数必須）
// - utm_source=note, utm_medium=referral, utm_campaign={上記} を全 doboku-note.com リンクに付与
// - 既に utm_* が含まれているリンクはスキップ（重複付与防止）
// - フラグメント (#anchor) が末尾にあればその前に挿入

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const NOTE_DIR = join(ROOT, 'docs/note');

const URL_RE = /\bhttps:\/\/doboku-note\.com\/[^\s)\]」]+/g;

function parseArgs(argv) {
  const args = { target: null, campaign: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--campaign') args.campaign = argv[++i];
    else if (!a.startsWith('--') && !args.target) args.target = a;
  }
  return args;
}

function resolveDirectory(target) {
  const all = readdirSync(NOTE_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  if (all.includes(target)) return target;
  // slug 前方一致（例: "総監" → "総監択一式17年分分析"）
  const matches = all.filter((d) => d.startsWith(target));
  if (matches.length === 0) throw new Error(`no note directory matches "${target}"`);
  if (matches.length > 1) throw new Error(`ambiguous prefix "${target}": ${matches.join(', ')}`);
  return matches[0];
}

function injectUtm(url, campaign) {
  // 既に utm_ が含まれていればスキップ
  if (/[?&]utm_/.test(url)) return url;
  // anchor 分離
  const hashIdx = url.indexOf('#');
  const base = hashIdx === -1 ? url : url.slice(0, hashIdx);
  const hash = hashIdx === -1 ? '' : url.slice(hashIdx);
  const sep = base.includes('?') ? '&' : '?';
  const params = `utm_source=note&utm_medium=referral&utm_campaign=${encodeURIComponent(campaign)}`;
  return `${base}${sep}${params}${hash}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.target) {
    console.error('Usage: node scripts/add-note-utm.mjs <slug|prefix> [--campaign <name>] [--dry-run]');
    process.exit(1);
  }
  const dirName = resolveDirectory(args.target);
  const articlePath = join(NOTE_DIR, dirName, 'article.md');
  const raw = readFileSync(articlePath, 'utf-8');
  const { data, content } = matter(raw);
  const campaign = args.campaign || data.utmCampaign;
  if (!campaign) {
    console.error(`[error] utmCampaign が frontmatter に未定義かつ --campaign 引数も無い: ${dirName}`);
    process.exit(1);
  }

  let added = 0;
  let skipped = 0;
  const updatedContent = content.replace(URL_RE, (url) => {
    const newUrl = injectUtm(url, campaign);
    if (newUrl === url) {
      skipped++;
      return url;
    }
    added++;
    if (args.dryRun) {
      console.log(`  ${url}\n→ ${newUrl}\n`);
    }
    return newUrl;
  });

  console.log(`[add-note-utm] ${dirName}`);
  console.log(`  campaign: ${campaign}`);
  console.log(`  追加: ${added}件 / スキップ済み(既に UTM あり): ${skipped}件`);

  if (args.dryRun) {
    console.log('  (dry-run: ファイル未変更)');
    return;
  }

  if (added === 0) {
    console.log('  変更なし、ファイル更新スキップ');
    return;
  }

  // gray-matter は frontmatter を再構築するが行末スタイルが変わる場合があるので
  // frontmatter ブロック自体は元のまま保持し、本文だけ差し替える
  const fmEndIdx = raw.indexOf('---', 4); // 2 番目の ---
  if (raw.startsWith('---') && fmEndIdx !== -1) {
    const fmBlock = raw.slice(0, fmEndIdx + 3);
    const newRaw = `${fmBlock}\n${updatedContent.replace(/^\n+/, '')}`;
    writeFileSync(articlePath, newRaw);
  } else {
    // frontmatter なしの場合は content そのまま
    writeFileSync(articlePath, updatedContent);
  }
  console.log('  ✓ 書き込み完了');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
