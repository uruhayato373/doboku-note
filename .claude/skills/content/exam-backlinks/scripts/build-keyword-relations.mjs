#!/usr/bin/env node
/**
 * キーワード ⇔ キーワード 関連 JSON 生成スクリプト
 *
 * 総監キーワード（pe-comprehensive-management）について、以下 4 シグナルで関連度を計算し
 * 各キーワードの top-N 関連リストを出力する。
 *
 * 関連度スコア:
 *   S1 (section) = 10  同セクション (pe-chapters.json の sections[].keywords[])
 *   S2 (chapter) =  3  同章 (S1 と排他、S1=0 のときだけ加算)
 *   S3 (exam)    =  2  共通過去問設問への共起数 × 2
 *   S4 (tag)     =  1  共通タグ数 × 1 (keyword/総合技術監理 除外、cap=3)
 *
 * 入力: src/config/pe-chapters.json, exam-question-keywords.json, tag-dictionary.json, doc-meta-index.json
 * 出力: src/config/keyword-relations.json
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const CATEGORY_PREFIX = 'pe-comprehensive-management-';

const IN_CHAPTERS = path.join(ROOT, 'src/config/pe-chapters.json');
const IN_QUESTION_KEYWORDS = path.join(ROOT, 'src/config/exam-question-keywords.json');
const IN_TAGS = path.join(ROOT, 'src/config/tag-dictionary.json');
const IN_META = path.join(ROOT, 'src/config/doc-meta-index.json');
const OUT_FILE = path.join(ROOT, 'src/config/keyword-relations.json');

const WEIGHTS = { section: 10, chapter: 3, exam: 2, tag: 1 };
const TOP_N = 5;
const EXCLUDED_TAGS = new Set(['keyword', '総合技術監理']);
const TAG_CAP = 3;

/** pe-chapters.json から全キーワードを slug 単位で集約
 *  一部キーワードは複数セクションに登録される（例: risk-assessment は 2.1 と 5.2）ため
 *  section_ids / chapter_ids を Set で保持し、S1/S2 は共通要素があれば成立とする
 */
function loadAllKeywords(chaptersData) {
  const bySlug = new Map();
  for (const chapter of chaptersData.chapters) {
    const chapter_id = chapter.id;
    for (const section of chapter.sections) {
      const section_id = section.id;
      for (const kw of section.keywords) {
        let existing = bySlug.get(kw.slug);
        if (!existing) {
          existing = {
            slug: kw.slug,
            title: kw.title,
            section_ids: new Set(),
            chapter_ids: new Set(),
          };
          bySlug.set(kw.slug, existing);
        }
        existing.section_ids.add(section_id);
        existing.chapter_ids.add(chapter_id);
      }
    }
  }
  return Array.from(bySlug.values());
}

/** 2 つの Set に共通要素があるかを返す */
function hasIntersection(setA, setB) {
  for (const x of setA) if (setB.has(x)) return true;
  return false;
}

/** exam-question-keywords から slugA → slugB → 共起カウント */
function buildExamCoOccurrence(questionKeywords) {
  const co = {};
  for (const examSlug of Object.keys(questionKeywords)) {
    const questions = questionKeywords[examSlug];
    for (const anchor of Object.keys(questions)) {
      const slugs = questions[anchor].slugs || [];
      for (let i = 0; i < slugs.length; i++) {
        for (let j = 0; j < slugs.length; j++) {
          if (i === j) continue;
          const a = slugs[i];
          const b = slugs[j];
          if (!co[a]) co[a] = {};
          co[a][b] = (co[a][b] || 0) + 1;
        }
      }
    }
  }
  return co;
}

/** tag-dictionary.json の tags[].usedIn[] を反転して shortSlug → Set<tagName> を生成
 *  EXCLUDED_TAGS のタグは事前に除外
 */
function buildTagMap(tagDict) {
  const map = {};
  for (const tag of tagDict.tags) {
    if (EXCLUDED_TAGS.has(tag.name)) continue;
    for (const fullSlug of tag.usedIn) {
      if (!fullSlug.startsWith(CATEGORY_PREFIX)) continue;
      const shortSlug = fullSlug.slice(CATEGORY_PREFIX.length);
      if (!map[shortSlug]) map[shortSlug] = new Set();
      map[shortSlug].add(tag.name);
    }
  }
  return map;
}

