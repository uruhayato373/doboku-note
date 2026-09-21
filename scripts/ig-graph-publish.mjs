#!/usr/bin/env node
/**
 * ig-graph-publish.mjs — Instagram Graph API 経由でパックを即時公開する CLI。
 * ---------------------------------------------------------------------------
 * publish-ig-bs.ts（Business Suite / Playwright）と役割分担する:
 *   - 予約投稿が要る → publish-ig-bs.ts（ToS グレー・DOM 未検証のリスクを受け入れる）
 *   - 即時公開でよい → 本スクリプト（公式 Graph API・予約不可）
 *
 * 手順: パック検証（caption 実在・カルーセルは画像 2〜10 枚・既に posted.json に
 * 当該フォーマットの url があれば拒否）→ stage-ig-media-r2 で public R2 へ一時配置
 * → Graph API でカルーセル/リール/ストーリーズを作成・公開 → permalink 取得 →
 * posted.json へ記録 → ステージング分を削除。
 *
 * --commit 無しは何も書き込まず・投稿もせず、実行予定（ステージ URL・payload）だけ出す。
 *
 * Usage:
 *   node scripts/ig-graph-publish.mjs --pack cem/keyword-packs/pfi --format carousel
 *   node scripts/ig-graph-publish.mjs --pack cem/keyword-packs/pfi --format carousel --commit
 *   node scripts/ig-graph-publish.mjs --pack cem/keyword-packs/pfi --format carousel --commit --json
 *
 * env: IG_GRAPH_ACCESS_TOKEN（必須・--commit 時）/ IG_BUSINESS_ACCOUNT_ID（必須・--commit 時）/
 *      IG_GRAPH_API_VERSION（任意・既定 v23.0）
 *
 * exit 0 = 成功 / 1 = API・認証エラー / 2 = 前提不成立（パック不備・既投稿・env 不足）
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createIgPublisher, GraphApiError, DEFAULT_API_VERSION } from './lib/ig-graph-publish.mjs';
import { resolvePackDir, resolveMediaFiles, stagePackMedia, cleanupPackMedia } from './stage-ig-media-r2.mjs';
import { normalizePosted, FORMATS } from './ig-status.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { loadEnvLocal } from './lib/asset-storage.mjs';

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const [k, v] = a.slice(2).split('=');
    flags[k] = v !== undefined ? v : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true);
  }
  return flags;
}

function findFirstExisting(paths) {
  for (const p of paths) if (existsSync(p)) return p;
  return null;
}

function captionPathFor(packDir, format) {
  if (format === 'carousel') return findFirstExisting([join(packDir, 'carousel', 'caption.txt'), join(packDir, 'caption.txt')]);
  if (format === 'reels') return findFirstExisting([join(packDir, 'reels', 'caption.txt'), join(packDir, 'caption.txt')]);
  return findFirstExisting([join(packDir, 'stories', 'caption.txt'), join(packDir, 'caption.txt')]); // stories は任意
}

function readCaption(packDir, format) {
  const p = captionPathFor(packDir, format);
  if (format !== 'stories' && !p) {
    throw { exitCode: 2, message: `IG_GRAPH_NO_CAPTION: caption.txt が見つかりません: ${packDir}` };
  }
  return p ? readFileSync(p, 'utf8').trim() : '';
}

function readPostedRaw(packDir) {
  const p = join(packDir, 'posted.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

function assertNotAlreadyPosted(packDir, format) {
  const posted = normalizePosted(readPostedRaw(packDir));
  if (posted?.[format]?.url) {
    throw { exitCode: 2, message: `IG_GRAPH_ALREADY_POSTED: posted.json に ${format}.url が既にあります（${posted[format].url}）` };
  }
}

function writePosted(packDir, format, entry) {
  const cur = normalizePosted(readPostedRaw(packDir)) ?? { carousel: null, reels: null, stories: null };
  cur[format] = entry;
  writeFileSync(join(packDir, 'posted.json'), JSON.stringify(cur, null, 2) + '\n', 'utf8');
}

/**
 * run() — テスト用に副作用を注入できる形にした本体。
 * @param {{ argv?: string[], env?: object, fetchImpl?: typeof fetch, stage?: typeof stagePackMedia,
 *   cleanup?: typeof cleanupPackMedia, createPublisher?: typeof createIgPublisher, log?: (s:string)=>void,
 *   errorLog?: (s:string)=>void, now?: () => number }} deps
 * @returns {Promise<number>} exit code
 */
