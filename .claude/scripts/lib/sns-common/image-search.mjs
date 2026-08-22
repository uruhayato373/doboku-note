/**
 * キーワードに対応する画像を取得する。
 *
 * 優先順:
 *   1. doboku-note R2 記事画像（img/ ディレクトリ）
 *   2. Wikimedia Commons 自動検索（CC ライセンス）
 *   3. null（画像なし → 呼び出し元でスキップ）
 *
 * @typedef {{ url: string, base64: string, credit: string }} ImageResult
 * @param {{ slug: string, title: string, category: string }} args
 * @returns {Promise<ImageResult | null>}
 */
export async function fetchImageForKeyword({ slug, title, category }) {
  const r2 = await fetchR2Image(slug, category);
  if (r2) return r2;

  // 日本語タイトルで検索し、ヒットしなければスラグ（英語）で再検索
  const wiki = await searchWikimediaCommons(title) ?? await searchWikimediaCommons(slug.replace(/-/g, ' '));
  if (wiki) return wiki;

  return null;
}

import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_CONTENT_ROOT } from '../../../../scripts/lib/repository-paths.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// .claude/scripts/lib/sns-common/ → プロジェクトルート
const PROJECT_ROOT = join(__dirname, '../../../..');
const R2_BASE = 'https://storage.doboku-note.com/posts';

async function fetchR2Image(slug, category) {
  // ローカルの content/site/{category}/{slug}/img/ からファイル名を列挙
  const localImgDir = join(SITE_CONTENT_ROOT, category, slug, 'img');
  let fnames;
  try {
    fnames = readdirSync(localImgDir).filter(f => /\.(svg|png|jpg|jpeg|webp)$/i.test(f));
  } catch {
    return null; // img/ ディレクトリなし
  }
  if (!fnames.length) return null;

  // figure-*.svg を優先、次に {slug}.svg、その他
  const sorted = [
    ...fnames.filter(f => f.startsWith('figure-')),
    ...fnames.filter(f => f.startsWith(slug)),
    ...fnames.filter(f => !f.startsWith('figure-') && !f.startsWith(slug)),
  ];

  for (const fname of sorted) {
    const url = `${R2_BASE}/${category}/${slug}/img/${fname}`;
    try {
      const result = await fetchWithTimeout(url, 5000);
      if (!result) continue;
      const { buf, contentType } = result;

      const pngBuf = contentType.includes('svg') ? await svgToPng(buf) : buf;
      const base64 = `data:image/png;base64,${Buffer.from(pngBuf).toString('base64')}`;
      return { url, base64, credit: 'doboku-note' };
    } catch {
      // 次の候補へ
    }
  }
  return null;
}

async function searchWikimediaCommons(title) {
  const query = encodeURIComponent(`${title} diagram`);
  const apiUrl =
    `https://commons.wikimedia.org/w/api.php?action=query&generator=search` +
    `&gsrsearch=${query}&gsrnamespace=6&prop=imageinfo` +
    `&iiprop=url|extmetadata&format=json&gsrlimit=8&origin=*`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const json = await res.json();
    const pages = Object.values(json?.query?.pages ?? {});
    if (!pages.length) return null;

    // PNG/JPG/SVG の中から最初の 1 枚を選ぶ
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info?.url) continue;
      const cleanUrl = info.url.split('?')[0]; // UTM パラメータを除去
      const ext = cleanUrl.split('.').pop().toLowerCase();
      if (!['png', 'jpg', 'jpeg', 'svg'].includes(ext)) continue;

      const result = await fetchWithTimeout(info.url, 6000);
      if (!result) continue;

      const { buf, contentType } = result;
      const pngBuf = contentType.includes('svg') ? await svgToPng(buf) : buf;
      const base64 = `data:image/png;base64,${Buffer.from(pngBuf).toString('base64')}`;

      const author = info.extmetadata?.Artist?.value
        ?.replace(/<[^>]+>/g, '')
        .trim() || 'Wikimedia Commons';
      const credit = `© ${author} (CC BY)`;

      return { url: info.url, base64, credit };
    }
  } catch {
    // タイムアウト or ネットワークエラー → null へ
  }
  return null;
}

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || '';
    return { buf, contentType };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function svgToPng(svgBuf) {
  const { default: sharp } = await import('sharp');
  return sharp(svgBuf).png().toBuffer();
}
