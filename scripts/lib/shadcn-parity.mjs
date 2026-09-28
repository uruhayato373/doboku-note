/**
 * shadcn-parity.mjs — shadcn/ui 部品のソースから「部品の単位ごとのクラス」を取り出して比べる（純関数）
 * ---------------------------------------------------------------------------
 * 単位（entity）:
 *   slot:<data-slot>             その要素の既定クラス（className="…" か cn("…", …) の文字列リテラル）
 *   cva:<name>:base              cva(...) の第 1 引数
 *   cva:<name>:<group>.<key>     cva の variants.<group>.<key>
 * クラスは空白で区切った集合として比べる（並び順は見ない）。条件付き・三項演算子の中の文字列も含める。
 * 読み手: scripts/check-shadcn-parity.mjs（DN-0432）
 * ---------------------------------------------------------------------------
 */

/** 文字列リテラル（"…" '…' `…`・テンプレートの ${} は除く）を順に取り出す。 */
function stringLiterals(src) {
  const out = [];
  const re = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  let m;
  while ((m = re.exec(src))) out.push((m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, ' '));
  return out;
}

const tokens = (strs) => [...new Set(strs.join(' ').split(/\s+/).filter(Boolean))].sort();

/** 開き括弧の位置から対応する閉じ括弧までを返す（文字列の中の括弧は数えない）。 */
function balanced(src, open) {
  const pair = { '(': ')', '{': '}', '[': ']' }[src[open]];
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch;
      for (i++; i < src.length && src[i] !== q; i++) if (src[i] === '\\') i++;
      continue;
    }
    if (ch === src[open]) depth++;
    else if (ch === pair && --depth === 0) return src.slice(open, i + 1);
  }
  return src.slice(open);
}

/** className の値（cn(...) の中で className 引数より前、または文字列そのもの）から文字列を集める。 */
function classStrings(attr) {
  const cn = /^\{\s*cn\(/.exec(attr);
  if (cn) {
    const inner = balanced(attr, attr.indexOf('('));
    // cn(badgeVariants({ variant }), className) のように cva を呼ぶだけのものは slot ではなく cva 側で比べる
    return stringLiterals(inner.replace(/\bclassName\b[\s\S]*$/, ''));
  }
  return stringLiterals(attr);
}

/** ソース 1 本の entity → クラス集合。 */
export function extractEntities(src) {
  const text = String(src).replace(/\r\n/g, '\n');
  const out = {};

  // cva
  for (const m of text.matchAll(/const\s+(\w+)\s*=\s*cva\(/g)) {
    const args = balanced(text, m.index + m[0].length - 1);
    const body = args.slice(1, -1);
    const firstComma = (() => {
      const lit = /^\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/.exec(body);
      return lit ? lit[0].length : -1;
    })();
    if (firstComma > 0) out[`cva:${m[1]}:base`] = tokens(stringLiterals(body.slice(0, firstComma)));
    const vAt = body.indexOf('variants:');
    if (vAt >= 0) {
      const variants = balanced(body, body.indexOf('{', vAt));
      for (const g of variants.slice(1, -1).matchAll(/(\w+)\s*:\s*\{/g)) {
        const group = balanced(variants.slice(1, -1), g.index + g[0].length - 1);
        if (!/^\{\s*("?[\w-]+"?)\s*:/.test(group)) continue;
        for (const k of group.slice(1, -1).matchAll(/(?:^|,|\n)\s*"?([\w-]+)"?\s*:\s*((?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)(?:\s*\+?\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'))*)/g)) {
          out[`cva:${m[1]}:${g[1]}.${k[1]}`] = tokens(stringLiterals(k[2]));
        }
      }
    }
  }

  // data-slot ごとの className（同じ要素の開きタグの中）
  for (const m of text.matchAll(/data-slot=["']([\w-]+)["']/g)) {
    const tagStart = text.lastIndexOf('<', m.index);
    let end = m.index;
    let depth = 0;
    for (; end < text.length; end++) {
      const ch = text[end];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0) break;
    }
    const tag = text.slice(tagStart, end);
    const cls = /className=(\{[\s\S]*|"[^"]*"|'[^']*')/.exec(tag);
    if (!cls) continue;
    const attr = cls[1].startsWith('{') ? balanced(cls[1], 0) : cls[1];
    const key = `slot:${m[1]}`;
    out[key] = tokens([...(out[key] ?? []), ...classStrings(attr)]);
  }
  return out;
}

/** 公式（ref）と自前（ours）の entity ごとの差分。どちらかにしか無い entity も返す。 */
export function diffEntities(ref, ours) {
  const diffs = [];
  for (const key of new Set([...Object.keys(ref), ...Object.keys(ours)])) {
    const a = new Set(ref[key] ?? []);
    const b = new Set(ours[key] ?? []);
    const missing = [...a].filter((t) => !b.has(t)).sort();
    const extra = [...b].filter((t) => !a.has(t)).sort();
    if (!(key in ours)) diffs.push({ entity: key, kind: 'entity-missing', missing, extra: [] });
    else if (!(key in ref)) diffs.push({ entity: key, kind: 'entity-extra', missing: [], extra });
    else if (missing.length || extra.length) diffs.push({ entity: key, kind: 'classes', missing, extra });
  }
  return diffs.sort((x, y) => x.entity.localeCompare(y.entity));
}
