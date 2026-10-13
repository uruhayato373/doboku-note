/**
 * figure-references.mjs — 書籍由来の記事で、図番号・図名・本文の参照がずれていないかを判定する純関数（DN-0557）。
 *
 * 記事だけで決まる判定（CI で回せる）:
 *   dup-number  同じ「図X.Y」が 2 枚以上の ArticleImage に付いている
 *   split-mark  図名に分割の印（上部）（下部）（詳細）が付いている（1 枚の図を割った切れ端）
 *   alt-number  alt が別の図番号で始まっている（caption と食い違う）
 *   ref-section 本文の「図X.Y」が、同じ節（直近の見出し）にある図を指していない
 * 書籍 OCR との突合（市販書籍の図名は git に置けないので手元／Drive vault が要る）:
 *   ocr-number  caption の図番号が、記事の sources に挙げた書籍のどれの OCR にも無い
 *   ocr-name    図番号は在るが、図名が OCR の図名と食い違う
 */

const FIG_NUM = /図\s*(\d+)\s*[.．]\s*(\d+)/;
export const SPLIT_MARKS = ['（上部）', '（下部）', '（詳細）', '(上部)', '(下部)', '(詳細)'];

export function figKey(a, b) { return `${Number(a)}.${Number(b)}`; }

/** 図名の比較用の正規形: 空白・記号・括弧を落とし、全角英数を半角にする。 */
export function normalizeFigureName(s) {
  return String(s)
    .normalize('NFKC')
    .replace(/[\s　、，,。．.・･:：;；!！?？「」『』（）()［］\[\]〔〕<>＜＞〈〉\-－―ー—~〜～＝=]/g, '')
    .toLowerCase();
}

function longestCommonSubstring(a, b) {
  if (!a || !b) return 0;
  let best = 0;
  let prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        if (cur[j] > best) best = cur[j];
      }
    }
    prev = cur;
  }
  return best;
}

/** 記事の図名 a と OCR の図名 b が同じ図を指すか。一方が他方を含む、または連続 4 字以上が共通（短い名前は全体が含まれること）。 */
export function figureNamesMatch(a, b) {
  const x = normalizeFigureName(a);
  const y = normalizeFigureName(b);
  if (!x || !y) return false;
  if (x.includes(y) || y.includes(x)) return true;
  const need = Math.min(4, Math.min(x.length, y.length));
  return longestCommonSubstring(x, y) >= need;
}

/** frontmatter を除いた本文の開始行（0 始まり）を返す。 */
function bodyStart(lines) {
  if (lines[0]?.trim() !== '---') return 0;
  for (let i = 1; i < lines.length; i++) if (lines[i].trim() === '---') return i + 1;
  return 0;
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
}

/**
 * MDX 本文を 1 回なめて、図（ArticleImage）と本文中の「図X.Y」参照を取る。
 * 節 = 直近の見出し（H2〜H4）。コードフェンスの中は見ない。
 * @returns {{figures: Array, refs: Array}}
 */
