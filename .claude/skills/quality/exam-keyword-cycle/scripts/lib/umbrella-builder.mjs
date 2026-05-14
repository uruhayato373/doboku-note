/**
 * 年度/親の進捗サマリ body の共通ビルダー + catalog/progress 読込ユーティリティ。
 *
 * generate-umbrella.mjs / sync-umbrella.mjs / verify-cycle-completeness.mjs から import する。
 *
 * progress.json.covered[exam][anchor].status enum:
 *   - "full_cycle_complete"  ← 全 slugs 処理済み × cem-qa 閾値達成（checkbox [x] の唯一の条件）
 *   - "in_review"            ← PR 作成済・未マージ（作業メタデータ）
 *   - "committed"            ← ローカルコミットのみ（作業メタデータ）
 *
 * 完了判定は status === 'full_cycle_complete' のバイナリ。それ以外はすべて「未完了」扱い。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// lib/ は scripts/ の 1 段下にあるため REPO_ROOT は 7 段上
export const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../../../../..');
export const PROGRESS_PATH = resolve(REPO_ROOT, '.claude/state/exam-keyword-cycles/progress.json');
export const CATALOG_PATH = resolve(REPO_ROOT, 'src/config/exam-question-keywords.json');
export const DRAFT_DIR = resolve(REPO_ROOT, '.claude/state/exam-keyword-cycles/umbrella-drafts');
export const LOGS_DIR = resolve(REPO_ROOT, '.claude/state/exam-keyword-cycles/logs');

export const TARGET_YEARS = [
  'pe-comprehensive-management-r07-primary',
  'pe-comprehensive-management-r06-primary',
  'pe-comprehensive-management-r05-primary',
  'pe-comprehensive-management-r04-primary',
  'pe-comprehensive-management-r03-primary',
  'pe-comprehensive-management-r02-primary',
  'pe-comprehensive-management-r01-primary',
];

/** 受験直結のため cem-qa 閾値を引き上げる exam。未指定は 2.0。 */
export const STRICT_THRESHOLD_EXAMS = new Set([
  'pe-comprehensive-management-r03-primary',
  'pe-comprehensive-management-r04-primary',
]);

export function cemQaThresholdFor(examSlug) {
  return STRICT_THRESHOLD_EXAMS.has(examSlug) ? 2.5 : 2.0;
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n', 'utf-8');
}

export function loadCatalogAndProgress() {
  return {
    catalog: readJson(CATALOG_PATH),
    progress: readJson(PROGRESS_PATH),
  };
}

export function compareAnchor(a, b) {
  const parseAnchor = (s) => s.split('-').map((n) => parseInt(n, 10));
  const [a1, a2] = parseAnchor(a);
  const [b1, b2] = parseAnchor(b);
  if (a1 !== b1) return a1 - b1;
  return a2 - b2;
}

export function yearLabel(examSlug) {
  // pe-comprehensive-management-r07-primary → R07-primary
  const match = examSlug.match(/-(r\d{2}|h\d{2})-(primary|secondary)$/);
  if (!match) return examSlug;
  const [, era, type] = match;
  return `${era.toUpperCase()}-${type}`;
}

export function anchorToRomanLabel(anchor) {
  return `Ⅰ-${anchor}`;
}

export function groupByHeadAnchor(anchors) {
  const groups = {};
  for (const a of anchors) {
    const head = a.split('-')[0];
    groups[head] ??= [];
    groups[head].push(a);
  }
  return groups;
}

/**
 * 1 設問の進捗状態を分類する。UI 表示と集計の両方で使う。
 *
 * @returns {{ isFullCycle: boolean, processed: number, total: number }}
 */
export function classifyQuestionCoverage(examSlug, anchor, catalog, coveredEntry) {
  const total = catalog[examSlug]?.[anchor]?.slugs?.length ?? 0;
  if (!coveredEntry) {
    return { isFullCycle: false, processed: 0, total };
  }
  const processed = coveredEntry.keywords?.length ?? 0;
  const isFullCycle = coveredEntry.status === 'full_cycle_complete';
  return { isFullCycle, processed, total };
}

