/**
 * MDX → 5 枚スライド構成（storyboard）の決定。
 *
 * デフォルト構成:
 *   1. cover       — タイトル + 「技術士総監」ラベル
 *   2. definition  — 「〜とは」短い定義（80 字以内）
 *   3. examPoint   — 試験ポイント 1
 *   4. examPoint   — 試験ポイント 2
 *   5. cta         — doboku-note 誘導
 *
 * examPointCount オプションでポイント数を変更可能（既定: 2）。
 * examPoints が不足している場合はその数だけ採用（不足分は省略、cover/def/cta は必ず出力）。
 */

import { extractMdx } from '#lib/sns-common/mdx-extract.mjs';
import { fetchImageForKeyword } from '#lib/sns-common/image-search.mjs';
import { SNS_CONFIG, detectManagement } from '#lib/sns-common/sns-config.mjs';

/**
 * MDX から storyboard を組む（ファイル読み込みあり）。
 * 画像検索を伴うため async。
 */
export async function buildStoryboard({ category, slug, options = {} }) {
  const mdx = extractMdx({ category, slug });
  const storyboard = buildStoryboardFromExtract(mdx, options, { category, slug });
  await injectKeywordImage(storyboard, { category, slug, title: mdx.title || '' });
  return storyboard;
}

/**
 * definition スライドにキーワード画像（base64）を注入する。
 * storyboard.json SSOT には巨大な base64 を保存しないため、
 * レンダリング直前（fresh ビルドでも SSOT ロードでも）に毎回これを呼ぶ。
 *
 * @param {object} storyboard - buildStoryboardFromExtract / SSOT ロード結果
 * @param {object} meta - { category, slug, title }
 * @returns {Promise<object>} 同じ storyboard（in-place 注入）
 */
export async function injectKeywordImage(storyboard, { category, slug, title }) {
  const imageData = await fetchImageForKeyword({
    slug,
    title: title || storyboard.title || '',
    category,
  });
  if (!imageData) return storyboard;
  const defSlide = storyboard.slides.find(s => s.type === 'definition');
  if (defSlide) {
    defSlide.data.imageBase64 = imageData.base64;
    defSlide.data.credit = imageData.credit;
  }
  return storyboard;
}

/**
 * 抽出結果（mdx-extract.mjs の戻り値）から storyboard を組む（純関数、テストしやすい）。
 *
 * @param {object} mdx - extractMdx() の戻り値
 * @param {object} [options]
 * @param {number} [options.examPointCount=2] - 採用する試験ポイント数の上限
 * @param {object} [meta] - storyboard のメタ情報（category / slug）
 */
export function buildStoryboardFromExtract(mdx, options = {}, meta = {}) {
  const examPointCount = options.examPointCount ?? 2;
  const points = (mdx.examPoints || []).slice(0, examPointCount);

  const slides = [
    {
      type: 'cover',
      data: {
        title: mdx.title || '',
        subtitle: null,
        label: SNS_CONFIG.labels.cover,
        management: detectManagement(mdx.description || ''),
      },
    },
    {
      type: 'definition',
      data: {
        title: mdx.title || '',
        body: truncateDefinition(stripEnglishParens(mdx.definition || mdx.description || ''), SNS_CONFIG.generation.definitionMaxLength),
      },
    },
    ...points.map((point, i) => ({
      type: 'examPoint',
      data: { index: i + 1, body: point },
    })),
    {
      type: 'cta',
      data: {
        headline: 'もっと詳しく',
        subline: 'doboku-note で全文を読む',
        url: 'doboku-note.com',
      },
    },
  ];

  return {
    category: meta.category || mdx.category || null,
    slug: meta.slug || null,
    title: mdx.title || '',
    description: mdx.description || '',
    tags: Array.isArray(mdx.tags) ? mdx.tags : [],
    slides,
  };
}

function stripEnglishParens(text) {
  return text.replace(/（[A-Za-z][^）ぁ-鿿]*）/g, '').trim();
}

/**
 * 定義文を maxLength 以内に切り詰める。句点で切れる場合はそこまで。
 */
export function truncateDefinition(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  // 句点での切断を優先
  const cutoff = text.slice(0, maxLength).match(/^.+[。]/);
  if (cutoff && cutoff[0].length >= maxLength * 0.6) return cutoff[0];
  // 読点でも妥協
  const commaCut = text.slice(0, maxLength).match(/^.+[、]/);
  if (commaCut && commaCut[0].length >= maxLength * 0.7) return commaCut[0] + '…';
  return text.slice(0, maxLength) + '…';
}
