#!/usr/bin/env node
// .claude/scripts/build-civil-exam-textbook-index.mjs
//
// 1級土木施工管理技士 (civil-construction-1) の過去問⇔教材相互リンクインデックスを生成。
//
// 入力:
//   - .local/r2/posts/civil-construction-1/primary-*/article.mdx
//   - .local/r2/posts/civil-construction-1/secondary-*/article.mdx
//   - .local/r2/posts/civil-construction-1/textbook-*/article.mdx
//   - .local/r2/posts/civil-construction-1/guide-*/article.mdx
//
// 出力:
//   - src/config/civil-exam-textbook-index.json
//     {
//       "questionToTextbooks": {
//         "primary-r07-a": {
//           "問題-1": [
//             { "slug": "textbook-leveling", "title": "水準測量", "score": 0.85 }
//           ]
//         }
//       },
//       "textbookToQuestions": {
//         "textbook-leveling": [
//           { "examSlug": "primary-r07-a", "section": "問題-1", "examTitle": "..." }
//         ]
//       },
//       "meta": { ... }
//     }
//
// AdSense 不合格対策プラン P1-1。詳細: /Users/minamidaisuke/.claude/plans/gentle-questing-sketch.md
//
// Usage:
//   node .claude/scripts/build-civil-exam-textbook-index.mjs
//   node .claude/scripts/build-civil-exam-textbook-index.mjs --verbose
//   node .claude/scripts/build-civil-exam-textbook-index.mjs --dry-run  # 書き出さない

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import matter from 'gray-matter';

const BASE = resolve('.local/r2/posts/civil-construction-1');
const OUT_PATH = resolve('src/config/civil-exam-textbook-index.json');
const VERBOSE = process.argv.includes('--verbose');
const DRY_RUN = process.argv.includes('--dry-run');

function collectMdx(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      const article = join(p, 'article.mdx');
      try {
        statSync(article);
        out.push({ slug: entry, path: article });
      } catch { /* skip */ }
    }
  }
  return out;
}

function extractKeywords(text) {
  // 日本語の名詞句を雑に抽出（カタカナ連続・漢字連続・カタカナ+漢字）
  // 短すぎる単語（2 字以下）は除外、長すぎるもの（15 字以上）も除外
  const matches = text.matchAll(/[一-龯々ヵヶ]{3,15}|[ァ-ヶー]{3,15}/g);
  const set = new Set();
  for (const m of matches) {
    set.add(m[0]);
  }
  return [...set];
}

