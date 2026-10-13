#!/usr/bin/env node
/**
 * check-search-improvements.mjs — 検索キーワード戦略の改善（実験台帳の kind: search-strategy）とバックログのカードが ID で結ばれているか。
 * ---------------------------------------------------------------------------
 * 判定は scripts/lib/search-improvement.mjs の linkErrors（唯一の実装）。committed の台帳・backlog・dispatch-log・設定だけを読み、
 * 壁時計に依存しない（quality-audit の ci:true・pre-commit で backlog / 実験台帳 / 設定 / dispatch-log を触ったとき）。
 *   - EXP の対象（クラスター・ページ・カード）と measure 仕様が揃っている
 *   - 起票中の EXP のカードが backlog か dispatch-log にあり、カードの本文に EXP-ID がある（双方向）
 *   - 起点が「検索キーワード戦略」のカードは EXP に結ばれている（手で起票して計測が漏れるのを止める）
 *   - 同じページに計測の終わっていない EXP が 2 つない・計測中は境目と判定日がある・判定済みは結果がある
 * exit: 0 違反なし / 1 違反あり
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { readDataset, readDatasetIf } from './lib/dataset-io.mjs';
import { parseBacklog } from './lib/backlog-lib.mjs';
import { BACKLOG } from './todo-add.mjs';
import { dispatchIndex, isSearchExperiment, linkErrors } from './lib/search-improvement.mjs';

const TAG = '[check-search-improvements]';
const config = readDataset(ROOT, 'config.search-strategy');
const ledger = readDataset(ROOT, 'business.experiments');
const dispatchById = dispatchIndex((readDatasetIf(ROOT, 'state.dispatch-log') ?? { entries: [] }).entries);
const cards = parseBacklog(readFileSync(join(ROOT, BACKLOG), 'utf8'));

const errors = linkErrors({ experiments: ledger.experiments, cards, dispatchById, clusters: new Set(config.clusters.map((c) => c.id)) });
const exps = ledger.experiments.filter(isSearchExperiment).length;
console.log(`${TAG} 検索改善の実験 ${exps} 件・backlog のカード ${cards.length} 枚を検査 / 違反 ${errors.length} 件`);
for (const e of errors) console.log(`  ✗ ${e}`);
if (errors.length) {
  console.log(`${TAG} 起票は npm run search-improvement -- add、既存カードの結び付けは link（scripts/search-improvement.mjs）`);
  process.exitCode = 1;
} else if (!exps) console.log(`${TAG} 検索改善の実験が 0 件（実験側の結び付けは検査していない。カード側の起点だけ検査した）`);
else console.log(`${TAG} ✓ 実験とカードは ID で結ばれている`);