/** doc-meta-index.json の docs[fullSlug] を shortSlug → published boolean に変換
 *  MDX が存在しない場合は undefined のままになる
 */
function buildPublishedMap(meta) {
  const map = {};
  for (const fullSlug of Object.keys(meta.docs)) {
    if (!fullSlug.startsWith(CATEGORY_PREFIX)) continue;
    const shortSlug = fullSlug.slice(CATEGORY_PREFIX.length);
    map[shortSlug] = meta.docs[fullSlug].published !== false;
  }
  return map;
}

/** 2 キーワード間のスコアとシグナル配列を返す */
function scoreRelation(slugA, slugB, indexes, keywordMap) {
  if (slugA === slugB) throw new Error(`Self comparison: ${slugA}`);
  const kwA = keywordMap[slugA];
  const kwB = keywordMap[slugB];
  let score = 0;
  const signals = [];

  if (kwA && kwB) {
    if (hasIntersection(kwA.section_ids, kwB.section_ids)) {
      score += WEIGHTS.section;
      signals.push('section');
    } else if (hasIntersection(kwA.chapter_ids, kwB.chapter_ids)) {
      score += WEIGHTS.chapter;
      signals.push('chapter');
    }
  }

  const examCount = (indexes.examCo[slugA] && indexes.examCo[slugA][slugB]) || 0;
  if (examCount > 0) {
    score += WEIGHTS.exam * examCount;
    signals.push('exam');
  }

  const tagsA = indexes.tagMap[slugA];
  const tagsB = indexes.tagMap[slugB];
  if (tagsA && tagsB) {
    let common = 0;
    for (const t of tagsA) if (tagsB.has(t)) common++;
    if (common > 0) {
      score += WEIGHTS.tag * Math.min(common, TAG_CAP);
      signals.push('tag');
    }
  }

  return { score, signals };
}

/** 1 キーワードの top-N 関連候補を計算。5 件未満ならフォールバック埋め */
function computeRelationsFor(slug, allSlugs, indexes, keywordMap) {
  const candidates = [];
  for (const otherSlug of allSlugs) {
    if (otherSlug === slug) continue;
    if (!keywordMap[otherSlug]) continue;
    const { score, signals } = scoreRelation(slug, otherSlug, indexes, keywordMap);
    if (score <= 0) continue;
    candidates.push({ slug: otherSlug, score, signals });
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aHasSec = a.signals.includes('section') ? 1 : 0;
    const bHasSec = b.signals.includes('section') ? 1 : 0;
    if (bHasSec !== aHasSec) return bHasSec - aHasSec;
    const aExam = (indexes.examCo[slug] && indexes.examCo[slug][a.slug]) || 0;
    const bExam = (indexes.examCo[slug] && indexes.examCo[slug][b.slug]) || 0;
    if (bExam !== aExam) return bExam - aExam;
    return a.slug.localeCompare(b.slug);
  });

  const selected = candidates.slice(0, TOP_N);

  if (selected.length < TOP_N) {
    const selectedSet = new Set(selected.map(c => c.slug));
    for (const otherSlug of allSlugs) {
      if (selected.length >= TOP_N) break;
      if (otherSlug === slug) continue;
      if (selectedSet.has(otherSlug)) continue;
      if (!keywordMap[otherSlug]) continue;
      selected.push({ slug: otherSlug, score: 0, signals: [] });
      selectedSet.add(otherSlug);
    }
  }

  return selected.map(c => ({
    slug: c.slug,
    label: keywordMap[c.slug].title,
    score: c.score,
    signals: c.signals,
  }));
}