export async function run(deps = {}) {
  const {
    argv = process.argv.slice(2),
    env = process.env,
    fetchImpl,
    stage = stagePackMedia,
    cleanup = cleanupPackMedia,
    createPublisher = createIgPublisher,
    sleep,
    log = console.log,
    errorLog = console.error,
  } = deps;
  const flags = parseArgs(argv);
  if (!flags.pack || !flags.format || !FORMATS.includes(flags.format)) {
    errorLog(`Usage: node scripts/ig-graph-publish.mjs --pack <exam/pack> --format ${FORMATS.join('|')} [--commit] [--json]`);
    return 2;
  }
  const commit = Boolean(flags.commit);
  const asJson = Boolean(flags.json);

  let packDir;
  try {
    packDir = resolvePackDir(flags.pack);
    const files = resolveMediaFiles(packDir, flags.format);
    const caption = readCaption(packDir, flags.format);
    assertNotAlreadyPosted(packDir, flags.format);

    if (!commit) {
      log(`[plan] パック ${flags.pack} / format=${flags.format} / メディア ${files.length} 件（${files.map((f) => f.split('/').pop()).join(', ')}）`);
      log('[plan] --commit 無しのためステージングも投稿もしません');
      return 0;
    }

    if (!env.IG_GRAPH_ACCESS_TOKEN || !env.IG_BUSINESS_ACCOUNT_ID) {
      errorLog('IG_GRAPH_ENV_MISSING: IG_GRAPH_ACCESS_TOKEN / IG_BUSINESS_ACCOUNT_ID が必要です');
      return 2;
    }

    const staged = await stage({ pack: flags.pack, format: flags.format, dryRun: false });
    const publisher = createPublisher({
      token: env.IG_GRAPH_ACCESS_TOKEN,
      igUserId: env.IG_BUSINESS_ACCOUNT_ID,
      apiVersion: env.IG_GRAPH_API_VERSION || DEFAULT_API_VERSION,
      fetchImpl,
      ...(sleep ? { sleep } : {}),
    });

    const startedAt = Date.now();
    let created;
    if (flags.format === 'carousel') {
      created = await publisher.createCarousel({ imageUrls: staged.files.map((f) => f.url), caption });
    } else if (flags.format === 'reels') {
      created = await publisher.createReel({ videoUrl: staged.files[0].url, caption });
    } else {
      created = await publisher.createStory(
        /\.mp4$/i.test(staged.files[0].file) ? { videoUrl: staged.files[0].url } : { imageUrl: staged.files[0].url },
      );
    }
    const readySeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    const { permalink } = await publisher.getPermalink(created.mediaId);

    writePosted(packDir, flags.format, { at: todayJst(), url: permalink, note: 'graph-api' });
    await cleanup({ pack: flags.pack, format: flags.format });

    const summary = `パック ${flags.pack} / ${flags.format} / メディア ${staged.files.length} 件 / container ready in ${readySeconds} 秒 / permalink=${permalink}`;
    if (asJson) log(JSON.stringify({ pack: flags.pack, format: flags.format, mediaId: created.mediaId, permalink }, null, 2));
    else log(summary);
    return 0;
  } catch (error) {
    if (error && typeof error.exitCode === 'number') {
      errorLog(error.message);
      return error.exitCode;
    }
    if (error instanceof GraphApiError) {
      errorLog(`[ig-graph-publish] FAIL: ${error.message}`);
      return 1;
    }
    errorLog(`[ig-graph-publish] FAIL: ${error.stack || error.message}`);
    return error?.code === 'ENOENT' || /NOT_FOUND|NO_IMAGES|NO_VIDEO|NO_STORY_MEDIA|NO_CAPTION/.test(String(error.message)) ? 2 : 1;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  loadEnvLocal();
  run().then((code) => process.exit(code));
}
