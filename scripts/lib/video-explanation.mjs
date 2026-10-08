/** Shared presentation layout for longform and portrait explanation scenes. */
const FONT = "'NotoSansJP', 'Noto Sans JP'";
const text = (value, style = {}) => ({ type: 'div', props: { style: { display: 'flex', fontFamily: FONT, ...style }, children: value } });
const box = (style, children) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });

// Count Latin letters at their approximate half-width; explicit lines avoid an
// extra unexpected wrap when Japanese and units/numbers share a card.
function units(value) {
  return [...value].reduce((sum, ch) => sum + (/^[\x20-\x7e]$/.test(ch) ? 0.62 : 1), 0);
}
// A wrapped line never starts with closing punctuation or 「・」, and never splits a
// word such as 「リスク」 or a Latin/number run such as 「1,500m3」 (2026-10-08).
const CLOSING = /[、。，．！？：；・）］」』]/u;
const LATIN = /[A-Za-z0-9.,:/%+\-²³℃°]/u;
const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
// Index in the line where the next line should start (chars.length = before `next`), or -1.
// Phrase breaks win: the nearest one looking back up to 3/4 of the line, so a heading such as
// 「仕上げ　概要と本文の一貫チェック」 breaks at the space instead of orphaning 「ク」.
// Otherwise the nearest word boundary in the latter half of the line.
function breakPoint(line, next) {
  const chars = [...line];
  const at = (i) => (i < chars.length ? chars[i] : next);
  for (let i = chars.length; i >= Math.max(2, Math.floor(chars.length / 4)); i--) {
    if (CLOSING.test(at(i))) continue;
    if (/[、：・〜～／→）」』　]/u.test(chars[i - 1]) || /[（「『]/u.test(at(i))) return i;
  }
  const bounds = new Set(); let pos = 0;
  for (const { segment } of segmenter.segment(line + next)) { bounds.add(pos); pos += [...segment].length; }
  for (let i = chars.length; i >= Math.ceil(chars.length / 2); i--) {
    if (!bounds.has(i) || CLOSING.test(at(i)) || (LATIN.test(chars[i - 1]) && LATIN.test(at(i)))) continue;
    return i;
  }
  return -1;
}
// loose: the earlier per-character wrapping, used only when word-aware lines cannot fit
// a cramped card at any size (so a screen that rendered before never starts failing).
function lines(value, capacity, loose = false) {
  const result = []; let line = '';
  for (const ch of value) {
    if (ch === '\n') { result.push(line); line = ''; continue; }
    if (line && units(line + ch) > capacity) {
      const closing = loose ? /[、。，．！？：；）］」』]/u : CLOSING;
      const cut = loose ? -1 : breakPoint(line, ch);
      if (cut > 0) {
        const chars = [...line]; result.push(chars.slice(0, cut).join('')); line = chars.slice(cut).join('');
      // Keep closing punctuation with the preceding character without exceeding
      // the measured line budget; hanging it outside the budget caused wraps.
      } else if (closing.test(ch) || /[（［「『]$/u.test(line)) {
        const chars = [...line]; const last = chars.pop(); result.push(chars.join('')); line = last;
      } else { result.push(line); line = ''; }
    }
    line += ch;
  }
  if (line) result.push(line);
  return result;
}
function fit(value, width, height, max, min, lineHeight = 1.35) {
  for (const loose of [false, true]) {
    for (let size = max; size >= min; size -= 2) {
      const wrapped = lines(value, (width - size * 0.6) / size, loose);
      if (wrapped.length * size * lineHeight <= height) return { value: wrapped.join('\n'), size, lineHeight };
    }
  }
  throw new Error(`説明画面に収まりません（内容を分割してください）: ${value}`);
}
// One size for a group of cells (a table reads unevenly when each cell picks
// its own size); single-line sizes are preferred so short labels do not wrap.
function groupSize(values, width, height, max, min, { singleLine = false } = {}) {
  if (singleLine) {
    for (let size = max; size >= min; size -= 2) {
      if (values.every(v => lines(v, (width - size * 0.6) / size).length <= 1 && size * 1.35 <= height)) return size;
    }
  }
  return Math.min(...values.map(v => fit(v, width, height, max, min).size));
}
function fitted(value, width, height, max, min, style = {}) {
  const f = fit(value, width, height, max, min);
  const node = text(f.value, { fontSize: f.size, lineHeight: f.lineHeight, whiteSpace: 'pre', fontWeight: 700, ...style });
  node.props['data-fit-width'] = width;
  node.props['data-fit-height'] = height;
  return node;
}

