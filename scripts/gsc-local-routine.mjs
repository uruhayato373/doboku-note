#!/usr/bin/env node
// 転送だけ。本体は scripts/search/gsc-local-routine.mjs（2026-11-20 に scripts/ 直下を領域・用途のフォルダへ分けた）。
// Mac の launchd（scripts/scheduled/gsc-indexing-daily.sh）は元の checkout の古い版のまま、origin/develop の worktree で旧パスを呼ぶ。
// 元の checkout が新しい版になったら、このファイルを消す。
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('./search/gsc-local-routine.mjs', import.meta.url));
const r = spawnSync(process.execPath, [target, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
