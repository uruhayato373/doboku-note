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
 *           テーマの軸（facet）・状態（status）が語彙外、主題タグ（topical）がどのテーマにも属さず noTopic の理由も無い、
 *           （--staged では）テーマへの所属が要るのにどのテーマにも属さない記事（content-taxonomy.md §6-2）
 *   ラチェット（--ci）… 未登録タグ（集合）・構造タグ×group 不整合（slug 集合）・別名綴りの使用数（件数）・
 *           テーマ所属漏れ（slug 集合）・記事型のタグしか持たない記事（slug 集合）が .claude/config/content-taxonomy-baseline.json より増えたら赤。減った分は「返済」として表示
 *   WARN  … topic 三方向（exam/practice/standards）の 0 件・topic タグの 0 使用・allowlist 未使用・baseline の返済済み・
 *           昇格基準と status の食い違い（育成中で基準を満たす／公開ハブで基準を下回る。自動では切り替えない）
 *           読み手＝/weekly-review Phase 2（quality-audit の report digest）と /monthly-review（report-taxonomy-wiring）
 *
 * exit 0 = 整合 / 1 = 違反 / 2 = 検査不成立（設定が読めない・記事 0 件・baseline 欠落）
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { readJson } from './lib/json-io.mjs';
import {
  buildAliasMap, normalizeTags, isStructuralTag, checkGroupAllowed, checkStructuralTags,
  evaluateSetRatchet, evaluateCountRatchet, countTopicDirections, topicEligibility, lacksSubjectTags,
} from './lib/content-taxonomy.mjs';
import { needsTopic, topicsOfDoc } from '../src/lib/topic-membership.mjs';
import { runBody, isCliEntry, runAsCli } from './lib/cli-run.mjs';
import { siteSlugFromRel } from '../src/lib/site-slug.mjs';

