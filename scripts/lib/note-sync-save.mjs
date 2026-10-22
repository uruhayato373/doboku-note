// note-sync-routine の「保存」段（asset-offload・drive-vault-sync）を 1 回だけ再試行し、失敗の理由を残す（DN-0763）。
//
// 2026-10-18 の週次で drive-vault-sync が非 0 になったが、子プロセスの出力を捨てていたので理由が分からなかった。
// 同じコマンドを手で流すと exit 0（失敗 0）で通り、Drive の一時的な I/O（10/11 の Unknown system error -11 と同類）とみられる。
// どちらのコマンドも冪等（既存はスキップ）なので、1 回だけ再試行し、それでも落ちたら出力の末尾を problems とログへ残す。

/** 出力の末尾 n 行（空行を除く） */
export function lastLines(out, n = 20) {
  return String(out || '').split(/\r?\n/).filter((l) => l.trim()).slice(-n);
}

/**
 * run() を最大 attempts 回呼ぶ。run は { status, out } を返す。
 * retryOn(r) が false の失敗はやり直さずにそのまま返す（既定はどの失敗でもやり直す）。
 * @returns {{ status: number, attempts: number, out: string, reason: string }} reason は最後の失敗の末尾 1 行（成功なら ''）
 */
export function runWithRetry(run, { attempts = 2, retryOn = () => true } = {}) {
  let r = { status: 1, out: '' };
  let i = 0;
  while (i < attempts) {
    i += 1;
    r = run();
    if (r.status === 0) return { status: 0, attempts: i, out: r.out, reason: '' };
    if (!retryOn(r)) break;
  }
  return { status: r.status, attempts: i, out: r.out, reason: lastLines(r.out, 1)[0] || `exit ${r.status}` };
}

// note-magazine-cover の account ゲート（クリエイター名が設定ページに出ない）は exit 2。
// 2026-10-07 の週次では 8 誌目だけ一時的に 2 になり、直後の再実行では通った。1 回目の 2 でログイン切れと決めて
// 残りの 47 誌を止めていたので、同じ誌を 1 回だけやり直し、2 回続けて 2 のときだけログイン切れとする（DN-0568）。
export const ACCOUNT_GATE_EXIT = 2;

/**
 * account ゲートつきの子プロセスを走らせる。exit 2 のときだけ 1 回やり直す（他の失敗はその誌の失敗としてやり直さない）。
 * @returns {{ status: number, attempts: number, out: string, reason: string, loggedOut: boolean }}
 *   loggedOut は 2 回続けて exit 2 だったとき（呼び出し側は残りを止める）
 */
export function runAccountGated(run) {
  const r = runWithRetry(run, { attempts: 2, retryOn: (x) => x.status === ACCOUNT_GATE_EXIT });
  return { ...r, loggedOut: r.status === ACCOUNT_GATE_EXIT };
}
