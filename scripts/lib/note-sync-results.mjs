/** Results emitted by note-update-body; daily quota is a bounded deferral, never a successful update. */
export function parseNoteSyncRun(text) {
  const result = {};
  let cur = null;
  for (const line of text.split('\n')) {
    const m = line.match(/^\[(article|skip)\] (n[0-9a-f]+)/);
    if (m) { cur = m[2]; result[cur] = m[1] === 'skip' ? `skip: ${line.slice(0, 160)}` : null; continue; }
    const deferred = line.match(/^\[DEFER\] (n[0-9a-f]+) attachment-daily-limit/);
    if (deferred) { result[deferred[1]] = 'attachment-daily-limit'; continue; }
    if (!cur || result[cur]?.startsWith?.('skip')) continue;
    if (/^\[OK\]/.test(line)) result[cur] = 'ok';
    else if (/^\[(FAIL|ABORT|ERROR)\]|ABORT:/.test(line) && result[cur] !== 'ok') result[cur] ||= line.slice(0, 160);
  }
  return result;
}

/**
 * 空きメモリの関所（scripts/lib/playwright-launch.mjs の LaunchGuardError・code LOW_MEMORY）がブラウザの起動を見送った印。
 * 子プロセスは記事の行を 1 行も出さずに終わるので、印が無いと全記事が「結果なし」の失敗に見えた（DN-0954）。
 */
export function lowMemoryReason(text) {
  if (!/LaunchGuardError|LOW_MEMORY/.test(text)) return null;
  const m = text.match(/空きメモリ (\d+)MB < 閾値 (\d+)MB/);
  return `low-memory: 空きメモリ不足でブラウザを起動しなかった${m ? `（${m[1]}MB < 閾値 ${m[2]}MB）` : ''}`;
}

export function classifyNoteSyncRun(items, text) {
  const results = parseNoteSyncRun(text);
  const lowMemory = lowMemoryReason(text);
  const updated = [], failed = [], deferred = [];
  const limitIndex = items.findIndex((item) => results[item.noteId] === 'attachment-daily-limit');
  for (const [index, item] of items.entries()) {
    const result = results[item.noteId];
    const entry = { path: item.path, parts: item.parts };
    if (result === 'ok') updated.push(entry);
    else if (limitIndex >= 0 && index >= limitIndex && (!result || result === 'attachment-daily-limit')) {
      deferred.push({ ...entry, reason: 'attachment-daily-limit' });
    } else if (lowMemory && !result) deferred.push({ ...entry, reason: lowMemory }); // 起動していないので失敗に数えず次回へ
    else failed.push({ ...entry, reason: result || '結果なし（連続失敗で中断された可能性）' });
  }
  return { updated, failed, deferred, attempted: Object.keys(results).length, dailyLimit: limitIndex >= 0, lowMemory: Boolean(lowMemory) };
}
