#!/usr/bin/env node
// 転送だけ。本体は scripts/ogp-create/ogp-create.mjs（2026-11-19 に事業の実装を scripts/ へ集約）。
// ogp-supply.yml は定義が main・checkout が develop なので、main へ deploy されるまで旧パスで呼ばれる。
// main のワークフローが新パスになったら、このファイルを消す（DN-1249）。
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('../../../../scripts/ogp-create/ogp-create.mjs', import.meta.url));
const r = spawnSync(process.execPath, [target, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
