/**
 * キーワードに対応する画像を取得する。
 *
 * 優先順:
 *   1. doboku-note R2 記事画像（img/ ディレクトリ。自作の図か AI 生成の写真）
 *   2. null（画像なし → 呼び出し元でスキップ）
 * 写真は AI 生成だけを使う（記事・SNS とも。2026-10-08 運営者決定）。以前の Wikimedia Commons の自動検索（実写）は外した。
 *
 * @typedef {{ url: string, base64: string, credit: string }} ImageResult
 * @param {{ slug: string, category: string }} args（title を渡しても使わない）
 * @returns {Promise<ImageResult | null>}
 */
export async function fetchImageForKeyword({ slug, category }) {
  return fetchR2Image(slug, category);
}

import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_CONTENT_ROOT } from '../../../../scripts/lib/repository-paths.mjs';
import { R2_PUBLIC_ORIGIN } from '../../../../scripts/lib/site-identity.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// .claude/scripts/lib/sns-common/ → プロジェクトルート
const PROJECT_ROOT = join(__dirname, '../../../..');
const R2_BASE = `${R2_PUBLIC_ORIGIN}/posts`;

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
