/**
 * strip-note-funnel.mjs — note 記事から「note 導線（funnel）」を機械除去する
 * ---------------------------------------------------------------------------
 * ココナラ納品物（PDF）に note.com / doboku-note の URL や note 商品への誘導が
 * 残ると外部誘導禁止（規約）違反＝アカウントリスク。note 記事を coconala 用に
 * 再利用する前に、以下を除去する:
 *   1. <!-- cta:... --> コメント直後から次の ## 見出し直前までのブロック（CTA 段落＋URL）
 *   2. 裸 URL 行（^https?://）
 *   3. note.com / doboku-note を含む行
 *   4. note 商品へ誘導する文（「…大全/パック/ノート/集/もくじ」＋用意/まとめ/こちら 等）
 * frontmatter は呼び出し側 or ここで除去。H1 は保持（magazine-to-pdf が題名に使う）。
 * ---------------------------------------------------------------------------
 */

/** note 商品誘導と判定する文パターン（1文＝句点まで。行内の一部でも該当文を落とす） */
const PROMO_SENTENCE = new RegExp(
  '[^。\\n]*(?:' +
    '「[^」]*(?:大全|パック|ノート|完成答案集|過去問模範答案集|もくじ|合格ラボ)[^」]*」[^。\\n]*' + // note 商品名 括弧
    '|次の教材とあわせて[^。\\n]*' +
    '|こちら(?:の(?:マガジン|もくじ|記事)|に(?:まとめ|用意))[^。\\n]*' +
    '|(?:マガジン|教材|もくじ)(?:に|で)(?:まとめ|用意|たどれ)[^。\\n]*' +
    // note 文脈・ペイウォール文（coconala では無意味＝除去）
    '|[^。\\n]*(?:有料パート|有料部分|有料エリア|有料記事|ここから先|この続き|続きは)[^。\\n]*' +
    '|[^。\\n]*(?:マガジンの収録記事|収録記事です|本マガジン|テーマ別の各記事)[^。\\n]*' +
  ')。',
  'g',
);

/** frontmatter を除去（--- ... --- の先頭ブロック） */
function stripFrontmatter(md) {
  return md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '');
}

/**
 * note funnel を除去したクリーン本文を返す（H1 は保持）。
 * @param {string} md 生の article.md（frontmatter 含んでよい）
 * @returns {{ clean:string, removed:string[] }} removed=除去した代表行（監査用）
 */
export function stripNoteFunnel(md) {
  const removed = [];
  let lines = stripFrontmatter(md).split('\n');
  const out = [];
  let skipping = false;
  for (const l of lines) {
    if (/^\s*<!--\s*cta:/i.test(l)) { skipping = true; removed.push(l.trim().slice(0, 40)); continue; }
    if (skipping) {
      if (/^#{2,6}\s/.test(l)) { skipping = false; out.push(l); continue; } // 見出しで復帰
      if (l.trim()) removed.push(l.trim().slice(0, 40));
      continue;
    }
    if (/^\s*https?:\/\//.test(l)) { removed.push(l.trim().slice(0, 40)); continue; }
    if (/note\.com|doboku-note/i.test(l)) { removed.push(l.trim().slice(0, 40)); continue; }
    out.push(l);
  }
  // 文レベルの note 商品誘導を除去（段落内の一部でも該当文を落とす）
  let text = out.join('\n').replace(PROMO_SENTENCE, (m) => { removed.push('[promo] ' + m.slice(0, 36)); return ''; });
  // 空行の整理
  text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  return { clean: text, removed };
}

/** クリーン本文に note 参照が残っていないかの最終検査（PDF 化前ゲート） */
export function assertNoFunnel(text) {
  const hits = (text.match(/note\.com|doboku-note|https?:\/\//gi) || []);
  return { ok: hits.length === 0, hits };
}
