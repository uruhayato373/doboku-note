/**
 * site-visual-inspect.mjs — 1 つの画面幅で、レイアウトと商品導線の状態を測る（ブラウザの中で走る関数）。
 *
 * page.evaluate(inspectLayoutInPage) で使う。関数の外の変数を参照しない（ブラウザへ文字列で渡るため）。
 * 使う側: scripts/site-visual-review.mjs。横はみ出し・読めない画像などは rendered-page-inspect.mjs が別に見る。
 *
 * 返すもの:
 *   blocks  ヘッダー・main の直下の区画・フッターごとの、中身の左端と右端（絶対配置の飾りは除く）
 *   issues  機械で決まる崩れ（1 件でもあれば不合格が確定）
 *             edge      区画の中身が、ヘッダーの中身の端（サイトの外枠）より左右の外に出ている（コンテナ幅の不統一）
 *             cta-clip  商品導線が画面の右へはみ出している
 *   hints   目視で判断する材料（不合格は確定しない）
 *             clip（題名が…で切れている）・orphan（最後の行が 1 文字）・small-text（12px 未満）・tap（スマホ幅で押しにくい）
 *             edge-step（上下に続く区画の左端が 3〜48px ずれている）
 *   ctas    商品導線（note・アフィリエイト・ココナラ）の位置と見え方
 *   skeleton 区画の骨組み（タグ・クラス・左端と幅）。画面幅をまたいで束ねたハッシュが変われば判定は古くなる
 */
