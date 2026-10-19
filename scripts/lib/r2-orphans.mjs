/**
 * 公開バケットのキーを「残す理由があるか」で分ける（check-r2-orphans の判定・副作用なし）。
 *
 * 残す理由（どれか 1 つ）:
 *   - manifest（台帳）の public エントリの r2Key
 *   - 台帳にある OGP（ogp.png）から作る縮小画像（ogp-thumb-{幅}.webp）
 *   - posts/<rel> で content/site/<rel> が git 管理下にある画像（r2-sync が送るもの）
 * MDX は残す理由にならない（サイトは R2 の MDX を読まない。2026-10-20 に 735 件を削除）。
 * 削除リストに載っていて未削除のキーは「削除待ち」として孤児と分ける。
 * 孤児のうち、ファイル名（拡張子まで一致）が今のリポジトリで参照されているものは「参照あり」に分ける
 * （消すと表示が切れるので、リポジトリへ戻すまで削除候補にしない）。
 */
export const OGP_THUMB_WIDTHS = [248, 336, 640];

export function classifyPublicKeys({ keys, manifestPublicKeys, trackedSitePaths, pendingDeleteKeys, referencedBasenames }) {
  const manifest = new Set(manifestPublicKeys);
  const thumbs = new Set(
    [...manifest].filter((k) => k.endsWith('/ogp.png'))
      .flatMap((k) => OGP_THUMB_WIDTHS.map((w) => k.replace(/ogp\.png$/, `ogp-thumb-${w}.webp`))),
  );
  const tracked = new Set(trackedSitePaths);
  const pending = new Set(pendingDeleteKeys);
  const referenced = new Set(referencedBasenames);
  const out = { kept: 0, pending: [], orphans: [], referencedOrphans: [] };
  for (const key of keys) {
    const rel = key.startsWith('posts/') ? key.slice('posts/'.length) : null;
    const keep = manifest.has(key) || thumbs.has(key)
      || (rel !== null && !key.endsWith('.mdx') && tracked.has(`content/site/${rel}`));
    if (keep) { out.kept++; continue; }
    if (pending.has(key)) { out.pending.push(key); continue; }
    (referenced.has(key.split('/').pop()) ? out.referencedOrphans : out.orphans).push(key);
  }
  return out;
}

/** 削除リスト（1 行 1 キー・# はコメント）から有効なキーを取り出す */
export function parseDeleteList(text) {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}