export function buildYearUmbrellaBody(examSlug, progress, catalog) {
  const anchors = Object.keys(catalog[examSlug]).sort(compareAnchor);
  const covered = progress.covered?.[examSlug] ?? {};
  const total = anchors.length;

  let fullCount = 0;
  for (const a of anchors) {
    const c = classifyQuestionCoverage(examSlug, a, catalog, covered[a]);
    if (c.isFullCycle) fullCount++;
  }
  const percent = total > 0 ? Math.round((fullCount / total) * 1000) / 10 : 0;
  const label = yearLabel(examSlug);
  const threshold = cemQaThresholdFor(examSlug);

  let body = '';
  body += `## 関連ロードマップ\n`;
  body += `[docs/project/25_過去問起点校正サイクルロードマップ.md](../blob/main/docs/project/25_過去問起点校正サイクルロードマップ.md)\n\n`;
  body += `## 進捗\n`;
  body += `**${fullCount}/${total} full-cycle (${percent}%)** <!-- sync marker: progress -->\n\n`;
  body += `> 完了判定: 全 slugs 処理済み × cem-qa ≥ ${threshold}。`;
  body += `full-cycle のみ [x]（中間状態なし、バイナリ判定）。\n\n`;

  body += `## 問題（checkbox は自動同期 — 手動チェック禁止）\n\n`;
  const groups = groupByHeadAnchor(anchors);
  for (const [head, list] of Object.entries(groups)) {
    body += `### Ⅰ-${head}\n`;
    for (const a of list) {
      const entry = covered[a];
      const c = classifyQuestionCoverage(examSlug, a, catalog, entry);
      const checked = c.isFullCycle ? 'x' : ' ';
      const coverageTag = entry && c.processed < c.total
        ? ` — 二次キーワード ${c.processed}/${c.total}`
        : '';
      const prText = entry?.pr ? ` — PR #${entry.pr}` : '';
      const dateText = entry?.date ? ` (${entry.date})` : '';
      body += `- [${checked}] ${anchorToRomanLabel(a)}${coverageTag}${prText}${dateText} <!-- anchor: ${a} -->\n`;
    }
    body += `\n`;
  }

  body += `## 次週の候補（3 件、週次レビュー時に更新）\n`;
  body += `<!-- sync marker: next-candidates -->\n\n`;

  body += `## 完了したサイクル（PR リンク）\n`;
  const completed = anchors.filter((a) => {
    const c = classifyQuestionCoverage(examSlug, a, catalog, covered[a]);
    return c.isFullCycle;
  });
  if (completed.length === 0) {
    body += `まだ full-cycle 完了サイクルなし。\n\n`;
  } else {
    for (const a of completed) {
      const c = covered[a];
      const prText = c.pr ? `PR #${c.pr}` : c.status ?? 'unknown';
      body += `- ${anchorToRomanLabel(a)} — ${prText}（${c.date ?? 'no-date'}）\n`;
    }
    body += `\n`;
  }
  body += `<!-- sync marker: completed-cycles -->\n\n`;

  body += `## 運用\n\n`;
  body += `- 1 サイクル = 1 過去問 + **全 RelatedKeywords** + 1 PR（全 slugs 処理しない限り完了扱いにしない）\n`;
  body += `- checkbox は \`/exam-keyword-cycle\` が自動で更新する（手動で触らない）\n`;
  body += `- 進捗状態の真実源: \`.claude/state/exam-keyword-cycles/progress.json\`\n`;
  body += `- cem-qa 閾値: R03/R04 は **2.5**、他年度は 2.0\n`;
  body += `- 全 checkbox が full-cycle になったら年度完了 → 次年度 draft へ\n\n`;

  body += `## 参照\n\n`;
  body += `- スキル: \`.claude/skills/quality/exam-keyword-cycle/SKILL.md\`\n`;
  body += `- 生成: \`generate-umbrella.mjs\` / 同期: \`sync-umbrella.mjs\` / 検証: \`verify-cycle-completeness.mjs\`\n`;
  body += `- カタログ: \`src/config/exam-question-keywords.json\`\n`;

  return {
    title: `[Umbrella] exam-keyword-cycle ${label} (${total} 問)`,
    body,
    coveredCount: fullCount,
    total,
  };
}

export function buildParentUmbrellaBody(progress, catalog) {
  let body = '';
  body += `## 関連ロードマップ\n`;
  body += `[docs/project/25_過去問起点校正サイクルロードマップ.md](../blob/main/docs/project/25_過去問起点校正サイクルロードマップ.md)\n\n`;

  let totalAll = 0;
  let fullAll = 0;
  const rows = [];
  for (const exam of TARGET_YEARS) {
    if (!catalog[exam]) continue;
    const anchors = Object.keys(catalog[exam]);
    const covered = progress.covered?.[exam] ?? {};
    let fullCount = 0;
    for (const a of anchors) {
      const c = classifyQuestionCoverage(exam, a, catalog, covered[a]);
      if (c.isFullCycle) fullCount++;
    }
    const t = anchors.length;
    totalAll += t;
    fullAll += fullCount;
    const p = t > 0 ? Math.round((fullCount / t) * 1000) / 10 : 0;
    rows.push(`| ${yearLabel(exam)} | ${fullCount}/${t} full (${p}%) |`);
  }
  const percentAll = totalAll > 0 ? Math.round((fullAll / totalAll) * 1000) / 10 : 0;

  body += `## 全体進捗\n`;
  body += `**${fullAll}/${totalAll} full-cycle (${percentAll}%)** <!-- sync marker: overall-progress -->\n\n`;

  body += `## 年度別 進捗\n\n`;
  body += `| 年度 | 進捗 |\n`;
  body += `|---|---|\n`;
  body += rows.join('\n') + '\n';
  body += `<!-- sync marker: year-umbrellas -->\n\n`;

  body += `## 今週実施分\n`;
  body += `<!-- sync marker: this-week -->\n\n`;

  body += `## 運用\n\n`;
  body += `- 本 draft は全体進捗の常設ビュー（progress.json から再生成、close の概念なし）\n`;
  body += `- 各年度 draft は全問 full-cycle になったら年度完了\n`;
  body += `- 週次 \`/weekly-review\` が本 draft のサマリを \`docs/project/pdca/YYYY-Www.md\` に反映\n`;
  body += `- 対象年度は直近 7 年（R07〜R01 primary）。追加年度が必要なら \`umbrella-builder.mjs\` の \`TARGET_YEARS\` を拡張\n\n`;

  body += `## 参照\n\n`;
  body += `- スキル: \`.claude/skills/quality/exam-keyword-cycle/SKILL.md\`\n`;
  body += `- ロードマップ: \`docs/project/25_過去問起点校正サイクルロードマップ.md\`\n`;
  body += `- 進捗 JSON: \`.claude/state/exam-keyword-cycles/progress.json\`\n`;

  return {
    title: `[Umbrella] exam-keyword-cycle 全体進捗`,
    body,
    coveredCount: fullAll,
    total: totalAll,
  };
}