function buildTextbookIndex(textbooks) {
  // 各 textbook の「キーワード集合」を作る（タイトル + shortTitle + subtitle + tags + H2/H3）
  const idx = [];
  for (const { slug, path } of textbooks) {
    const raw = readFileSync(path, 'utf-8');
    const { data, content } = matter(raw);
    const titleText = [data.title, data.shortTitle, data.subtitle].filter(Boolean).join(' ');
    const tags = (data.tags || []).filter((t) => typeof t === 'string');
    const headings = [...content.matchAll(/^##+\s+(.+)$/gm)].map((m) => m[1]);

    // キーワード = タイトル系から抽出した名詞句 + tags（textbook など汎用は除外）
    const titleKeywords = extractKeywords(titleText + ' ' + headings.join(' '));
    const tagKeywords = tags.filter((t) => !['textbook', 'guide', 'primary', 'secondary', 'past-questions', 'exam-questions'].includes(t));

    // タイトル本体（クレーン・高所作業車 など）も完全一致照合用に追加
    const titleExact = [data.title, data.shortTitle].filter(Boolean);

    idx.push({
      slug,
      title: data.title || slug,
      keywords: titleKeywords,
      tagKeywords,
      titleExact,
      group: data.group || 'textbook',
    });
  }
  return idx;
}

function scoreMatch(text, textbookEntry) {
  let score = 0;
  const matchedTokens = [];

  // タイトル完全一致（最も強い signal）
  for (const t of textbookEntry.titleExact) {
    if (text.includes(t)) {
      score += 1.0;
      matchedTokens.push(`title:${t}`);
    }
  }

  // tags のキーワード一致
  for (const tk of textbookEntry.tagKeywords) {
    if (text.includes(tk)) {
      score += 0.3;
      matchedTokens.push(`tag:${tk}`);
    }
  }

  // タイトル名詞句の一致（個別キーワード）
  let kwHits = 0;
  for (const kw of textbookEntry.keywords) {
    if (text.includes(kw)) {
      kwHits++;
      score += 0.15;
      matchedTokens.push(`kw:${kw}`);
    }
  }

  // 上限正規化（最大 2.0）
  if (score > 2.0) score = 2.0;

  return { score, matchedTokens, kwHits };
}

function parseExamQuestions(examFile) {
  const raw = readFileSync(examFile.path, 'utf-8');
  const { data, content } = matter(raw);
  // 各 ## 問題 N セクションを抽出
  const sections = [];
  const lines = content.split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const h2Match = line.match(/^##\s+問題\s*([\d.]+)/);
    if (h2Match) {
      if (current) sections.push(current);
      current = { id: `問題-${h2Match[1]}`, text: '' };
    } else if (current) {
      current.text += line + '\n';
    }
  }
  if (current) sections.push(current);
  return {
    slug: examFile.slug,
    title: data.title || examFile.slug,
    group: data.group || 'unknown',
    sections,
  };
}

function buildIndex() {
  const all = collectMdx(BASE);
  const textbooks = all.filter((f) => f.slug.startsWith('textbook-') || f.slug.startsWith('guide-'));
  const exams = all.filter((f) => f.slug.startsWith('primary-') || f.slug.startsWith('secondary-'));

  console.log(`Textbooks/guides: ${textbooks.length}, Exams: ${exams.length}`);

  // textbook side index
  const textbookIdx = buildTextbookIndex(textbooks);

  const questionToTextbooks = {};
  const textbookToQuestions = {};
  let totalMatches = 0;
  let questionsWithMatches = 0;

  // 各 exam の各 question について textbook をマッチング
  for (const examFile of exams) {
    const exam = parseExamQuestions(examFile);
    if (exam.sections.length === 0) continue;

    questionToTextbooks[exam.slug] = {};
    for (const section of exam.sections) {
      const matches = [];
      for (const tb of textbookIdx) {
        const { score, matchedTokens, kwHits } = scoreMatch(section.text, tb);
        // 採用閾値: score >= 0.45 (title-exact 1 hit or kw 3 hits 等)
        if (score >= 0.45) {
          matches.push({
            slug: tb.slug,
            title: tb.title,
            score: Math.round(score * 100) / 100,
            kwHits,
            sampleTokens: matchedTokens.slice(0, 3),
          });
        }
      }
      // score 降順、最大 5 件
      matches.sort((a, b) => b.score - a.score);
      const top = matches.slice(0, 5);
      if (top.length > 0) {
        questionToTextbooks[exam.slug][section.id] = top;
        questionsWithMatches++;
        totalMatches += top.length;

        // 逆引き
        for (const m of top) {
          if (!textbookToQuestions[m.slug]) textbookToQuestions[m.slug] = [];
          textbookToQuestions[m.slug].push({
            examSlug: exam.slug,
            examTitle: exam.title,
            section: section.id,
            score: m.score,
          });
        }
      }
    }
    // empty なら削除
    if (Object.keys(questionToTextbooks[exam.slug]).length === 0) {
      delete questionToTextbooks[exam.slug];
    }
  }

  // 逆引きを score 降順でソート、各 textbook の上位 20 件
  for (const tb of Object.keys(textbookToQuestions)) {
    textbookToQuestions[tb].sort((a, b) => b.score - a.score);
    if (textbookToQuestions[tb].length > 20) {
      textbookToQuestions[tb] = textbookToQuestions[tb].slice(0, 20);
    }
  }

  const result = {
    questionToTextbooks,
    textbookToQuestions,
    meta: {
      generatedAt: new Date().toISOString(),
      textbookCount: textbooks.length,
      examCount: exams.length,
      questionsWithMatches,
      totalMatches,
      threshold: 0.45,
    },
  };

  return result;
}

function main() {
  const result = buildIndex();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Questions with matches: ${result.meta.questionsWithMatches}`);
  console.log(`Total exam→textbook matches: ${result.meta.totalMatches}`);
  console.log(`Textbooks referenced: ${Object.keys(result.textbookToQuestions).length}`);

  if (VERBOSE) {
    console.log('\n--- Sample (first exam) ---');
    const firstExam = Object.keys(result.questionToTextbooks)[0];
    if (firstExam) {
      console.log(`${firstExam}:`);
      const sections = result.questionToTextbooks[firstExam];
      for (const sec of Object.keys(sections).slice(0, 3)) {
        console.log(`  ${sec}:`);
        for (const m of sections[sec]) {
          console.log(`    [${m.score}] ${m.slug} (${m.title}) tokens: ${m.sampleTokens.join(', ')}`);
        }
      }
    }
  }

  if (DRY_RUN) {
    console.log(`\n(--dry-run mode, no file written)`);
    return;
  }
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\nWritten: ${OUT_PATH}`);
}

main();
