#!/usr/bin/env node
/**
 * civil-construction-1 textbook/guide 用 関連 JSON 生成スクリプト
 *
 * pe-comprehensive-management の build-keyword-relations.mjs を civil 用にリライト。
 * civil には pe-chapters.json 相当の構造マスタが無いため、tag + textbook_order の近接で関連度を計算する。
 *
 * 関連度スコア:
 *   S1 (topic_tag) = 10  共通の topical tag（law/quality/machinery/construction-plan/schedule/surveying/demolition）
 *   S2 (order)     =  3  textbook_order が ±10 の範囲（S1 が立つ場合のみ加算）
 *   S3 (other_tag) =  1  その他の共通タグ × 1（cap=3）
 *
 *   guide ↔ textbook: GUIDE_IMPLICIT_TOPICS マップで guide に topical tag を付与し、上記 S1 と同様に判定
 *   guide ↔ guide:    全 guide が exam-preparation 共通のため、共通 implicit topic で +5
 *
 * 入力: src/config/doc-meta-index.json, src/config/tag-dictionary.json
 * 出力: src/config/civil-relations.json
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CATEGORY_PREFIX = 'civil-construction-1-';

const IN_META = path.join(ROOT, 'src/config/doc-meta-index.json');
const IN_TAGS = path.join(ROOT, 'src/config/tag-dictionary.json');
const OUT_FILE = path.join(ROOT, 'src/config/civil-relations.json');

const WEIGHTS = { topic: 10, order: 3, other: 1, guide_overlap: 5 };
const TOP_N = 5;
const ORDER_PROXIMITY = 10;
const TAG_CAP = 3;

// 構造的・カテゴリ系で関連度シグナルにならないタグ
const EXCLUDED_TAGS = new Set([
  'textbook',
  'guide',
  'civil-construction-1',
  '1級土木施工管理技士',
  'exam-preparation',
]);

// Topical tags（textbook の主軸タグ）
const TOPIC_TAGS = new Set([
  'law',
  'quality',
  'machinery',
  'construction-plan',
  'schedule',
  'surveying',
  'demolition',
]);

// guide の implicit topic 推定（slug → topical tag のセット）
const GUIDE_IMPLICIT_TOPICS = {
  'guide-concrete-key-points': new Set(['quality', 'construction-plan']),
  'guide-concrete-maintenance': new Set(['quality', 'construction-plan']),
  'guide-earthwork-key-points': new Set(['construction-plan']),
  'guide-four-management': new Set(['quality', 'construction-plan', 'schedule']),
  'guide-law-key-points': new Set(['law']),
  'guide-strategy': new Set([]), // 横断的、固有 topic なし
};

/** doc-meta-index から civil-construction-1 の textbook/guide ページを抽出 */
function loadCivilDocs(meta) {
  const docs = [];
  for (const [fullSlug, m] of Object.entries(meta.docs)) {
    if (!fullSlug.startsWith(CATEGORY_PREFIX)) continue;
    if (m.published === false) continue;
    if (m.group !== 'textbook' && m.group !== 'guide') continue;

    const shortSlug = fullSlug.slice(CATEGORY_PREFIX.length);
    const allTags = new Set((m.tags || []).filter((t) => !EXCLUDED_TAGS.has(t)));
    const topicTags = new Set();
    const otherTags = new Set();
    for (const t of allTags) {
      if (TOPIC_TAGS.has(t)) topicTags.add(t);
      else otherTags.add(t);
    }
    // guide の implicit topic を加算
    if (m.group === 'guide' && GUIDE_IMPLICIT_TOPICS[shortSlug]) {
      for (const t of GUIDE_IMPLICIT_TOPICS[shortSlug]) topicTags.add(t);
    }

    docs.push({
      slug: shortSlug,
      title: m.shortTitle || m.title,
      group: m.group,
      order: typeof m.textbook_order === 'number' ? m.textbook_order : null,
      topicTags,
      otherTags,
    });
  }
  return docs;
}

