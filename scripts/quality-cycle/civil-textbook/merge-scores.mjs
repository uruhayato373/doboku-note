#!/usr/bin/env node
//
// scripts/quality-cycle/civil-textbook/merge-scores.mjs
//
// article-proofreader サブエージェントが返す評価結果 JSON を
// .claude/state/civil-quality-scores.json にマージする。
//
// 使い方:
//   node scripts/quality-cycle/civil-textbook/merge-scores.mjs <results.json>
//
// results.json の形式（JSON 配列 or 1オブジェクト）:
//   [
//     {
//       "slug": "textbook-crane",
//       "group": "textbook",
//       "scores": {"structure":3,"principle":3,"mobile":1,"figures":1,"reference":2},
//       "weak_axes": ["mobile","figures"],
//       "qualitative_comment": "..."
//     },
//     ...
//   ]
//
// 動作:
//   - 各 result について weighted を article-proofreader の重みで再計算
//   - civil-quality-scores.json の pages[slug] に上書き
//   - group も一緒に保存

import { runMergeScores } from '../common/merge-scores-core.mjs';
import { readScores, writeScores, computeWeighted } from './lib/civil-state.mjs';

runMergeScores({ readScores, writeScores, computeWeighted, withGroup: true });
