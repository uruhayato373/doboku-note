// scripts/bulk-rewrite-descriptions.mjs
//
// 技術士総監キーワードページ（group: keyword）の frontmatter description を
// 一括リライトし、5管理分類ラベルと2026キーワード集コンテキストを付与する。
//
// 戦略:
//   既存 description の末尾にある定型句（"技術士総監の試験対策に" 等）を剥がし、
//   section frontmatter から 5管理ラベルを導き、
//   「...解説。技術士総合技術監理キーワード集2026（○○管理）。5管理トレードオフ・過去問演習リンク付き。」
//   のような 100〜160字の SEO 向け description に統一する。
//
// 使い方:
//   node scripts/bulk-rewrite-descriptions.mjs              # 全件 dry-run
//   node scripts/bulk-rewrite-descriptions.mjs --apply      # 実書き込み
//   node scripts/bulk-rewrite-descriptions.mjs --slug X     # 単一 slug
//   node scripts/bulk-rewrite-descriptions.mjs --limit 10   # 先頭10件のみ
//
// 改行コードは .claude/scripts/lib/mdx-io.mjs 経由で保持。

import { readdirSync, statSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import matter from 'gray-matter';
import { readMdxFile, transformMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';

const BASE = 'content/site/pe-comprehensive-management';
const MAX_LEN = 160;
const MIN_LEN = 70; // 70 未満なら情報量不足として fail（core が極端に短いケース）

const SECTION_LABELS = {
  '1': '総合技術監理',
  '2': '経済性管理',
  '3': '人的資源管理',
  '4': '情報管理',
  '5': '安全管理',
  '6': '社会環境管理',
};

// 最終文（最後の句点以降）がこのどれかを含んでいたら「定型句」とみなして削る。
// 「を解説」「を整理」等は本文本体でも頻出するので外し、試験向けワードのみに絞る。
const TAIL_CLICHE_RE = /(?:技術士総合技術監理|技術士総監|総合技術監理|2次試験|試験対策|キーワード集|キーワード。?$|キーワードとして)/u;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const slugFilter = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null;

function listArticles() {
  const out = [];
  for (const slug of readdirSync(BASE)) {
    const dir = join(BASE, slug);
    try { if (!statSync(dir).isDirectory()) continue; } catch { continue; }
    const file = join(dir, 'article.mdx');
    try { statSync(file); } catch { continue; }
    out.push({ slug, file });
  }
  return out;
}

function getSectionLabel(section) {
  if (section === undefined || section === null) return null;
  const prefix = String(section).trim().split('.')[0];
  return SECTION_LABELS[prefix] || null;
}

function cleanCore(desc) {
  let core = (desc || '').trim();
  // 末尾に句点がない description にも対応（`。` を仮付与してから剥がす）
  if (core && !/[。．]\s*$/u.test(core)) core += '。';

  // 末尾から1〜2文を検査し、定型句を含む文があれば削る（最大3回）
  for (let i = 0; i < 3; i++) {
    const m = core.match(/^(.*?)([^。]+)。\s*$/u);
    if (!m) break;
    const head = m[1];
    const tail = m[2];
    if (TAIL_CLICHE_RE.test(tail)) {
      core = head.replace(/[、。\s]+$/u, '').trim();
      if (core) core += '。';
      continue;
    }
    break;
  }
  core = core.trim();
  // 末尾が接続助詞（と・や・の・を・で・も）で終わっているなら直前の句読点まで切る
  core = core.replace(/[、。]+$/u, '').trim();
  if (/[とやのをとも]$/u.test(core)) {
    const lastPunct = Math.max(core.lastIndexOf('。'), core.lastIndexOf('、'));
    if (lastPunct > 15) core = core.slice(0, lastPunct);
  }
  core = core.replace(/[、。]+$/u, '').replace(/\s+/g, ' ').trim();
  if (!core) return '';
  return core + '。';
}

function fallbackCore(title) {
  // core が極端に短い（< 35字）ときに使う。本文1段落目があれば本来そこから
  // 抽出したいが、スクリプトレベルでは frontmatter にない情報は使えないため
  // title 起点のテンプレに倒す。
  const t = (title || 'キーワード').replace(/\s*｜.*$/, '').trim();
  return `${t}の定義、種類、実務上の要点、関連用語を技術士総合技術監理の視点で整理。`;
}

function buildDescription(title, existing, sectionLabel) {
  let core = cleanCore(existing);
  if (core.length < 35) core = fallbackCore(title);

  const suffix = sectionLabel
    ? `技術士総合技術監理キーワード集2026（${sectionLabel}）。5管理トレードオフ・過去問演習リンク付き。`
    : `技術士総合技術監理キーワード集2026収録。5管理トレードオフ・過去問演習リンク付き。`;
  let out = core + suffix;
  if (out.length > MAX_LEN) {
    const budget = MAX_LEN - suffix.length - 1;
    if (budget > 20) {
      out = core.slice(0, budget).replace(/[、。]+$/u, '') + '。' + suffix;
    } else {
      out = (core.slice(0, MAX_LEN - 1)).replace(/[、。]+$/u, '') + '。';
    }
  }
  return out;
}

function replaceDescriptionInFrontmatter(raw, newDesc) {
  const foldedRe = /^description:\s*>-?\r?\n((?:[ \t]+.*\r?\n)+)/m;
  if (foldedRe.test(raw)) {
    return raw.replace(foldedRe, `description: ${JSON.stringify(newDesc)}\n`);
  }
  const singleRe = /^description:\s*.*$/m;
  if (singleRe.test(raw)) {
    return raw.replace(singleRe, `description: ${JSON.stringify(newDesc)}`);
  }
  return null;
}

function processFile({ slug, file }) {
  const { raw } = readMdxFile(file);
  const parsed = matter(raw);
  const fm = parsed.data || {};
  if (fm.published === false) return { slug, action: 'skip-unpublished' };
  if (fm.group !== 'keyword') return { slug, action: 'skip-non-keyword' };

  const current = (fm.description || '').toString();
  // idempotent: 既にこのスクリプトで rewrite 済みの description は再処理しない
  if (current.includes('技術士総合技術監理キーワード集2026')
      && current.includes('5管理トレードオフ・過去問演習リンク付き')) {
    return { slug, action: 'skip-already-rewritten' };
  }
  const sectionLabel = getSectionLabel(fm.section);
  const newDesc = buildDescription(fm.title || slug, current, sectionLabel);

  if (!newDesc || newDesc.length < MIN_LEN) {
    return { slug, action: 'fail-short', from: current, to: newDesc };
  }
  if (newDesc === current) return { slug, action: 'skip-identical' };

  if (!APPLY) {
    return { slug, action: 'would-rewrite', from: current, fromLen: current.length, to: newDesc, toLen: newDesc.length };
  }

  const wrote = transformMdxFile(file, (r) => replaceDescriptionInFrontmatter(r, newDesc));
  return {
    slug,
    action: wrote ? 'rewrote' : 'no-match',
    from: current,
    fromLen: current.length,
    to: newDesc,
    toLen: newDesc.length,
  };
}

function main() {
  let articles = listArticles();
  if (slugFilter) articles = articles.filter(a => a.slug === slugFilter);
  if (LIMIT) articles = articles.slice(0, LIMIT);

  const results = [];
  for (const a of articles) {
    try {
      results.push(processFile(a));
    } catch (e) {
      results.push({ slug: a.slug, action: 'error', error: e.message });
    }
  }

  const changed = results.filter(r => r.action === 'rewrote' || r.action === 'would-rewrite');
  const skipped = results.filter(r => r.action?.startsWith('skip'));
  const failed = results.filter(r => r.action === 'fail-short' || r.action === 'error' || r.action === 'no-match');

  console.log(`Total scanned: ${articles.length}`);
  console.log(`Candidates (${APPLY ? 'applied' : 'dry-run'}): ${changed.length}`);
  console.log(`Skipped: ${skipped.length}`);
  console.log(`Failed: ${failed.length}`);

  const sampleN = APPLY ? Math.min(3, changed.length) : Math.min(10, changed.length);
  console.log(`\n--- first ${sampleN} samples ---`);
  for (const r of changed.slice(0, sampleN)) {
    console.log(`\n[${r.slug}]`);
    console.log(`  from(${r.fromLen}): ${r.from}`);
    console.log(`  to  (${r.toLen}): ${r.to}`);
  }

  if (failed.length) {
    console.log(`\n--- failures ---`);
    for (const r of failed) {
      console.log(`[${r.slug}] ${r.action}: ${r.error || r.from || ''}`);
    }
  }

  // 長さ分布
  if (changed.length) {
    const lens = changed.map(r => r.toLen);
    const avg = Math.round(lens.reduce((a,b)=>a+b,0) / lens.length);
    const min = Math.min(...lens);
    const max = Math.max(...lens);
    console.log(`\nnew description length: min=${min}, avg=${avg}, max=${max}`);
  }
}

main();
