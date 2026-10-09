/**
 * figure-review.mjs — 記事図クロップの品質ループ（/figure-quality-loop）の共通部品。
 *
 * ループ: 機械の兆候（OCR の needs・画素の EDGE_CUT / STRAY_*）で判定待ちを選ぶ → 目で判定して直す →
 * 判定を台帳に画像のハッシュつきで記録する → 次回からその図は判定待ちに上がらない。
 * 画像を差し替えるとハッシュが変わって記録は効かなくなり、兆候があれば判定待ちへ戻る
 * （古い画像に付けた「ok」が新しい画像を素通りさせない）。
 *
 * なぜ要るか（2026-10-06）: 画素検査の EDGE_CUT は 212 枚・337 件が「情報のみ」で誰にも読まれず、
 * 目で見た判定もどこにも残らなかった。上位 4 枚を見ると 3 枚は図やラベルが縁で切れていたのに
 * provenance は全部 needs:ok だった。判定を残さないと何度回しても同じ図が上がり続けて収束しない。
 *
 * 判定（verdict）:
 *   ok                 … 目で見て問題なし（切り直し・切り出し直しの後の確認を含む）
 *   needs-source       … 図本体が縁で切れている等、今の画像の切り直しでは直らない → 元 PDF からの切り出し直し待ち
 *   source-unavailable … 元 PDF から切り出し直そうとしたが原典が手元に無い（入手待ち・ループの対象外）
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import matter from 'gray-matter';

export const LEDGER_FILE = '.claude/state/quality/figure-review-ledger.json';
export const VERDICTS = ['ok', 'needs-source', 'source-unavailable'];
export const ACTIONS = ['none', 'recrop', 'reextract'];

/** 判定待ちに載せる兆候と優先度（小さいほど先に回す）。ここに無い兆候（EDGE_LINE 等の正当な縁接触）は載せない */
export const SIGNAL_PRIORITY = {
  'recrop-urgent': 1, // OCR: 答え漏らし
  recrop: 1, // OCR: 問題文・選択肢の写り込み
  STRAY_SLIVER: 1, // 画素: 隣の図の切れ端
  EDGE_CUT: 2, // 画素: 縁で線が切れている疑い
  LOW_RES: 2, // 画素数: 長辺が image-limits の figureMinLongSide 未満（スマホ 2x 表示でぼやける・DN-0577）
  'recrop-review': 3, // OCR: 句点あり（凡例の可能性）
  STRAY_LABEL: 3, // 画素: 縁の離れ島（見出し・軸・写り込みのいずれか）
};

const IMG_EXT = ['webp', 'png', 'jpg', 'jpeg'];

/**
 * 写真とみなす濃淡のエントロピー（sharp の greyscale().stats().entropy）。写真は約 7、線画・スキャン図は 5 前後以下（2026-10-06 実測:
 * 機材写真 7.0〜7.3／スキャン図 0.8〜5.1）。画素検査（EDGE_CUT 等）は線画前提で、空や地面が縁まで続く写真を「切断」と誤検出し、
 * しかも縁にかかる線が長いので判定待ちの先頭に並ぶ（最初の 8 枚のうち 3 枚が写真だった）。写真は画素の兆候を使わず OCR の兆候だけで選ぶ。
 * check-figure-crop-integrity の写真スキップ（白率 < 50%）は空の明るい写真を通してしまうので、こちらで補う。
 */
export const PHOTO_ENTROPY = 6.5;

/** 画像のハッシュ（先頭 16 桁）。判定の記録をこの画像に結び付ける */
export function fileSha(absPath) {
  return createHash('sha256').update(readFileSync(absPath)).digest('hex').slice(0, 16);
}

export function emptyLedger() {
  return {
    schemaVersion: 1,
    note: '図クロップを目で判定した記録（/figure-quality-loop が書く）。sha が今の画像と一致する記録だけが効く。手で編集しない（scripts/figure-review-queue.mjs record を使う）',
    figures: {},
  };
}

/** 台帳の記録が今の画像に効いていれば返す（画像を差し替えるとハッシュが変わり null） */
export function validEntry(ledger, figKey, sha) {
  const e = ledger?.figures?.[figKey];
  return e && e.sha === sha ? e : null;
}

/** 判定 → provenance の needs（build-figure-provenance.mjs が台帳を読んで上書きする） */
export function needsFromVerdict(verdict) {
  return { ok: 'ok', 'needs-source': 'reextract', 'source-unavailable': 'rescan-need-source' }[verdict] ?? null;
}

