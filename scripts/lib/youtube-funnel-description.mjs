/** Keep one paid primary CTA and a clearly secondary, relevant free article. */
export function buildYoutubeFunnelDescription({ intro, promise, primary, site, chapters = [], disclosure, notice = '※制度・日程は変更される場合があります。受検年度の公式情報も確認してください。', credit, hashtags }) {
  if (!primary?.label || !primary?.url) throw new Error('YouTube の主 CTA がありません');
  const lines = [
    intro, '',
    `▼ ${primary.label}`, primary.url, '',
    `この動画で分かること：${promise}`, '',
  ];
  if (site) lines.push('関連する無料の解説・過去問（サイト）', site, '');
  if (chapters.length) lines.push('▼ チャプター', ...chapters, '');
  lines.push(disclosure, '', notice, credit, '', hashtags);
  return lines.join('\n');
}

/** Update only the managed CTA blocks of an already scheduled longform. */
export function reviseYoutubeFunnelDescription(description, { primary, site }) {
  const lines = description.split('\n');
  const intro = lines[0];
  const promise = lines.find((line) => line.startsWith('この動画で分かること：'))?.slice('この動画で分かること：'.length);
  const disclosureStart = lines.findIndex((line) => line.startsWith('【この動画の制作について】'));
  const disclosureEnd = disclosureStart < 0 ? -1 : lines.findIndex((line, i) => i > disclosureStart && line === '');
  const disclosure = disclosureStart < 0 || disclosureEnd < 0 ? null : lines.slice(disclosureStart, disclosureEnd).join('\n');
  const credit = lines.find((line) => line.startsWith('音声：'));
  const notice = lines.find((line) => line.startsWith('※制度・日程は'));
  const hashtags = lines.findLast((line) => line.startsWith('#'));
  if (!intro || !promise || !disclosure || !notice || !credit || !hashtags || lines.includes('▼ チャプター')) throw new Error('既存概要欄の構造が想定と違います');
  const urls = lines.filter((line) => /^https?:\/\//.test(line));
  if (urls.length < 1 || urls.length > 2) throw new Error('既存概要欄のリンク数が想定外です');
  if (urls[0] !== primary.url || (urls.length === 2 && urls[1] !== site)) throw new Error('既存概要欄のリンク先が現在のCTAと違います');
  return buildYoutubeFunnelDescription({ intro, promise, primary, site, disclosure, notice, credit, hashtags });
}

/**
 * 主 CTA がサイト記事（site-article）の概要欄の問題を返す。空なら合格。
 * 集客の枠は商品でなく関連記事へ送る（DN-1004・2026-11-10）。リンクの先頭が、targetPath の公開 URL であること。
 * @param {string[]} links 概要欄の自社リンク（出現順）
 * @param {string} target targetPath を siteArticleUrl で解決した公開 URL（解決できなければ呼ぶ側で問題にする）
 */
export function siteArticleCtaProblems(links, target) {
  if (!links.length) return [`サイト記事の主CTAリンクが無い: ${target}`];
  if (links[0].split('?')[0] !== target) return [`主CTAのサイト記事が先頭に無い: ${target}`];
  return [];
}
