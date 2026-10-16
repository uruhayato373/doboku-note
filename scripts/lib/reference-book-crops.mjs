/**
 * 本の頁から図をまとめて切り出す判定（batch）の検査と、book-manifest への反映（DN-0754・2026-10-16）。
 *
 * batch は 1 冊ぶん: { sourceId, pages: [{ page: "p0031", notNeeded: true, reason }, { page, crops: [{ figureId, caption, bbox: { x, y, w, h }, audit: [4 軸] }] }] }
 * 図の無い頁は cropStatus を not-needed に、切り出した頁は complete にする。切り出しの画像そのものは呼び出し側が作る。
 */

const FIGURE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PAGE_ID = /^p[0-9]{4}$/;

/** 切り出しのファイル名（pNNNN_図の id.png） */
export function cropFileName(page, figureId) {
  return `${page}_${figureId}.png`;
}

/** batch を book-manifest に照らして検査する。違反の一覧（空なら通る） */
export function validateCropBatch(batch, manifest, { requireAudit = true } = {}) {
  const errors = [];
  if (!batch || typeof batch !== 'object') return ['batch がオブジェクトでない'];
  if (batch.sourceId !== manifest?.sourceId) errors.push(`sourceId が book-manifest（${manifest?.sourceId}）と違う: ${batch.sourceId}`);
  if (!Array.isArray(batch.pages) || batch.pages.length === 0) return [...errors, 'pages が空'];
  const pages = new Map((manifest.pages || []).map((p) => [p.id, p]));
  const seenPage = new Set();
  const seenFile = new Set();
  for (const entry of batch.pages) {
    const where = entry?.page ?? '(page なし)';
    if (!PAGE_ID.test(entry?.page || '')) { errors.push(`${where}: page は pNNNN`); continue; }
    if (seenPage.has(entry.page)) errors.push(`${where}: 同じ頁が2回ある`);
    seenPage.add(entry.page);
    const page = pages.get(entry.page);
    if (!page) { errors.push(`${where}: book-manifest に無い頁`); continue; }
    const crops = entry.crops ?? [];
    if (entry.notNeeded && crops.length) errors.push(`${where}: notNeeded と crops を同時に書かない`);
    if (!entry.notNeeded && crops.length === 0) errors.push(`${where}: notNeeded か crops のどちらかが要る`);
    if (entry.notNeeded && !(typeof entry.reason === 'string' && entry.reason.trim())) errors.push(`${where}: notNeeded には reason（図が無い理由）を書く`);
    for (const c of crops) {
      const id = `${where}/${c?.figureId ?? '?'}`;
      if (!FIGURE_ID.test(c?.figureId || '')) errors.push(`${id}: figureId は英小文字・数字・ハイフン`);
      if (!(typeof c?.caption === 'string' && c.caption.trim())) errors.push(`${id}: caption が無い`);
      const b = c?.bbox ?? {};
      const nums = [b.x, b.y, b.w, b.h];
      if (!nums.every((n) => Number.isInteger(n) && n >= 0) || b.w === 0 || b.h === 0) errors.push(`${id}: bbox は x,y,w,h の非負整数（w,h > 0）`);
      else if (b.x + b.w > page.width || b.y + b.h > page.height) errors.push(`${id}: bbox が頁 ${page.width}x${page.height} を越える`);
      const a = c?.audit ?? [];
      if (requireAudit && !(Array.isArray(a) && a.length === 4 && a.every((s) => Number.isInteger(s) && s >= 2 && s <= 3))) errors.push(`${id}: audit は合格した4軸の整数（各2..3）`);
      const file = cropFileName(entry.page, c?.figureId);
      if (seenFile.has(file)) errors.push(`${id}: 同じファイル名の切り出しが2つある`);
      seenFile.add(file);
    }
  }
  return errors;
}

/**
 * 検査済みの batch を book-manifest に反映した新しい manifest を返す（元は変えない）。
 * results は Map(ファイル名 → { repoPath, sha256, md5, bytes, width, height })。
 */
export function applyCropBatch(manifest, batch, { results, bookRoot, timestamp }) {
  const next = JSON.parse(JSON.stringify(manifest));
  const pages = new Map(next.pages.map((p) => [p.id, p]));
  const byPath = new Map((next.crops || []).map((c) => [c.repoPath, c]));
  for (const entry of batch.pages) {
    const page = pages.get(entry.page);
    if (entry.notNeeded) { page.cropStatus = 'not-needed'; continue; }
    for (const c of entry.crops) {
      const file = cropFileName(entry.page, c.figureId);
      const r = results.get(file);
      if (!r) throw new Error(`${file}: 切り出しの結果が無い`);
      const repoPath = `${bookRoot}/crops/${file}`;
      byPath.set(repoPath, {
        id: c.figureId,
        pageId: entry.page,
        sourceImage: page.image,
        path: `crops/${file}`,
        repoPath,
        caption: c.caption,
        bbox: { x: c.bbox.x, y: c.bbox.y, w: c.bbox.w, h: c.bbox.h },
        sha256: r.sha256,
        md5: r.md5,
        bytes: r.bytes,
        width: r.width,
        height: r.height,
        audit: {
          status: 'pass',
          scores: { clipPurity: c.audit[0], completeness: c.audit[1], correctFigure: c.audit[2], altIdentifiability: c.audit[3] },
          reviewedAt: timestamp,
        },
      });
    }
    page.cropStatus = 'complete';
  }
  next.crops = [...byPath.values()];
  next.updatedAt = timestamp;
  return next;
}