export function inspectLayoutInPage() {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;
  const TOL = 2;
  const round = (n) => Math.round(n);
  const textOf = (el, max = 40) => (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, max);
  const isShown = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) !== 0;
  };
  const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);

  // ---- 区画（ヘッダー・main の直下・フッター） ----
  const unwrap = (el) => {
    let cur = el;
    // 1 人っ子の入れ物は中へ降りる（main > div > section… の形）
    while (cur.children.length === 1 && !hasOwnText(cur)) cur = cur.children[0];
    return cur;
  };
  const main = document.querySelector('main');
  const blockEls = [];
  const header = document.querySelector('body header');
  if (header) blockEls.push(['header', header]);
  if (main) {
    const root = unwrap(main);
    const kids = root === main || root.children.length > 1 ? [...root.children] : [root];
    kids.forEach((k, i) => blockEls.push([`main-${String(i + 1).padStart(2, '0')}`, k]));
  }
  const footer = document.querySelector('body footer');
  if (footer) blockEls.push(['footer', footer]);

  const outOfFlow = (el, stop) => {
    for (let p = el; p && p !== stop.parentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.position === 'absolute' || cs.position === 'fixed') return true;
      if (p !== el && (cs.overflowX === 'auto' || cs.overflowX === 'scroll')) return true;
    }
    return false;
  };
  const blocks = [];
  for (const [id, el] of blockEls) {
    if (!isShown(el)) continue;
    let left = Infinity;
    let right = -Infinity;
    for (const leaf of el.querySelectorAll('h1,h2,h3,h4,p,li,a,button,img,input,dt,dd,span,div')) {
      const tag = leaf.tagName;
      if ((tag === 'SPAN' || tag === 'DIV') && !hasOwnText(leaf)) continue;
      if (!isShown(leaf) || outOfFlow(leaf, el)) continue;
      const r = leaf.getBoundingClientRect();
      left = Math.min(left, r.left);
      right = Math.max(right, r.right);
    }
    if (!Number.isFinite(left)) continue;
    const r = el.getBoundingClientRect();
    const cls = typeof el.className === 'string' ? el.className.trim() : '';
    const kids = [...new Set([...el.querySelectorAll(':scope > *, :scope > * > *')].map((k) => `${k.tagName.toLowerCase()}.${typeof k.className === 'string' ? k.className.trim() : ''}`))];
    blocks.push({ id, tag: el.tagName.toLowerCase(), cls, label: textOf(el, 24), top: round(r.top + window.scrollY), height: round(r.height), left: round(left), right: round(vw - right), kids });
  }

  const issues = [];
  // 基準はヘッダーの中身の端（サイトの外枠）。本文の区画は外枠より狭くてよいが、外へは出ない。
  // 多数派を基準にすると、記事ページでは本文の中の区画が多数派になり、ヘッダーとフッターが「広い」と誤って出る（2026-11-11）。
  const shell = blocks.find((b) => b.id === 'header');
  if (shell) {
    for (const b of blocks) {
      if (b === shell) continue;
      if (b.left < shell.left - TOL || b.right < shell.right - TOL) {
        issues.push({
          type: 'edge',
          detail: `${b.id}「${b.label}」の中身がヘッダーの端より外に出ている（左余白 ${b.left}px・右余白 ${b.right}px / ヘッダー 左 ${shell.left}px・右 ${shell.right}px）: ${b.tag}.${b.cls.split(/\s+/).slice(0, 4).join('.')}`,
        });
      }
    }
  }

  // ---- 目視の材料 ----
  const hints = [];
  // 上下に続く区画の左端が少しだけ食い違う（基準が立たない読み幅のページでも、見出しとカードの段差を拾う）
  const mains = blocks.filter((b) => b.id.startsWith('main-'));
  const steps = [];
  for (let i = 1; i < mains.length; i += 1) {
    const diff = Math.abs(mains[i].left - mains[i - 1].left);
    if (diff > TOL && diff <= 48) steps.push(`${mains[i - 1].id}「${mains[i - 1].label.slice(0, 12)}」${mains[i - 1].left}px と ${mains[i].id}「${mains[i].label.slice(0, 12)}」${mains[i].left}px`);
  }
  if (steps.length) hints.push({ type: 'edge-step', detail: `続く区画の左端が少しずれている: ${steps.slice(0, 4).join(' / ')}` });
  const clipped = [];
  for (const el of document.querySelectorAll('h1,h2,h3,h4,a,p,span')) {
    if (clipped.length >= 6) break;
    if (!isShown(el)) continue;
    const cs = getComputedStyle(el);
    const ellipsis = cs.textOverflow === 'ellipsis' && cs.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1;
    const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && el.scrollHeight > el.clientHeight + 1;
    if (ellipsis || clamp) clipped.push(textOf(el, 50));
  }
  if (clipped.length) hints.push({ type: 'clip', detail: `文字が途中で切れている: ${clipped.map((t) => `「${t}」`).join(' ')}` });

  const orphans = [];
  for (const el of document.querySelectorAll('h1,h2,h3,main a,main button')) {
    if (orphans.length >= 8) break;
    if (!isShown(el) || el.querySelector('img,svg,picture') && !hasOwnText(el) && el.children.length > 2) continue;
    const text = textOf(el, 60);
    if (text.length < 4 || text.length > 40) continue;
    const target = [...el.querySelectorAll('*')].find((c) => hasOwnText(c) && textOf(c, 60) === text) ?? (hasOwnText(el) ? el : null);
    if (!target) continue;
    // 文字だけを測る（アイコン・矢印の svg を 1 行に数えない）
    const fontSize = parseFloat(getComputedStyle(target).fontSize) || 16;
    const lines = new Map();
    for (const node of target.childNodes) {
      if (node.nodeType !== 3 || !node.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) {
        if (r.width < 1) continue;
        const key = Math.round(r.top / (fontSize * 0.6));
        const cur = lines.get(key) ?? { left: r.left, right: r.right };
        lines.set(key, { left: Math.min(cur.left, r.left), right: Math.max(cur.right, r.right) });
      }
    }
    const rows = [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v.right - v.left);
    if (rows.length >= 2 && rows.at(-1) < fontSize * 1.3) orphans.push(text);
  }
  if (orphans.length) hints.push({ type: 'orphan', detail: `最後の行が 1 文字だけの折り返し: ${[...new Set(orphans)].map((t) => `「${t}」`).join(' ')}` });

  let small = 0;
  const smallSamples = [];
  for (const el of document.querySelectorAll('main *, footer *')) {
    if (!hasOwnText(el) || !isShown(el)) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 12) {
      small += 1;
      if (smallSamples.length < 4) smallSamples.push(`${textOf(el, 20)}(${size}px)`);
    }
  }
  if (small) hints.push({ type: 'small-text', detail: `12px 未満の文字 ${small} 箇所: ${smallSamples.join(' / ')}` });

  if (vw < 768) {
    let tap = 0;
    const tapSamples = [];
    for (const el of document.querySelectorAll('a,button')) {
      if (!isShown(el) || getComputedStyle(el).display === 'inline') continue;
      const r = el.getBoundingClientRect();
      if (Math.min(r.width, r.height) < 32) {
        tap += 1;
        if (tapSamples.length < 4) tapSamples.push(`${textOf(el, 16) || el.getAttribute('aria-label') || el.tagName}(${round(r.width)}×${round(r.height)})`);
      }
    }
    if (tap) hints.push({ type: 'tap', detail: `押せる要素が 32px 未満 ${tap} 箇所: ${tapSamples.join(' / ')}` });
  }

  // ---- 商品導線 ----
  const kindOf = (el) => {
    const marked = el.closest('[data-cta]');
    const cta = marked?.getAttribute('data-cta') ?? '';
    const href = el.tagName === 'A' ? el.href : (el.querySelector('a')?.href ?? '');
    const rel = el.tagName === 'A' ? el.rel : (el.querySelector('a[rel~="sponsored"]') ? 'sponsored' : '');
    if (cta.startsWith('note') || /\/\/note\.com\//.test(href)) return 'note';
    if (cta === 'coconala' || /coconala\.com/.test(href)) return 'coconala';
    if (cta === 'affiliate' || cta === 'career-need' || /sponsored/.test(rel)) return 'affiliate';
    return null;
  };
  const seen = new Set();
  const ctas = [];
  for (const el of document.querySelectorAll('[data-cta], a[href*="//note.com/"], a[href*="coconala.com"], a[rel~="sponsored"]')) {
    const root = el.closest('[data-cta]') ?? el;
    if (seen.has(root)) continue;
    seen.add(root);
    if (root.getAttribute('data-cta') === 'nav' || root.closest('header, footer')) continue;
    const kind = kindOf(root);
    if (!kind) continue;
    const r = root.getBoundingClientRect();
    const shown = isShown(root);
    const top = round(r.top + window.scrollY);
    ctas.push({
      kind,
      placement: root.getAttribute('data-cta-placement') ?? root.closest('[data-cta-placement]')?.getAttribute('data-cta-placement') ?? null,
      label: root.getAttribute('data-cta-label') ?? textOf(root, 30),
      visible: shown,
      top,
      width: round(r.width),
      height: round(r.height),
      firstView: shown && top < vh,
      depthPct: Math.round((top / Math.max(1, docHeight)) * 100),
    });
    if (shown && r.right > vw + TOL) issues.push({ type: 'cta-clip', detail: `${kind} の導線「${textOf(root, 24)}」が画面の右へ ${round(r.right - vw)}px はみ出している` });
  }

  const skeleton = blocks.map((b) => `${b.id}|${b.tag}.${b.cls}|${b.left}|${b.right}|${b.kids.join(',')}`);
  return { vw, vh, docHeight, blocks: blocks.map(({ kids, ...rest }) => rest), issues, hints, ctas, skeleton };
}
