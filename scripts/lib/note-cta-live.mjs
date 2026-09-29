/**
 * note-cta-live.mjs — 原稿に入れた販売導線（<!-- cta:<id> -->）が note の公開記事に出ているかを判定する（DN-0268・DN-0438）。
 *
 * なぜ要るか: 導線は note-append-cta で公開記事へ直接差し込むことがあり、週次の同期の記録（sync-log）には残らない。
 * 「本文が同期済みか」から推測すると、公開済みの導線まで「未反映」に見える（2026-09-29 に 245 本すべてが黄色だった）。
 * そこで公開 API の本文に、原稿の導線ブロックにあるリンク先が、原稿どおりの順番・位置で出ているかを直接見る。
 *
 * 導線の種類（cta の id）ごとに、原稿で最初のブロックを 1 つ照合する。
 *   ok       … リンク先がすべて原稿と同じ順番で出ている（原稿で最初の見出しより前なら、公開記事でも前）
 *   missing  … 出ていないリンク先がある
 *   order    … すべて出ているが順番が違う
 *   position … 順番は合っているが、原稿では最初の見出しの前なのに公開記事では後ろ
 * 有料記事の公開 API は無料部分までしか返さないので、有料記事は最初の見出しより前のブロックだけを照合する。
 */

const MARKER = /<!-- cta:([a-z0-9-]+) -->/;
const LINK = /https?:\/\/(?:coconala\.com\/services\/\d+|note\.com\/[^\s)]+)/g;
const RANK = { ok: 0, position: 1, order: 2, missing: 3 };

/**
 * 原稿から、導線の種類ごとに最初のブロックのリンク先と「最初の見出しより前か」を取り出す。
 * ブロックはマーカーから次の見出し・区切り線・次のマーカーまで。リンクの無いブロックは照合しない。
 * @param {string} markdown
 * @param {{ paid?: boolean }} [opts] 有料記事なら最初の見出しより前のブロックだけ
 * @returns {{ id: string, links: string[], beforeFirstHeading: boolean }[]}
 */
export function extractCtaExpectations(markdown, { paid = false } = {}) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const fmEnd = lines[0] === '---' ? lines.indexOf('---', 1) : -1;
  const firstHeading = lines.findIndex((l, i) => i > fmEnd && /^##\s/.test(l));
  const seen = new Set();
  const out = [];
  lines.forEach((line, start) => {
    const id = line.match(MARKER)?.[1];
    if (!id || seen.has(id)) return;
    seen.add(id);
    const beforeFirstHeading = firstHeading < 0 || start < firstHeading;
    if (paid && !beforeFirstHeading) return;
    const links = [];
    for (let i = start + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^#{1,6}\s/.test(l) || /^-{3,}\s*$/.test(l) || MARKER.test(l)) break;
      for (const m of l.matchAll(LINK)) links.push(m[0]);
    }
    if (links.length) out.push({ id, links, beforeFirstHeading });
  });
  return out;
}

/** リンク先の照合用の鍵（ココナラは services/番号、note は記事・マガジンの末尾）。 */
function linkKey(url) {
  const svc = url.match(/services\/(\d+)/)?.[1];
  if (svc) return `services/${svc}`;
  return url.replace(/[?#].*$/, '').replace(/\/$/, '').split('/').pop();
}

/**
 * 公開 API の本文（HTML）に、1 つの導線ブロックが期待どおりに出ているか。
 * @returns {{ state: 'ok'|'missing'|'order'|'position', missing: string[] }}
 */
export function classifyCtaLive(liveHtml, expected) {
  const positions = expected.links.map((u) => ({ u, at: liveHtml.indexOf(linkKey(u)) }));
  const missing = positions.filter((p) => p.at < 0).map((p) => p.u);
  if (missing.length) return { state: 'missing', missing };
  for (let i = 1; i < positions.length; i++) {
    if (positions[i].at < positions[i - 1].at) return { state: 'order', missing: [] };
  }
  const h2 = liveHtml.search(/<h2[\s>]/);
  if (expected.beforeFirstHeading && h2 >= 0 && positions[0] && positions[0].at > h2) return { state: 'position', missing: [] };
  return { state: 'ok', missing: [] };
}

/**
 * 記事 1 本の全導線を照合し、いちばん悪い状態を記事の状態にする。
 * @returns {{ state: 'ok'|'missing'|'order'|'position', byId: Record<string, {state: string, missing: string[]}> }}
 */
export function classifyArticleCtas(liveHtml, expectations) {
  const byId = {};
  let state = 'ok';
  for (const e of expectations) {
    const r = classifyCtaLive(liveHtml, e);
    byId[e.id] = r;
    if (RANK[r.state] > RANK[state]) state = r.state;
  }
  return { state, byId };
}