/**
 * 1 枚の兆候。needs は provenance（OCR）、violations は画素検査（analyzeImage）の結果。写真（entropy ≥ PHOTO_ENTROPY）は画素の兆候を使わない。
 * imgSize と minLongSide を渡すと、長辺が minLongSide 未満の図に LOW_RES を付ける（2026-10-07: 260×280 の図が「sharp」判定で素通りしていた）。
 */
export function signalsOf({ needs = null, violations = [], entropy = 0, imgSize = null, minLongSide = 0 }) {
  const out = [];
  if (needs && SIGNAL_PRIORITY[needs]) out.push({ signal: needs, detail: 'OCR（figure-text-audit）' });
  if (imgSize && minLongSide && Math.max(...imgSize) < minLongSide) out.push({ signal: 'LOW_RES', detail: `長辺 ${Math.max(...imgSize)}px < ${minLongSide}px（${imgSize.join('×')}）` });
  if (entropy >= PHOTO_ENTROPY) return out;
  for (const v of violations) {
    if (SIGNAL_PRIORITY[v.rule]) out.push({ signal: v.rule, side: v.side, detail: v.detail, ...(v.edgeFrac != null ? { edgeFrac: v.edgeFrac } : {}) });
  }
  return out;
}

/** 並び順の鍵: 優先度の小さい順 → EDGE_CUT は縁にかかる線が長い順（長いほど図本体の切断の可能性が高い） */
export function priorityOf(signals) {
  const tier = Math.min(...signals.map((s) => SIGNAL_PRIORITY[s.signal] ?? 9));
  const edge = Math.max(0, ...signals.map((s) => s.edgeFrac ?? 0));
  return { tier, edge };
}

/**
 * 判定待ちと切り出し直し待ちを作る。
 * figures: [{ figKey, sha, live, needs, violations }]（live = 公開記事が本文で参照している）
 * trusted: Map<figKey, needs> … 画像が変わっていない手動判定（figure-sources.json の manual_needs）
 */
export function buildQueue({ figures, ledger, trusted = new Map(), minLongSide = 0 }) {
  const review = [];
  const reextract = [];
  const counts = {
    figures: figures.length, live: 0, flagged: 0,
    ok: 0, needsSource: 0, sourceUnavailable: 0, trusted: 0, stale: 0,
    pendingReview: 0, pendingReextract: 0,
  };
  for (const f of figures) {
    if (!f.live) continue;
    counts.live++;
    const signals = signalsOf({ ...f, minLongSide });
    if (signals.length) counts.flagged++;
    const entry = validEntry(ledger, f.figKey, f.sha);
    // 画素数（px）を残していない判定は LOW_RES を見ていない（2026-10-07 より前の記録）→ 低解像度なら判定し直す
    const lowResUnseen = entry?.verdict === 'ok' && !entry.px && signals.some((s) => s.signal === 'LOW_RES');
    if (entry && !lowResUnseen) {
      if (entry.verdict === 'ok') counts.ok++;
      else if (entry.verdict === 'needs-source') { counts.needsSource++; reextract.push({ ...f, signals, entry }); }
      else counts.sourceUnavailable++;
      continue;
    }
    if (ledger?.figures?.[f.figKey]) counts.stale++; // 記録はあるが画像が変わった
    if (!signals.length) continue;
    const manual = trusted.get(f.figKey);
    // manual_needs の ok は LOW_RES より前の目視（画素数を見ていない）→ 低解像度なら判定し直す
    if (manual && !(manual === 'ok' && signals.some((s) => s.signal === 'LOW_RES'))) {
      if (manual === 'rescan-need-source') counts.sourceUnavailable++;
      else counts.trusted++;
      continue;
    }
    review.push({ ...f, signals, ...priorityOf(signals) });
  }
  review.sort((a, b) => a.tier - b.tier || b.edge - a.edge || a.figKey.localeCompare(b.figKey));
  reextract.sort((a, b) => a.figKey.localeCompare(b.figKey));
  counts.pendingReview = review.length;
  counts.pendingReextract = reextract.length;
  return { review, reextract, counts };
}

