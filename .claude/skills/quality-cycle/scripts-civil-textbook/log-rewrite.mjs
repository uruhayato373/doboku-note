#!/usr/bin/env node
//
// scripts/log-rewrite.mjs
//
// civil-textbook-rewriter サブエージェントが返す結果 JSON を
// .claude/state/civil-quality-cycle-state.json の history 配列に記録する。
//
// 使い方:
//   node scripts/log-rewrite.mjs <results.json>
//
// results.json の形式（JSON 配列、各要素に wave ラベルを含める）:
//   [
//     {
//       "slug": "textbook-crane",
//       "wave": "W1",
//       "applied_patterns": ["G","I"],
//       "added_sections": [],
//       "converted_tables": 2,
//       "migrated_images": 5,
//       "before_chars": 1720,
//       "after_chars": 2451,
//       "added_chars": 731,
//       "lint_high_before": 0,
//       "lint_high_after": 0,
//       "lint_medium_before": 15,
//       "lint_medium_after": 3,
//       "mojibake": false
//     }
//   ]
//
// 動作:
//   - 各 result について、page.history の中で wave が一致し action='rewritten' の
//     エントリを探す。見つかれば extras を in-place でマージ（date は温存）。
//   - 見つからなければ現在時刻で新規エントリを append。
//   - page.status は 'rewritten' に更新。

import { runLogRewrite } from '../scripts-common/log-rewrite-core.mjs';
import { readState, writeState } from './lib/civil-state.mjs';

// 土木は wave が無ければ次の周回（W<cycle+1>）として記録する
runLogRewrite({ readState, writeState, defaultWave: (state) => `W${(state.cycle || 0) + 1}` });
