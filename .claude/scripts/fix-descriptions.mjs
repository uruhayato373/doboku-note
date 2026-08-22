// scripts/fix-descriptions.mjs
//
// pe-comprehensive-management 配下の article.mdx で description が
// 50 文字未満のものを、テンプレート方式で補強する。
//
// 過去問・キーワードページの種別を frontmatter から判定し、それぞれに
// 適したテンプレートで生成する。元の description は破棄せず、不足分のみ
// 追加するフォールバック方式。
//
// 改行コードは .claude/scripts/lib/mdx-io.mjs 経由で保持する。
//
// 使い方:
//   node scripts/fix-descriptions.mjs            # 全件 dry-run
//   node scripts/fix-descriptions.mjs --apply    # 実書き込み
//   node scripts/fix-descriptions.mjs --slug X   # 単一 slug のみ

import { readdirSync, statSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import matter from 'gray-matter';
import { transformMdxFile, readMdxFile } from '#lib/mdx-io.mjs';

const BASE = 'content/site/pe-comprehensive-management';
const MIN_LEN = 50;
const TARGET_LEN = 90;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const slugFilter = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;

function listArticles() {
  const out = [];
  for (const slug of readdirSync(BASE)) {
    const dir = join(BASE, slug);
    if (!statSync(dir).isDirectory()) continue;
    const file = join(dir, 'article.mdx');
    try { statSync(file); } catch { continue; }
    out.push({ slug, file });
  }
  return out;
}

function detectKind(slug, fm) {
  if (/^[hr]\d+-primary$/.test(slug)) return 'primary';
  if (/^[hr]\d+-secondary$/.test(slug)) return 'secondary';
  if (fm.group === 'past-exam') return 'past-other';
  if (fm.group === 'keyword') return 'keyword';
  return 'other';
}

function buildDescription(slug, fm, current) {
  const kind = detectKind(slug, fm);
  const title = fm.title || slug;

  // 過去問: 年度を slug から抽出
  const m = slug.match(/^([hr])(\d+)-(primary|secondary)$/);
  if (m) {
    const era = m[1] === 'h' ? '平成' : '令和';
    const yr = parseInt(m[2], 10);
    const kindLabel = m[3] === 'primary' ? '択一式' : '記述式';
    if (m[3] === 'primary') {
      return `技術士二次試験 総合技術監理部門 ${era}${yr}年度 ${kindLabel}の全問題と解答解説。経済性・人的資源・情報・安全・社会環境管理の5分野40問を収録し、本サイトで効率的に過去問演習が可能。`;
    }
    return `技術士二次試験 総合技術監理部門 ${era}${yr}年度 ${kindLabel}の問題文と総合技術監理の視点からの解答方針を整理。本記事で論文対策の出題傾向を確認できる。`;
  }

  if (kind === 'keyword') {
    const section = fm.section ? `${fm.section}節` : '5管理分野';
    return `${title}の定義・要点・実務での適用例を解説。技術士総監（${section}）の試験対策として5管理分野横断のキーワードを整理。`;
  }

  if (slug === 'keyword-2026') {
    return '技術士総合技術監理部門の2026年度キーワード集。経済性・人的資源・情報・安全・社会環境の5管理分野ごとに体系化し、各キーワードページへリンク。';
  }
  if (slug === 'general-overview') {
    return '技術士総合技術監理部門の全体像。5つの管理分野（経済性・人的資源・情報・安全・社会環境）の関連と総合技術監理の考え方を整理。';
  }

  // フォールバック: 既存 description に補足を付加
  return `${current} ${title}を技術士総監の視点から実務と試験対策の両面で整理。`.trim();
}

function processFile({ slug, file }) {
  const { raw } = readMdxFile(file);
  const parsed = matter(raw);
  const fm = parsed.data || {};
  if (fm.published === false) return { slug, action: 'skip-unpublished' };

  const desc = (fm.description || '').toString();
  if (desc.length >= MIN_LEN) return { slug, action: 'skip-ok', length: desc.length };

  const newDesc = buildDescription(slug, fm, desc);
  if (newDesc.length < MIN_LEN) return { slug, action: 'fail', new: newDesc };

  if (!APPLY) return { slug, action: 'would-fix', from: desc, to: newDesc };

  // frontmatter description 行を置換（改行・引用形式は元を壊さないよう、
  // YAML を再シリアライズせずに行単位の置換で行う）
  const transformed = transformMdxFile(file, (rawIn) => {
    // 1) >- folded scalar の複数行ブロック
    const foldedRe = /^description:\s*>-?\r?\n((?:[ \t]+.*\r?\n)+)/m;
    if (foldedRe.test(rawIn)) {
      return rawIn.replace(foldedRe, `description: ${JSON.stringify(newDesc)}\n`);
    }
    // 2) 単一行
    const singleRe = /^description:\s*.*$/m;
    if (singleRe.test(rawIn)) {
      return rawIn.replace(singleRe, `description: ${JSON.stringify(newDesc)}`);
    }
    return null;
  });

  return { slug, action: transformed ? 'fixed' : 'no-match', from: desc, to: newDesc };
}

function main() {
  const articles = listArticles();
  const filtered = slugFilter ? articles.filter(a => a.slug === slugFilter) : articles;
  const results = [];
  for (const a of filtered) {
    try {
      results.push(processFile(a));
    } catch (e) {
      results.push({ slug: a.slug, action: 'error', error: e.message });
    }
  }

  const fixedOrWould = results.filter(r => r.action === 'fixed' || r.action === 'would-fix');
  const errors = results.filter(r => r.action === 'error' || r.action === 'fail' || r.action === 'no-match');

  console.log(`Total: ${filtered.length}`);
  console.log(`Fix candidates: ${fixedOrWould.length} (${APPLY ? 'applied' : 'dry-run'})`);
  console.log(`Errors: ${errors.length}`);

  for (const r of fixedOrWould) {
    console.log(`\n[${r.slug}]`);
    console.log(`  from(${r.from?.length || 0}): ${r.from}`);
    console.log(`  to  (${r.to.length}): ${r.to}`);
  }
  for (const r of errors) {
    console.log(`\n[ERROR ${r.slug}]: ${r.action} ${r.error || ''}`);
  }
}

main();
