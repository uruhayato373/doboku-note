/**
 * asset-locate.mjs — 「その実体を手元に用意する」を、どの tier が持っているかを気にせず呼ぶ入口。
 *
 * R2 系（asset-storage.mjs の ensureLocal）と Drive 系（drive-vault.mjs の ensureLocalFromVault）
 * は台帳も置き場も別だが、外部へ書き込むスクリプト（note へ添付・IG へ投稿）が欲しいのは
 * 「今ここに実体があるか」だけ。tier を意識させると、group を移すたびに呼び出し側を直すことになる。
 *
 * 返り値は boolean。**false なら呼び出し側は必ず止める**（実体無しで外部へ書かない）。
 */
import { ensureLocal } from './asset-storage.mjs';
import { ensureLocalFromVault } from './drive-vault.mjs';

export function ensureLocalAny(absPath) {
  if (ensureLocal(absPath)) return true;
  return ensureLocalFromVault(absPath);
}
