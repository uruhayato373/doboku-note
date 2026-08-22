/**
 * 解説型キーワードパックの instagram-carousel.md / source.md / x.md を構造化データに変換するパーサ。
 *
 * 解説型は 1 投稿 = 10 スライドで構成され、スライド index から種別を推定する:
 *   slide 1  → cover         （表紙）
 *   slide 2  → definition    （定義 = label + mainText + supplement）
 *   slide 3  → figure-fullbleed（既存 SVG 全面表示）
 *   slide 4-7 → explanation   （label + mainText + items + emphasis のいずれか）
 *   slide 8  → numbered-list  （引っかけポイント; 番号付きリスト + bold + body）
 *   slide 9  → related        （関連キーワード）
 *   slide 10 → cta            （メイン + CTA テキスト + リンク）
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export function parseKeywordPack(packDir) {
  const carouselMd = readFileSync(join(packDir, 'instagram-carousel.md'), 'utf8').replace(/\r\n/g, '\n');
  const sourceMd = readFileSync(join(packDir, 'source.md'), 'utf8').replace(/\r\n/g, '\n');

  const meta = parseMeta(carouselMd, sourceMd, packDir);
  const slides = parseSlides(carouselMd);
  return { meta, slides };
}

export function parseKeywordTweets(packDir) {
  const xPath = join(packDir, 'x.md');
  if (!existsSync(xPath)) return { tweets: [] };
  const raw = readFileSync(xPath, 'utf8').replace(/\r\n/g, '\n');

  // 各 ## Tweet 0N: {subtitle} ブロックを切り出す
  const re = /^## Tweet (\d+):\s*(.+?)$/gm;
  const matches = [...raw.matchAll(re)];
  const tweets = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const startIdx = m.index;
    const endIdx = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    const block = raw.slice(startIdx, endIdx);
    tweets.push(parseTweetBlock(parseInt(m[1], 10), m[2].trim(), block));
  }
  return { tweets };
}

function parseTweetBlock(num, subtitle, block) {
  // 本文ブロック: ヘッダ行（【総監キーワード解説】...#N）の直後から URL 行までを抽出
  const lines = block.split('\n');
  let bodyStart = -1, bodyEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^【.*】.*#\d+/.test(lines[i])) { bodyStart = i + 1; continue; }
    if (bodyStart >= 0 && /^→\s*https?:/.test(lines[i])) { bodyEnd = i; break; }
  }
  const bodyLines = bodyStart >= 0 && bodyEnd > bodyStart
    ? lines.slice(bodyStart, bodyEnd).map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    : [];

  // Heading: 本文 1 行目（最も短い行・要約的）
  const heading = bodyLines[0] || subtitle;
  // bullets: ▼ で始まる行 or 1./2./ 等の番号付き行
  const bullets = bodyLines
    .filter(l => /^[▼・]/.test(l) || /^\d+\.\s/.test(l))
    .map(l => l.replace(/^[▼・]\s*/, '').replace(/^\d+\.\s+/, '').trim())
    .map(stripMd);
  // descLines: bullet 以外の本文（先頭 1 行は除く）
  const descLines = bodyLines.slice(1).filter(l => !/^[▼・]/.test(l) && !/^\d+\.\s/.test(l)).map(stripMd);

  return {
    num,
    subtitle: subtitle.replace(/編$/, ''),
    heading: stripMd(heading),
    bullets,
    descLines,
  };
}

