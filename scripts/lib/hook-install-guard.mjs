// 共有 pre-commit フック（.git/hooks/pre-commit・全 worktree 共有）を上書きしてよいかの判定（DN-0506）。
//
// 2026-10-02: 古い develop の作業ツリーのセッションと最新 develop の worktree のセッションが、互いに
// 「導入済みフックが古い」と言われて pre-commit:install を繰り返し、フックが新旧を往復した。古い
// ツリーから入れ直すと、他セッションが足した新しいゲートが共有フックから消える。
// ここでは「導入済み＝origin/develop の版」かつ「自分の版＝develop の過去の版」のときだけ上書きを
// 拒む。自分の版が develop に無い（＝新しいゲートを足している途中）なら従来どおり入れる。
import { createHash } from 'node:crypto';

/** install-pre-commit.mjs のソーステキストから、フック本体（HOOK_CONTENT_BODY）のハッシュを取る。 */
export function hookBodyHash(src) {
  const m = String(src ?? '').match(/const HOOK_CONTENT_BODY = `([\s\S]*?)`;/);
  return m ? createHash('sha256').update(m[1]).digest('hex').slice(0, 12) : null;
}

/** 導入済みフックのテキストから、埋め込まれたハッシュ（HOOK_HASH_INSTALLED）を読む。 */
export function installedHookHash(hookText) {
  return String(hookText ?? '').match(/^HOOK_HASH_INSTALLED="([0-9a-f]{12})"/m)?.[1] ?? null;
}

/**
 * @param {object} p
 * @param {string|null} p.installedHash  導入済みフックのハッシュ（未導入・読めないなら null）
 * @param {string|null} p.sourceHash     このツリーの install-pre-commit.mjs のハッシュ
 * @param {string|null} p.developHash    origin/develop の install-pre-commit.mjs のハッシュ（取れなければ null）
 * @param {string[]}    p.developHistory origin/develop の過去の版のハッシュ（新しい順・現行を含んでよい）
 * @returns {'install'|'refuse-stale'}
 */
export function decideHookInstall({ installedHash, sourceHash, developHash, developHistory = [] }) {
  if (!installedHash || !sourceHash || !developHash) return 'install';
  if (installedHash === sourceHash) return 'install';
  const sourceIsOldDevelop = sourceHash !== developHash && developHistory.includes(sourceHash);
  if (installedHash === developHash && sourceIsOldDevelop) return 'refuse-stale';
  return 'install';
}
