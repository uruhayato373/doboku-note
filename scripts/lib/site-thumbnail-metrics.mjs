/**
 * サイト内サムネイルの機械の検査（画素を測る部分と、測った値の判定）。閾値は config/site-thumbnails.json の spec。
 * 生成（generate-site-thumbnails）が測って AI 台帳の行に metrics として残し、CI のテストは残った値を spec と照らす
 * （画像の実体は Git に無いので、CI は画素を読まない）。設計は docs/operations/画像運用設計.md。
 */
import sharp from 'sharp';

/**
 * 写真の画素を測る。mean は平均輝度（0-255）、bright は輝度が brightLevel 以上の画素の割合、
 * dhash は 9×8 に縮めた差分ハッシュ（16 桁の 16 進）。似た画像の検出に使う。
 */
export async function imageMetrics(buffer, { brightLevel }) {
  const grey = await sharp(buffer).resize(240, 126, { fit: 'fill' }).greyscale().raw().toBuffer();
  let sum = 0;
  let bright = 0;
  for (const v of grey) { sum += v; if (v >= brightLevel) bright += 1; }
  const small = await sharp(buffer).resize(9, 8, { fit: 'fill' }).greyscale().raw().toBuffer();
  let bits = 0n;
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) bits = (bits << 1n) | (small[y * 9 + x] > small[y * 9 + x + 1] ? 1n : 0n);
  }
  // 下端（カードの帯が重なる 15%）の明暗のばらつき。生成が黒や無地の帯を描き込むと 5 未満になる（地面や路面は 10 以上）
  const strip = await sharp(buffer).resize(240, 126, { fit: 'fill' }).extract({ left: 0, top: 107, width: 240, height: 19 }).greyscale().raw().toBuffer();
  let s1 = 0;
  let s2 = 0;
  for (const v of strip) { s1 += v; s2 += v * v; }
  const stripMean = s1 / strip.length;
  return {
    bottomStd: Math.round(Math.sqrt(Math.max(0, s2 / strip.length - stripMean * stripMean)) * 10) / 10,
    mean: Math.round((sum / grey.length) * 10) / 10,
    bright: Math.round((bright / grey.length) * 1000) / 1000,
    dhash: bits.toString(16).padStart(16, '0'),
  };
}

/** 2 つの dHash の距離（違うビットの数） */
export function hamming(a, b) {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}

/** dHash が max 以下の組（[key, key]）。rows: [{ key, dhash }] */
export function nearDuplicates(rows, max) {
  const pairs = [];
  const withHash = rows.filter((row) => row.dhash);
  for (let i = 0; i < withHash.length; i += 1) {
    for (let j = i + 1; j < withHash.length; j += 1) {
      if (hamming(withHash[i].dhash, withHash[j].dhash) <= max) pairs.push([withHash[i].key, withHash[j].key]);
    }
  }
  return pairs;
}

/** 生の寸法と測った値を spec と照らし、違反の文（日本語）を返す。空なら合格 */
export function metricViolations({ rawSize, metrics }, spec) {
  const out = [];
  const [w, h] = String(rawSize ?? '').split('x').map(Number);
  if (!w || !h) out.push('生の出力の寸法の記録が無い');
  else if (w / h < spec.rawMinAspect) out.push(`生の出力が横長でない（${rawSize}）`);
  if (!metrics) { out.push('画素の測定の記録が無い'); return out; }
  if (metrics.bright > spec.brightMaxRatio) out.push(`明るい面が ${Math.round(metrics.bright * 100)}%（上限 ${Math.round(spec.brightMaxRatio * 100)}%）`);
  if (metrics.mean < spec.meanLuminance[0]) out.push(`暗すぎる（平均輝度 ${metrics.mean}）`);
  if (metrics.mean > spec.meanLuminance[1]) out.push(`明るすぎる（平均輝度 ${metrics.mean}）`);
  if (metrics.bottomStd != null && metrics.bottomStd < spec.bottomStripMinStd) out.push(`下端に黒や無地の帯が描き込まれている（ばらつき ${metrics.bottomStd}）`);
  return out;
}

/** 白文字と帯の色（#RRGGBB）のコントラスト比（WCAG 2） */
export function contrastWithWhite(hex) {
  const lin = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return 1.05 / (lum + 0.05);
}