// 16:9 only: the character stands in a right column whose feet sit on the
// bottom rule, so the burned-in subtitle band below stays clear.
const CHARACTER_COLUMN_W = 440;
const CHARACTER_GAP = 40;
const NG = { fg: '#B42318', bg: '#FDECEC', border: '#F3B5AE' };
const OK = { fg: '#16703A', bg: '#E8F5EC', border: '#A9D8B8' };

function characterNodes(character, image, { theme, W, H, margin }) {
  const width = Math.min(CHARACTER_COLUMN_W, image.width);
  const height = Math.min(620, Math.round(image.height * width / image.width));
  const left = W - margin - CHARACTER_COLUMN_W + (CHARACTER_COLUMN_W - width) / 2;
  const top = H - 136 - height;
  const nodes = [{ type: 'img', props: { src: image.uri, width, height, style: { position: 'absolute', left, top, objectFit: 'contain' } } }];
  if (character.say) {
    const bubbleW = CHARACTER_COLUMN_W, bubbleH = 150;
    const bubbleTop = Math.max(130, top - bubbleH - 26);
    nodes.push(
      box({ position: 'absolute', left: W - margin - bubbleW, top: bubbleTop, width: bubbleW, height: bubbleH,
        background: '#ffffff', border: `4px solid ${theme.base}`, borderRadius: 28, padding: '16px 22px',
        alignItems: 'center', justifyContent: 'center' }, [
        fitted(character.say, bubbleW - 52, bubbleH - 40, 44, 30, { color: theme.deep, textAlign: 'center' }),
      ]),
      box({ position: 'absolute', left: W - margin - bubbleW / 2 - 14, top: bubbleTop + bubbleH - 18, width: 28, height: 28,
        background: '#ffffff', borderRight: `4px solid ${theme.base}`, borderBottom: `4px solid ${theme.base}`,
        transform: 'rotate(45deg)' }, []),
    );
  }
  return nodes;
}

function compareBody(visual, { theme, width, height }) {
  const rows = visual.rows ?? [];
  if (!rows.length || rows.length > 4) throw new Error('compare は rows を1〜4行で指定してください');
  const labelW = rows.some(r => r.label) ? 240 : 0;
  const gap = 16, headH = 62;
  const cellW = (width - labelW - gap * (labelW ? 2 : 1)) / 2;
  const rowH = (height - headH - gap * rows.length) / rows.length;
  // 36px is the smallest size still readable on a phone; split the scene rather than shrink.
  const ngSize = groupSize(rows.map(r => r.ng), cellW - 50, rowH - 34, 56, 36);
  const okSize = groupSize(rows.map(r => r.ok ?? ''), cellW - 50, rowH - 34, 56, 36);
  const labelSize = labelW ? groupSize(rows.map(r => r.label ?? ''), labelW - 28, rowH - 24, 40, 26, { singleLine: true }) : 0;
  const chip = (mark, word, tone, left) => box({ position: 'absolute', left, top: 0, width: cellW, height: headH,
    alignItems: 'center', justifyContent: 'center', background: tone.fg, borderRadius: 12 }, [
    text(`${mark}  ${word}`, { color: '#ffffff', fontSize: 36, fontWeight: 700 }),
  ]);
  const okLeft = labelW + (labelW ? gap : 0) + cellW + gap;
  const cell = (value, tone, size, left, top, faded) => box({ position: 'absolute', left, top, width: cellW, height: rowH,
    padding: '14px 22px', alignItems: 'center', background: tone.bg, border: `3px solid ${tone.border}`, borderRadius: 14,
    opacity: faded ? 0.35 : 1 }, [fitted(value, cellW - 50, rowH - 34, size, size, { color: tone.fg })]);
  return [
    chip('×', visual.ngLabel ?? 'NG', NG, labelW ? labelW + gap : 0),
    chip('○', visual.okLabel ?? 'OK', OK, okLeft),
    ...rows.flatMap((row, i) => {
      const top = headH + gap + i * (rowH + gap);
      const faded = Number.isInteger(visual.focus) && visual.focus !== i;
      return [
        ...(labelW ? [box({ position: 'absolute', left: 0, top, width: labelW, height: rowH, alignItems: 'center',
          justifyContent: 'center', background: `${theme.base}14`, borderRadius: 14, opacity: faded ? 0.35 : 1 }, [
          fitted(row.label ?? '', labelW - 28, rowH - 24, labelSize, labelSize, { color: theme.deep }),
        ])] : []),
        cell(row.ng, NG, ngSize, labelW ? labelW + gap : 0, top, faded),
        cell(row.ok ?? '', OK, okSize, okLeft, top, faded || row.ok === undefined),
      ];
    }),
  ];
}