function intersectSize(a, b) {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

function scoreRelation(a, b) {
  let score = 0;
  const signals = [];

  const topicCommon = intersectSize(a.topicTags, b.topicTags);
  const hasTopic = topicCommon > 0;

  if (hasTopic) {
    score += WEIGHTS.topic;
    signals.push('topic');

    // guide ↔ guide は order が無いので、topic で +5 加算
    if (a.group === 'guide' && b.group === 'guide') {
      score += WEIGHTS.guide_overlap;
      signals.push('guide_overlap');
    }
    // textbook 間は order proximity で +3
    if (a.order !== null && b.order !== null && Math.abs(a.order - b.order) <= ORDER_PROXIMITY) {
      score += WEIGHTS.order;
      signals.push('order');
    }
  }

  const otherCommon = intersectSize(a.otherTags, b.otherTags);
  if (otherCommon > 0) {
    score += WEIGHTS.other * Math.min(otherCommon, TAG_CAP);
    signals.push('other_tag');
  }

  return { score, signals };
}

function computeRelationsFor(doc, allDocs) {
  const candidates = [];
  for (const other of allDocs) {
    if (other.slug === doc.slug) continue;
    const { score, signals } = scoreRelation(doc, other);
    if (score <= 0) continue;
    candidates.push({ slug: other.slug, label: other.title, score, signals, group: other.group, order: other.order });
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // タイブレーク: textbook を guide より優先（textbook→textbook が一般的に強連結）
    const aIsTb = a.group === 'textbook' ? 1 : 0;
    const bIsTb = b.group === 'textbook' ? 1 : 0;
    if (bIsTb !== aIsTb) return bIsTb - aIsTb;
    // order が近い順
    if (doc.order !== null && a.order !== null && b.order !== null) {
      const da = Math.abs(a.order - doc.order);
      const db = Math.abs(b.order - doc.order);
      if (da !== db) return da - db;
    }
    return a.slug.localeCompare(b.slug);
  });

  // top-N まで取る、フォールバックで order 近接の textbook を埋める（同じ group の場合）
  const selected = candidates.slice(0, TOP_N);
  if (selected.length < TOP_N && doc.order !== null) {
    const selectedSet = new Set(selected.map((c) => c.slug));
    const fallback = allDocs
      .filter((o) => o.slug !== doc.slug && o.group === 'textbook' && o.order !== null && !selectedSet.has(o.slug))
      .map((o) => ({ slug: o.slug, label: o.title, distance: Math.abs(o.order - doc.order) }))
      .sort((a, b) => a.distance - b.distance);
    for (const f of fallback) {
      if (selected.length >= TOP_N) break;
      selected.push({ slug: f.slug, label: f.label, score: 0, signals: ['fallback_order'] });
    }
  }

  return selected.map((c) => ({
    slug: c.slug,
    label: c.label,
    score: c.score,
    signals: c.signals,
  }));
}

function main() {
  const meta = JSON.parse(fs.readFileSync(IN_META, 'utf8'));
  const docs = loadCivilDocs(meta);
  console.log(`Loaded ${docs.length} civil docs (textbook + guide, published)`);

  const relations = {};
  const summary = {
    total_docs: docs.length,
    by_group: { textbook: 0, guide: 0 },
    docs_with_relations: 0,
    docs_below_target: 0,
    isolated_docs: [],
  };

  for (const doc of docs) {
    summary.by_group[doc.group]++;
    const rels = computeRelationsFor(doc, docs);
    relations[doc.slug] = rels;
    if (rels.length > 0) summary.docs_with_relations++;
    if (rels.length < TOP_N) summary.docs_below_target++;
    if (rels.length === 0) summary.isolated_docs.push(doc.slug);
  }

  const output = {
    version: 1,
    generated_at: new Date().toISOString(),
    summary,
    config: {
      top_n: TOP_N,
      weights: WEIGHTS,
      order_proximity: ORDER_PROXIMITY,
      excluded_tags: Array.from(EXCLUDED_TAGS),
      topic_tags: Array.from(TOPIC_TAGS),
      tag_cap: TAG_CAP,
    },
    relations,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

  const totalRels = Object.values(relations).reduce((s, arr) => s + arr.length, 0);
  const avg = docs.length > 0 ? (totalRels / docs.length).toFixed(2) : '0.00';

  console.log(`✓ Wrote ${OUT_FILE}`);
  console.log(`  ${summary.total_docs} docs (textbook=${summary.by_group.textbook}, guide=${summary.by_group.guide})`);
  console.log(`  ${summary.docs_with_relations} docs with ≥ 1 relation`);
  console.log(`  ${summary.docs_below_target} docs with < ${TOP_N} relations`);
  console.log(`  ${summary.isolated_docs.length} isolated docs`);
  console.log(`  Avg relations per doc: ${avg}`);
}

main();
