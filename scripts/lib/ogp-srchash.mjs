import { createHash } from 'node:crypto';

/** オブジェクトを key でソートして JSON 化する（挿入順ではなく値だけでハッシュを決めるため）。 */
export function canonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** OGP 描画に使われる frontmatter だけから srcHash（16 桁）を計算する。 */
export function computeOgpSrcHash(data) {
  const ogpTitle = data.ogp?.title ?? null;
  const payload = {
    v: 1,
    // ogp-create は空文字を含む falsy な ogp.title のときだけ title へフォールバックする。
    // 明示的な ogp.title がある場合、記事 title は画像に影響しないので hash から除外する。
    title: data.ogp?.title ? null : (data.title ?? null),
    ogpTitle,
    ogpSubtitle: data.ogp?.subtitle ?? null,
    templateInputs: {
      template: data.ogp?.template ?? null,
      category: data.category ?? null,
      tags: data.tags ?? [],
    },
  };
  const full = createHash('sha256').update(canonicalStringify(payload)).digest('hex');
  return full.slice(0, 16);
}
