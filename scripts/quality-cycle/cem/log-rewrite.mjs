#!/usr/bin/env node
//
// scripts/quality-cycle/cem/log-rewrite.mjs
//
// keyword-rewriter サブエージェントが返す結果 JSON を
// .claude/state/quality-cycle-state.json の history 配列に記録する。
//
// 使い方:
//   node scripts/quality-cycle/cem/log-rewrite.mjs <results.json>
//
// results.json の形式（JSON 配列、各要素に wave ラベルを含める）:
//   [
//     {
//       "slug": "heat-island-effect",
//       "wave": "G-5-W1",
//       "applied_patterns": ["G","D"],
//       "added_sections": ["## 参考資料"],
//       "converted_tables": 0,
//       "before_chars": 1720,
//       "after_chars": 2451,
//       "added_chars": 731,
//       "lint_high_before": 0,
//       "lint_high_after": 0,
//       "lint_medium_before": 4,
//       "lint_medium_after": 0,
//       "mojibake": false
//     },
//     ...
//   ]
//
// 動作:
//   - 各 result について、page.history の中で wave が一致し action='rewritten' の
//     エントリを探す。見つかれば extras を in-place でマージ（date は温存）。
//   - 見つからなければ現在時刻で新規エントリを append。
//   - page.status は 'rewritten' に更新。

import { runLogRewrite } from '../common/log-rewrite-core.mjs';
import { readState, writeState } from './lib/quality-state.mjs';

// 総監は wave の無い結果を飛ばし、migrated_images を持たない
runLogRewrite({ readState, writeState, omit: ['migrated_images'] });
