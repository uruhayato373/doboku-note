#!/usr/bin/env node
// content/note/{slug}/article.md の doboku-note.com 向けリンクに UTM
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
// - utm_term＝frontmatter.noteId（公開済みの記事の note キー）。既に note の UTM があり term だけ無いリンクには term だけ足す
// - それ以外で既に utm_* が含まれているリンクはスキップ（重複付与防止）
// - フラグメント (#anchor) が末尾にあればその前に挿入

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { listFiles } from './lib/fs-walk.mjs';
import matter from 'gray-matter';
import { applyNoteInboundUtm } from './lib/utm-contract.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';

const NOTE_DIR = join(ROOT, 'content/note');

// source / medium は契約（config/utm-templates.json の note.site）。campaign は記事ごと（frontmatter utmCampaign）、
// utm_term は記事の note キー（frontmatter noteId・公開後だけ。DN-0947 の _inbound_note。utm_content はリンクの種類に使っているので触らない）。

function parseArgs(argv) {
  const flags = parseCliArgs({
    'dry-run': { type: 'boolean' },
    campaign: { type: 'string' },
  }, argv);
  return { target: flags._.find(Boolean) ?? null, campaign: flags.campaign, dryRun: flags.dryRun };
}

// content/note 配下の article.md を全部探す（2026-11-03: 資格フォルダを決め打ちの一覧で持っていたため、コンクリート技士・
// 測量士・舗装などの記事を解決できず、check-note-site-utm の [utm-term] が案内する直し方が動かなかった）。
// slug はフォルダ名、rel は content/note からの相対。マガジンの中の記事も含める（magazines/<誌>/<記事>）。
function resolveDirectory(target) {
  const all = listFiles(NOTE_DIR, { match: (_p, name) => name === 'article.md', allowMissing: true })
    .map((p) => relative(NOTE_DIR, dirname(p)).split('\\').join('/'))
    .filter((rel) => rel && rel !== '.')
    .map((rel) => ({ slug: rel.split('/').pop(), rel }));
  // パスの末尾が一致（"1級・2級土木/xxx" のように親フォルダつきで渡してもよい）
  const byPath = all.filter((a) => a.rel === target || a.rel.endsWith(`/${target}`));
  if (byPath.length === 1) return byPath[0].rel;
  // slug 完全一致
  const exact = all.filter((a) => a.slug === target);
  if (exact.length === 1) return exact[0].rel;
  if (exact.length > 1) throw new Error(`ambiguous slug "${target}": ${exact.map((a) => a.rel).join(', ')}`);
  // slug 前方一致（例: "総監択一" → "技術士総監/総監択一式17年分分析"）
  const matches = all.filter((a) => a.slug.startsWith(target));
  if (matches.length === 0) throw new Error(`no note directory matches "${target}"`);
  if (matches.length > 1) throw new Error(`ambiguous prefix "${target}": ${matches.map((a) => a.rel).join(', ')}`);
  return matches[0].rel;
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
  const { data } = matter(raw);
  const campaign = args.campaign || data.utmCampaign;
  if (!campaign) {
    console.error(`[error] utmCampaign が frontmatter に未定義かつ --campaign 引数も無い: ${dirName}`);
    process.exit(1);
  }

  const { text: updatedRaw, added, skipped } = applyNoteInboundUtm(raw, campaign, data.noteId || null);
  if (args.dryRun) {
    const before = raw.match(/\bhttps:\/\/doboku-note\.com\/[^\s)\]」]+/g) ?? [];
    const after = updatedRaw.match(/\bhttps:\/\/doboku-note\.com\/[^\s)\]」]+/g) ?? [];
    before.forEach((u, k) => { if (after[k] && after[k] !== u) console.log(`  ${u}\n→ ${after[k]}\n`); });
  }

  console.log(`[add-note-utm] ${dirName}`);
  console.log(`  campaign: ${campaign}`);
  console.log(`  term: ${data.noteId || '（noteId 未設定＝未公開。公開後にもう一度回す）'}`);
  console.log(`  追加: ${added}件 / スキップ済み(既に UTM あり): ${skipped}件`);

  if (args.dryRun) {
    console.log('  (dry-run: ファイル未変更)');
    return;
  }

  if (added === 0) {
    console.log('  変更なし、ファイル更新スキップ');
    return;
  }

  // 本文のリンクだけを置き換えた原文をそのまま書く（改行コード・frontmatter を変えない・applyNoteInboundUtm）
  writeFileSync(articlePath, updatedRaw);
  console.log('  ✓ 書き込み完了');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
