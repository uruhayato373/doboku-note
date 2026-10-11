/**
 * coconala-revenue.mjs — ココナラ「売上管理・振込申請」（/mypage/revenue）の本文から売上履歴を読む（純関数）。
 * 読み手: scripts/coconala-revenue.mjs・tests/coconala-revenue.test.mjs。
 *
 * 画面の形（2026-10-11 実画面）:
 *   売上実績 → サービス → 今月の売上 / N 円 → 累積売上 / N 円 → （ブログの累積売上）
 *   売上履歴 → 1 件ごとに「YYYY/MM/DD HH:MM」「トークルームNo：N」（おひねりなら「おひねり <サービス名>」）
 *             （振込済みなら「振込済み」）「N 円」。金額は手数料控除後、日時はクローズ（計上）の日時。
 * 購入者名・サービス名は返さない（台帳に残さない）。
 */
const yenOf = (line) => (/^([\d,]+) 円$/.exec(line) ? Number(line.replace(/[^\d]/g, '')) : null);

export function parseCoconalaRevenue(text) {
  const lines = String(text ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
  const perf = lines.indexOf('売上実績');
  const cumIdx = perf >= 0 ? lines.indexOf('累積売上', perf) : -1;
  const cumulativeYen = cumIdx >= 0 ? yenOf(lines[cumIdx + 1] ?? '') : null;
  const start = lines.indexOf('売上履歴');
  const rows = [];
  if (start >= 0) {
    for (let i = start + 1; i < lines.length; i++) {
      const d = /^(\d{4})\/(\d{2})\/(\d{2}) \d{2}:\d{2}$/.exec(lines[i]);
      if (!d) continue;
      let talkroomId = null;
      let kind = 'service';
      let netYen = null;
      for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
        if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/.test(lines[j])) break;
        const room = /トークルームNo：(\d+)/.exec(lines[j]);
        if (room) talkroomId = room[1];
        if (/^おひねり/.test(lines[j])) kind = 'tip';
        const y = yenOf(lines[j]);
        if (y != null) { netYen = y; break; }
      }
      if (talkroomId && netYen != null) rows.push({ closedAt: `${d[1]}-${d[2]}-${d[3]}`, talkroomId, kind, netYen });
    }
  }
  return { cumulativeYen, rows };
}

/** 行の合計が累積売上と一致するか（取りこぼし・ページ送りの見落としを止める）。 */
export function reconcileRevenue({ cumulativeYen, rows }) {
  const sum = rows.reduce((s, r) => s + r.netYen, 0);
  return { ok: Number.isInteger(cumulativeYen) && sum === cumulativeYen, sum, expected: cumulativeYen };
}
