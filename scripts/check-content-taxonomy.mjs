#!/usr/bin/env node
/**
 * check-content-taxonomy.mjs — 領域×資格×記事型×テーマ×タグの整合ゲート（読み取り専用）。
 *
 * 規則の真実源: .claude/knowledge/reference/content-taxonomy.md
 * 値の真実源:   src/config/content-taxonomy.json / categories.json / tags.json / topics.json
 * 純関数:       scripts/lib/content-taxonomy.mjs
 *
 * 使い方:
 *   node scripts/check-content-taxonomy.mjs            # doc-meta-index（公開記事）を全量検査
 *   node scripts/check-content-taxonomy.mjs --ci       # ラチェット（baseline より債務が増えたら赤）
 *   node scripts/check-content-taxonomy.mjs --staged   # pre-commit: staged MDX を gray-matter で読み、新規/変更記事に厳格
 *   node scripts/check-content-taxonomy.mjs --json     # 機械可読（baseline 生成にも使う）
 *
 * 判定:
 *   HARD  … 設定不良（category の area/groups・タグ綴りの衝突・topics のタグ未解決）、
 *           doc の category 不明・group 欠落/許可外、（--staged では）未登録タグ・別名綴り・構造タグ不整合
 *   ラチェット（--ci）… 未登録タグ（集合）・構造タグ×group 不整合（slug 集合）・別名綴りの使用数（件数）が
 *           .claude/config/content-taxonomy-baseline.json より増えたら赤。減った分は「返済」として表示
 *   WARN  … topic 三方向（exam/practice/standards）の 0 件・topic タグの 0 使用・allowlist 未使用・baseline の返済済み
 *           読み手＝/weekly-review Phase 2（quality-audit の report digest）
 *
 * exit 0 = 整合 / 1 = 違反 / 2 = 検査不成立（設定が読めない・記事 0 件・baseline 欠落）
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import {
  buildAliasMap, normalizeTags, isStructuralTag, checkGroupAllowed, checkStructuralTags,
  evaluateSetRatchet, evaluateCountRatchet, countTopicDirections,
} from './lib/content-taxonomy.mjs';

const NAME = 'check-content-taxonomy';
const ARGS = process.argv.slice(2);
const STAGED = ARGS.includes('--staged');
const CI = ARGS.includes('--ci');
const JSON_OUT = ARGS.includes('--json');
const BASELINE_PATH = join(REPO_ROOT, '.claude/config/content-taxonomy-baseline.json');

const readJson = (rel) => JSON.parse(readFileSync(join(REPO_ROOT, rel), 'utf8'));
const fail2 = (msg) => { console.error(`[${NAME}] 検査不成立: ${msg}`); process.exit(2); };

let taxonomy; let categories; let tags; let topics; let catalog;
try {
  taxonomy = readJson('src/config/content-taxonomy.json');
  categories = readJson('src/config/categories.json');
  tags = readJson('src/config/tags.json');
  topics = readJson('src/config/topics.json');
  catalog = readJson('content/site/standards-library/catalog.json');
} catch (e) { fail2(`設定を読めない: ${e.message}`); }

let aliasMap;
try { aliasMap = buildAliasMap(tags); } catch (e) { fail2(e.message); }
const categoryMap = new Map(categories.map((c) => [c.slug, c]));
const groupDefs = taxonomy.groups;
const flags = taxonomy.flags ?? {};

// ---- 設定の HARD 検査 ----------------------------------------------------
const hard = [];
for (const c of categories) {
  if (!taxonomy.areas[c.area]) hard.push({ rule: 'config-category-area', at: c.slug, msg: `area「${c.area ?? '(なし)'}」が語彙外` });
  for (const g of c.groups ?? []) if (!groupDefs[g]) hard.push({ rule: 'config-category-groups', at: c.slug, msg: `group「${g}」が語彙外` });
  if (!Array.isArray(c.groups) || c.groups.length === 0) hard.push({ rule: 'config-category-groups', at: c.slug, msg: 'groups が空' });
}
const tagClasses = new Set(taxonomy.tagClasses);
for (const t of tags) if (t.class && !tagClasses.has(t.class)) hard.push({ rule: 'config-tag-class', at: t.name, msg: `class「${t.class}」が語彙外` });
const topicTagOwner = new Map();
for (const t of topics) {
  for (const tag of t.tags ?? []) {
    const canonical = aliasMap.toCanonical.get(tag);
    if (canonical === undefined) hard.push({ rule: 'config-topic-tag', at: t.slug, msg: `タグ「${tag}」が tags.json に無い` });
    const key = canonical ?? tag;
    if (topicTagOwner.has(key) && topicTagOwner.get(key) !== t.slug) hard.push({ rule: 'config-topic-tag', at: t.slug, msg: `タグ「${key}」が ${topicTagOwner.get(key)} と重複` });
    topicTagOwner.set(key, t.slug);
  }
}

// ---- 記事の読み込み ------------------------------------------------------
function stagedMdx() {
  const out = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACMR', '--', '*.mdx'],
    { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\n').filter((p) => p.startsWith('content/site/') && p.endsWith('.mdx')).sort();
}
function slugOf(rel) { return rel.replace(/^content\/site\//, '').replace(/\/article\.mdx$/, '').replace(/\.mdx$/, '').replace(/\//g, '-'); }

let docs = [];
if (STAGED) {
  const paths = stagedMdx();
  for (const rel of paths) {
    let raw; try { raw = execFileSync('git', ['show', `:${rel}`], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); } catch { continue; }
    let data; try { data = matter(raw).data; } catch { hard.push({ rule: 'doc-frontmatter', at: rel, msg: 'frontmatter を解釈できない' }); continue; }
    docs.push({ slug: slugOf(rel), at: rel, category: data.category, group: data.group, tags: data.tags ?? [], topics: data.topics, published: data.published !== false });
  }
} else {
  const index = readJson('src/config/doc-meta-index.json');
  for (const [slug, m] of Object.entries(index.docs ?? {})) {
    docs.push({ slug, at: slug, category: m.category, group: m.group, tags: m.tagsRaw ?? m.tags ?? [], topics: m.topics, published: m.published !== false });
  }
}
if (!STAGED && docs.length === 0) fail2('doc-meta-index に記事が 0 件（npm run build-indexes を先に）');

// ---- 記事の検査 ----------------------------------------------------------
const docViolations = [];
const unknownTags = new Map();      // canonical(raw) → count
const aliasUsage = new Map();       // alias spelling → count
const structuralMismatch = [];      // slugs
const topicSlugs = new Set(topics.map((t) => t.slug));
const normalizedDocs = [];
for (const d of docs) {
  for (const v of checkGroupAllowed(d, categoryMap, groupDefs)) docViolations.push({ ...v, at: d.at });
  const n = normalizeTags(d.tags, aliasMap);
  for (const u of n.unknown) unknownTags.set(u, (unknownTags.get(u) ?? 0) + 1);
  for (const a of n.aliased) aliasUsage.set(a.from, (aliasUsage.get(a.from) ?? 0) + 1);
  if (d.group && groupDefs[d.group]) {
    const bad = checkStructuralTags({ group: d.group, tags: n.tags }, aliasMap, groupDefs, flags);
    if (bad.length) structuralMismatch.push({ slug: d.slug, at: d.at, tags: bad });
  }
  for (const t of Array.isArray(d.topics) ? d.topics : []) {
    if (!topicSlugs.has(t)) docViolations.push({ rule: 'doc-topic-unknown', at: d.at, msg: `topics「${t}」は topics.json に無い` });
  }
  normalizedDocs.push({ ...d, tags: n.tags });
}

// ---- WARN（surfacer） ------------------------------------------------------
const warns = [];
const usedCanonical = new Set(normalizedDocs.flatMap((d) => d.tags));
const directions = {};
if (!STAGED) {
  for (const t of topics) {
    const c = countTopicDirections(t, normalizedDocs, categoryMap, catalog.documents ?? []);
    directions[t.slug] = c;
    const zero = ['exam', 'practice', 'standards'].filter((k) => c[k] === 0);
    if (zero.length) warns.push(`topic ${t.slug}: ${zero.join('/')} が 0 件（exam ${c.exam} / practice ${c.practice} / standards ${c.standards}）`);
    for (const tag of t.tags ?? []) {
      const canonical = aliasMap.toCanonical.get(tag) ?? tag;
      if (!usedCanonical.has(canonical)) warns.push(`topic ${t.slug}: タグ「${tag}」を使う公開記事が 0 本`);
    }
  }
  for (const [canonical] of aliasMap.entryByCanonical) {
    if (!usedCanonical.has(canonical) && !topicTagOwner.has(canonical) && !flags[canonical]) warns.push(`allowlist 未使用: ${canonical}`);
  }
}

// ---- baseline ラチェット ----------------------------------------------------
const current = {
  unknownTags: [...unknownTags.keys()].sort(),
  aliasUsage: Object.fromEntries([...aliasUsage.entries()].sort()),
  structuralMismatch: structuralMismatch.map((m) => m.slug).sort(),
};
let ratchet = null;
if (CI) {
  if (!existsSync(BASELINE_PATH)) fail2(`baseline が無い: ${BASELINE_PATH}（--json の出力から作る）`);
  const baseline = readJson('.claude/config/content-taxonomy-baseline.json');
  ratchet = {
    unknownTags: evaluateSetRatchet(current.unknownTags, baseline.unknownTags),
    aliasUsage: evaluateCountRatchet(current.aliasUsage, baseline.aliasUsage),
    structuralMismatch: evaluateSetRatchet(current.structuralMismatch, baseline.structuralMismatch),
  };
}

// ---- 出力 ---------------------------------------------------------------
const mode = STAGED ? ' --staged' : CI ? ' --ci' : '';
const summary = `[${NAME}${mode}] 記事 ${docs.length} 件を実検査 / カテゴリ ${categories.length} / tags ${tags.length} 種（受理綴り ${aliasMap.toCanonical.size}） / topics ${topics.length} / 未登録 ${unknownTags.size} 種・別名使用 ${[...aliasUsage.values()].reduce((a, b) => a + b, 0)} 件・構造タグ不整合 ${structuralMismatch.length} 本`;

if (JSON_OUT) {
  console.log(JSON.stringify({ mode: STAGED ? 'staged' : CI ? 'ci' : 'full', docs: docs.length, hard, docViolations, current, unknownTagCounts: Object.fromEntries(unknownTags), structuralMismatch, ratchet, directions, warns }, null, 2));
}

let bad = false;
if (hard.length) { bad = true; console.error(`\n[${NAME}] ✗ 設定不良 ${hard.length} 件:`); for (const h of hard) console.error(`  [${h.rule}] ${h.at} — ${h.msg}`); }
if (docViolations.length) { bad = true; console.error(`\n[${NAME}] ✗ 記事の分類違反 ${docViolations.length} 件:`); for (const v of docViolations.slice(0, 30)) console.error(`  [${v.rule}] ${v.at} — ${v.msg}`); if (docViolations.length > 30) console.error(`  … 他 ${docViolations.length - 30} 件`); }

if (STAGED) {
  if (unknownTags.size) {
    bad = true;
    console.error(`\n[${NAME} --staged] ✗ 未登録タグ ${unknownTags.size} 種（新規・変更記事は allowlist 登録が必須。src/config/tags.json へ class 付きで追加 → content-taxonomy.md §5）:`);
    for (const [t, n] of unknownTags) console.error(`  ${t}（${n} 本）`);
  }
  // 2026-09-11 に全記事の別名・構造タグ不整合を 0 にした（codemod）。以後は新規・変更記事で赤にする
  if (aliasUsage.size) {
    bad = true;
    console.error(`\n[${NAME} --staged] ✗ 別名綴り ${aliasUsage.size} 種（正規表記で書く。直すには node scripts/migrate-tag-aliases.mjs <file> --write）:`);
    for (const [a, n] of aliasUsage) console.error(`  「${a}」→「${aliasMap.toCanonical.get(a)}」（${n} 本）`);
  }
  if (structuralMismatch.length) {
    bad = true;
    console.error(`\n[${NAME} --staged] ✗ 構造タグ × group の不整合 ${structuralMismatch.length} 本（group が真実。矛盾する構造タグは外す）:`);
    for (const m of structuralMismatch) console.error(`  ${m.at}: ${m.tags.join(', ')} は group「${docs.find((d) => d.slug === m.slug)?.group}」と合わない`);
  }
}

if (CI && ratchet) {
  const inc = ratchet.unknownTags.increased.length + ratchet.aliasUsage.increased.length + ratchet.structuralMismatch.increased.length;
  if (inc) {
    bad = true;
    console.error(`\n[${NAME} --ci] ✗ baseline より債務が増えた:`);
    for (const t of ratchet.unknownTags.increased) console.error(`  未登録タグ: ${t}`);
    for (const a of ratchet.aliasUsage.increased) console.error(`  別名綴り「${a.key}」${a.from} → ${a.to} 本`);
    for (const s of ratchet.structuralMismatch.increased) console.error(`  構造タグ不整合: ${s}`);
  }
  const rep = ratchet.unknownTags.repaid.length + ratchet.aliasUsage.repaid.length + ratchet.structuralMismatch.repaid.length;
  if (rep) (JSON_OUT ? console.error : console.log)(`[${NAME} --ci] 返済済み ${rep} 件（baseline から削ってよい）: ${[...ratchet.unknownTags.repaid, ...ratchet.aliasUsage.repaid.map((r) => r.key), ...ratchet.structuralMismatch.repaid].slice(0, 10).join(', ')}${rep > 10 ? ' …' : ''}`);
}

if (!JSON_OUT) for (const w of warns.slice(0, 40)) console.log(`[${NAME}] WARN ${w}`);
if (warns.length > 40 && !JSON_OUT) console.log(`[${NAME}] WARN … 他 ${warns.length - 40} 件`);

(JSON_OUT ? console.error : console.log)(summary);
if (bad) process.exit(1);
(JSON_OUT ? console.error : console.log)(`[${NAME}] ✓ 分類は整合${CI ? '（baseline 以下）' : ''}`);
