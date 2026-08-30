#!/usr/bin/env node
/**
 * check-brain-wiring.mjs — Brain 商品の SoT 整合を機械検知する（pre-commit / 手動）
 * ---------------------------------------------------------------------------
 * 判定ロジックは scripts/lib/brain-inventory.mjs（pure module）が唯一の実装で、
 * admin の `/content/brain`（tools/admin-app/src/lib/brain.ts 経由）と共有する
 * （DN-0103 Phase 04・判定を2箇所に複製しない）。本スクリプトは CLI の
 * exit code・出力整形だけを担当する。
 *
 * 検査内容:
 *   1. submitted/listed は articleId・productUrl 必須（https://brain-market.com/a/{articleId} 形式一致）
 *   2. catalog↔listings が全商品で一致（listings だけに在る孤児エントリも検出）
 *   3. imagePath が実在（content/brain/assets 配下）
 *   4. distFile が content/brain/dist に実在
 *   5. 本文の配布URL basename が distFile と一致し、paidMarker より後（無料流出防止）
 *   6. 本文に ¥価格の直書きが無い（価格の真実源はカタログ＝Brain 販売設定）
 *   7. priceYen が Brain の制約（100〜100,000）内
 *   8. 旧配置（.claude/config/brain-listings.json・.claude/config/brain/{assets,dist}）が
 *      存在したら FAIL（DN-0103 Phase 03 で content/brain へ移行済み・二重 SSOT を許さない）
 *
 * 使い方: node scripts/check-brain-wiring.mjs [--staged]
 *   --staged: git staged に brain 系ファイルが無ければ即 exit 0（pre-commit 用）
 */
import { execFileSync } from 'node:child_process';
import { loadBrainInventory, validateBrainInventory } from './lib/brain-inventory.mjs';

const staged = process.argv.includes('--staged');
if (staged) {
  let names = '';
  try { names = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only'], { encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 }); } catch { /* noop */ }
  const hit = names.split('\n').some((p) =>
    /src\/lib\/brain-products\.ts|content\/brain\/|\.claude\/config\/brain-listings\.json|\.claude\/config\/brain\//.test(p.replace(/\\/g, '/')));
  if (!hit) process.exit(0);
}

const inventory = loadBrainInventory();
const result = validateBrainInventory(inventory);

if (!result.ok) {
  console.error(`[check-brain-wiring] ✗ ${result.violations.length} 件:`);
  for (const v of result.violations) console.error(`  - ${v}`);
  process.exit(1);
}

const counts = inventory.items.reduce((a, p) => { a[p.status] = (a[p.status] || 0) + 1; return a; }, {});
console.log(`[check-brain-wiring] ✓ 商品 ${inventory.items.length} 件（${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' / ')}）は SoT 整合`);
