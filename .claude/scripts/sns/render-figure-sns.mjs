/** Site SVG → SNS frames. Qualification labels come from categories.json.
 * --slug <slug|category/slug> --figure figure-1.svg --format ig-single|yt-thumb|vertical|both|all
 * [--concept "短い問い"] [--mgmt "管理分野・テーマ"] [--out-dir .tmp/figure-preview]
 * Default output: content/sns/figures/<slug>/<figure-stem>-<format>.png
 */
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join, basename, relative } from 'node:path';
import { svgDoc, text, rect, line, COLORS, MGMT_COLORS } from './lib/svg-base.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FORMATS = ['ig-single', 'yt-thumb', 'vertical'];
const categories = JSON.parse(readFileSync(join(ROOT, 'src/config/categories.json'), 'utf8'));

export function resolveFigureInput(args, root = ROOT) {
  if (typeof args.slug !== 'string' || !/^[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(args.slug)) throw new Error('--slug は slug または category/slug を指定してください');
  const [category, article] = args.slug.includes('/') ? args.slug.split('/') : ['pe-comprehensive-management', args.slug];
  const config = categories.find((item) => item.slug === category && ['exam', 'practice'].includes(item.area));
  if (!config) throw new Error(`未対応の資格・実務カテゴリ: ${category}`);
  const figure = args.figure ?? 'figure-1.svg';
  if (typeof figure !== 'string' || !/^figure-[a-zA-Z0-9_-]+\.svg$/.test(figure)) throw new Error('--figure は figure-*.svg のファイル名を指定してください');
  const format = args.format ?? 'ig-single';
  const formats = format === 'all' ? FORMATS : format === 'both' ? FORMATS.slice(0, 2) : [format];
  if (formats.some((f) => !FORMATS.includes(f))) throw new Error(`未対応の形式: ${format}`);
  const svgPath = join(root, 'content/site', category, article, 'img', figure);
  if (!existsSync(svgPath)) throw new Error(`SVG がありません: ${svgPath}`);
  const figSvg = readFileSync(svgPath, 'utf8');
  const concept = args.concept ?? ((figSvg.match(/aria-label="([^"]*)"/) || [])[1] || article).split(/[。．]/)[0];
  if (typeof concept !== 'string' || !concept.trim() || [...concept].length > 44) throw new Error('--concept は1〜44文字の短い見出しを指定してください（省略・切捨てはしません）');
  if (args.mgmt !== undefined && (typeof args.mgmt !== 'string' || [...args.mgmt].length > 16)) throw new Error('--mgmt は16文字以内の管理分野・テーマを指定してください');
  if (args['out-dir'] !== undefined && (typeof args['out-dir'] !== 'string' || !args['out-dir'].trim())) throw new Error('--out-dir に保存先を指定してください');
  return { category, qualification: config.label, figSvg, concept, topic: args.mgmt || '', formats, svgPath,
    color: MGMT_COLORS[args.mgmt] || COLORS.brand,
    outDir: args['out-dir'] ? resolve(root, args['out-dir']) : join(root, 'content/sns/figures', args.slug),
    stem: basename(figure, '.svg') };
}

function wrap(value, length) {
  const chars = [...value];
  return Array.from({ length: Math.ceil(chars.length / length) }, (_, i) => chars.slice(i * length, (i + 1) * length).join(''));
}

export function buildFigureFrame(input, format, { uri, width, height }) {
  if (!FORMATS.includes(format)) throw new Error(`未対応の形式: ${format}`);
  const { concept, qualification, topic, color } = input;
  const fittedImage = (x, y, w, h) => {
    const scale = Math.min(w / width, h / height), iw = width * scale, ih = height * scale;
    return `<image href="${uri}" x="${Math.round(x + (w - iw) / 2)}" y="${Math.round(y + (h - ih) / 2)}" width="${Math.round(iw)}" height="${Math.round(ih)}" preserveAspectRatio="xMidYMid meet" />`;
  };
  const label = topic && topic !== qualification ? `${qualification} / ${topic}` : qualification;
  let W, H, body;
  if (format === 'yt-thumb') {
    W = 1280; H = 720;
    const title = wrap(concept, 11);
    body = [
      rect({ x: 0, y: 0, w: 16, h: H, fill: color }),
      rect({ x: 540, y: 0, w: W - 540, h: H, fill: COLORS.surfaceLight }),
      text({ x: 56, y: 100, content: qualification, size: 28, weight: 700, fill: color }),
      text({ x: 56, y: 145, content: topic, size: 24, fill: COLORS.inkBody }),
      ...title.map((value, i) => text({ x: 56, y: 230 + i * 78, content: value, size: 42, weight: 800, fill: COLORS.brandDeep })),
      text({ x: 56, y: 672, content: 'doboku-note.com', size: 26, fill: COLORS.inkBody }),
      fittedImage(570, 40, 670, 640),
    ];
  } else {
    const vertical = format === 'vertical';
    W = 1080; H = vertical ? 1920 : 1350;
    const title = wrap(concept, 22);
    const titleY = vertical ? 205 : 145, diagramY = vertical ? 330 : 265;
    body = [
      rect({ x: 0, y: 0, w: W, h: 14, fill: color }),
      text({ x: 60, y: vertical ? 125 : 80, content: label, size: 27, weight: 700, fill: color }),
      ...title.map((value, i) => text({ x: 60, y: titleY + i * 56, content: value, size: 42, weight: 700, fill: COLORS.brandDeep })),
      fittedImage(50, diagramY, 980, vertical ? 1280 : 910),
      line({ x1: 60, y1: H - 120, x2: 1020, y2: H - 120, stroke: COLORS.border, sw: 2 }),
      text({ x: 60, y: H - 68, content: '図の読み方と詳しい解説はサイトへ', size: 30, fill: COLORS.inkBody }),
      text({ x: 1030, y: H - 25, content: 'doboku-note.com', size: 24, fill: COLORS.inkBody, anchor: 'end' }),
    ];
  }
  return { svg: svgDoc({ width: W, height: H, body: body.join('\n') }), width: W, height: H };
}

export function renderFigureSns(args, root = ROOT) {
  // Validate every option before writing any output. White also protects transparent site SVGs.
  const input = resolveFigureInput(args, root);
  const figure = new Resvg(input.figSvg, { background: '#ffffff', fitTo: { mode: 'width', value: 1000 }, font: { loadSystemFonts: true } }).render();
  const image = { uri: `data:image/png;base64,${figure.asPng().toString('base64')}`, width: figure.width, height: figure.height };
  const rendered = input.formats.map((format) => {
    const frame = buildFigureFrame(input, format, image);
    const png = new Resvg(frame.svg, { background: '#ffffff', font: { loadSystemFonts: true } }).render().asPng();
    return { format, png, file: join(input.outDir, `${input.stem}-${format}.png`) };
  });
  mkdirSync(input.outDir, { recursive: true });
  for (const output of rendered) writeFileSync(output.file, output.png);
  return rendered.map(({ format, file, png }) => ({ format, file, bytes: png.length, source: input.svgPath, qualification: input.qualification }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = {};
    for (let i = 2; i < process.argv.length; i++) {
      const option = process.argv[i];
      if (!['--slug', '--figure', '--format', '--concept', '--mgmt', '--out-dir'].includes(option)) throw new Error(`未対応の引数: ${option}`);
      if (!process.argv[i + 1] || process.argv[i + 1].startsWith('--')) throw new Error(`${option} に値が必要です`);
      args[option.slice(2)] = process.argv[++i];
    }
    for (const result of renderFigureSns(args)) console.log(`[figure-sns] ${result.qualification} / ${result.format} → ${relative(ROOT, result.file)} (${result.bytes} bytes)`);
  } catch (error) { console.error(`[figure-sns] ${error.message}`); process.exitCode = 1; }
}
