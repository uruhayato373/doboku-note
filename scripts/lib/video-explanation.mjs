/** Shared presentation layout for longform and portrait explanation scenes. */
const FONT = "'NotoSansJP', 'Noto Sans JP'";
const text = (value, style = {}) => ({ type: 'div', props: { style: { display: 'flex', fontFamily: FONT, ...style }, children: value } });
const box = (style, children) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });

// Count Latin letters at their approximate half-width; explicit lines avoid an
// extra unexpected wrap when Japanese and units/numbers share a card.
function units(value) {
  return [...value].reduce((sum, ch) => sum + (/^[\x20-\x7e]$/.test(ch) ? 0.62 : 1), 0);
}
function lines(value, capacity) {
  const result = []; let line = '';
  for (const ch of value) {
    if (ch === '\n') { result.push(line); line = ''; continue; }
    if (line && units(line + ch) > capacity) {
      // Keep closing punctuation with the preceding character without exceeding
      // the measured line budget; hanging it outside the budget caused wraps.
      if (/[、。，．！？：；）］」』]/u.test(ch) || /[（［「『]$/u.test(line)) {
        const chars = [...line]; const last = chars.pop(); result.push(chars.join('')); line = last;
      } else { result.push(line); line = ''; }
    }
    line += ch;
  }
  if (line) result.push(line);
  return result;
}
function fit(value, width, height, max, min, lineHeight = 1.35) {
  for (let size = max; size >= min; size -= 2) {
    const wrapped = lines(value, (width - size * 0.6) / size);
    if (wrapped.length * size * lineHeight <= height) return { value: wrapped.join('\n'), size, lineHeight };
  }
  throw new Error(`説明画面に収まりません（内容を分割してください）: ${value}`);
}
function fitted(value, width, height, max, min, style = {}) {
  const f = fit(value, width, height, max, min);
  const node = text(f.value, { fontSize: f.size, lineHeight: f.lineHeight, whiteSpace: 'pre', fontWeight: 700, ...style });
  node.props['data-fit-width'] = width;
  node.props['data-fit-height'] = height;
  return node;
}

