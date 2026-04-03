#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const postsDir = path.join(root, '.local', 'r2', 'posts');
const cemTargetDir = path.join(postsDir, 'pe-comprehensive-management');

// 日本語ディレクトリ → 英語 slug マッピング
const japaneseToEnglishMap = {
  'ESG・環境評価': 'esg-environmental-assessment',
  'PDCAサイクル': 'pdca-cycle',
  'PERT-CPM': 'pert-cpm',
  'PFI': 'pfi',
  'PM理論': 'pm-theory',
  'SL理論': 'situational-leadership-theory',
  'WACC-ROIC': 'wacc-roic',
  'ゲーム理論': 'game-theory',
  'サーバントリーダーシップ': 'servant-leadership',
  'サプライチェーンマネジメント': 'supply-chain-management',
  'シミュレーション': 'simulation',
  'トレーサビリティー': 'traceability',
  'フィージビリティスタディ': 'feasibility-study',
  'フォロワーシップ': 'followership',
  'プロジェクトマネジメント': 'project-management',
  'ライフサイクルコスティング': 'lifecycle-costing',
  'ライフサイクルマネジメント': 'lifecycle-management',
  'リスク評価': 'risk-assessment',
  '価値工学': 'value-engineering',
  '改善活動': 'improvement-activities',
  '階層分析法': 'analytic-hierarchy-process',
  '企業会計基準': 'corporate-accounting-standards',
  '技士試験_総合技術監理部門': 'exam-index',
  '経済性工学': 'economic-engineering',
  '原価企画': 'target-costing',
  '原価計算': 'cost-accounting',
  '原価差異分析': 'cost-variance-analysis',
  '減価償却': 'depreciation',
  '顧客満足（CS）': 'customer-satisfaction',
  '工数見積り': 'effort-estimation',
  '財務諸表': 'financial-statements',
  '施工計画': 'construction-planning',
  '事業継続計画（BCP）・事業継続マネジメント（BCM）': 'business-continuity-plan',
  '事業投資計画': 'business-investment-plan',
  '事業投資評価': 'business-investment-evaluation',
  '事業評価': 'business-evaluation',
  '手順計画': 'procedure-planning',
  '重要目標達成指標': 'key-performance-indicators',
  '消費者保護': 'consumer-protection',
  '数理計画法': 'mathematical-programming',
  '制約条件の理論（TOC）': 'theory-of-constraints',
  '生産の4M': 'four-m-of-production',
  '生産活動指標': 'production-activity-indicators',
  '生産統制': 'production-control',
  '生産方式': 'production-method',
  '製造原価': 'manufacturing-cost',
  '製造物責任（PL）': 'product-liability',
  '製品安全': 'product-safety',
  '設計管理': 'design-management',
  '設備管理': 'equipment-management',
  '設備計画': 'equipment-planning',
  '設備保全': 'equipment-maintenance',
  '専門職制度': 'professional-system',
  '損益分岐点分析': 'break-even-analysis',
  '中谷公巳-アジャイル型プロジェクトマネジメント': 'agile-project-management',
  '特性要因図': 'cause-and-effect-diagram',
  '日程計画': 'schedule-planning',
  '発想法': 'idea-generation-methods',
  '品質': 'quality',
  '品質改善活動': 'quality-improvement',
  '品質管理': 'quality-management',
  '品質管理（広義）': 'quality-management-broad',
  '品質管理の統計的手法': 'statistical-quality-control',
  '品質機能展開': 'quality-function-deployment',
  '品質保証': 'quality-assurance',
  '負荷計画': 'load-planning',
};

const dryRun = process.argv.includes('--dry-run');

console.log(`\n📂 技術士総合技術監理部門 コンテンツを統合中`);
console.log(`ターゲット: ${cemTargetDir}`);
console.log(`Dry run: ${dryRun ? 'YES' : 'NO'}\n`);

const results = { moved: 0, skipped: 0, errors: 0 };

// README 削除
const readmeDir = path.join(postsDir, 'README');
if (fs.existsSync(readmeDir)) {
  if (dryRun) {
    console.log(`✅ [DRY-RUN] README を削除`);
  } else {
    fs.rmSync(readmeDir, { recursive: true, force: true });
    console.log(`✅ README を削除`);
  }
}

// 日本語ディレクトリを pe-comprehensive-management に移動
for (const [japaneseDir, englishSlug] of Object.entries(japaneseToEnglishMap)) {
  const srcDir = path.join(postsDir, japaneseDir);

  if (!fs.existsSync(srcDir)) {
    console.log(`⏭️  スキップ: "${japaneseDir}" （存在しない）`);
    results.skipped++;
    continue;
  }

  const destDir = path.join(cemTargetDir, englishSlug);

  try {
    if (dryRun) {
      console.log(`✅ [DRY-RUN] "${japaneseDir}" → "${englishSlug}"`);
    } else {
      // Create parent directory if it doesn't exist
      fs.mkdirSync(cemTargetDir, { recursive: true });

      // Move directory
      fs.renameSync(srcDir, destDir);
      console.log(`✅ "${japaneseDir}" → "${englishSlug}"`);
    }
    results.moved++;
  } catch (err) {
    console.error(`❌ エラー: "${japaneseDir}" の移動に失敗: ${err.message}`);
    results.errors++;
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log(`移動: ${results.moved}`);
console.log(`スキップ: ${results.skipped}`);
console.log(`エラー: ${results.errors}`);
console.log('='.repeat(60) + '\n');

if (dryRun) {
  console.log('✨ DRY RUN 完了。ファイルは移動されていません。');
  console.log('   実行するには --dry-run なしで実行してください。\n');
} else {
  console.log('✨ 統合完了！');
  const remaining = fs.readdirSync(postsDir).filter(f => {
    const stat = fs.statSync(path.join(postsDir, f));
    return stat.isDirectory() && f !== 'civil-construction-1' && f !== 'pe' && f !== 'pe-comprehensive-management';
  });
  if (remaining.length > 0) {
    console.log(`⚠️  未処理のディレクトリ: ${remaining.join(', ')}\n`);
  } else {
    console.log(`ディレクトリ構成:\n`);
    const topDirs = fs.readdirSync(postsDir).filter(f => fs.statSync(path.join(postsDir, f)).isDirectory());
    topDirs.forEach(dir => {
      const count = fs.readdirSync(path.join(postsDir, dir)).filter(f => f.endsWith('.mdx')).length;
      console.log(`  - ${dir}/ (${count} ファイル)`);
    });
    console.log();
  }
}
