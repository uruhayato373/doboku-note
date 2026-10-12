#!/usr/bin/env node
/**
 * build-llms-txt.mjs — AI 検索・LLM 向けの入口 public/llms.txt と public/llms-full.txt を生成する。
 *
 * なぜ要るか: 2 ファイルは手書きで、2026-10-11 の時点で URL の 97% が旧 /docs/（301）、本文の資格は 2 つだけ
 * （2級・コンクリート系・建設部門・RCCM・実務・公的基準が無い）、消えたページを 10 件指していた（DN-0696）。
 * 記事の増減に追従する生成元が無かったので、doc-meta-index（公開記事）・qualification-registry（資格の名前と並び）・
 * categories.json（ハブの説明）から作る。資格名を手で書かない（check-qualification-ssot）。
 *
 * 置き場: refresh-indexes の最後に回す。コミットとの不一致は check-generated-indexes（ci）が止める。
 * URL は url-normalization の正規公開パスだけを出す（旧 /docs/ は出ない）。正規パスの無い記事は数えて除く。
 *
 * 使い方:
 *   node scripts/build-llms-txt.mjs            # 変わっていれば書く
 *   node scripts/build-llms-txt.mjs --check    # 書かずに、コミットと違えば exit 1
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { SITE_ORIGIN } from './lib/site-identity.mjs';
import { loadRegistry, orderedQualifications, qualificationLabel } from './lib/qualification-registry.mjs';
import { publicPathFromSlug } from './lib/url-normalization.mjs';

const DOC_META = join(REPO_ROOT, 'src/config/doc-meta-index.json');
const CATEGORIES = join(REPO_ROOT, 'src/config/categories.json');
const TAXONOMY = join(REPO_ROOT, 'src/config/content-taxonomy.json');
const OUT_INDEX = join(REPO_ROOT, 'public/llms.txt');
const OUT_FULL = join(REPO_ROOT, 'public/llms-full.txt');
const MAIN_PAGES_PER_QUALIFICATION = 12;

const clip = (s, n) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const idOf = (q) => (typeof q === 'string' ? q : q.id);

/** カテゴリのハブ URL（サイトの getCategoryHubPath と同じ規則: exam は /exam/<slug>、他は領域のハブ）。 */
export function hubPathFor(category, categories, areas) {
  const area = categories.find((c) => c.slug === category)?.area ?? 'exam';
  return area === 'exam' ? `/exam/${category}` : (areas[area]?.hubPath ?? '/exam');
}

/**
 * 公開記事を「資格（registry の active の並び）→ その他の表示カテゴリ」に束ねる。
 * 正規公開パスの無い記事は skipped に数えて除く（旧 /docs/ を出さない）。
 */
export function collectPages({ docs, registry, categories, pathFor = publicPathFromSlug }) {
  const visible = categories.filter((c) => c.visible !== false);
  const order = orderedQualifications(registry, 'active').map(idOf).filter((id) => visible.some((c) => c.slug === id));
  const otherCats = visible.map((c) => c.slug).filter((s) => !order.includes(s));
  const byCat = new Map();
  let skipped = 0;
  for (const [slug, d] of Object.entries(docs)) {
    if (d.published === false) continue;
    const path = pathFor(slug);
    if (!path) { skipped += 1; continue; }
    const list = byCat.get(d.category) ?? [];
    list.push({ slug, path, title: d.title, shortTitle: d.shortTitle, description: d.description, group: d.group, guideOrder: d.guide_order });
    byCat.set(d.category, list);
  }
  for (const list of byCat.values()) list.sort((a, b) => a.path.localeCompare(b.path));
  const total = [...byCat.values()].reduce((n, l) => n + l.length, 0);
  return { order, otherCats, byCat, skipped, total };
}

/** 資格ごとの「主要ページ」= guide / pillar を guide_order → 題名の順で上位だけ。 */
function mainPages(list) {
  return list
    .filter((p) => p.group === 'guide' || p.group === 'pillar')
    .sort((a, b) => (a.guideOrder ?? 999) - (b.guideOrder ?? 999) || String(a.title).localeCompare(String(b.title), 'ja'))
    .slice(0, MAIN_PAGES_PER_QUALIFICATION);
}

