#!/usr/bin/env node
/**
 * 技術士第二次試験・建設部門の内部導線契約を検査する。
 *
 * - articleLevel: 12 科目 × 実在する全年度（R01〜）の過去問と keyword 35 本を科目単位で双方向化
 * - questionLevel: 科目概説を設問へ雑に貼らず、細粒度の中心概念ページだけを許可
 *
 * 真実源: src/config/pe-construction-exam-keyword-links.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT as ROOT } from '../lib/repository-paths.mjs';

const CONFIG_PATH = path.join(ROOT, 'src/config/pe-construction-exam-keyword-links.json');
const SUBJECTS_PATH = path.join(ROOT, 'src/lib/pe-construction-subjects.ts');
const CURRICULUM_PATH = path.join(ROOT, 'src/config/category-curriculum.json');
const ARTICLE_FOOTER_PATH = path.join(ROOT, 'src/components/docs/ArticleFooter.tsx');
const COMPONENT_PATH = path.join(ROOT, 'src/components/ui/PeConstructionSubjectLinks/PeConstructionSubjectLinks.tsx');
const CONTENT_ROOT = path.join(ROOT, 'content/site/pe-construction');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const curriculum = JSON.parse(fs.readFileSync(CURRICULUM_PATH, 'utf8'));
const errors = [];
let checkedArticles = 0;

function parseFrontmatter(file) {
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { source, group: null, category: null, published: null };
  const value = (key) => match[1].match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? null;
  return { source, group: value('group'), category: value('category'), published: value('published') };
}

function checkArticle(localSlug, expectedGroup) {
  const file = path.join(CONTENT_ROOT, localSlug, 'article.mdx');
  checkedArticles += 1;
  if (!fs.existsSync(file)) {
    errors.push(`記事不在: ${localSlug}`);
    return null;
  }
  const meta = parseFrontmatter(file);
  if (meta.category !== 'pe-construction') errors.push(`${localSlug}: category=${meta.category ?? 'なし'}`);
  if (meta.group !== expectedGroup) errors.push(`${localSlug}: group=${meta.group ?? 'なし'}（期待 ${expectedGroup}）`);
  if (meta.published !== 'true') errors.push(`${localSlug}: published=${meta.published ?? 'なし'}（期待 true）`);
  return meta;
}

const componentSource = fs.readFileSync(COMPONENT_PATH, 'utf8');
const subjectSource = fs.readFileSync(SUBJECTS_PATH, 'utf8');
const subjectKeys = [...subjectSource.matchAll(/\{\s*key:\s*'([^']+)',\s*label:/g)].map((m) => m[1]);
const configuredSubjects = Object.keys(config.articleLevel?.subjects ?? {});
if (subjectKeys.length !== 12) errors.push(`科目 SSOT が ${subjectKeys.length} 件（期待 12）`);
if (JSON.stringify(configuredSubjects) !== JSON.stringify(subjectKeys)) {
  errors.push(`科目の順序・集合が PE_CONSTRUCTION_SUBJECTS と不一致: ${configuredSubjects.join(', ')}`);
}

const required = curriculum['pe-construction']?.keywordSection?.required;
const selective = curriculum['pe-construction']?.keywordSection?.selective?.subjects ?? [];
const curriculumKeywords = [
  required?.themeSlug,
  ...(required?.groups ?? []).flatMap((group) => group.slugs ?? []),
  ...selective.flatMap((subject) => subject.slugs ?? []),
].filter(Boolean);
const configuredKeywords = configuredSubjects.flatMap((key) => config.articleLevel.subjects[key] ?? []);
if (new Set(configuredKeywords).size !== configuredKeywords.length) {
  errors.push('articleLevel.subjects 内で keyword slug が重複');
}
const missingKeywords = curriculumKeywords.filter((slug) => !configuredKeywords.includes(slug));
const extraKeywords = configuredKeywords.filter((slug) => !curriculumKeywords.includes(slug));
if (missingKeywords.length || extraKeywords.length) {
  errors.push(`keywordSection 35本との不一致（不足: ${missingKeywords.join(', ') || 'なし'} / 余分: ${extraKeywords.join(', ') || 'なし'}）`);
}

for (const keywordSlug of configuredKeywords) checkArticle(keywordSlug, 'keyword');
// 年度は固定しない。実在する年度の列（r01〜最新）を content から拾い、全科目がその全年度にそろうことを見る
const examYears = [...new Set(fs.readdirSync(CONTENT_ROOT).flatMap((name) => name.match(/^(r\d{2})-required$/)?.[1] ?? []))].sort();
if (examYears.length < 8) errors.push(`年度別の過去問が ${examYears.length} 年度（R01〜R08 の 8 年度以上を期待）`);
let checkedExams = 0;
for (const subjectKey of configuredSubjects) {
  for (const year of examYears) {
    checkArticle(`${year}-${subjectKey}`, 'past-exam');
    checkedExams += 1;
  }
}
if (/Array\.from\(\{\s*length:\s*\d+/.test(componentSource)) errors.push('導線コンポーネントが年度を固定している（Array.from({ length: N })）');

const questionLevel = config.questionLevel ?? {};
const questionEntries = Object.entries(questionLevel.entries ?? {});
if (questionLevel.mode === 'disabled-until-fine-grained-keywords-exist' && questionEntries.length > 0) {
  errors.push('questionLevel は無効中なのに entries が存在する');
}
for (const [source, slugs] of questionEntries) {
  const match = source.match(/^(r\d{2}-[a-z-]+)#(.+)$/);
  if (!match) {
    errors.push(`questionLevel のキー形式が不正: ${source}`);
    continue;
  }
  const exam = checkArticle(match[1], 'past-exam');
  if (exam && !exam.source.includes(`id="${match[2]}"`) && !exam.source.includes(`{#${match[2]}}`)) {
    errors.push(`${source}: anchor が過去問本文に無い`);
  }
  for (const slug of Array.isArray(slugs) ? slugs : []) {
    if (configuredKeywords.includes(slug)) errors.push(`${source}: 広い科目記事 ${slug} を設問へ付与できない`);
    checkArticle(slug, 'keyword');
  }
}

const footerSource = fs.readFileSync(ARTICLE_FOOTER_PATH, 'utf8');
if (!footerSource.includes('<PeConstructionSubjectLinks')) errors.push('ArticleFooter に双方向導線コンポーネントが未配線');
if (!componentSource.includes('pe-construction-exam-keyword-links.json')) errors.push('導線コンポーネントが正源 config を参照していない');

if (checkedArticles === 0) errors.push('検査対象 0 件');
if (configuredKeywords.length !== 35) errors.push(`keyword 記事 ${configuredKeywords.length} 本（期待 35）`);
if (checkedArticles < 119) errors.push(`記事検査 ${checkedArticles} 本（最低 119）`);

if (errors.length > 0) {
  for (const error of errors) console.error(`[check-pe-construction-subject-links] ERROR ${error}`);
  console.error(`[check-pe-construction-subject-links] ✗ ${errors.length} 件のエラー`);
  process.exit(1);
}

console.log(
  `[check-pe-construction-subject-links] ✓ ${configuredSubjects.length}科目 / 過去問${checkedExams}本（${examYears.length}年度）/ keyword${configuredKeywords.length}本 / 設問map ${questionEntries.length}件を検査`,
);