function main() {
  const chaptersData = JSON.parse(fs.readFileSync(IN_CHAPTERS, 'utf8'));
  const questionKeywords = JSON.parse(fs.readFileSync(IN_QUESTION_KEYWORDS, 'utf8'));
  const tagDict = JSON.parse(fs.readFileSync(IN_TAGS, 'utf8'));
  const meta = JSON.parse(fs.readFileSync(IN_META, 'utf8'));

  const keywords = loadAllKeywords(chaptersData);
  console.log(`Loaded ${keywords.length} keywords from pe-chapters.json`);

  const keywordMap = {};
  for (const kw of keywords) keywordMap[kw.slug] = kw;

  const examCo = buildExamCoOccurrence(questionKeywords);
  const tagMap = buildTagMap(tagDict);
  const publishedMap = buildPublishedMap(meta);

  const indexes = { examCo, tagMap };

  // Orphan: group: keyword の MDX が存在するが pe-chapters.json に未登録
  // doc-meta-index の group フィールドを真実源にする（tags はカタカナ/英語揺れあり）
  const chaptersSlugSet = new Set(keywords.map(k => k.slug));
  const allKeywordMdxShortSlugs = [];
  for (const fullSlug of Object.keys(meta.docs)) {
    if (!fullSlug.startsWith(CATEGORY_PREFIX)) continue;
    if (meta.docs[fullSlug].group !== 'keyword') continue;
    if (meta.docs[fullSlug].published === false) continue;
    allKeywordMdxShortSlugs.push(fullSlug.slice(CATEGORY_PREFIX.length));
  }
  const orphanSlugs = allKeywordMdxShortSlugs.filter(s => !chaptersSlugSet.has(s));
  if (orphanSlugs.length > 0) {
    console.log(`⚠  ${orphanSlugs.length} orphan slugs (group='keyword' MDX exists but not in pe-chapters.json):`);
    for (const s of orphanSlugs) console.log(`   - ${s}`);
  }

  // Missing MDX: pe-chapters.json にはあるが MDX (= doc-meta-index) に存在しないか published=false
  const missingMdxSlugs = keywords
    .filter(k => publishedMap[k.slug] !== true)
    .map(k => k.slug);
  if (missingMdxSlugs.length > 0) {
    console.log(`⚠  ${missingMdxSlugs.length} keywords in pe-chapters.json without published MDX:`);
    for (const s of missingMdxSlugs) console.log(`   - ${s}`);
  }

  // 関連度計算の対象: pe-chapters.json 登録かつ MDX 公開中
  const allSlugs = keywords.map(k => k.slug).filter(s => publishedMap[s] === true);
  console.log(`Computing relations for ${allSlugs.length} published keywords...`);

  const relations = {};
  const summary = {
    total_keywords: keywords.length,
    published_keywords: allSlugs.length,
    keywords_with_relations: 0,
    keywords_below_target: 0,
    isolated_keywords: [],
    orphan_slugs_warned: orphanSlugs,
    missing_mdx_slugs: missingMdxSlugs,
  };

  for (const slug of allSlugs) {
    const rels = computeRelationsFor(slug, allSlugs, indexes, keywordMap);
    relations[slug] = rels;
    if (rels.length > 0) summary.keywords_with_relations++;
    if (rels.length < TOP_N) summary.keywords_below_target++;
    if (rels.length === 0) summary.isolated_keywords.push(slug);
  }

  const output = {
    version: 1,
    generated_at: new Date().toISOString(),
    summary,
    config: {
      top_n: TOP_N,
      weights: WEIGHTS,
      excluded_tags: Array.from(EXCLUDED_TAGS),
      tag_cap: TAG_CAP,
    },
    relations,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

  const totalRels = Object.values(relations).reduce((s, arr) => s + arr.length, 0);
  const avg = allSlugs.length > 0 ? (totalRels / allSlugs.length).toFixed(2) : '0.00';

  console.log(`✓ Wrote ${OUT_FILE}`);
  console.log(`  ${summary.published_keywords} keywords processed (${summary.total_keywords} in master, ${summary.missing_mdx_slugs.length} missing MDX)`);
  console.log(`  ${summary.keywords_with_relations} keywords with ≥ 1 relation`);
  console.log(`  ${summary.keywords_below_target} keywords with < ${TOP_N} relations (below_target)`);
  console.log(`  ${summary.isolated_keywords.length} isolated keywords (0 relations)`);
  console.log(`  ${summary.orphan_slugs_warned.length} orphan slugs warned`);
  console.log(`  Avg relations per keyword: ${avg}`);
}

main();