export function buildExplanationNode(scene, { theme, portrait = false, assetDataUri }) {
  const visual = scene.visual ?? { heading: scene.caption, items: [] };
  const W = portrait ? 1080 : 1920, H = portrait ? 1920 : 1080;
  const margin = portrait ? 64 : 88, contentW = W - margin * 2;
  const originalHeading = visual.heading || scene.caption || '';
  const prefix = originalHeading.match(/^(STEP\s*\d+|原因\s*\d+|ポイント\s*\d+|\d+)[\s　.:：、．-]+(.+)$/iu);
  const label = prefix?.[1] ?? (scene.sceneId === 'summary' ? 'まとめ' : scene.sceneId === 'premise' ? '押さえるポイント' : '解説');
  const heading = originalHeading === 'まとめ' && scene.caption ? scene.caption : prefix?.[2] ?? originalHeading;
  const headerY = portrait ? 205 : 125;
  const headingY = portrait ? 285 : 190;
  const headingH = portrait ? 325 : 212;
  const bodyY = portrait ? 625 : 412;
  const bodyH = portrait ? 755 : 488;
  const items = visual.items ?? [];
  const figure = !portrait && visual.kind === 'figure';
  if (figure && !visual.flow && !assetDataUri) throw new Error(`figure scene に画像データがありません: ${scene.sceneId}`);
  const columns = !portrait && !figure && items.length >= 5 ? 3 : !portrait && !figure && items.length === 4 ? 2 : 1;
  const rows = Math.max(1, Math.ceil(items.length / columns));
  const gap = portrait ? 20 : 18;
  const cardsW = figure ? 980 : contentW;
  const cardW = (cardsW - gap * (columns - 1)) / columns;
  const inset = portrait ? 24 : 22;
  const maxSize = portrait ? 74 : figure ? 64 : columns === 2 ? 74 : items.length <= 2 ? 90 : 78;
  const minSize = portrait ? 56 : figure ? 48 : 58;
  let cardFont = maxSize, heights;
  for (; cardFont >= minSize; cardFont -= 2) {
    const needs = items.map(item => {
      const numberW = /^[①②③④⑤⑥⑦⑧⑨⑩]/u.test(item) ? 0 : (portrait ? 66 : 74);
      const capacity = (cardW - inset * 2 - numberW - cardFont * 0.6) / cardFont;
      return lines(item, capacity).length * cardFont * 1.35 + inset * 2;
    });
    const rowNeeds = Array.from({ length: rows }, (_, row) => Math.max(0, ...needs.slice(row * columns, (row + 1) * columns)));
    const required = rowNeeds.reduce((a, b) => a + b, 0) + gap * (rows - 1);
    if (required <= bodyH) { heights = rowNeeds.map(h => h + (bodyH - required) / rows); break; }
  }
  if (!heights) throw new Error(`説明画面の要点を分割してください: ${scene.sceneId}`);
  const cards = items.map((item, index) => {
    const hasNumber = /^[①②③④⑤⑥⑦⑧⑨⑩]/u.test(item);
    const row = Math.floor(index / columns);
    const cardH = heights[row];
    const top = heights.slice(0, row).reduce((a, b) => a + b, 0) + row * gap;
    const numberW = hasNumber ? 0 : (portrait ? 66 : 74);
    return box({
      position: 'absolute', left: (index % columns) * (cardW + gap), top,
      width: cardW, height: cardH, alignItems: 'center', padding: inset,
      background: index % 2 === 0 ? `${theme.base}12` : `${theme.base}08`,
      border: `2px solid ${theme.base}26`, borderRadius: 18,
    }, [
      ...(!hasNumber ? [text(String(index + 1).padStart(2, '0'), { width: numberW, flexShrink: 0, fontSize: portrait ? 36 : 40, color: theme.base, fontWeight: 700 })] : []),
      fitted(item, cardW - inset * 2 - numberW, cardH - inset * 2,
        cardFont, cardFont, { color: theme.deep }),
    ]);
  });
  return box({ width: `${W}px`, height: `${H}px`, background: '#ffffff', fontFamily: FONT, position: 'relative' }, [
    box({ position: 'absolute', top: 0, left: 0, width: W, height: 10, background: theme.base }, []),
    box({ position: 'absolute', top: portrait ? 65 : 42, left: margin, width: contentW, alignItems: 'center', justifyContent: 'space-between' }, [
      text(theme.label, { fontSize: portrait ? 34 : 32, color: theme.deep, fontWeight: 700 }),
      ...(!portrait ? [text('doboku-note', { fontSize: 30, color: theme.base, fontWeight: 700 })] : []),
    ]),
    box({ position: 'absolute', left: margin, top: headerY, background: theme.base, padding: portrait ? '9px 22px' : '8px 20px', borderRadius: 8 }, [
      text(label, { color: '#ffffff', fontSize: portrait ? 32 : 28, fontWeight: 700 }),
    ]),
    box({ position: 'absolute', left: margin, top: headingY, width: contentW, height: headingH }, [
      fitted(heading, contentW, headingH, portrait ? 90 : 96, portrait ? 78 : 78, { color: theme.deep }),
    ]),
    ...(figure ? [box({ position: 'absolute', left: margin, top: visual.flow ? bodyY : bodyY - 80, width: 664, height: visual.flow ? bodyH : 664, justifyContent: 'center', alignItems: 'center' }, [
      ...(visual.flow ? [box({ width: 620, height: 488, flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }, visual.flow.flatMap((label, index) => [
        ...(index ? [text('↓', { fontSize: 34, lineHeight: 1, color: theme.base })] : []),
        box({ width: 580, height: 90, background: `${theme.base}12`, border: `2px solid ${theme.base}40`, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, [text(label, { fontSize: 58, fontWeight: 700, color: theme.deep })]),
      ]))] : [{ type: 'img', props: { src: assetDataUri, width: 664, height: 664, style: { objectFit: 'contain' } } }]),
    ])] : []),
    box({ position: 'absolute', left: figure ? W - margin - cardsW : margin, top: bodyY, width: cardsW, height: bodyH }, cards),
    box({ position: 'absolute', left: margin, bottom: portrait ? 205 : 136, width: contentW, height: 2, background: `${theme.base}30` }, []),
    ...(portrait ? [text('doboku-note', { position: 'absolute', left: margin, bottom: 155, fontSize: 30, fontWeight: 700, color: theme.base })] : []),
  ]);
}