function sheetBody(visual, { theme, width, height }) {
  const rows = visual.rows ?? [];
  if (!rows.length || rows.length > 8) throw new Error('sheet は rows を1〜8行で指定してください');
  const titleH = visual.sheetTitle ? 58 : 0;
  const rowH = (height - titleH) / rows.length;
  const labelW = 330;
  const valueStyle = {
    todo: { background: '#ffffff', color: '#9AA4B2' },
    done: { background: '#ffffff', color: theme.deep },
    focus: { background: '#FFF4CC', color: theme.deep },
    ng: { background: NG.bg, color: NG.fg },
    ok: { background: OK.bg, color: OK.fg },
  };
  // ok is shown by colour only: a "○" mark would read as part of "○○" placeholders.
  const shown = rows.map(row => {
    const state = row.state ?? (row.value ? 'done' : 'todo');
    if (!valueStyle[state]) throw new Error(`sheet の state が不正です: ${state}`);
    return { state, value: `${state === 'ng' ? '× ' : ''}${row.value || (state === 'todo' ? '（未記入）' : '')}` };
  });
  const orderW = rows.some(r => r.order) ? 58 : 0;
  const labelSize = groupSize(rows.map(r => r.label), labelW - 36 - orderW, rowH - 16, 38, 24, { singleLine: true });
  const valueSize = groupSize(shown.map(s => s.value), width - labelW - 56, rowH - 18, 40, 24, { singleLine: true });
  return [
    ...(titleH ? [box({ position: 'absolute', left: 0, top: 0, width, height: titleH, alignItems: 'center', paddingLeft: 20,
      background: theme.deep }, [text(visual.sheetTitle, { color: '#ffffff', fontSize: 32, fontWeight: 700 })])] : []),
    ...rows.flatMap((row, i) => {
      const { state, value } = shown[i];
      const top = titleH + i * rowH;
      const focus = state === 'focus';
      return [
        box({ position: 'absolute', left: 0, top, width: labelW, height: rowH, alignItems: 'center', padding: '0 18px',
          background: focus ? theme.base : '#EEF2F7', border: `2px solid ${theme.deep}55` }, [
          ...(row.order ? [text(String(row.order), { width: 46, height: 46, flexShrink: 0, marginRight: 12, borderRadius: 23,
            alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700,
            background: focus ? '#ffffff' : theme.base, color: focus ? theme.base : '#ffffff' })] : []),
          fitted(row.label, labelW - 36 - orderW, rowH - 16, labelSize, labelSize, { color: focus ? '#ffffff' : theme.deep }),
        ]),
        box({ position: 'absolute', left: labelW, top, width: width - labelW, height: rowH, alignItems: 'center',
          padding: '0 22px', background: valueStyle[state].background,
          border: focus ? `5px solid ${theme.base}` : `2px solid ${theme.deep}55` }, [
          fitted(value, width - labelW - 56, rowH - 18, valueSize, valueSize, { color: valueStyle[state].color, fontWeight: state === 'todo' ? 500 : 700 }),
        ]),
      ];
    }),
  ];
}

