#!/usr/bin/env node
// 転送だけ。本体は scripts/checks/check-internal-links-vs-gsc.mjs（2026-11-20 に検査を scripts/checks/ へ分けた）。
// 定期実行のワークフローは定義が main・checkout が develop なので、main へ deploy されるまで旧パスで呼ばれる。
// main のワークフローが新パスになったら、このファイルを消す。
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('./checks/check-internal-links-vs-gsc.mjs', import.meta.url));
const r = spawnSync(process.execPath, [target, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
