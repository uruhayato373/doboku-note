/**
 * cta-stack-inspect.mjs — 本文の列で縦に続けて並ぶ商品導線（転職・note・ココナラ・AdSense）の幅と左端がそろっているかを測る（ブラウザの中で走る関数）。
 * ---------------------------------------------------------------------------
 * 規則の正本は src/lib/cta-stack.ts（置かれた列の幅いっぱい・上に見出しなし）。記事末で横長バナー（740px）・note（300px の中央寄せ）・
 * ココナラ（2 列の片側）がばらばらだった（2026-11-16 運営者指摘・67 種類 × 2 幅のうち 43 で不一致）。
 * page.evaluate(inspectCtaStacksInPage) で使う。関数の外の変数を参照しない（ブラウザへ文字列で渡るため）。
 * 使う側: scripts/reports/site-visual-review.mjs（機械で決まる崩れ cta-width）・e2e/cta.spec.ts。
 *
 * 幅は導線を包む data-cta-stack の箱（CTA_STACK_CLASS を当てた要素）で測り、無ければ導線そのもので測る。data-cta-stack="exempt" は規則の外（トップの全幅の見出し画像）。
 * 判定: 右の欄・ヘッダー・フッター・ナビの外にある、見えている導線を上から並べ、横に並ぶもの（縦の範囲が重なる＝2 列のカードなど）は 1 行にまとめる。
 * 1 つだけの行が続き（間が 160px 以下）、幅か左端が 12px を超えて違えば不一致。
 * 離れた導線も、同じ置き場（記事カードの中・外）の 1 つだけの行の多数派（2 個以上）の幅・左端から 12px を超えて違えば不一致（本文中の note カードだけ狭く左寄せ、を拾う）。
 * 返すもの: { checked: 見た導線の数, mismatches: [{ upper, lower, detail }] }
 */
