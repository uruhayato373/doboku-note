/**
 * OGP画像一括生成スクリプト
 *
 * .local/r2/posts/ 配下の全MDXファイルからfrontmatterを読み取り、
 * satori + @resvg/resvg-js でOGP画像（1200x630 PNG）を生成する。
 *
 * 出力先: 各記事ディレクトリに ogp.png を書き出す（コロケーション方式）
 *   例: .local/r2/posts/pe-comprehensive-management/iso-14000/ogp.png
 * 本番URL: https://storage.doboku-note.com/posts/{category}/{localSlug}/ogp.png
 *
 * Usage:
 *   node scripts/generate-ogps.mjs [--force] [--slug <slug>]
 *   --force: 既存画像があっても再生成
 *   --slug:  特定のslugのみ生成（slug は category prefix 付きのフルスラグ）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(PROJECT_ROOT, '.local', 'r2', 'posts');
const FONTS_DIR = path.join(__dirname, 'fonts');

// カテゴリ表示名
const CATEGORY_LABELS = {
  'pe-comprehensive-management': '技術士 総監',
  'civil-construction-1': '1級土木施工管理技士',
  'civil-general': '土木一般',
  'construction-management': '施工管理',
  'keywords-law': 'キーワード・法規',
};

// --- フォント読み込み ---
function loadFonts() {
  const notoPath = path.join(FONTS_DIR, 'NotoSansJP-Bold.ttf');
  const interPath = path.join(FONTS_DIR, 'Inter-Bold.ttf');

  if (!fs.existsSync(notoPath) || !fs.existsSync(interPath)) {
    console.error('Error: フォントファイルが見つかりません。scripts/fonts/ にNotoSansJP-Bold.ttf と Inter-Bold.ttf を配置してください。');
    process.exit(1);
  }

  return [
    { name: 'Noto Sans JP', data: fs.readFileSync(notoPath), weight: 700, style: 'normal' },
    { name: 'Inter', data: fs.readFileSync(interPath), weight: 700, style: 'normal' },
  ];
}

// --- MDXファイル探索 ---
// コロケーション方式では OGP は `{記事dir}/ogp.png` に置くため、
// findMdxFiles は `img` と `ogp` ディレクトリ（レガシー）をスキップする。
function findMdxFiles(dir) {
  const results = [];

  function walk(currentDir, relativeParts) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'ogp' || entry.name === 'img' || entry.name === '.DS_Store') continue;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, [...relativeParts, entry.name]);
      } else if (entry.name.endsWith('.mdx')) {
        results.push({ fullPath, relativeParts, fileName: entry.name });
      }
    }
  }

  walk(dir, []);
  return results;
}

// --- スラッグ生成（docs.tsのロジックに合わせる） ---
function buildSlug(relativeParts, fileName) {
  const baseName = fileName.replace(/\.mdx$/, '');
  if (baseName === 'article') {
    return relativeParts.join('-');
  }
  return [...relativeParts, baseName].join('-');
}

// --- OGPデザイン（JSXオブジェクト） ---
function createOgpElement(title, category) {
  const categoryLabel = CATEGORY_LABELS[category] || '';

  // タイトルのフォントサイズを文字数に応じて調整
  let fontSize = 48;
  if (title.length > 40) fontSize = 36;
  if (title.length > 60) fontSize = 30;
  if (title.length > 80) fontSize = 26;

  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        fontFamily: '"Noto Sans JP", "Inter", sans-serif',
        padding: '60px 80px',
        position: 'relative',
      },
      children: [
        // 上部の装飾ライン
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: 'linear-gradient(90deg, #3b82f6 0%, #1e40af 100%)',
            },
          },
        },
        // カテゴリラベル
        categoryLabel ? {
          type: 'div',
          props: {
            style: {
              fontSize: '22px',
              color: '#3b82f6',
              fontWeight: 700,
              marginBottom: '20px',
              letterSpacing: '0.05em',
            },
            children: categoryLabel,
          },
        } : null,
        // タイトル
        {
          type: 'div',
          props: {
            style: {
              fontSize: `${fontSize}px`,
              fontWeight: 700,
              color: '#1e293b',
              textAlign: 'center',
              lineHeight: 1.4,
              maxWidth: '1000px',
              wordBreak: 'break-word',
            },
            children: title,
          },
        },
        // 下部サイト名
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: '30px',
              right: '60px',
              fontSize: '20px',
              color: '#94a3b8',
              fontWeight: 700,
            },
            children: 'doboku-note',
          },
        },
      ].filter(Boolean),
    },
  };
}

// --- メイン処理 ---
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const slugIndex = args.indexOf('--slug');
  const targetSlug = slugIndex >= 0 ? args[slugIndex + 1] : null;

  console.log('OGP画像生成を開始...');

  // フォント読み込み
  const fonts = loadFonts();

  // MDXファイル探索
  const mdxFiles = findMdxFiles(POSTS_DIR);
  console.log(`  MDXファイル: ${mdxFiles.length}件`);

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const { fullPath, relativeParts, fileName } of mdxFiles) {
    const slug = buildSlug(relativeParts, fileName);

    // 特定slug指定時のフィルタ
    if (targetSlug && slug !== targetSlug) continue;

    // 出力先は記事ディレクトリ直下の ogp.png
    // article.mdx → 同じ dir / 個別 .mdx → ファイル名と同名のサブ dir は作らず dir 直下に置く
    const articleDir = fileName === 'article.mdx'
      ? path.dirname(fullPath)
      : path.dirname(fullPath); // Convention A は既に存在しないが念のため同じ dir 扱い
    const outputPath = path.join(articleDir, 'ogp.png');

    // 差分チェック（--force でない場合）
    if (!force && fs.existsSync(outputPath)) {
      const srcStat = fs.statSync(fullPath);
      const outStat = fs.statSync(outputPath);
      if (outStat.mtime >= srcStat.mtime) {
        skipped++;
        continue;
      }
    }

    try {
      // frontmatter読み取り
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { data } = matter(raw);

      if (!data.published) {
        skipped++;
        continue;
      }

      const title = data.title || slug;
      const category = data.category || '';

      // SVG生成
      const element = createOgpElement(title, category);
      const svg = await satori(element, {
        width: 1200,
        height: 630,
        fonts,
      });

      // PNG変換
      const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: 1200 },
      });
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();

      // 書き出し
      fs.writeFileSync(outputPath, pngBuffer);
      generated++;

      if (generated % 50 === 0) {
        console.log(`  ...${generated}件生成済み`);
      }
    } catch (err) {
      console.error(`  Error [${slug}]: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n完了:`);
  console.log(`  生成: ${generated}件`);
  console.log(`  スキップ: ${skipped}件`);
  if (errors > 0) console.log(`  エラー: ${errors}件`);
  console.log(`  出力先: 各記事ディレクトリの ogp.png`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
