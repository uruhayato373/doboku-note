const units = value => [...value].reduce((n, ch) => n + (/^[\x20-\x7e]$/.test(ch) ? 0.62 : 1), 0);
const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });

/** Keep numbers, decimals and Latin terms together in a one-line subtitle. */
export function subtitleChunks(value, maxUnits = 15) {
  const text = String(value ?? '');
  if (!text) return [];
  if (!Number.isFinite(maxUnits) || maxUnits <= 0) throw new Error('字幕の行幅が不正です');
  const spans = text.match(/[A-Za-z0-9][A-Za-z0-9.,:/%+\-²³℃°]*|[^A-Za-z0-9]+/gu) ?? [];
  const raw = spans.flatMap(span => /^[A-Za-z0-9]/.test(span) ? [span] : [...segmenter.segment(span)].map(s => s.segment));
  const tokens = [];
  for (const token of raw) {
    if (tokens.length && (/^[、。，．！？：；）］」』]/u.test(token) || /[（［「『]$/u.test(tokens.at(-1)))) tokens[tokens.length - 1] += token;
    else tokens.push(token);
  }
  if (tokens.some(token => units(token) > maxUnits)) throw new Error('字幕の数値・用語が1行を超えています。表記を短くしてください。');
  const target = Math.min(maxUnits, Math.ceil(units(text) / Math.ceil(units(text) / maxUnits)));
  const rows = []; let row = [], width = 0;
  for (const token of tokens) {
    const size = units(token);
    if (row.length && width + size > target) { rows.push(row); row = []; width = 0; }
    row.push(token); width += size;
  }
  if (row.length) rows.push(row);
  if (rows.length > 1 && units(rows.at(-1).join('')) < target * 0.4) {
    const pair = rows.slice(-2).flat(); let best = null;
    for (let i = 1; i < pair.length; i++) {
      const left = pair.slice(0, i), right = pair.slice(i);
      const a = units(left.join('')), b = units(right.join(''));
      if (a <= maxUnits && b <= maxUnits && (!best || Math.abs(a - b) < best.delta)) best = { left, right, delta: Math.abs(a - b) };
    }
    if (best) rows.splice(-2, 2, best.left, best.right);
  }
  return rows.map(tokens => tokens.join(''));
}
