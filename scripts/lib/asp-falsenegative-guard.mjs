/**
 * asp-falsenegative-guard.mjs — 「取得は成功したが 0 件」でカタログを塗り潰さない
 * ---------------------------------------------------------------------------
 * asp-site-guard が守るのは**帰属**（他サイトのデータを自分のものと誤認しない）。
 * こちらが守るのは**実在**（見えていないだけの状態を「解除された」と書き込まない）。
 *
 * なぜ要るか（2026-08-13 実測）:
 *   affiliate-status の実行ログに次が残っていた——
 *     a8/partnered: 0 件（SID a25050375786）
 *     moshimo/partnered: 0 件（SID 672381）
 *   SID は取れているので**取得は成功**扱いになり `failed` に入らない。つまり
 *   「実機に提携が 1 件も無い」と解釈され、`--write` を付けていればカタログの
 *   approved 9 件が none で塗り潰されていた。セッション切れの典型的な出方で、
 *   memory にも「実機セッション切れで false none → --write で壊すな」とある。
 *
 *   実機が本当に 0 件なのか、ログインが切れて見えていないだけなのかは
 *   **区別できない**。区別できない以上、破壊的な側（全消し）を選ばない。
 *
 * 判定:
 *   ある ASP について、カタログ上 approved の案件が 1 件以上あり、
 *   その**全部**が none へ落ちるドリフトなら偽陰性とみなして書き込みを止める。
 *   一部だけ解除されたケース（実際に起こりうる）は通す。
 *
 * 設計方針は asp-site-guard に合わせる:
 *   - 判定は純関数（`detectFalseNegative`）でテスト可能にする
 *   - 迂回フラグは作らない（作れば必ず使われる）
 * ---------------------------------------------------------------------------
 */

/**
 * @param {object} args
 * @param {string[]} args.aspNames        照合できた ASP 名（取得失敗したものは含めない）
 * @param {Array<{asp:string,catalog:string,actual:string}>} args.drift  検出したドリフト
 * @param {Record<string, number>} args.knownApprovedByAsp  ASP ごとのカタログ上 approved 件数
 * @param {Record<string, number>} args.partneredSeenByAsp  ASP ごとに実機で拾えた partnered 件数
 * @returns {Array<{asp:string, knownApproved:number, lostApproved:number, partneredSeen:number, reason:string}>}
 */
export function detectFalseNegative({ aspNames, drift, knownApprovedByAsp, partneredSeenByAsp }) {
  const blocked = [];
  for (const asp of aspNames) {
    const knownApproved = knownApprovedByAsp[asp] ?? 0;
    if (knownApproved === 0) continue; // 元から approved が無ければ判定しない
    const lostApproved = drift.filter(
      (d) => d.asp === asp && d.catalog === 'approved' && d.actual === 'none',
    ).length;
    if (lostApproved !== knownApproved) continue; // 一部解除は通す（実際に起こりうる）
    blocked.push({
      asp,
      knownApproved,
      lostApproved,
      partneredSeen: partneredSeenByAsp[asp] ?? 0,
      reason:
        `既知の提携済み ${knownApproved} 件が全て none へ落ちた` +
        `（実機の partnered 検出=${partneredSeenByAsp[asp] ?? 0} 件）。` +
        `セッション切れの偽陰性の可能性が高い`,
    });
  }
  return blocked;
}
