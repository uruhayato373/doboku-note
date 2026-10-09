/**
 * registry-reconcile.mjs — コンテンツ台帳の公開の行と、外から観測した公開状態を突き合わせる判定（content-registry.md「照合」）。
 * 観測の取得（YouTube Data API の videos.list など）と台帳への書き込みは scripts/registry-reconcile.mjs が持ち、ここは判定だけ（依存ゼロ）。
 *
 * - 前進は証拠があるときだけ: 予約（scheduled）の動画が公開（public）になっていれば published へ進める。
 * - 後戻り・消えた・期日を過ぎても公開にならないものは所見（findings）として出すだけで、状態は人が決める。
 */

/** 観測の結果で台帳の状態を変えない（所見だけ出す）状態 */
const LIVE = new Set(['published', 'refresh_due']);

/**
 * @param {object[]} pubs 台帳の YouTube の公開の行（platform.id のあるもの）
 * @param {Map<string, { privacy: string, publishedAt?: string|null }>} observed videoId → 観測（videos.list で取れなかった id は入れない）
 * @param {{ now: Date, graceDays: number, evidenceRef: string }} opts
 * @returns {{ advance: { id: string, platform: object }[], findings: { id: string, severity: 'fail'|'warn', code: string, message: string }[], checked: number }}
 */
export function reconcileYoutube(pubs, observed, { now, graceDays, evidenceRef }) {
  const advance = [];
  const findings = [];
  let checked = 0;
  for (const p of pubs) {
    const videoId = p.platform?.id;
    if (!videoId) continue;
    checked += 1;
    const seen = observed.get(videoId);
    const due = p.publishAt && Date.parse(p.publishAt) + graceDays * 86_400_000 < now.getTime();
    if (!seen) {
      findings.push({ id: p.id, severity: LIVE.has(p.status) || p.status === 'scheduled' ? 'fail' : 'warn', code: 'gone', message: `videoId ${videoId} が videos.list で取れない（削除・BAN・別チャンネル）` });
      continue;
    }
    if (p.status === 'scheduled' && seen.privacy === 'public') {
      advance.push({
        id: p.id,
        platform: {
          ...p.platform, privacy: 'public',
          ...(seen.publishedAt ? { publishedAt: new Date(seen.publishedAt).toISOString() } : {}),
          evidence: { kind: 'youtube-api', ref: evidenceRef },
        },
      });
      continue;
    }
    if (LIVE.has(p.status) && seen.privacy !== 'public') {
      findings.push({ id: p.id, severity: 'fail', code: 'not-public', message: `台帳は ${p.status} だが YouTube は ${seen.privacy}` });
      continue;
    }
    if (p.status === 'scheduled' && due) {
      findings.push({ id: p.id, severity: 'warn', code: 'overdue', message: `publishAt（${p.publishAt}）から ${graceDays} 日を過ぎても ${seen.privacy}` });
      continue;
    }
    if (!LIVE.has(p.status) && p.status !== 'scheduled' && seen.privacy === 'public') {
      findings.push({ id: p.id, severity: 'warn', code: 'public-before-scheduled', message: `台帳は ${p.status} だが YouTube は public（予約を経ていない。状態は人が決める）` });
    }
  }
  return { advance, findings, checked };
}
