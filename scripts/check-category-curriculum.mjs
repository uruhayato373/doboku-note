#!/usr/bin/env node
// category-curriculum.json の健全性チェック（pre-commit / CI）。
// - HARD FAIL: config の slug が doc-meta-index に実在しない（タイプミス・記事削除の取り残し）
// - HARD FAIL: careerFeatured に career タグでない記事を指定
// - HARD FAIL: keywordSection の slug 不在 / 同一 slug の重複 / subjects[].slugs と columns の個数不一致
// - WARN: config 未割当の非キャリア guide 記事（resolver が unassigned で拾うが、編成漏れの気づき用）
// - WARN: keywordSection 未割当の keyword 記事（resolver が「その他」で拾うが、編成漏れの気づき用）
// - WARN: textbookChapters のレンジ外にある textbook 記事（resolver は「その他」章へ回す）
// 真実源: src/lib/category-curriculum.ts（resolver）/ .claude/knowledge/design-system/design-system.md §3。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const curriculum = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/config/category-curriculum.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/config/doc-meta-index.json'), 'utf8'));
const docs = index.docs; // { fullSlug: { category, group, tags, textbook_order, ... } }

const errors = [];
const warnings = [];
// 検査した slug 参照の総数。0 件の緑を「異常なし」と誤読しないため最後に出す（CLAUDE.md §9）。
let checkedSlugs = 0;

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
    // keyword は tags フォールバックを持たない（classifyDoc の既定値なので、group 明記のみを対象にする）。
    if (kind === 'keyword' && m.group === 'keyword') out.push({ slug, ...m });
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
  // テキスト章の入口に据えた要点 guide（introGuides）も guide 記事として検証＋assigned 化（未割当 WARN を避ける）
  for (const ch of cfg.textbookChapters ?? []) {
    if (ch.introGuides) blockSpecs.push({ where: `${category}.textbookChapters[${ch.label}].introGuides`, slugs: ch.introGuides, kind: 'guide' });
  }

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
      checkedSlugs += 1;
    }
  }

  // keywordSection（キーワード節: 必須科目I ブロック ＋ 科目 × 種別マトリクス）の検証
  if (cfg.keywordSection) {
    const ks = cfg.keywordSection;
    const keywordDocs = docsOf(category, 'keyword');
    const keywordBySlug = new Map(keywordDocs.map((d) => [d.slug, d]));
    const kwAssigned = new Set();

    const checkKeywordSlug = (where, suffix) => {
      if (suffix == null) return; // マトリクスの欠番（セルは "—" になる）
      const full = `${category}-${suffix}`;
      checkedSlugs += 1;
      if (!keywordBySlug.has(full)) {
        errors.push(`[${where}] slug 不在: "${suffix}"（${full} が doc-meta-index の group:keyword に無い）`);
        return;
      }
      if (kwAssigned.has(full)) {
        errors.push(`[${where}] slug 重複: "${suffix}"（keywordSection 内で 2 回以上参照・resolver は先着のみ表示）`);
        return;
      }
      kwAssigned.add(full);
    };

    if (ks.required) {
      checkKeywordSlug(`${category}.keywordSection.required.themeSlug`, ks.required.themeSlug ?? null);
      for (const g of ks.required.groups ?? []) {
        for (const s of g.slugs ?? []) checkKeywordSlug(`${category}.keywordSection.required.${g.label}`, s);
      }
    }
    if (ks.selective) {
      const colCount = (ks.selective.columns ?? []).length;
      for (const subject of ks.selective.subjects ?? []) {
        if ((subject.slugs ?? []).length !== colCount) {
          errors.push(`[${category}.keywordSection.selective] "${subject.label}" の slugs ${subject.slugs?.length ?? 0} 個が columns ${colCount} 列と不一致（列ずれの原因）`);
        }
        for (const s of subject.slugs ?? []) checkKeywordSlug(`${category}.keywordSection.selective.${subject.label}`, s);
      }
    }

    const kwUnassigned = keywordDocs.filter((d) => !kwAssigned.has(d.slug));
    if (kwUnassigned.length > 0) {
      warnings.push(`[${category}] keywordSection 未割当の keyword ${kwUnassigned.length} 本（「その他」で表示される）: ${kwUnassigned.map((d) => d.slug.replace(`${category}-`, '')).join(', ')}`);
    }
  }

  // careerFeatured の検証
  for (const suffix of cfg.careerFeatured ?? []) {
    const full = `${category}-${suffix}`;
    const d = guideBySlug.get(full);
    checkedSlugs += 1;
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
if (checkedSlugs === 0) {
  console.error('[check-category-curriculum] ✗ 検査対象 0 件（config 読み込み or カテゴリ判定の故障）');
  process.exit(1);
}
console.log(`[check-category-curriculum] ✓ slug 参照 ${checkedSlugs} 件を検査・全て実在（WARN ${warnings.length} 件）`);