/** 記事（slug = 資格/記事）の MDX を探して published と本文を返す（provenance と判定待ちで同じ判定を使う） */
export function articleInfo(postsRoot, slug, cache = new Map()) {
  if (cache.has(slug)) return cache.get(slug);
  const cands = [
    join(postsRoot, slug, 'article.mdx'),
    join(postsRoot, `${slug}.mdx`),
    join(postsRoot, slug.replace(/\//g, '-'), 'article.mdx'),
  ];
  let info = { found: false, published: false, content: '', path: null };
  for (const p of cands) {
    if (!existsSync(p)) continue;
    try {
      const { data, content } = matter(readFileSync(p, 'utf8'));
      info = { found: true, published: data.published === true, content, path: p };
    } catch { /* frontmatter が壊れた記事は未掲載扱い */ }
    break;
  }
  cache.set(slug, info);
  return info;
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 本文が参照している拡張子（webp / png / svg / jpg / jpeg）。参照していなければ null */
export function referencedExt(content, name) {
  const m = content.match(new RegExp(`/${escRe(name)}\\.(webp|png|svg|jpg|jpeg)\\b`, 'i'));
  return m ? m[1].toLowerCase() : null;
}

/** 読者に配信している画像の拡張子: 本文が参照する拡張子を優先し、無ければ webp → png → jpg の順で実在するもの */
export function servedExt(baseAbs, refExt, exists = existsSync) {
  if (refExt && IMG_EXT.includes(refExt) && exists(`${baseAbs}.${refExt}`)) return refExt;
  return IMG_EXT.find((e) => exists(`${baseAbs}.${e}`)) ?? null;
}

const toPosix = (p) => p.split(sep).join('/');

/** 記事の img/ にあるラスター画像（png/webp/jpg）の図キー（資格/記事/img/名前・拡張子なし）。ogp は除く */
export function listFigureKeys(siteRoot) {
  const bases = new Set();
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!/\.(png|webp|jpg|jpeg)$/i.test(e.name) || /^ogp\./i.test(e.name)) continue;
      const rel = toPosix(relative(siteRoot, full));
      if (!/\/img\/[^/]+$/.test(rel)) continue;
      bases.add(rel.replace(/\.(png|webp|jpg|jpeg)$/i, ''));
    }
  };
  walk(siteRoot);
  return [...bases].sort();
}

/** 図 1 枚の基本情報（公開記事で使用中か・配信している画像）。live = 公開記事の本文がラスター画像として参照している */
export function describeFigure({ siteRoot, repoRoot, figKey, cache = new Map() }) {
  const parts = figKey.split('/');
  const slug = parts.slice(0, 2).join('/');
  const name = parts[parts.length - 1];
  const art = articleInfo(siteRoot, slug, cache);
  const refExt = art.found ? referencedExt(art.content, name) : null;
  const baseAbs = join(siteRoot, figKey);
  const ext = servedExt(baseAbs, refExt);
  const abs = ext ? `${baseAbs}.${ext}` : null;
  return {
    figKey, name, ext, abs, slug,
    img: abs ? toPosix(relative(repoRoot, abs)) : null,
    mdx: art.path ? toPosix(relative(repoRoot, art.path)) : null,
    live: Boolean(art.published && refExt && refExt !== 'svg' && abs),
  };
}

/** MDX 本文で name の <img>/<ArticleImage> の width/height を w×h に合わせる。変えた数と新しい本文を返す */
export function syncImageDims(raw, name, w, h) {
  let changed = 0;
  const tagRe = new RegExp(`<(?:img|ArticleImage)\\b[^>]*?/${escRe(name)}\\.(?:webp|png|jpg|jpeg)\\b[^>]*>`, 'g');
  const out = raw.replace(tagRe, (tag) => {
    const next = tag
      .replace(/(\bwidth=[{"])\d+([}"])/, `$1${w}$2`)
      .replace(/(\bheight=[{"])\d+([}"])/, `$1${h}$2`);
    if (next !== tag) changed++;
    return next;
  });
  return { raw: out, changed };
}

/** 判定 1 件の検査。誤りの説明（日本語）の配列を返す。空なら正しい */
export function validateVerdict(v) {
  const errs = [];
  if (!v || typeof v !== 'object') return ['判定がオブジェクトでない'];
  if (typeof v.figKey !== 'string' || !v.figKey.includes('/img/')) errs.push(`figKey が不正: ${v.figKey}`);
  if (!VERDICTS.includes(v.verdict)) errs.push(`${v.figKey}: verdict は ${VERDICTS.join(' / ')} のいずれか（${v.verdict}）`);
  if (!ACTIONS.includes(v.action ?? 'none')) errs.push(`${v.figKey}: action は ${ACTIONS.join(' / ')} のいずれか（${v.action}）`);
  if (typeof v.reason !== 'string' || v.reason.trim().length < 4) errs.push(`${v.figKey}: reason（判定の根拠）が無い`);
  if (v.action === 'reextract' && !(v.source && v.source.pdf && Number.isInteger(v.source.page))) {
    errs.push(`${v.figKey}: 切り出し直し（reextract）は source.pdf と source.page が必要（次に辿り直さないため）`);
  }
  if (v.verdict === 'needs-source' && v.action && v.action !== 'none') {
    errs.push(`${v.figKey}: needs-source は直していない判定なので action は none`);
  }
  return errs;
}
