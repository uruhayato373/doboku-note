#!/usr/bin/env node
/**
 * SessionStart: Mac の launchd gsc-local が Google の未ログインで止まっていたら、再ログインを促す 1 行を出す。
 *
 * gsc-local はログインしたブラウザのプロファイルで GSC の登録リクエストと UI CSV を取る（DN-0293）。ログインが
 * 切れると macOS 通知を出すが、10:30 に Mac が寝ていたり通知を見逃したりすると気づけない。gsc-local が
 * develop へ push する requests-latest.json の status を毎セッション読み、not-signed-in なら知らせる。
 * 読めないときは何も出さない（gsc-local を入れていない端末で毎回ノイズにしない）。
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createOutput, runAsCli } from './lib/cli-run.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LATEST = join(ROOT, '.claude/state/metrics/gsc-indexing/requests-latest.json');

/** requests-latest.json の中身から表示行を決める（出さないときは null） */
export function gscLoginLine(latest) {
  if (!latest || latest.status !== 'not-signed-in') return null;
  const when = String(latest.collectedAt || '').replace('T', ' ').slice(0, 16);
  return `[gsc-login] ⚠ Google が未ログイン（gsc-local ${when}Z）。登録リクエストと GSC の CSV 取得が止まっている → npm run google-console:login`;
}

/** session-start.mjs は import して run({ quiet: true }) を呼ぶ（子の node を立てない） */
export async function run({ quiet = false } = {}) {
  const out = createOutput({ quiet });
  let latest = null;
  try { latest = JSON.parse(readFileSync(LATEST, 'utf8')); } catch { /* 無い端末では出さない */ }
  const line = gscLoginLine(latest);
  if (line) out.log(line);
  return out.result(0);
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) runAsCli(run);