export function parseArticleFigures(text) {
  const lines = text.split(/\r?\n/);
  const figures = [];
  const refs = [];
  let section = '(見出しの前)';
  let sectionNo = 0;
  let inFence = false;
  for (let i = bodyStart(lines); i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const h = line.match(/^(#{2,4})\s+(.*\S)\s*$/);
    if (h) { section = h[2]; sectionNo += 1; continue; }
    if (line.includes('<ArticleImage')) {
      // タグが複数行にまたがる場合は閉じるまで連結する
      let tag = line;
      let j = i;
      while (!/\/>|<\/ArticleImage>/.test(tag) && j + 1 < lines.length && j - i < 8) { j += 1; tag += ' ' + lines[j]; }
      const caption = attr(tag, 'caption') ?? '';
      const alt = attr(tag, 'alt') ?? '';
      const src = attr(tag, 'src') ?? '';
      const cm = caption.match(/^\s*図\s*(\d+)\s*[.．]\s*(\d+)\s*(.*)$/);
      const sm = src.match(/\/figure-(\d+)-(\d+)\.[a-z]+$/);
      const am = alt.match(/^\s*図\s*(\d+)\s*[.．]\s*(\d+)/);
      figures.push({
        line: i + 1, section, sectionNo, src, alt, caption,
        key: cm ? figKey(cm[1], cm[2]) : null,
        name: cm ? cm[3].trim() : caption.replace(/^\s*図\s*/, '').trim(),
        altKey: am ? figKey(am[1], am[2]) : null,
        srcKey: sm ? figKey(sm[1], sm[2]) : null,
      });
      i = j;
      continue;
    }
    for (const m of line.matchAll(/図\s*(\d+)\s*[.．]\s*(\d+)/g)) {
      refs.push({ line: i + 1, section, sectionNo, key: figKey(m[1], m[2]), text: m[0] });
    }
  }
  return { figures, refs };
}

/** 記事だけで決まる不一致。 */
export function checkArticleFigures(text) {
  const { figures, refs } = parseArticleFigures(text);
  const problems = [];
  const byKey = new Map();
  for (const f of figures) {
    if (f.key) { if (!byKey.has(f.key)) byKey.set(f.key, []); byKey.get(f.key).push(f); }
    const mark = SPLIT_MARKS.find((m) => f.caption.includes(m));
    if (mark) problems.push({ kind: 'split-mark', line: f.line, detail: `図名に分割の印 ${mark}: ${f.caption}` });
    if (f.key && f.altKey && f.key !== f.altKey) {
      problems.push({ kind: 'alt-number', line: f.line, detail: `caption は図${f.key}、alt は図${f.altKey}` });
    }
  }
  for (const [key, list] of byKey) {
    if (list.length > 1) {
      problems.push({ kind: 'dup-number', line: list[1].line, detail: `図${key} が ${list.length} 枚（行 ${list.map((x) => x.line).join('・')}）` });
    }
  }
  // 本文の参照先になれるのは、caption の「図X.Y」か、ファイル名 figure-X-Y.svg が示す番号
  const sectionsOf = new Map();
  for (const f of figures) {
    for (const k of new Set([f.key, f.srcKey].filter(Boolean))) {
      if (!sectionsOf.has(k)) sectionsOf.set(k, new Set());
      sectionsOf.get(k).add(f.sectionNo);
    }
  }
  const reported = new Set();
  for (const r of refs) {
    const secs = sectionsOf.get(r.key);
    if (secs?.has(r.sectionNo)) continue;
    const id = `${r.sectionNo}:${r.key}`;
    if (reported.has(id)) continue;
    reported.add(id);
    const where = secs ? `図${r.key} は別の節の図` : `図${r.key} はこの記事に無い`;
    problems.push({ kind: 'ref-section', line: r.line, detail: `本文の「${r.text}」が同じ節（${r.section}）の図を指していない（${where}）` });
  }
  return { figures: figures.length, numbered: figures.filter((f) => f.key).length, refs: refs.length, problems };
}

/**
 * OCR の「（図: 図X.Y 図名。…）」から { 'X.Y' → 図名[] } を作る。図名は最初の「。」「＝」「—」「（」手前まで。
 */
export function parseOcrFigureNames(ocrText) {
  const map = new Map();
  for (const m of ocrText.matchAll(/（図:\s*図\s*(\d+)\s*[.．]\s*(\d+)[\s　]*([^\n]*)/g)) {
    let name = m[3];
    name = name.split(/[。＝]| — |\s—\s/)[0].trim();
    const key = figKey(m[1], m[2]);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(name);
  }
  return map;
}

/**
 * OCR の「（図: 図X.Y 図名。説明）」を、直前のページ印 `<!-- p0122 印字:114 -->` と行番号つきで全部返す（find-book-figure が使う）。
 * page = PDF のページ（p0122 → 122）、printed = 本に印字されたページ（無ければ null）。
 */
export function parseOcrFigureEntries(ocrText) {
  const out = [];
  let page = null;
  let printed = null;
  ocrText.split(/\r?\n/).forEach((line, i) => {
    const pm = line.match(/<!--\s*p(\d+)(?:\s+印字:([^\s>]+))?\s*-->/);
    if (pm) { page = Number(pm[1]); printed = pm[2] ?? null; return; }
    const m = line.match(/（図:\s*図\s*(\d+)\s*[.．]\s*(\d+)[\s　]*(.*)$/);
    if (!m) return;
    const description = m[3].replace(/）\s*$/, '').trim();
    out.push({ key: figKey(m[1], m[2]), name: description.split(/[。＝]| — |\s—\s/)[0].trim(), description, page, printed, line: i + 1 });
  });
  return out;
}

/**
 * 図（番号付き）を、記事が挙げた書籍の OCR 図名と突合する。
 * @param {Array} figures parseArticleFigures().figures
 * @param {Map<string, Map<string,string[]>>} ocrByBook 書籍 id → 図名の索引
 */
export function checkAgainstOcr(figures, ocrByBook) {
  const problems = [];
  let checked = 0;
  for (const f of figures) {
    if (!f.key) continue;
    checked += 1;
    const names = [];
    for (const idx of ocrByBook.values()) for (const n of idx.get(f.key) ?? []) names.push(n);
    if (names.length === 0) {
      problems.push({ kind: 'ocr-number', line: f.line, detail: `図${f.key} が sources の書籍 OCR のどれにも無い（${f.caption}）` });
      continue;
    }
    const base = f.name.replace(/[（(][上下]部[）)]|[（(]詳細[）)]/g, '');
    if (!names.some((n) => figureNamesMatch(base, n))) {
      problems.push({ kind: 'ocr-name', line: f.line, detail: `図${f.key} の図名が書籍と違う: 記事「${f.name}」／書籍「${names.join('」「')}」` });
    }
  }
  return { checked, problems };
}
