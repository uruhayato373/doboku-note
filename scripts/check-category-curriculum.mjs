#!/usr/bin/env node
// category-curriculum.json の健全性チェック（pre-commit / CI）。
// - HARD FAIL: config の slug が doc-meta-index に実在しない（タイプミス・記事削除の取り残し）
// - HARD FAIL: careerFeatured に career タグでない記事を指定
// - WARN: config 未割当の非キャリア guide 記事（resolver が unassigned で拾うが、編成漏れの気づき用）
// - WARN: textbookChapters のレンジ外にある textbook 記事（resolver は「その他」章へ回す）
// 真実源: src/lib/category-curriculum.ts（resolver）/ docs/design-system/design-system.md §3。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const curriculum = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/config/category-curriculum.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/config/doc-meta-index.json'), 'utf8'));
const docs = index.docs; // { fullSlug: { category, group, tags, textbook_order, ... } }

const errors = [];
const warnings = [];

// カテゴリ別の guide / textbook 記事を index から収集。
// classifyDoc（src/lib/doc-classifier.ts）と同じく group フィールドを優先し、
// group が無い場合のみ tags でフォールバックする（例: pe-construction の group:keyword を guide と誤認しない）。
function docsOf(category, kind) {
  const out = [];
  for (const [slug, m] of Object.entries(docs)) {
    if (m.category !== category) continue;
    const isGuide = m.group === 'guide' || (!m.group && (m.tags || []).includes('guide'));
    const isTextbook = m.group === 'textbook' || (!m.group && (m.tags || []).includes('textbook'));
    if (kind === 'guide' && isGuide) out.push({ slug, ...m });
    if (kind === 'textbook' && isTextbook) out.push({ slug, ...m });
  }
  return out;
}

for (const [category, cfg] of Object.entries(curriculum)) {
  if (category.startsWith('$')) continue;

  const guideDocs = docsOf(category, 'guide');
  const guideBySlug = new Map(guideDocs.map((d) => [d.slug, d]));
  const assigned = new Set();

  // examGuide + fields のブロック slug を検証
  const blockSpecs = [];
  if (cfg.examGuide) blockSpecs.push({ where: `${category}.examGuide`, slugs: cfg.examGuide.slugs, kind: 'guide' });
  for (const b of cfg.fields?.blocks ?? []) blockSpecs.push({ where: `${category}.fields.${b.id}`, slugs: b.slugs, kind: 'guide' });

  for (const spec of blockSpecs) {
    for (const suffix of spec.slugs) {
      const full = `${category}-${suffix}`;
      const d = guideBySlug.get(full);
      if (!d) {
        errors.push(`[${spec.where}] slug 不在: "${suffix}"（${full} が doc-meta-index の guide に無い）`);
        continue;
      }
      if ((d.tags || []).includes('career')) {
        errors.push(`[${spec.where}] "${suffix}" は career タグ付き。分野/受験ガイドに置けない（career タグを外すか careerFeatured へ）`);
      }
      assigned.add(full);
    }
  }

  // careerFeatured の検証
  for (const suffix of cfg.careerFeatured ?? []) {
    const full = `${category}-${suffix}`;
    const d = guideBySlug.get(full);
    if (!d) {
      errors.push(`[${category}.careerFeatured] slug 不在: "${suffix}"（${full} が無い）`);
      continue;
    }
    if (!(d.tags || []).includes('career')) {
      errors.push(`[${category}.careerFeatured] "${suffix}" は career タグが無い（注目キャリアに置けない）`);
    }
  }

  // 未割当の非キャリア guide（WARN）
  const unassigned = guideDocs.filter(
    (d) => !assigned.has(d.slug) && !(d.tags || []).includes('career'),
  );
  if (unassigned.length > 0) {
    warnings.push(`[${category}] config 未割当の guide ${unassigned.length} 本（unassigned で表示される）: ${unassigned.map((d) => d.slug.replace(`${category}-`, '')).join(', ')}`);
  }

  // textbookChapters レンジ外（WARN）
  if (cfg.textbookChapters) {
    const tb = docsOf(category, 'textbook');
    const outside = tb.filter((d) => {
      const o = d.textbook_order;
      if (typeof o !== 'number') return true;
      return !cfg.textbookChapters.some((r) => o >= r.min && o <= r.max);
    });
    if (outside.length > 0) {
      warnings.push(`[${category}] textbookChapters レンジ外 ${outside.length} 本（「その他」章へ）: ${outside.map((d) => `${d.slug.replace(`${category}-`, '')}(${d.textbook_order})`).join(', ')}`);
    }
  }
}

for (const w of warnings) console.log(`[check-category-curriculum] WARN ${w}`);
if (errors.length > 0) {
  for (const e of errors) console.error(`[check-category-curriculum] ERROR ${e}`);
  console.error(`\n[check-category-curriculum] ✗ ${errors.length} 件のエラー`);
  process.exit(1);
}
console.log(`[check-category-curriculum] ✓ config の slug は全て実在（WARN ${warnings.length} 件）`);