function parseMeta(carouselMd, sourceMd, packDir) {
  // タイトル ## Carousel 01: {keywordName} 完全解説 から keywordName を抽出
  const carouselTitle = carouselMd.match(/^## Carousel \d+: (.+?)( 完全解説)?$/m);
  const keywordName = carouselTitle ? carouselTitle[1].trim() : '';

  // 利用 SVG パスを抽出
  const svgLine = carouselMd.match(/利用 SVG[:：][^`]*`(.+?)`/);
  const referenceSvg = svgLine ? svgLine[1].trim() : '';

  // UTM campaign からキーワード slug
  const utm = carouselMd.match(/utm_campaign=keyword-([\w-]+)/);
  const keywordSlug = utm ? utm[1] : '';

  // CTA リンク（slide 10）
  const ctaLink = carouselMd.match(/リンク[:：]\s*`(https:\/\/doboku-note[^`]+)`/);
  const ctaUrl = ctaLink ? ctaLink[1] : `https://doboku-note.com/docs/pe-comprehensive-management-${keywordSlug}`;

  // バッジ「総監 X.X セクション名」を slide 1 から
  const badgeMatch = carouselMd.match(/バッジ[:：]\s*「(.+?)」/);
  const badge = badgeMatch ? badgeMatch[1] : '';

  // section ID とセクション名（バッジから抽出）
  const sectionMatch = badge.match(/総監\s*([\d.]+)\s*(.+)/);
  const sectionId = sectionMatch ? sectionMatch[1] : '';
  const sectionName = sectionMatch ? sectionMatch[2].trim() : '';

  // 公開予定日
  const publishDate = carouselMd.match(/公開予定[:：]\s*\*?\*?(\d{4}-\d{2}-\d{2})/);

  return {
    packDir: resolve(packDir),
    keywordName,
    keywordSlug,
    referenceSvg,
    referenceSvgAbsPath: referenceSvg ? resolveProjectPath(referenceSvg) : '',
    ctaUrl,
    badge,
    sectionId,
    sectionName,
    publishDate: publishDate ? publishDate[1] : '',
  };
}

function resolveProjectPath(p) {
  // content/site/... を repo root からの絶対パスに
  if (p.startsWith('.local/') || p.startsWith('docs/')) {
    return resolve(process.cwd(), p);
  }
  return p;
}

function parseSlides(carouselMd) {
  // ### Slide N: {heading} で分割
  const slideRe = /^### Slide (\d+):\s*(.+?)$/gm;
  const matches = [...carouselMd.matchAll(slideRe)];
  const slides = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const startIdx = m.index;
    const endIdx = i + 1 < matches.length ? matches[i + 1].index : findCaptionStart(carouselMd, startIdx);
    const block = carouselMd.slice(startIdx, endIdx);
    const slideIndex = parseInt(m[1], 10);
    const heading = m[2].trim();
    slides.push(parseSlideBlock(slideIndex, heading, block));
  }
  return slides;
}

function findCaptionStart(text, fromIdx) {
  const idx = text.indexOf('**キャプション', fromIdx);
  return idx > 0 ? idx : text.length;
}

function parseSlideBlock(slideIndex, heading, block) {
  // bullets を抽出
  const bullets = extractBullets(block);

  // type 推定（slide index ベース）
  const type =
    slideIndex === 1 ? 'cover' :
    slideIndex === 2 ? 'definition' :
    slideIndex === 3 ? 'figure-fullbleed' :
    slideIndex === 8 ? 'numbered-list' :
    slideIndex === 9 ? 'related' :
    slideIndex === 10 ? 'cta' :
    'explanation';

  return {
    slideIndex,
    heading: stripMd(heading),
    type,
    raw: block,
    bullets,
    // 共通フィールドを slide type に応じて抽出
    ...extractFields(type, bullets, block),
  };
}

// `- key: value` または `- value` を { key, value, subItems? } の配列に
function extractBullets(block) {
  const lines = block.split('\n').slice(1); // 見出し行を除く
  const result = [];
  let currentMulti = [];

  function flushMulti() {
    if (currentMulti.length > 0 && result.length > 0) {
      result[result.length - 1].subItems = currentMulti.slice();
    }
    currentMulti = [];
  }

  for (const ln of lines) {
    const trimmed = ln.trimEnd();
    // 階層的な - 子要素（行頭にスペース 2-4 + -）
    const subMatch = trimmed.match(/^( {2,})[-*]\s+(.+)$/);
    if (subMatch) {
      currentMulti.push(subMatch[2].trim());
      continue;
    }
    flushMulti();
    // トップレベルの - bullet
    const m = trimmed.match(/^[-*]\s+(.+)$/);
    if (!m) continue;
    const body = m[1].trim();
    // `key:` または `key: value` 両対応（value 空も許容）
    const kv = body.match(/^([^:：]+?)[:：]\s*(.*)$/);
    if (kv) {
      const key = kv[1].replace(/「/g, '').replace(/」/g, '').trim();
      result.push({ key, value: kv[2].trim() });
    } else {
      result.push({ key: '', value: body });
    }
  }
  flushMulti();
  return result;
}

function stripMd(s) {
  return String(s ?? '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/「|」/g, '')
    .trim();
}

function extractFields(type, bullets, block) {
  const find = (...keys) => {
    for (const k of keys) {
      const b = bullets.find(b => b.key.includes(k));
      if (b) return b;
    }
    return null;
  };
  const findValue = (...keys) => {
    const b = find(...keys);
    return b ? stripMd(b.value) : '';
  };

  switch (type) {
    case 'cover':
      return {
        main: stripMd(findValue('メイン')),
        sub: stripMd(findValue('サブ')),
        badge: stripMd(findValue('バッジ')),
        bg: findValue('背景'),
      };
    case 'definition':
      return {
        label: extractLabelText(findValue('上部ラベル')),
        labelKind: extractLabelKind(findValue('上部ラベル')),
        mainText: extractDefinitionMain(bullets),
        supplement: stripMd(findValue('補足')),
      };
    case 'figure-fullbleed':
      return {
        label: extractLabelText(findValue('上部ラベル')),
        labelKind: extractLabelKind(findValue('上部ラベル')),
        figureNote: extractFigureNote(bullets),
        emphasis: stripMd(findValue('強調')),
      };
    case 'numbered-list':
      return {
        label: extractLabelText(findValue('上部ラベル')),
        labelKind: 'warn',
        items: extractNumberedItems(block),
        note: stripMd(findValue('注記')),
      };
    case 'related':
      return {
        label: extractLabelText(findValue('上部ラベル')) || 'セットで覚える',
        labelKind: 'brand',
        items: extractRelatedItems(bullets),
        supplement: stripMd(findValue('補足')),
      };
    case 'cta':
      return {
        main: stripMd(findValue('メイン')),
        ctaText: stripMd(findValue('CTA テキスト', 'CTA')),
        ctaUrl: stripMd(findValue('リンク')).replace(/^`|`$/g, ''),
        sub: stripMd(findValue('サブ')),
      };
    case 'explanation':
    default:
      return {
        label: extractLabelText(findValue('上部ラベル')),
        labelKind: extractLabelKind(findValue('上部ラベル')) || 'brand',
        mainText: stripMd(findValue('メインテキスト', 'メイン')),
        items: extractExplanationItems(bullets),
        emphasis: stripMd(findValue('強調')),
        comparisonTable: extractInlineTable(block),
      };
  }
}

function extractLabelText(value) {
  if (!value) return '';
  // 「{label}」(brand) のような形式から label を抜き出す
  const m = value.match(/「(.+?)」/);
  if (m) return stripMd(m[1]);
  return stripMd(value).replace(/\([^)]*\)$/, '').trim();
}

function extractLabelKind(value) {
  if (!value) return '';
  // (brand) (positive) (warn) など
  const m = value.match(/\((brand|positive|warn|danger)/i);
  return m ? m[1].toLowerCase() : 'brand';
}

function extractDefinitionMain(bullets) {
  // メインテキスト の subItems があればそれ、なければ value
  const main = bullets.find(b => b.key.includes('メインテキスト'));
  if (!main) return '';
  if (main.subItems && main.subItems.length > 0) {
    return stripMd(main.subItems.join(' '));
  }
  return stripMd(main.value);
}

function extractFigureNote(bullets) {
  // 図解: の value を参照（ただし利用 SVG パスは meta から取る）
  const f = bullets.find(b => b.key.includes('図解'));
  return f ? stripMd(f.value) : '';
}

function extractNumberedItems(block) {
  const lines = block.split('\n');
  const items = [];
  for (const ln of lines) {
    const m = ln.match(/^\s+(\d+)\.\s+(.+)$/);
    if (!m) continue;
    const body = m[2];
    // **bold** — desc 形式
    const bm = body.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
    if (bm) {
      items.push({ bold: stripMd(bm[1]), body: stripMd(bm[2]) });
    } else {
      items.push({ bold: '', body: stripMd(body) });
    }
  }
  return items;
}

function extractRelatedItems(bullets) {
  // リスト: の subItems
  const f = bullets.find(b => b.key.includes('リスト'));
  if (f && f.subItems) return f.subItems.map(stripMd);
  // フォールバック: key='' のトップ bullet を関連項目とみなす
  return bullets.filter(b => !b.key && b.value).map(b => stripMd(b.value)).slice(0, 6);
}

function extractExplanationItems(bullets) {
  // 説明:/リスト:/番号付きリスト:/比較表:/関係: 等の subItems を優先
  const ITEM_HOST_KEYS = ['説明', 'リスト', '関係', '比較表', '構成', '段階', '手順'];
  const exp = bullets.find(b => b.key && ITEM_HOST_KEYS.some(k => b.key.includes(k)));
  if (exp && exp.subItems && exp.subItems.length > 0) {
    return exp.subItems.map(stripMd);
  }

  // フォールバック: 主要メタ key を除外した key 付き bullet を items 候補に
  const SKIP = ['上部ラベル', '強調', '補足', '注記', '比較表', '図解', 'メインテキスト', 'メイン', 'サブ', 'バッジ', '背景', 'CTA', 'リンク', '管理ピラー'];
  const candidates = bullets.filter(b =>
    b.key && !SKIP.some(skip => b.key.includes(skip))
  );
  return candidates.map(b => stripMd(b.value ? `${b.key}: ${b.value}` : b.key));
}

function extractInlineTable(block) {
  // | A | B |\n|---|---|\n... 形式の markdown テーブルを抽出
  const lines = block.split('\n');
  let tableStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\|.+\|\s*$/.test(lines[i]) && /^\s*\|[\s|:-]+\|\s*$/.test(lines[i + 1] || '')) {
      tableStart = i;
      break;
    }
  }
  if (tableStart < 0) return null;
  const rows = [];
  for (let i = tableStart; i < lines.length; i++) {
    const ln = lines[i];
    if (!/^\s*\|.+\|\s*$/.test(ln)) break;
    if (/^\s*\|[\s|:-]+\|\s*$/.test(ln)) continue; // separator
    const cells = ln.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => stripMd(s.trim()));
    rows.push(cells);
  }
  if (rows.length < 2) return null;
  return {
    header: rows[0],
    body: rows.slice(1),
  };
}
