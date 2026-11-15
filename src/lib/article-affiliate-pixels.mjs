import { choosePixelCarrier } from './affiliate-placement-core.mjs';

/** 実際の表示幅・案で出る素材だけから案件ごとに 1 面選ぶ。素材の href/pixel の組は変更しない。 */
export function chooseArticlePixels(candidates, vocab, { desktop, wide, variant }) {
  const visible = candidates.filter(c => (!c.viewport || c.viewport === (desktop ? 'pc' : 'mobile')) && (!c.secondary || (wide && variant === 'B2')));
  const programs = [...new Set(visible.map(c => c.program))];
  return programs.flatMap(program => {
    const rows = visible.filter(c => c.program === program);
    const slot = choosePixelCarrier(vocab, rows.map(c => c.slot));
    const owner = rows.find(c => c.slot === slot);
    return owner?.src ? [owner] : [];
  });
}
