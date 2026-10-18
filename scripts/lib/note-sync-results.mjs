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

export function classifyNoteSyncRun(items, text) {
  const results = parseNoteSyncRun(text);
  const updated = [], failed = [], deferred = [];
  const limitIndex = items.findIndex((item) => results[item.noteId] === 'attachment-daily-limit');
  for (const [index, item] of items.entries()) {
    const result = results[item.noteId];
    const entry = { path: item.path, parts: item.parts };
    if (result === 'ok') updated.push(entry);
    else if (limitIndex >= 0 && index >= limitIndex && (!result || result === 'attachment-daily-limit')) {
      deferred.push({ ...entry, reason: 'attachment-daily-limit' });
    } else failed.push({ ...entry, reason: result || '結果なし（連続失敗で中断された可能性）' });
  }
  return { updated, failed, deferred, attempted: Object.keys(results).length, dailyLimit: limitIndex >= 0 };
}
