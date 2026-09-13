/** @typedef {{box: number[] | null, note: string}} FrameVariant */
/** @typedef {{source: {width: number, height: number, sha256: string}, reviewedAt: string, variants: Record<string, FrameVariant>}} Framing */
export const FRAME_LABELS = { full: '全身', waist: '腰上', bust: '胸上（手・小物を含む）' };
/** Validate normalized, pose-specific crops even on PCs without the source images. */
export function validateFraming(framing) {
  if (!framing) return;
  const s = framing.source;
  if (!/^[a-f0-9]{64}$/.test(s?.sha256 ?? '') ||
      ![s?.width, s?.height].every(n => Number.isInteger(n) && n > 0) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(framing.reviewedAt ?? '')) {
    throw new Error('切り取り原本・確認日の記録が不正です');
  }
  for (const kind of Object.keys(FRAME_LABELS)) {
    const v = framing.variants?.[kind];
    if (!v?.note) throw new Error(`切り取りの説明が不正です: ${kind}`);
    if (v.box === null && kind !== 'full') continue;
    if (!Array.isArray(v.box) || v.box.length !== 4 || !v.box.every(Number.isFinite)) {
      throw new Error(`切り取り座標が不正です: ${kind}`);
    }
    const [x, y, w, h] = v.box;
    if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1 || y + h > 1 ||
        (kind === 'full' && v.box.join(',') !== '0,0,1,1')) {
      throw new Error(`切り取り範囲が不正です: ${kind}`);
    }
  }
}

export function frameGeometry(source, box, width = 0) {
  if (!Number.isInteger(width) || width < 0 || width > 4096) throw new Error('幅は0（原寸）〜4096の整数です');
  const left = Math.floor(box[0] * source.width);
  const top = Math.floor(box[1] * source.height);
  const rect = { left, top,
    width: Math.max(1, Math.ceil((box[0] + box[2]) * source.width) - left),
    height: Math.max(1, Math.ceil((box[1] + box[3]) * source.height) - top) };
  const outputWidth = width ? Math.min(width, rect.width) : rect.width;
  return { rect, width: outputWidth, height: Math.max(1, Math.round(rect.height * outputWidth / rect.width)),
    limited: width > rect.width };
}
