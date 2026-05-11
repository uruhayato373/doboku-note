#!/usr/bin/env node
/**
 * Audit Result Applier — exam-keyword-mapping-auditor の出力を機械的に反映
 *
 * 監査差分 JSON を読み、指定 tier（既定: auto_apply）の候補のみを
 * `.claude/state/exam-keyword-map.json` に反映する決定論的スクリプト。
 * LLM 判断を含まない。
 *
 * ── 安全機構 ──
 *   1. 反映前に exam-keyword-map.json を `.backup-{YYYY-MM-DD}.json` に snapshot
 *   2. anchor の current_slugs が監査時点と差異がある場合は skip + warn
 *      （並行編集の上書き防止）
 *   3. dry-run モードで反映なしの差分プレビュー可能
 *   4. 反映済みエントリは `applied-{YYYY-MM-DD}.json` に記録
 *
 * Usage:
 *   node .claude/scripts/apply-audit-result.mjs \
 *     --audit .claude/state/exam-keyword-audits/r07/2026-05-11.json \
 *     [--tier auto_apply]                # 反映する tier、既定 auto_apply
 *     [--include-needs-review]           # needs_review も含めて反映（要注意）
 *     [--dry-run]                        # 反映なしで差分のみ表示
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const ROOT = process.cwd();
const MAP_PATH = join(ROOT, '.claude/state/exam-keyword-map.json');

function parseArgs(argv) {
  const args = { auditPath: null, tier: 'auto_apply', includeNeedsReview: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--audit') args.auditPath = argv[++i];
    else if (a === '--tier') args.tier = argv[++i];
    else if (a === '--include-needs-review') args.includeNeedsReview = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '-h' || a === '--help') {
      console.log('Usage: apply-audit-result.mjs --audit <path> [--tier auto_apply] [--include-needs-review] [--dry-run]');
      process.exit(0);
    }
  }
  if (!args.auditPath) {
    console.error('Error: --audit <path> is required');
    process.exit(1);
  }
  return args;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function shouldApplyTier(candidate, args) {
  if (candidate.tier === 'auto_apply') return true;
  if (candidate.tier === 'needs_review' && args.includeNeedsReview) return true;
  return false;
}

function main() {
  const args = parseArgs(process.argv);
  const audit = JSON.parse(readFileSync(args.auditPath, 'utf8'));

  if (!audit.exam_slug || !audit.anchors) {
    console.error('Error: audit JSON missing exam_slug or anchors');
    process.exit(1);
  }

  const map = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
  const category = audit.category || 'pe-comprehensive-management';
  const examKey = audit.exam_slug.replace(`${category}-`, '');

  if (!map[category] || !map[category][examKey]) {
    console.error(`Error: ${category}.${examKey} not found in exam-keyword-map.json`);
    process.exit(1);
  }

  const examMap = map[category][examKey];

  const applied = {
    audit_path: args.auditPath,
    applied_at: new Date().toISOString(),
    tier_filter: args.tier,
    include_needs_review: args.includeNeedsReview,
    dry_run: args.dryRun,
    anchors: {},
  };
  const skipped = {};
  let totalAdded = 0;
  let totalRemoved = 0;

  for (const [anchor, audited] of Object.entries(audit.anchors)) {
    const currentInMap = examMap[anchor] || [];

    // 並行編集検知
    if (!arraysEqual(currentInMap, audited.current_slugs)) {
      skipped[anchor] = {
        reason: 'concurrent_edit_detected',
        map_now: currentInMap,
        audit_snapshot: audited.current_slugs,
      };
      continue;
    }

    const next = new Set(currentInMap);
    const added = [];
    const removed = [];

    for (const c of audited.candidates_to_add || []) {
      if (!shouldApplyTier(c, args)) continue;
      if (next.has(c.slug)) continue;
      next.add(c.slug);
      added.push({ slug: c.slug, confidence: c.confidence, tier: c.tier });
    }
    for (const c of audited.candidates_to_remove || []) {
      if (!shouldApplyTier(c, args)) continue;
      if (!next.has(c.slug)) continue;
      next.delete(c.slug);
      removed.push({ slug: c.slug, confidence: c.confidence, tier: c.tier });
    }

    if (added.length === 0 && removed.length === 0) continue;

    applied.anchors[anchor] = { added, removed, before: currentInMap, after: [...next] };
    totalAdded += added.length;
    totalRemoved += removed.length;

    if (!args.dryRun) examMap[anchor] = [...next].sort();
  }

  // 反映実行
  if (!args.dryRun && (totalAdded > 0 || totalRemoved > 0)) {
    const backupPath = join(ROOT, `.claude/state/exam-keyword-map.backup-${todayISO()}.json`);
    if (!existsSync(backupPath)) copyFileSync(MAP_PATH, backupPath);
    writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + '\n', 'utf8');

    const appliedDir = join(ROOT, dirname(args.auditPath).replace(/exam-keyword-audits[\\/](.+)$/, 'exam-keyword-audits/$1'));
    mkdirSync(appliedDir, { recursive: true });
    const appliedName = `applied-${basename(args.auditPath)}`;
    const appliedPath = join(appliedDir, appliedName);
    writeFileSync(appliedPath, JSON.stringify({ ...applied, skipped }, null, 2) + '\n', 'utf8');
    console.log(`[apply-audit] ✓ exam-keyword-map.json 更新`);
    console.log(`[apply-audit] ✓ backup: ${backupPath.replace(ROOT, '.')}`);
    console.log(`[apply-audit] ✓ record: ${appliedPath.replace(ROOT, '.')}`);
  } else if (args.dryRun) {
    console.log(`[apply-audit] DRY RUN — exam-keyword-map.json は変更しない`);
  }

  console.log(`\n=== 反映サマリ ===`);
  console.log(`tier filter        : ${args.tier}${args.includeNeedsReview ? ' + needs_review' : ''}`);
  console.log(`anchors processed  : ${Object.keys(audit.anchors).length}`);
  console.log(`anchors applied    : ${Object.keys(applied.anchors).length}`);
  console.log(`anchors skipped    : ${Object.keys(skipped).length} (concurrent edit)`);
  console.log(`slugs added        : ${totalAdded}`);
  console.log(`slugs removed      : ${totalRemoved}`);

  if (Object.keys(skipped).length > 0) {
    console.log(`\n[apply-audit] ⚠️  skipped anchors (sample 5):`);
    Object.entries(skipped).slice(0, 5).forEach(([a, info]) => {
      console.log(`  ${a}: map=[${info.map_now.join(',')}] audit=[${info.audit_snapshot.join(',')}]`);
    });
  }

  console.log(`\n次のステップ:`);
  if (args.dryRun) {
    console.log(`  - dry-run の結果に問題なければ --dry-run を外して再実行`);
  } else {
    console.log(`  - npm run refresh-indexes で派生 JSON を再生成`);
    console.log(`  - git diff .claude/state/exam-keyword-map.json で差分確認`);
    if (audit.has_needs_review) {
      console.log(`  - /audit-exam-mapping export-notebooklm-sheet ${audit.year} で needs_review 監査シート生成`);
    }
  }
}

main();