export function buildIndex({ pages, registry, categories, areas, origin = SITE_ORIGIN }) {
  const cat = (slug) => categories.find((c) => c.slug === slug);
  const labels = pages.order.map((id) => qualificationLabel(registry, id));
  const L = [];
  L.push('# doboku-note', '');
  L.push(`> 土木・建設系の実務資格受験者向け試験対策ハブ。${labels.join('・')} の試験対策（キーワード解説・過去問解説・教科書範囲）と、土木施工の実務、公的基準の章記事を公開しています。`, '');
  L.push('サイトの設計思想は「ユーザーが、ここだけで合格できる体験を軸資格ごとに提供する」ことです。教科書的な網羅と過去問演習を一体化させ、各キーワードページから過去問・解説・関連項目へ双方向にリンクする構造で運用しています。', '');
  L.push('## 試験別ハブ', '');
  for (const id of pages.order) {
    const c = cat(id);
    L.push(`- [${qualificationLabel(registry, id)}](${origin}${hubPathFor(id, categories, areas)}): ${c?.subtitle ?? ''}${c?.description ? `。${clip(c.description, 90)}` : ''}`);
  }
  L.push('');
  for (const id of pages.order) {
    const main = mainPages(pages.byCat.get(id) ?? []);
    if (main.length === 0) continue;
    L.push(`## ${qualificationLabel(registry, id)} — 主要ページ`, '');
    for (const p of main) L.push(`- [${p.shortTitle || p.title}](${origin}${p.path}): ${clip(p.description, 80)}`);
    L.push('');
  }
  const practiceLike = pages.otherCats.map(cat).filter(Boolean);
  L.push('## 土木施工の実務・公的基準', '');
  for (const c of practiceLike) L.push(`- [${c.label}](${origin}${hubPathFor(c.slug, categories, areas)}): ${c.subtitle ?? ''}${c.description ? `。${clip(c.description, 90)}` : ''}`);
  if (areas.standards) L.push(`- [${areas.standards.label}](${origin}${areas.standards.hubPath}): 共通仕様書など公的基準の章ごとの解説（原本の章立てに沿う）`);
  L.push('');
  L.push('## 全ページ詳細リスト', '');
  L.push(`全 ${pages.total} ページの完全リスト（URL・タイトル・概要）:`);
  L.push(`- [llms-full.txt](${origin}/llms-full.txt)（Markdown リンク形式・1 行 1 ページ）`, '');
  L.push('## 引用について', '');
  L.push(`AI による要約・引用を歓迎します。コンテンツを引用する際は、出典として **doboku-note (${origin})** を明記してください。各記事には著者情報・公開日・最終更新日が構造化データ（JSON-LD）で入っています。`, '');
  L.push('特に技術士総合技術監理部門の解説は、文部科学省『総合技術監理 キーワード集 2026』の Web 版（出典明記済み）を含みます。一次資料との対応関係を保つよう努めています。');
  return `${L.join('\n')}\n`;
}

export function buildFull({ pages, registry, categories, origin = SITE_ORIGIN }) {
  const cat = (slug) => categories.find((c) => c.slug === slug);
  const L = [];
  L.push('# doboku-note 全ページインデックス（LLM 引用用）', '');
  L.push(`${origin} の公開記事 ${pages.total} ページ。1 行 1 ページ: [タイトル](URL) — 概要。資格の並びは qualification-registry、URL は正規公開パス。`, '');
  const section = (label, list) => {
    if (!list || list.length === 0) return;
    L.push(`## ${label}（${list.length} ページ）`, '');
    for (const p of list) L.push(`- [${p.title}](${origin}${p.path}) — ${clip(p.description, 120)}`);
    L.push('');
  };
  for (const id of pages.order) section(qualificationLabel(registry, id), pages.byCat.get(id));
  for (const slug of pages.otherCats) section(cat(slug)?.label ?? slug, pages.byCat.get(slug));
  return `${L.join('\n').trimEnd()}\n`;
}

function main() {
  const check = process.argv.includes('--check');
  const docs = JSON.parse(readFileSync(DOC_META, 'utf8')).docs;
  const registry = loadRegistry(REPO_ROOT);
  const categories = JSON.parse(readFileSync(CATEGORIES, 'utf8'));
  const areas = JSON.parse(readFileSync(TAXONOMY, 'utf8')).areas;
  const pages = collectPages({ docs, registry, categories });
  if (pages.total < 100) {
    console.error(`[build-llms-txt] 公開記事が ${pages.total} 件（検査不成立: doc-meta-index か正規パスの対応が壊れている）`);
    process.exitCode = 2;
    return;
  }
  const outputs = [[OUT_INDEX, buildIndex({ pages, registry, categories, areas })], [OUT_FULL, buildFull({ pages, registry, categories })]];
  let changed = 0;
  for (const [path, body] of outputs) {
    const same = existsSync(path) && readFileSync(path, 'utf8') === body;
    if (same) continue;
    changed += 1;
    if (!check) writeFileSync(path, body);
  }
  console.log(`[build-llms-txt] 公開記事 ${pages.total} 件（資格 ${pages.order.length}・その他カテゴリ ${pages.otherCats.length}・正規パス無しで除外 ${pages.skipped}）/ ${check ? '差分' : '書換'} ${changed} ファイル`);
  if (check && changed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
