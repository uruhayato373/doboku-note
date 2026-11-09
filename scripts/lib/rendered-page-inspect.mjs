/**
 * rendered-page-inspect.mjs — 描画したページで決定的に判定できる崩れを拾う（ブラウザの中で走る関数）。
 *
 * page.evaluate(inspectInPage) で使う。関数の外の変数を参照しない（ブラウザへ文字列で渡るため）。
 * 使う側: scripts/check-rendered-pages.mjs（全ページの一巡）・scripts/standards-visual-review.mjs（基準書の章の目視の前段）。
 * 返す種類: overflow（横はみ出し）・image（読めない画像）・katex・main（本文なし・極端に短い）・markup（記法が生で出る）・mojibake
 */
export function inspectInPage() {
  const vw = document.documentElement.clientWidth;
  const issues = [];
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 1) {
    const isClipped = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true;
      }
      return false;
    };
    const offenders = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      // position:fixed の要素（閉じたドロワー等）は文書の横幅を広げないので原因にしない
      if (r.width === 0 || r.right <= vw + 1 || isClipped(el) || getComputedStyle(el).position === 'fixed') continue;
      // 親もはみ出しているなら親だけを報告する
      const parent = el.parentElement;
      if (parent && parent.getBoundingClientRect().right > vw + 1 && !isClipped(parent) && parent !== document.body) continue;
      const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
      offenders.push(`${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''} (right=${Math.round(r.right)})`);
      if (offenders.length >= 3) break;
    }
    issues.push({ type: 'overflow', detail: `scrollWidth=${sw} > ${vw}: ${offenders.join(' | ')}` });
  }

  for (const img of document.querySelectorAll('img')) {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
      issues.push({ type: 'image', detail: img.currentSrc || img.getAttribute('src') });
    }
  }

  const katex = document.querySelectorAll('.katex-error');
  if (katex.length) issues.push({ type: 'katex', detail: `${katex.length} 件: ${katex[0].textContent.slice(0, 60)}` });

  const main = document.querySelector('main');
  if (!main) {
    issues.push({ type: 'main', detail: '<main> が無い' });
    return issues;
  }
  const clone = main.cloneNode(true);
  clone.querySelectorAll('.katex, script, style, pre, code, noscript, svg, textarea').forEach((n) => n.remove());
  const text = clone.textContent ?? '';
  if (text.replace(/\s/g, '').length < 150) issues.push({ type: 'main', detail: `本文 ${text.replace(/\s/g, '').length} 字` });
  const patterns = [
    [/<\/?[A-Z][A-Za-z]+[\s/>]/, 'JSX タグ'],
    [/\$\$|\\(?:frac|times|mathrm|text|sqrt|left|right)\b/, '数式記法'],
    [/\*\*[^*\s][^*]{0,40}\*\*/, '太字記法'],
    [/\]\((?:https?:|\/)/, 'リンク記法'],
    [/^#{2,4} /m, '見出し記法'],
    [/\{\/\*|\*\/\}/, 'MDX コメント'],
    [/^\s*\|.*\|.*\|\s*$/m, '表記法'],
    // 段落につながって 1 行になった表（DN-0916: `| 項目 | 記入欄 ||---|---||`）は行頭・行末で切れない
    [/\|\s*:?-{3,}:?\s*\|/, '表記法（区切り行）'],
  ];
  for (const [re, label] of patterns) {
    const m = text.match(re);
    if (m) {
      const at = Math.max(0, m.index - 20);
      issues.push({ type: 'markup', detail: `${label}: …${text.slice(at, m.index + 40).replace(/\s+/g, ' ')}…` });
    }
  }
  if (text.includes('�')) issues.push({ type: 'mojibake', detail: 'U+FFFD' });
  return issues;
}