export function buildExplanationNode(scene, { theme, portrait = false, assetDataUri, rightMargin, character: characterImage }) {
  const visual = scene.visual ?? { heading: scene.caption, items: [] };
  const W = portrait ? 1080 : 1920, H = portrait ? 1920 : 1080;
  const character = !portrait && visual.character ? visual.character : null;
  if (character && !characterImage) throw new Error(`character の画像データがありません: ${scene.sceneId}`);
  const margin = portrait ? 64 : 88;
  const fullW = W - margin - (rightMargin ?? margin);
  const contentW = character ? W - margin * 2 - CHARACTER_COLUMN_W - CHARACTER_GAP : fullW;
  const originalHeading = visual.heading || scene.caption || '';
  const prefix = originalHeading.match(/^(STEP\s*\d+|原因\s*\d+|ポイント\s*\d+|\d+)[\s　.:：、．-]+(.+)$/iu);
  // 総まとめ（video-compilation）の場面は元パックの sceneId でラベルを決める
  const baseId = scene.from?.sceneId ?? scene.sceneId;
  const label = prefix?.[1] ?? (baseId === 'summary' ? 'まとめ' : baseId === 'premise' ? '押さえるポイント' : '解説');
  const heading = originalHeading === 'まとめ' && scene.caption ? scene.caption : prefix?.[2] ?? originalHeading;
  const kind = portrait ? 'points' : visual.kind ?? 'points';
  if ((visual.kind === 'compare' || visual.kind === 'sheet') && portrait) throw new Error(`${visual.kind} は16:9専用です: ${scene.sceneId}`);
  // The answer-sheet mock needs the vertical space of 7 rows, so its heading is one line.
  const compact = kind === 'sheet';
  const headerY = portrait ? 205 : 125;
  const headingY = portrait ? 285 : compact ? 182 : 190;
  const headingH = portrait ? 325 : compact ? 110 : 212;
  const bodyY = portrait ? 625 : compact ? 312 : 412;
  const bodyH = portrait ? 755 : compact ? 612 : 488;
  const items = visual.items ?? [];
  const figure = kind === 'figure';
  if (figure && !visual.flow && !assetDataUri) throw new Error(`figure scene に画像データがありません: ${scene.sceneId}`);
  const columns = !portrait && kind === 'points' && items.length >= 5 ? 3 : !portrait && kind === 'points' && items.length === 4 ? 2 : 1;
  const rows = Math.max(1, Math.ceil(items.length / columns));
  const gap = portrait ? 20 : 18;
  const figureW = character ? 560 : 664;
  const cardsW = figure ? (character ? contentW - figureW - 40 : 980) : contentW;
  // reveal: show the first N items while keeping the full layout, so ~10s beats
  // can add one card at a time without the earlier cards moving.
  const reveal = Number.isInteger(visual.reveal) ? visual.reveal : items.length;
  const cardW = (cardsW - gap * (columns - 1)) / columns;
  const inset = portrait ? 24 : 22;
  const maxSize = portrait ? 74 : figure ? 64 : columns === 2 ? 74 : items.length <= 2 ? 90 : 78;
  const minSize = portrait ? 56 : figure ? 48 : 58;
  let cardFont = maxSize, heights;
  for (const loose of [false, true]) {
    for (cardFont = maxSize; cardFont >= minSize; cardFont -= 2) {
      const needs = items.map(item => {
        const numberW = /^[①②③④⑤⑥⑦⑧⑨⑩]/u.test(item) ? 0 : (portrait ? 66 : 74);
        const capacity = (cardW - inset * 2 - numberW - cardFont * 0.6) / cardFont;
        return lines(item, capacity, loose).length * cardFont * 1.35 + inset * 2;
      });
      const rowNeeds = Array.from({ length: rows }, (_, row) => Math.max(0, ...needs.slice(row * columns, (row + 1) * columns)));
      const required = rowNeeds.reduce((a, b) => a + b, 0) + gap * (rows - 1);
      if (required <= bodyH) { heights = rowNeeds.map(h => h + (bodyH - required) / rows); break; }
    }
    if (heights) break;
  }
  if (!heights) throw new Error(`説明画面の要点を分割してください: ${scene.sceneId}`);
  const cards = items.slice(0, reveal).map((item, index) => {
    const hasNumber = /^[①②③④⑤⑥⑦⑧⑨⑩]/u.test(item);
    const row = Math.floor(index / columns);
    const cardH = heights[row];
    const top = heights.slice(0, row).reduce((a, b) => a + b, 0) + row * gap;
    const numberW = hasNumber ? 0 : (portrait ? 66 : 74);
    const focused = Number.isInteger(visual.focus) && visual.focus === index;
    const faded = Number.isInteger(visual.focus) && !focused;
    return box({
      position: 'absolute', left: (index % columns) * (cardW + gap), top,
      width: cardW, height: cardH, alignItems: 'center', padding: inset,
      background: focused ? '#FFF4CC' : index % 2 === 0 ? `${theme.base}12` : `${theme.base}08`,
      border: focused ? `5px solid ${theme.base}` : `2px solid ${theme.base}26`, borderRadius: 18,
      opacity: faded ? 0.4 : 1,
    }, [
      ...(!hasNumber ? [text(String(index + 1).padStart(2, '0'), { width: numberW, flexShrink: 0, fontSize: portrait ? 36 : 40, color: theme.base, fontWeight: 700 })] : []),
      fitted(item, cardW - inset * 2 - numberW, cardH - inset * 2,
        cardFont, cardFont, { color: theme.deep }),
    ]);
  });
  return box({ width: `${W}px`, height: `${H}px`, background: '#ffffff', fontFamily: FONT, position: 'relative' }, [
    box({ position: 'absolute', top: 0, left: 0, width: W, height: 10, background: theme.base }, []),
    box({ position: 'absolute', top: portrait ? 65 : 42, left: margin, width: fullW, alignItems: 'center', justifyContent: 'space-between' }, [
      text(theme.label, { fontSize: portrait ? 34 : 32, color: theme.deep, fontWeight: 700 }),
      ...(!portrait ? [text('doboku-note', { fontSize: 30, color: theme.base, fontWeight: 700 })] : []),
    ]),
    box({ position: 'absolute', left: margin, top: headerY, background: theme.base, padding: portrait ? '9px 22px' : '8px 20px', borderRadius: 8 }, [
      text(label, { color: '#ffffff', fontSize: portrait ? 32 : 28, fontWeight: 700 }),
    ]),
    box({ position: 'absolute', left: margin, top: headingY, width: contentW, height: headingH }, [
      fitted(heading, contentW, headingH, portrait ? 90 : compact ? 72 : 96, portrait ? 78 : compact ? 52 : 78, { color: theme.deep }),
    ]),
    // With a character the heading may need two lines, so the image may not rise into the heading area.
    ...(figure ? [box({ position: 'absolute', left: margin, top: visual.flow || character ? bodyY : bodyY - 80, width: figureW, height: visual.flow || character ? bodyH : figureW, justifyContent: 'center', alignItems: 'center' }, [
      ...(visual.flow ? [box({ width: figureW - 44, height: 488, flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }, visual.flow.flatMap((label, index) => [
        ...(index ? [text('↓', { fontSize: 34, lineHeight: 1, color: theme.base })] : []),
        box({ width: figureW - 84, height: 90, background: `${theme.base}12`, border: `2px solid ${theme.base}40`, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, [text(label, { fontSize: 58, fontWeight: 700, color: theme.deep })]),
      ]))] : [{ type: 'img', props: { src: assetDataUri, width: figureW, height: character ? bodyH : figureW, style: { objectFit: 'contain' } } }]),
    ])] : []),
    box({ position: 'absolute', left: figure ? margin + contentW - cardsW : margin, top: bodyY, width: cardsW, height: bodyH },
      kind === 'compare' ? compareBody(visual, { theme, width: cardsW, height: bodyH })
        : kind === 'sheet' ? sheetBody(visual, { theme, width: cardsW, height: bodyH })
          : cards),
    box({ position: 'absolute', left: margin, bottom: portrait ? 205 : 136, width: fullW, height: 2, background: `${theme.base}30` }, []),
    ...(portrait ? [text('doboku-note', { position: 'absolute', left: margin, bottom: 155, fontSize: 30, fontWeight: 700, color: theme.base })] : []),
    ...(character ? characterNodes(character, characterImage, { theme, W, H, margin }) : []),
  ]);
}
