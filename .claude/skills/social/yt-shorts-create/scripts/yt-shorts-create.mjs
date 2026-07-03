#!/usr/bin/env node
/**
 * YouTube Shorts 自動生成 CLI。
 *
 * v7 で MDX 直結モード (--slug) は廃止し、IG Reels mp4 から派生する
 * --from-reels モード一本に再設計。詳細は SKILL.md と
 * docs/project/03_SNS/01_SNS集客戦略.md v7 を参照。
 *
 * Usage:
 *   # v7 (現行): IG Reels パックから 30-60 秒の YT Shorts mp4 を派生
 *   node yt-shorts-create.mjs --from-reels r03-pack-01
 *
 *   # 旧 (v6 以前): MDX 直結。v7 で廃止 → エラー終了
 *   node yt-shorts-create.mjs --slug followership --date 2026-05-02
 *
 * 派生フロー (v7):
 *   1. docs/sns/instagram/{exam}/exam-packs/<year>/pack-NN/reels/ の
 *      slide-00 (cover) / 01 (problem) / 02 (answer) / 09 (cta) mp4 を
 *      ffmpeg concat → 30-60 秒の結合 mp4
 *   2. thumbnail.png: reels/img/00-cover.png をコピー
 *   3. meta.json: slide-data.json から派生したタイトル + 概要欄テンプレ
 *      + UTM (utm_source=youtube) を生成
 */

import { mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

import { renderSlide } from '#lib/sns-common/slide-render.mjs';
import { synthesize } from '#lib/sns-common/tts-client.mjs';
import { applyReadingDict } from '#lib/sns-common/reading-dict.mjs';
import { SNS_CONFIG } from '#lib/sns-common/sns-config.mjs';
import { wrapTitle } from '#lib/sns-common/jp-text-wrap.mjs';
import { buildUtmUrl } from '#lib/utm-builder.mjs';
import { buildStoryboard, injectKeywordImage } from './lib/build-storyboard.mjs';
import { buildScript } from './lib/build-script.mjs';
import { buildSubtitle } from './lib/build-subtitle.mjs';
import {
  composeShortsVideo,
  generateThumbnail,
  probeDuration,
  ffmpegAvailable,
} from './lib/ffmpeg-compose.mjs';

const WIDTH = 1080;
const HEIGHT = 1920;

// 字幕 1 行あたりの最大文字数（fontSize 48px・幅 1080px の実測上限の安全側）
const SUBTITLE_MAX_CHARS_PER_LINE = 19;

function parseCliArgs(argv) {
  const { values } = parseArgs({
    args: argv.slice(2),
    options: {
      slug: { type: 'string' },
      date: { type: 'string' },
      category: { type: 'string', default: SNS_CONFIG.defaultCategory },
      speaker: { type: 'string' },
      out: { type: 'string' },
      reset: { type: 'boolean' },
      'config-only': { type: 'boolean' },
      'from-reels': { type: 'string' },  // v7: IG Reels mp4 派生モード
    },
  });
  // v7: --slug モードは廃止（IG 一次・YT 派生に再設計）
  if (values.slug) {
    throw new Error(
      '--slug mode is deprecated (戦略 v7: 2026-05-28)。--from-reels <pack-id> を使用してください。\n' +
      '詳細: docs/project/03_SNS/01_SNS集客戦略.md v7 の §1 基本方針・§2 YouTube Shorts。\n' +
      '移行例: --slug followership → IG Reels 一次制作 (ig-reels-writer) → --from-reels <pack-id>'
    );
  }
  if (!values['from-reels']) {
    throw new Error('--from-reels <pack-id> is required (例: --from-reels r03-pack-01)');
  }
  // pack-id 形式チェック
  if (!/^[rh]\d{2}-pack-\d{2}$/.test(values['from-reels'])) {
    throw new Error(`--from-reels の形式は <year>-pack-<NN> (例: r03-pack-01)。got: ${values['from-reels']}`);
  }
  return values;
}

/**
 * Shorts 生成のメイン処理。
 *
 * storyboard.json（SSOT）の扱い:
 *   - 既存 storyboard.json があり reset=false → それを読み込み（MDX 解析スキップ）
 *   - 無い or reset=true → MDX から生成し storyboard.json を書き出す
 *   各 slide は { type, data, script } を持ち、script が TTS・字幕の真実源。
 *   手書きで品質を上げた台本は storyboard.json に保存され、動画再生成でも保持される。
 *
 * @param {object} args
 * @param {string} args.category
 * @param {string} args.slug
 * @param {string} args.date  YYYY-MM-DD
 * @param {string} [args.speaker]  VOICEVOX speaker ID（既定: env or 1）
 * @param {string} [args.outDir]
 * @param {boolean} [args.reset]       storyboard.json を無視して MDX から再生成
 * @param {boolean} [args.configOnly] storyboard.json 生成のみ（PNG/TTS/動画をスキップ、ffmpeg 不要）
 * @returns {Promise<{ mp4Path, thumbPath, metaPath, durations }>}
 */
export async function createShorts({ category, slug, date, speaker, outDir, reset = false, configOnly = false }) {
  if (!configOnly && !ffmpegAvailable()) {
    throw new Error('ffmpeg not found in PATH. Install with: brew install ffmpeg');
  }

  // 中間ファイル（PNG/WAV/mp4/concat/ass）は .tmp に、最終成果物は docs に
  const tmpDir = join('.tmp', 'sns', date, `${slug}-shorts`);
  const docsDir = outDir ?? join('docs', 'sns', 'youtube', `${date}-${slug}`);
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(docsDir, { recursive: true });

  const sbPath = join(docsDir, 'storyboard.json');

  // [1/6] storyboard（SSOT 優先 / 無ければ MDX から生成して書き出す）
  let storyboard;
  if (existsSync(sbPath) && !reset) {
    process.stdout.write(`[1/6] Loading storyboard.json (SSOT)...\n`);
    storyboard = JSON.parse(readFileSync(sbPath, 'utf8'));
  } else {
    process.stdout.write(`[1/6] Building storyboard from MDX...\n`);
    storyboard = await buildStoryboard({ category, slug });
    const built = buildScript(storyboard);
    storyboard.slides.forEach((slide, i) => { slide.script = built[i]; });
    writeFileSync(sbPath, JSON.stringify(serializeStoryboard(storyboard), null, 2) + '\n', 'utf8');
    process.stdout.write(`     storyboard.json を生成（手動編集可能な SSOT）\n`);
  }
  process.stdout.write(`     ${storyboard.slides.length} slides: ${storyboard.slides.map(s => s.type).join(' / ')}\n`);

  // [2/6] script（storyboard.json の各 slide.script が真実源）
  process.stdout.write(`[2/6] Writing scripts...\n`);
  const scripts = storyboard.slides.map(s => s.script || '');
  const readingScripts = scripts.map(s => applyReadingDict(s));
  writeFileSync(join(docsDir, 'script.txt'), buildScriptTxt({ storyboard, scripts, date }));
  writeFileSync(join(docsDir, 'reading.txt'), buildScriptTxt({ storyboard, scripts: readingScripts, date }));

  if (configOnly) {
    process.stdout.write(`\n✓ config-only → ${sbPath}\n`);
    return { storyboardPath: sbPath, docsDir };
  }

  // 画像 base64 は SSOT に保存しないため、レンダリング直前に再注入
  await injectKeywordImage(storyboard, { category, slug, title: storyboard.title });

  // [3/6] スライド PNG（中間ファイル → tmpDir）
  process.stdout.write(`[3/6] Rendering ${storyboard.slides.length} slide PNGs (Satori)...\n`);
  const pngPaths = [];
  for (let i = 0; i < storyboard.slides.length; i++) {
    const png = await renderSlide({
      width: WIDTH,
      height: HEIGHT,
      slide: storyboard.slides[i],
    });
    const p = join(tmpDir, `slide-${String(i).padStart(2, '0')}.png`);
    writeFileSync(p, png);
    pngPaths.push(p);
  }

  // [4/6] TTS wav（中間ファイル → tmpDir）
  process.stdout.write(`[4/6] Synthesizing TTS (VOICEVOX speaker=${speaker ?? '<default>'})...\n`);
  const wavPaths = [];
  for (let i = 0; i < readingScripts.length; i++) {
    const wav = await synthesize({
      text: readingScripts[i],
      speaker: speaker !== undefined ? Number(speaker) : undefined,
    });
    const p = join(tmpDir, `slide-${String(i).padStart(2, '0')}.wav`);
    writeFileSync(p, wav);
    wavPaths.push(p);
  }

  // [5/6] 字幕 .ass + ffmpeg 合成（中間 → tmpDir、最終 mp4 → docsDir）
  process.stdout.write(`[5/6] Composing video with ffmpeg + subtitles...\n`);
  const durations = [];
  for (const w of wavPaths) durations.push(await probeDuration(w));
  // 字幕は budoux で文節改行を入れてから渡す（build-subtitle は WrapStyle 2 = 自動折り返し無効）
  const subtitleScripts = await Promise.all(scripts.map(wrapScriptForSubtitle));
  const assPath = join(tmpDir, 'subtitle.ass');
  writeFileSync(assPath, buildSubtitle({ scripts: subtitleScripts, durations, options: { width: WIDTH, height: HEIGHT } }));

  const mp4Path = join(docsDir, 'shorts.mp4');
  await composeShortsVideo({ pngPaths, wavPaths, assPath, outPath: mp4Path, options: { tmpDir } });

  // [6/6] サムネ + meta（→ docsDir）
  process.stdout.write(`[6/6] Generating thumbnail and meta.json...\n`);
  const thumbPath = join(docsDir, 'thumbnail.png');
  await generateThumbnail({ storyboard, outPath: thumbPath });

  const meta = buildMeta({ storyboard, durations });
  const metaPath = join(docsDir, 'meta.json');
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  const totalSec = durations.reduce((a, b) => a + b, 0).toFixed(1);
  process.stdout.write(`\n✓ Generated: ${mp4Path}\n`);
  process.stdout.write(`  Thumbnail: ${thumbPath}\n`);
  process.stdout.write(`  Meta:      ${metaPath}\n`);
  process.stdout.write(`  Total:     ${totalSec}s (${storyboard.slides.length} slides)\n`);

  return { mp4Path, thumbPath, metaPath, durations };
}

/**
 * storyboard を SSOT JSON 用に整形する。
 * definition スライドの imageBase64 / credit は巨大かつ毎回再取得できるため除外する。
 */
function serializeStoryboard(sb) {
  return {
    category: sb.category,
    slug: sb.slug,
    title: sb.title,
    description: sb.description,
    tags: sb.tags,
    slides: sb.slides.map(s => {
      const data = { ...(s.data || {}) };
      delete data.imageBase64;
      delete data.credit;
      return { type: s.type, data, script: s.script ?? '' };
    }),
  };
}

/**
 * 字幕 1 スライド分のテキストを budoux で文節改行する。
 * build-subtitle.mjs は WrapStyle 2（自動折り返し無効）なので、ここで改行を確定させる。
 */
async function wrapScriptForSubtitle(text) {
  const lines = await wrapTitle(text || '', {
    budoux: { enabled: true },
    charCountFallback: SUBTITLE_MAX_CHARS_PER_LINE,
  });
  return lines.join('\n');
}

/**
 * meta.json の中身を組み立てる。YouTube Data API で必要なフィールドを揃える。
 */
export function buildMeta({ storyboard, durations }) {
  const totalSec = durations.reduce((a, b) => a + b, 0);
  const yt = SNS_CONFIG.youtube;
  const description = [
    `${storyboard.title}（${SNS_CONFIG.profession}）`,
    '',
    storyboard.description,
    '',
    yt.descriptionHeaders.site,
    buildUtmUrl(`${SNS_CONFIG.domainUrl}/docs/${storyboard.category}-${storyboard.slug}`, { channel: 'youtube', format: 'shorts', campaign: 'shorts' }),
    '',
    yt.descriptionHeaders.note,
    buildUtmUrl(SNS_CONFIG.noteUrl, { channel: 'youtube', format: 'shorts', campaign: 'note' }),
    '',
    yt.hashtags,
  ].join('\n');

  return {
    title: `${yt.titlePrefix}${storyboard.title}`,
    description,
    tags: dedupe([...yt.tags, ...(storyboard.tags || [])]),
    categoryId: yt.categoryId,
    privacyStatus: yt.privacyStatus,
    sourceSlug: storyboard.slug,
    sourceCategory: storyboard.category,
    sourceUrl: `${SNS_CONFIG.domainUrl}/docs/${storyboard.category}-${storyboard.slug}`,
    durationSeconds: Number(totalSec.toFixed(2)),
    slidesCount: storyboard.slides.length,
  };
}

function dedupe(arr) {
  return [...new Set(arr)];
}

function buildScriptTxt({ storyboard, scripts, date }) {
  const header = `# yt-shorts-script: ${storyboard.title} (${date})\n\n`;
  const sections = storyboard.slides.map((slide, i) => {
    const label = String(i + 1).padStart(2, '0');
    return `[${label} ${slide.type}]\n${scripts[i]}`;
  });
  return header + sections.join('\n\n') + '\n';
}

// ─── v7: --from-reels モード（IG Reels mp4 派生） ─────────────────

/**
 * IG Reels の slide-NN.mp4 から YT Shorts (30-60 秒) を派生生成する。
 *
 * 抜粋戦略: 10 スライド構成 (cover + problem×4 + answer×4 + cta) から
 * cover + problem 1 + answer 1 + cta の 4 スライドを concat。
 * IG Reels の各 slide-NN.mp4 は VOICEVOX TTS 入り独立 mp4。
 *
 * @param {object} args
 * @param {string} args.packId  例: "r03-pack-01"
 * @param {string} [args.outDir]
 * @returns {Promise<{ mp4Path, thumbPath, metaPath, durationSec }>}
 */
export async function createShortsFromReels({ packId, outDir, examDir = '技術士総監' }) {
  if (!ffmpegAvailable()) {
    throw new Error('ffmpeg not found in PATH. Install with: brew install ffmpeg (macOS) or apt install ffmpeg (Linux)');
  }

  const m = packId.match(/^([rh]\d{2})-pack-(\d{2})$/);
  if (!m) throw new Error(`Invalid pack-id: ${packId}`);
  const [, year, packNum] = m;
  const packNumLabel = String(Number(packNum));

  // IG Reels パックのパスを解決（試験軸: 省略時=技術士総監）
  const reelsDir = join('docs', 'sns', 'instagram', examDir, 'exam-packs', year, `pack-${packNum}`, 'reels');
  const slideDataPath = join('docs', 'sns', 'instagram', examDir, 'exam-packs', year, `pack-${packNum}`, 'slide-data.json');
  if (!existsSync(reelsDir)) {
    throw new Error(`Reels ディレクトリが見つかりません: ${reelsDir}\n  先に ig-reel-create で生成してください`);
  }
  if (!existsSync(slideDataPath)) {
    throw new Error(`slide-data.json が見つかりません: ${slideDataPath}`);
  }

  const slideData = JSON.parse(readFileSync(slideDataPath, 'utf8'));
  const date = new Date().toISOString().slice(0, 10);
  const docsDir = outDir ?? join('docs', 'sns', 'youtube', `${date}-${packId}`);
  const tmpDir = join('.tmp', 'sns', date, `${packId}-shorts`);
  mkdirSync(docsDir, { recursive: true });
  mkdirSync(tmpDir, { recursive: true });

  // [1/3] 抜粋する slide-NN.mp4 を concat
  // cover (00) + problem 1 (01) + answer 1 (02) + cta (09) の 4 スライド
  const sourceSlides = ['00', '01', '02', '09'];
  const missing = sourceSlides.filter((n) => !existsSync(join(reelsDir, `slide-${n}.mp4`)));
  if (missing.length > 0) {
    throw new Error(`Reels の slide mp4 が不足: ${missing.map((n) => `slide-${n}.mp4`).join(', ')}\n  ig-reel-create を先に走らせてください`);
  }

  // カバー同期ガード: slide-00.mp4 に焼かれたカバーが最新 img/00-cover.png と乖離していたら中断。
  // カバーPNG/テンプレを刷新したのに reel 動画を再生成せず古いカバーのまま派生する事故を防ぐ
  // （2026-06-02 cover刷新で video.mp4 1枚目が旧カバーのまま残った desync の再発防止）。
  assertCoverInSync({ reelsDir, tmpDir, packId, examDir });

  // 絶対パスで concat.txt を生成（ffmpeg は concat.txt のあるディレクトリからの相対解釈をするため、絶対パスが最も安全）
  const concatTxt = sourceSlides
    .map((n) => `file '${resolve(reelsDir, `slide-${n}.mp4`).replace(/\\/g, '/')}'`)
    .join('\n') + '\n';
  const concatPath = join(tmpDir, 'concat.txt');
  writeFileSync(concatPath, concatTxt, 'utf8');

  process.stdout.write(`[1/3] Concat ${sourceSlides.length} slides from IG Reels → mp4...\n`);
  const mp4Path = join(docsDir, 'shorts.mp4');
  const concatResult = spawnSync(
    'ffmpeg',
    ['-y', '-f', 'concat', '-safe', '0', '-i', concatPath, '-c', 'copy', mp4Path],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (concatResult.status !== 0) {
    throw new Error(`ffmpeg concat 失敗:\n${concatResult.stderr?.toString() ?? ''}`);
  }

  // 動画長を計測（probeDuration は wav 用だが mp4 でも動く）
  const durationSec = await probeDuration(mp4Path);
  if (durationSec < 15 || durationSec > 70) {
    process.stdout.write(`  ⚠ 動画尺 ${durationSec.toFixed(1)}秒 は YT Shorts 推奨 30-60 秒の範囲外\n`);
  }

  // [2/3] サムネイル（Reels cover を流用）
  process.stdout.write(`[2/3] Thumbnail (copy from reels cover)...\n`);
  const thumbPath = join(docsDir, 'thumbnail.png');
  copyFileSync(join(reelsDir, 'img', '00-cover.png'), thumbPath);

  // [3/3] meta.json
  process.stdout.write(`[3/3] Generating meta.json...\n`);
  const meta = buildMetaFromReels({ slideData, packId, year, packNumLabel, durationSec });
  const metaPath = join(docsDir, 'meta.json');
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  process.stdout.write(`\n✓ Generated: ${mp4Path}\n`);
  process.stdout.write(`  Thumbnail: ${thumbPath}\n`);
  process.stdout.write(`  Meta:      ${metaPath}\n`);
  process.stdout.write(`  Duration:  ${durationSec.toFixed(1)}s\n`);

  return { mp4Path, thumbPath, metaPath, durationSec };
}

/**
 * IG Reels 派生 mp4 用の meta.json を組み立てる。
 * IG Reels のキャプションテキストは別ファイル (reels/caption.txt) で
 * IG 用に書かれているため、YT 用は本関数で別途生成する。
 */
function buildMetaFromReels({ slideData, packId, year, packNumLabel, durationSec }) {
  const yt = SNS_CONFIG.youtube;
  const yearLabel = `令和${year.replace(/^[rRhH]0?/, '')}年度`;
  const managementKey = slideData._meta?.management || slideData.cover?.management || '';
  // 英語キー → 日本語ラベル（economic→経済性管理 等）。生のキーをタイトル/タグに出さない。
  const management = SNS_CONFIG.managementMap?.[managementKey]?.label || managementKey;
  const titleBase = `${yearLabel} 択一式 過去問${management ? `（${management}）` : ''}`;

  const description = [
    `${titleBase} — ${SNS_CONFIG.profession}`,
    '',
    'この動画は IG Reels で公開した過去問パックから 1 問抜粋した YouTube Shorts 派生版です。',
    '',
    yt.descriptionHeaders.site,
    buildUtmUrl(`${SNS_CONFIG.domainUrl}/docs/pe-comprehensive-management-${year}-primary`, { channel: 'youtube', format: 'shorts', campaign: `exam-pack-${packId}` }),
    '',
    yt.descriptionHeaders.note,
    buildUtmUrl(SNS_CONFIG.noteUrl, { channel: 'youtube', format: 'shorts', campaign: 'note' }),
    '',
    yt.hashtags,
  ].join('\n');

  return {
    // 過去問では「【総監キーワード】」prefix を使わない。論点別の最終タイトルは投稿時に人手で設定（policy §2 タイトル規約・§6 使い回し禁止）。
    title: `技術士総監 ${titleBase}`,
    description,
    tags: dedupe([...yt.tags, `${yearLabel}`, '過去問', '択一式', management].filter(Boolean)),
    categoryId: yt.categoryId,
    privacyStatus: yt.privacyStatus,
    sourcePackId: packId,
    sourceYear: year,
    sourceUrl: `${SNS_CONFIG.domainUrl}/docs/pe-comprehensive-management-${year}-primary`,
    durationSeconds: Number(durationSec.toFixed(2)),
    derivedFrom: 'instagram-reels',
  };
}

/**
 * カバー同期ガード。slide-00.mp4 の1枚目フレームと img/00-cover.png を SSIM で内容比較し、
 * 乖離（カバー未反映）なら例外を投げて派生を止める。
 *
 * 背景: カバーPNG/テンプレだけ刷新し reel 動画（slide-00.mp4）を再生成しないと、
 * サムネ=新・動画1枚目=旧 の desync が発生する（2026-06-05 検出）。本ガードはその再発防止。
 * ffmpeg 不在・SSIM フィルタ非搭載・フレーム抽出失敗時は安全側でスキップ（誤検知で正規生成を止めない）。
 */
function assertCoverInSync({ reelsDir, tmpDir, packId, examDir }) {
  const coverPng = join(reelsDir, 'img', '00-cover.png');
  const coverMp4 = join(reelsDir, 'slide-00.mp4');
  if (!existsSync(coverPng) || !existsSync(coverMp4)) return; // 比較材料が無ければスキップ

  const framePng = join(tmpDir, '_cover-frame.png');
  const ex = spawnSync('ffmpeg', ['-y', '-i', coverMp4, '-frames:v', '1', framePng], { stdio: ['ignore', 'ignore', 'pipe'] });
  if (ex.status !== 0 || !existsSync(framePng)) return; // 抽出失敗時はスキップ

  const ss = spawnSync('ffmpeg', ['-i', framePng, '-i', coverPng, '-filter_complex', 'ssim', '-f', 'null', '-'], { encoding: 'utf8' });
  const out = `${ss.stdout ?? ''}${ss.stderr ?? ''}`;
  const m = out.match(/All:\s*([0-9.]+)/);
  if (!m) return; // SSIM フィルタ非搭載等はスキップ
  const ssim = parseFloat(m[1]);
  if (ssim < 0.90) {
    throw new Error(
      `カバー desync 検知 (SSIM=${ssim.toFixed(3)} < 0.90)。\n` +
      `  slide-00.mp4 の1枚目が img/00-cover.png と乖離しています。\n` +
      `  → カバーPNG/テンプレ刷新後に reel 動画が再生成されていない可能性。\n` +
      `  先に reel を再生成してください:\n` +
      `    node .claude/skills/social/ig-reel-create/scripts/ig-reel-create.mjs --exam-dir ${examDir} --exam ${packId}\n` +
      `  （カバーPNGだけ更新する運用は禁止。動画も同時に再生成すること）`
    );
  }
}

// CLI 起動判定（argv[1] が無い動的 import では false）
const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const args = parseCliArgs(process.argv);
  await createShortsFromReels({
    packId: args['from-reels'],
    outDir: args.out,
    ...(typeof args['exam-dir'] === 'string' && args['exam-dir'] ? { examDir: args['exam-dir'] } : {}),
  });
}
