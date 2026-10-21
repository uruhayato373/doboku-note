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
 * @returns {{ status: number, attempts: number, out: string, reason: string }} reason は最後の失敗の末尾 1 行（成功なら ''）
 */
export function runWithRetry(run, { attempts = 2 } = {}) {
  let r = { status: 1, out: '' };
  let i = 0;
  while (i < attempts) {
    i += 1;
    r = run();
    if (r.status === 0) return { status: 0, attempts: i, out: r.out, reason: '' };
  }
  return { status: r.status, attempts: i, out: r.out, reason: lastLines(r.out, 1)[0] || `exit ${r.status}` };
}