export function inspectCtaStacksInPage() {
  const GAP = 160;
  const TOL = 12;
  const isShown = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };
  const isProduct = (root) => {
    if (root.hasAttribute('data-adsense') || root.hasAttribute('data-article-affiliate')) return true;
    const cta = root.getAttribute('data-cta') ?? '';
    const a = root.tagName === 'A' ? root : root.querySelector('a');
    const href = a?.href ?? '';
    return cta.startsWith('note') || cta === 'coconala' || cta === 'affiliate' || cta === 'career-need'
      || /\/\/note\.com\//.test(href) || /coconala\.com/.test(href) || /sponsored/.test(a?.rel ?? '');
  };
  const seen = new Set();
  const items = [];
  for (const el of document.querySelectorAll('[data-adsense], [data-article-affiliate], [data-cta], a[href*="//note.com/"], a[href*="coconala.com"], a[rel~="sponsored"]')) {
    const root = el.closest('[data-adsense], [data-article-affiliate]') ?? el.closest('[data-cta]') ?? el;
    if (root.closest('header, footer, aside:not([data-adsense]), nav') || root.getAttribute('data-cta') === 'nav') continue;
    if (!isProduct(root) || !isShown(root)) continue;
    // 幅は見た目の枠で測る。data-cta-stack の箱に導線が 2 つ以上（2 列のカード）なら箱ごと 1 つ、1 つなら箱の中で枠（線・地・影）を持つ一番外の要素
    // （箱の中で細いカードが中央に置かれていても見逃さない・バナーの内側の余白で誤らない）。exempt は規則の外
    const stack = root.closest('[data-cta-stack]');
    if (stack?.getAttribute('data-cta-stack') === 'exempt') continue;
    const links = stack ? [...stack.querySelectorAll('a[href]')].filter((a) => isShown(a) && a.getBoundingClientRect().width >= 120) : [];
    let box = root;
    if (stack && links.length > 1) box = stack;
    else if (stack) {
      for (let a = root; a && a !== stack.parentElement; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (parseFloat(s.borderLeftWidth) > 0 || s.boxShadow !== 'none' || (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent')) box = a;
      }
    }
    if (seen.has(box)) continue;
    seen.add(box);
    const r = box.getBoundingClientRect();
    if (r.width < 120) continue; // 本文中の文字リンク
    const label = `${root.getAttribute('data-adsense') ? 'adsense:' + root.getAttribute('data-adsense') : (root.getAttribute('data-cta-placement') ?? root.closest('[data-cta-placement]')?.getAttribute('data-cta-placement') ?? root.getAttribute('data-cta') ?? 'cta')}「${(root.textContent ?? '').trim().slice(0, 16)}」`;
    // 置き場（折りたたみの中・記事カードの中・外）。中ほど余白の分だけ狭いので、多数派との比較は同じ置き場どうしで行う
    const container = box.closest('details') ? 'details' : box.closest('article') ? 'article' : 'page';
    items.push({ label, container, top: r.top + scrollY, bottom: r.bottom + scrollY, left: Math.round(r.left), width: Math.round(r.width) });
  }
  items.sort((a, b) => a.top - b.top);
  const rows = [];
  for (const it of items) {
    const row = rows[rows.length - 1];
    if (row && it.top < row.bottom - 2) { row.items.push(it); row.bottom = Math.max(row.bottom, it.bottom); } else rows.push({ items: [it], top: it.top, bottom: it.bottom });
  }
  const mismatches = [];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    if (a.items.length !== 1 || b.items.length !== 1 || b.top - a.bottom > GAP) continue;
    const [x] = a.items, [y] = b.items;
    if (x.container !== y.container) continue;
    if (Math.abs(x.width - y.width) > TOL || Math.abs(x.left - y.left) > TOL) {
      mismatches.push({ upper: x.label, lower: y.label, detail: `${x.label}（幅 ${x.width}px・左 ${x.left}px）の直後の ${y.label}（幅 ${y.width}px・左 ${y.left}px）と幅か左端がそろっていない` });
    }
  }
  // 離れて置かれた導線も、同じページの 1 つで置かれた導線の多数派の幅・左端とそろえる（本文中の note カードだけ 672px で左寄せだった）
  const flagged = new Set(mismatches.flatMap((m) => [m.upper, m.lower]));
  const key = (it) => `${Math.round(it.width / TOL)}:${Math.round(it.left / TOL)}`;
  for (const container of ['details', 'article', 'page']) {
    const singles = rows.filter((row) => row.items.length === 1).map((row) => row.items[0]).filter((it) => it.container === container);
    const counts = new Map();
    for (const it of singles) counts.set(key(it), (counts.get(key(it)) ?? 0) + 1);
    const [modeKey, modeCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    const mode = singles.find((it) => key(it) === modeKey);
    if (!mode || modeCount < 2) continue;
    for (const it of singles) {
      if (flagged.has(it.label) || (Math.abs(it.width - mode.width) <= TOL && Math.abs(it.left - mode.left) <= TOL)) continue;
      mismatches.push({ upper: mode.label, lower: it.label, detail: `${it.label}（幅 ${it.width}px・左 ${it.left}px）が、このページの導線の多数派（幅 ${mode.width}px・左 ${mode.left}px・${modeCount} 個）とそろっていない` });
    }
  }
  return { checked: items.length, mismatches };
}

/**
 * 記事の一覧に挟んだインフィード広告（[data-adsense^="inFeed"]・ul の li か grid の div・src/lib/feed-ads.ts）を描画した画面で点検する（ブラウザの中で走る関数）。
 * 見えている広告ごとに、前後の兄弟が見えている一覧の項目であること（先頭・末尾・広告の隣に置かない）と、幅が前後の項目と 12px 以内でそろうことを見る。
 * 返すもの: { checked: 見えている広告の数, total: 広告の数, mismatches: [{ detail }] }。1 ページ 3 枠を超えたら mismatches に入れる。
 */
export function inspectFeedAdsInPage() {
  const TOL = 12;
  const shown = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const ads = [...document.querySelectorAll('[data-adsense^="inFeed"]')];
  const mismatches = [];
  if (ads.length > 3) mismatches.push({ detail: `インフィード広告が ${ads.length} 枠（1 ページ 3 枠まで）` });
  let checked = 0;
  for (const ad of ads) {
    if (!shown(ad)) continue;
    checked += 1;
    const items = [...ad.parentElement.children].filter((el) => shown(el));
    const index = items.indexOf(ad);
    const neighbors = [items[index - 1], items[index + 1]];
    const slot = ad.getAttribute('data-adsense');
    if (neighbors.some((n) => !n || n.hasAttribute('data-adsense'))) mismatches.push({ detail: `${slot} が一覧の先頭・末尾か、広告の隣にある` });
    const w = ad.getBoundingClientRect().width;
    for (const n of neighbors.filter(Boolean)) {
      const nw = n.getBoundingClientRect().width;
      if (Math.abs(nw - w) > TOL) mismatches.push({ detail: `${slot}（幅 ${Math.round(w)}px）が隣の項目（幅 ${Math.round(nw)}px）とそろっていない` });
    }
  }
  return { checked, total: ads.length, mismatches };
}