// in-process でも呼べるよう run() に包んである（DN-0688・pre-commit-dispatch が import して呼ぶ）。
// process.argv / process.exit / process.exitCode は runBody が渡す __argv / __exit / __status への読み替え。
// 本文は字下げしていない（複数行の文字列を壊さないため）。CLI として起動したときの引数・出力・終了コードは従来と同じ。
export async function run({ argv = process.argv.slice(2) } = {}) {
  return runBody(argv, import.meta.url, async ({ argv: __argv, exit: __exit, status: __status }) => {

const NAME = 'check-content-taxonomy';
const ARGS = __argv.slice(2);
const STAGED = ARGS.includes('--staged');
const CI = ARGS.includes('--ci');
const JSON_OUT = ARGS.includes('--json');
const BASELINE_PATH = join(REPO_ROOT, '.claude/config/content-taxonomy-baseline.json');

const fail2 = (msg) => { console.error(`[${NAME}] 検査不成立: ${msg}`); __exit(2); };

let taxonomy; let categories; let tags; let topics; let catalog;
try {
  taxonomy = readJson(REPO_ROOT, 'src/config/content-taxonomy.json');
  categories = readJson(REPO_ROOT, 'src/config/categories.json');
  tags = readJson(REPO_ROOT, 'src/config/tags.json');
  topics = readJson(REPO_ROOT, 'src/config/topics.json');
  catalog = readJson(REPO_ROOT, 'content/site/standards-library/catalog.json');
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
    // learning class（試験対策・出題傾向など学習の型）は技術テーマでないのでテーマに束ねない（content-taxonomy.md §5-1）
    if (canonical !== undefined && aliasMap.classOf.get(canonical) === 'learning') hard.push({ rule: 'config-topic-tag', at: t.slug, msg: `タグ「${tag}」は learning class（学習の型）でテーマに使えない` });
    const key = canonical ?? tag;
    if (topicTagOwner.has(key) && topicTagOwner.get(key) !== t.slug) hard.push({ rule: 'config-topic-tag', at: t.slug, msg: `タグ「${key}」が ${topicTagOwner.get(key)} と重複` });
    topicTagOwner.set(key, t.slug);
  }
  // テーマの軸と状態（content-taxonomy.md §6-1）
  if (!taxonomy.topicFacets?.[t.facet]) hard.push({ rule: 'config-topic-facet', at: t.slug, msg: `facet「${t.facet ?? '(なし)'}」が語彙外（${Object.keys(taxonomy.topicFacets ?? {}).join('/')}）` });
  if (!taxonomy.topicStatuses?.[t.status]) hard.push({ rule: 'config-topic-status', at: t.slug, msg: `status「${t.status ?? '(なし)'}」が語彙外（${Object.keys(taxonomy.topicStatuses ?? {}).join('/')}）` });
}
// 主題タグ（topical）は、どれか 1 つのテーマに属すか、属さない理由（noTopic）を持つ。新しい主題タグを足した人に行き先を決めさせる
for (const t of tags) {
  const canonical = t.canonical ?? t.name;
  const cls = t.class ?? 'topical';
  if (t.noTopic !== undefined) {
    if (cls !== 'topical') hard.push({ rule: 'config-tag-notopic', at: canonical, msg: `noTopic は主題タグ（topical）にだけ書く（class ${cls}）` });
    else if (!taxonomy.noTopicReasons?.[t.noTopic]) hard.push({ rule: 'config-tag-notopic', at: canonical, msg: `noTopic「${t.noTopic}」が語彙外（${Object.keys(taxonomy.noTopicReasons ?? {}).join('/')}）` });
    if (topicTagOwner.has(canonical)) hard.push({ rule: 'config-tag-notopic', at: canonical, msg: `${topicTagOwner.get(canonical)} に属すのに noTopic がある` });
  } else if (cls === 'topical' && !topicTagOwner.has(canonical)) {
    hard.push({ rule: 'config-tag-unrouted', at: canonical, msg: 'どのテーマにも属さない主題タグ。topics.json のテーマに入れるか、tags.json に noTopic（理由）を書く' });
  }
}

// ---- 記事の読み込み ------------------------------------------------------
function stagedMdx() {
  const out = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACMR', '--', '*.mdx'],
    { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\n').filter((p) => p.startsWith('content/site/') && p.endsWith('.mdx')).sort();
}
function slugOf(rel) { return siteSlugFromRel(rel.replace(/^content\/site\//, '')); }

let docs = [];
if (STAGED) {
  const paths = stagedMdx();
  for (const rel of paths) {
    let raw; try { raw = execFileSync('git', ['show', `:${rel}`], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); } catch { continue; }
    let data; try { data = matter(raw).data; } catch { hard.push({ rule: 'doc-frontmatter', at: rel, msg: 'frontmatter を解釈できない' }); continue; }
    docs.push({ slug: slugOf(rel), at: rel, category: data.category, group: data.group, tags: data.tags ?? [], topics: data.topics, published: data.published !== false });
  }
} else {
  const index = readJson(REPO_ROOT, 'src/config/doc-meta-index.json');
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
const canon = (tag) => aliasMap.toCanonical.get(tag) ?? tag;
const classOfTag = (tag) => aliasMap.classOf.get(canon(tag));
const topicless = [];               // テーマへの所属が要るのにどのテーマにも属さない記事
const subjectless = [];             // 記事型・フラグのタグしか持たない記事（§5-3。過去問・キャリアを除く）
let needTopicCount = 0;
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
  const nd = { ...d, tags: n.tags };
  normalizedDocs.push(nd);
  if (lacksSubjectTags(nd, classOfTag)) subjectless.push({ slug: d.slug, at: d.at });
  if (needsTopic(nd, { area: categoryMap.get(d.category)?.area ?? 'exam', classOf: classOfTag })) {
    needTopicCount += 1;
    if (!topicsOfDoc(nd, topics, canon).length) topicless.push({ slug: d.slug, at: d.at });
  }
}

// ---- WARN（surfacer） ------------------------------------------------------
const warns = [];
const usedCanonical = new Set(normalizedDocs.flatMap((d) => d.tags));
const directions = {};
if (!STAGED) {
  for (const t of topics) {
    const c = countTopicDirections(t, normalizedDocs, categoryMap, catalog.documents ?? [], canon);
    const el = topicEligibility(c, taxonomy.topicPromotion);
    directions[t.slug] = { ...c, filled: el.filled, eligible: el.eligible, status: t.status };
    if (t.status === 'incubating' && el.eligible) warns.push(`topic ${t.slug}: 育成中だが昇格基準を満たす（${el.filled.join('/')} が埋まった）→ status を hub にできる`);
    if (t.status === 'hub' && !el.eligible) warns.push(`topic ${t.slug}: 公開ハブだが昇格基準を下回る（埋まった方向 ${el.filled.join('/') || 'なし'}）→ 記事を足すか判断する（即 noindex にしない）`);
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
  topicless: topicless.map((m) => m.slug).sort(),
  subjectless: subjectless.map((m) => m.slug).sort(),
};
let ratchet = null;
if (CI) {
  if (!existsSync(BASELINE_PATH)) fail2(`baseline が無い: ${BASELINE_PATH}（--json の出力から作る）`);
  const baseline = readJson(REPO_ROOT, '.claude/config/content-taxonomy-baseline.json');
  ratchet = {
    unknownTags: evaluateSetRatchet(current.unknownTags, baseline.unknownTags),
    aliasUsage: evaluateCountRatchet(current.aliasUsage, baseline.aliasUsage),
    structuralMismatch: evaluateSetRatchet(current.structuralMismatch, baseline.structuralMismatch),
    topicless: evaluateSetRatchet(current.topicless, baseline.topicless ?? []),
    subjectless: evaluateSetRatchet(current.subjectless, baseline.subjectless ?? []),
  };
}

// ---- 出力 ---------------------------------------------------------------
const mode = STAGED ? ' --staged' : CI ? ' --ci' : '';
const summary = `[${NAME}${mode}] 記事 ${docs.length} 件を実検査 / カテゴリ ${categories.length} / tags ${tags.length} 種（受理綴り ${aliasMap.toCanonical.size}） / topics ${topics.length} / 未登録 ${unknownTags.size} 種・別名使用 ${[...aliasUsage.values()].reduce((a, b) => a + b, 0)} 件・構造タグ不整合 ${structuralMismatch.length} 本 / テーマ所属が要る ${needTopicCount} 本・所属なし ${topicless.length} 本・記事型のタグだけ ${subjectless.length} 本`;

if (JSON_OUT) {
  console.log(JSON.stringify({ mode: STAGED ? 'staged' : CI ? 'ci' : 'full', docs: docs.length, hard, docViolations, current, unknownTagCounts: Object.fromEntries(unknownTags), structuralMismatch, topicCoverage: { need: needTopicCount, topicless }, subjectless, ratchet, directions, warns }, null, 2));
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
  if (topicless.length) {
    bad = true;
    console.error(`\n[${NAME} --staged] ✗ テーマへの所属が要るのにどのテーマにも属さない ${topicless.length} 本（分野・管理のタグを付けるか、frontmatter に topics: [slug] を書く → content-taxonomy.md §6-2）:`);
    for (const m of topicless) console.error(`  ${m.at}`);
  }
  if (subjectless.length) {
    bad = true;
    console.error(`\n[${NAME} --staged] ✗ 記事型のタグ（guide など）しか持たない ${subjectless.length} 本（資格・科目のタグか、学習の型・主題のタグを 1 つ以上付ける → content-taxonomy.md §5-3。どの記事の関連記事にも選ばれなくなる）:`);
    for (const m of subjectless) console.error(`  ${m.at}`);
  }
}

if (CI && ratchet) {
  const inc = ratchet.unknownTags.increased.length + ratchet.aliasUsage.increased.length + ratchet.structuralMismatch.increased.length + ratchet.topicless.increased.length + ratchet.subjectless.increased.length;
  if (inc) {
    bad = true;
    console.error(`\n[${NAME} --ci] ✗ baseline より債務が増えた:`);
    for (const t of ratchet.unknownTags.increased) console.error(`  未登録タグ: ${t}`);
    for (const a of ratchet.aliasUsage.increased) console.error(`  別名綴り「${a.key}」${a.from} → ${a.to} 本`);
    for (const s of ratchet.structuralMismatch.increased) console.error(`  構造タグ不整合: ${s}`);
    for (const s of ratchet.topicless.increased) console.error(`  テーマ所属なし: ${s}（分野・管理のタグか topics: を付ける）`);
    for (const s of ratchet.subjectless.increased) console.error(`  記事型のタグだけ: ${s}（資格・学習の型・主題のタグを付ける）`);
  }
  const rep = ratchet.unknownTags.repaid.length + ratchet.aliasUsage.repaid.length + ratchet.structuralMismatch.repaid.length + ratchet.topicless.repaid.length + ratchet.subjectless.repaid.length;
  if (rep) (JSON_OUT ? console.error : console.log)(`[${NAME} --ci] 返済済み ${rep} 件（baseline から削ってよい）: ${[...ratchet.unknownTags.repaid, ...ratchet.aliasUsage.repaid.map((r) => r.key), ...ratchet.structuralMismatch.repaid, ...ratchet.topicless.repaid, ...ratchet.subjectless.repaid].slice(0, 10).join(', ')}${rep > 10 ? ' …' : ''}`);
}

if (!JSON_OUT) for (const w of warns.slice(0, 40)) console.log(`[${NAME}] WARN ${w}`);
if (warns.length > 40 && !JSON_OUT) console.log(`[${NAME}] WARN … 他 ${warns.length - 40} 件`);

(JSON_OUT ? console.error : console.log)(summary);
if (bad) __exit(1);
(JSON_OUT ? console.error : console.log)(`[${NAME}] ✓ 分類は整合${CI ? '（baseline 以下）' : ''}`);
  });
}

if (isCliEntry(import.meta.url)) runAsCli(run);
