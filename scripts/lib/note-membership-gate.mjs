/**
 * プランを消してよいかの会員ゲート（note-membership-plan-status.mjs の --delete・純関数）。
 *
 * プラン名を読めないときは在籍者の有無が分からない。在籍ありとも無しとも言わず検査不成立にする。
 * 2026-11-04 に管理画面全体の文字列をプラン名として扱い、「メンバーシッ」で照合して在籍ありと誤判定した。
 */

const MAX_PLAN_NAME = 60;
const PAGE_CHROME = /^メンバーシップ(\s|$)/;

/** 管理画面の行の文字列からプラン名を取り出す。行を特定できていなければ空文字。 */
export function planNameFromRow(rowText) {
  const name = (String(rowText || '').match(/^(.+?)\s*[¥￥]/) || [])[1]?.trim() || '';
  return isPlanName(name) ? name : '';
}

export function isPlanName(name) {
  return Boolean(name) && name.length <= MAX_PLAN_NAME && !PAGE_CHROME.test(name);
}

/**
 * @param {{ planName: string, membersText: string }} p
 * @returns {{ status: 'inconclusive'|'members'|'clear', key: string }}
 */
export function memberGate({ planName, membersText }) {
  if (!isPlanName(planName) || !membersText) return { status: 'inconclusive', key: '' };
  // note のメンバー一覧はプラン名を省略表示することがあるので、先頭 6 文字で照合する
  const key = planName.slice(0, 6);
  return { status: membersText.includes(key) ? 'members' : 'clear', key };
}
