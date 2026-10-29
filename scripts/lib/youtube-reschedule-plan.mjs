/** Validate the one-off publication plan before touching YouTube. */
export function validateReschedulePlan(plan, now = Date.now()) {
  if (plan?.schemaVersion !== 1 || !/^[\w-]{24}$/.test(plan.channelId ?? '')) throw new Error('予約計画の版またはチャンネル ID が不正');
  if (!Array.isArray(plan.moves) || !plan.moves.length || !Array.isArray(plan.newUploads)) throw new Error('予約計画の対象が無い');
  const ids = new Set();
  const slots = new Set();
  const days = new Map();
  for (const row of [...plan.moves, ...plan.newUploads]) {
    if (!/^[a-z0-9-]+\/[a-z0-9-]+\/youtube\.longform(?:\.[a-z0-9-]+)?$/.test(row.publicationId ?? '')) throw new Error(`公開 ID が不正: ${row.publicationId}`);
    if (ids.has(row.publicationId)) throw new Error(`公開 ID が重複: ${row.publicationId}`);
    ids.add(row.publicationId);
    if (!/^2026-\d\d-\d\dT(?:08:30|14:30|20:30):00\+09:00$/.test(row.to ?? '') || Date.parse(row.to) <= now + 30 * 60_000) throw new Error(`公開枠が無効または近すぎる: ${row.publicationId}`);
    if (slots.has(row.to)) throw new Error(`公開枠が重複: ${row.to}`);
    slots.add(row.to);
    const day = row.to.slice(0, 10);
    days.set(day, (days.get(day) ?? 0) + 1);
  }
  for (const row of plan.moves) {
    if (!/^[\w-]{11}$/.test(row.videoId ?? '') || !/^2026-\d\d-\d\dT\d\d:\d\d:\d\d\+09:00$/.test(row.from ?? '') || row.from === row.to) throw new Error(`移動元が不正: ${row.publicationId}`);
  }
  if ([...days.values()].some((count) => count !== 3)) throw new Error(`1日3本になっていない: ${JSON.stringify(Object.fromEntries(days))}`);
  return { moves: plan.moves.length, newUploads: plan.newUploads.length, days: days.size };
}
