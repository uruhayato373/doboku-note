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
 *   5. note 専用セクション（印刷用PDF の案内＝PDF を読んでいる人には無意味）
 *   6. 著者オーソリティバナー（note 記事用の画像。PDF では画像が解決できず alt だけ残る）
 *   7. 上記の除去で**中身が空になった見出し/ラベル**（2026-08-06 追加）
 * frontmatter は呼び出し側 or ここで除去。H1 は保持（magazine-to-pdf が題名に使う）。
 *
 * なぜ 7 が要るか（2026-08-06 実測）:
 *   `**関連リンク**` のリンク行は doboku-note を含むので 3 で消えるが、**ラベルだけが残る**。
 *   結果、納品 PDF 16 冊のうち 10 冊が「関連リンク」の一語で終わり、うち 3 冊は
 *   その一語だけの空白ページが最終ページになっていた（顧客が最後に見る面）。
 *   除去は「行単位」で正しく動いていたが、**節が空になったこと**を誰も見ていなかった。
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

/** note 専用セクションの見出し（この ## から次の ## / EOF まで丸ごと落とす） */
const NOTE_ONLY_HEADING = /^#{2,6}\s*印刷用PDF/;

/**
 * note 記事用の著者バナー画像（PDF では解決できず alt テキストだけが残る）と、
 * その定型キャプション。キャプションは note マガジン CTA の直前に置かれるため、
 * URL 行だけを消すと**宣伝文だけが宙に浮く**（2026-08-06 実測）。
 * 文面は author-authority-banner.md の SSOT 由来の固定文なので直接マッチしてよい。
 */
const AUTHOR_BANNER = /!\[[^\]]*\]\([^)]*figure-author-authority[^)]*\)|上位資格の分析力[・･]発注者として書類を評価してきた目/;

/** 見出し(#…)か、単独行の太字ラベル(**…**)か */
function labelLevel(line) {
  const h = line.match(/^(#{1,6})\s+\S/);
  if (h) return h[1].length;
  if (/^\*\*[^*]+\*\*\s*$/.test(line.trim())) return 99; // 太字ラベルは最下位扱い
  return null;
}

/** 区切り線・空行だけの行か（＝節の中身とは見なさない） */
const isFiller = (l) => l.trim() === '' || /^-{3,}$/.test(l.trim());

/**
 * 中身が空になった見出し／太字ラベルを落とす。
 * 「次に中身のある行が来る前に、同格以上の見出しか EOF に当たる」なら空と判定する。
 * 収束するまで繰り返す（空節が入れ子になっている場合に 1 回では取り切れないため）。
 */
function dropEmptySections(text) {
  let lines = text.split('\n');
  for (let pass = 0; pass < 5; pass++) {
    const keep = new Array(lines.length).fill(true);
    let dropped = 0;
    for (let i = 0; i < lines.length; i++) {
      const lv = labelLevel(lines[i]);
      if (lv == null) continue;
      let hasBody = false;
      for (let j = i + 1; j < lines.length; j++) {
        if (isFiller(lines[j])) continue;
        const lv2 = labelLevel(lines[j]);
        if (lv2 != null && lv2 <= lv) break; // 同格以上の見出し＝この節は空
        hasBody = true;
        break;
      }
      if (!hasBody) { keep[i] = false; dropped++; }
    }
    if (!dropped) break;
    lines = lines.filter((_, i) => keep[i]);
  }
  return lines.join('\n');
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
  let skippingNoteOnly = false;
  for (const l of lines) {
    // note 専用セクション（印刷用PDF 案内）は次の見出しまで丸ごと落とす
    if (NOTE_ONLY_HEADING.test(l)) { skippingNoteOnly = true; removed.push('[note-only] ' + l.trim().slice(0, 30)); continue; }
    if (skippingNoteOnly) {
      if (/^#{2,6}\s/.test(l)) { skippingNoteOnly = false; } // 次の見出しで復帰（この行は下で通常処理）
      else { if (l.trim()) removed.push(l.trim().slice(0, 40)); continue; }
    }
    if (/^\s*<!--\s*cta:/i.test(l)) { skipping = true; removed.push(l.trim().slice(0, 40)); continue; }
    if (skipping) {
      if (/^#{2,6}\s/.test(l)) { skipping = false; out.push(l); continue; } // 見出しで復帰
      if (l.trim()) removed.push(l.trim().slice(0, 40));
      continue;
    }
    if (AUTHOR_BANNER.test(l)) { removed.push('[banner] ' + l.trim().slice(0, 30)); continue; }
    if (/^\s*https?:\/\//.test(l)) { removed.push(l.trim().slice(0, 40)); continue; }
    if (/note\.com|doboku-note/i.test(l)) { removed.push(l.trim().slice(0, 40)); continue; }
    out.push(l);
  }
  // 文レベルの note 商品誘導を除去（段落内の一部でも該当文を落とす）
  let text = out.join('\n').replace(PROMO_SENTENCE, (m) => { removed.push('[promo] ' + m.slice(0, 36)); return ''; });
  // 除去で空になった見出し／ラベルを落とす（先に空行を整えてから判定する）
  text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  text = dropEmptySections(text);
  // 空行・宙に浮いた区切り線の整理
  text = text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/(?:^|\n)-{3,}\s*(?=\n*$)/g, '') // 末尾に残る区切り線
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
  return { clean: text, removed };
}

/** クリーン本文に note 参照が残っていないかの最終検査（PDF 化前ゲート） */
export function assertNoFunnel(text) {
  const hits = (text.match(/note\.com|doboku-note|https?:\/\//gi) || []);
  return { ok: hits.length === 0, hits };
}
