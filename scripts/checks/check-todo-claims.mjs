#!/usr/bin/env node
/**
 * todo の claim の残骸を期限で検出する（外部通信なし・DN-1128）。
 *
 * npm run check-todo-claims — .claude/state/todo-claims.json の claim のうち、startedAt から 7 日（CLAIM_MAX_DAYS）を過ぎたものを列挙して exit 1。
 * 並行セッションは claim を見て着手を避けるので、持ち主のいない claim はカードを塞ぐ。
 * 直し方は、作業中でなければ node scripts/ops/todo-release.mjs DN-####、終わっていれば todo-complete.mjs（手で claims.json を消さない）。
 * 壁時計に依存するので quality-audit では週次の ops（ci:false）。読み手は土曜の週次レビュー。
 * exit: 0 残骸なし / 1 残骸あり / 2 検査不成立（claims.json が読めない）。検査した claim の件数を必ず出す。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLAIMS_PATH, CLAIM_MAX_DAYS, readClaimsStore, staleClaims } from '../lib/todo-lifecycle.mjs';
import { REPO_ROOT } from '../lib/repository-paths.mjs';

const file = join(REPO_ROOT, CLAIMS_PATH);
if (!existsSync(file)) {
  console.log(`check-todo-claims: ${CLAIMS_PATH} が無い（claim 0 件）`);
  process.exit(0);
}
const raw = readFileSync(file, 'utf8');
try {
  JSON.parse(raw);
} catch (e) {
  console.error(`check-todo-claims: ${CLAIMS_PATH} が JSON として読めない（検査不成立）: ${e.message}`);
  process.exit(2);
}
const store = readClaimsStore(raw);
const stale = staleClaims(store);
console.log(`check-todo-claims: claim ${store.claims.length} 件を検査 / ${CLAIM_MAX_DAYS} 日超の残骸 ${stale.length} 件`);
for (const s of stale) {
  console.log(`  [残骸] ${s.id}（owner=${s.owner}）${s.ageDays === null ? 'startedAt が読めない' : `${s.ageDays} 日前に着手`} → node scripts/ops/todo-release.mjs ${s.id}`);
}
process.exit(stale.length ? 1 : 0);
