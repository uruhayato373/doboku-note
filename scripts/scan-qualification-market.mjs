#!/usr/bin/env node
/**
 * scan-qualification-market.mjs — 資格ごとの市場（競合の混み具合）を検索で機械取得する（read-only）
 * ---------------------------------------------------------------------------
 * 検索語は .claude/config/market-scan.json（資格 id → keywords / coconala）。取得先:
 *   - YouTube … yt-dlp の検索（ytsearchN:<語>）で動画・チャンネル・再生数。ログイン・API キー不要
 *   - note    … 公開検索 API（api/v3/searches?context=note）で記事・作者・価格・スキ数
 *   - ココナラ … 既存の scripts/coconala-research.mjs に未取得の語だけを渡す（--coconala 指定時のみ。
 *               ブラウザで公開検索ページを読む・低頻度厳守＝四半期）
 * 追跡中の YouTube チャンネル（youtube-competitors.json）の登録者数も取る。
 *
 * 出力: .claude/state/market/history/market-YYYY-MM-DD.json（JST の実行日。1 ファイル＝その日の市場）。
 *       直前のファイルを土台に取得した語だけ上書きするので、部分実行でも全資格の最新が 1 ファイルに揃う。
 *       読むときは最も新しい日付のファイルが最新（scripts/lib/market-inputs.mjs の latestMarketSnapshot）。
 *       1 件 1 行で書く（差分を読めるように・サイズを抑えるため）。
 * 集計と判定は scripts/lib/qualification-market.mjs（npm run qualification-market が表示）。
 *
 * 礼節と安全弁:
 *   - 同時実行なし。YouTube は 1 秒、note は 3 秒の間隔（note 公開 API は連打で note.com 全体が 403 になる）
 *   - note が HTML（403 等）を返したら note の取得をその場で打ち切る（続けて叩かない）
 *   - 同じ JST 日付に取得済みの語は --force が無ければ取り直さない（中断後の再実行で再開できる）
 *
 * 使い方:
 *   npm run scan-qualification-market                                  # YouTube・note を全資格
 *   npm run scan-qualification-market -- --qualification building-construction-1   # 資格を絞る（複数可）
 *   npm run scan-qualification-market -- --channel youtube              # チャネルを絞る（youtube|note|coconala、複数可）
 *   npm run scan-qualification-market -- --coconala                     # ココナラも取る（四半期に1回）
 *   npm run scan-qualification-market -- --dry-run                      # 取得する語を表示するだけ
 * 取得した語が 1 件も無く、失敗が 1 件以上なら exit 1（検査不成立）。
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { todayJst } from './lib/jst-date.mjs';
import { latestMarketSnapshot, MARKET_HISTORY_DIR, stringifyMarketSnapshot } from './lib/market-inputs.mjs';

const ROOT = process.cwd();
const CONFIG_PATH = join(ROOT, '.claude/config/market-scan.json');
const REGISTRY_PATH = join(ROOT, '.claude/config/qualification-registry.json');
const YT_COMPETITORS_PATH = join(ROOT, '.claude/config/youtube-competitors.json');
const HISTORY_DIR = join(ROOT, MARKET_HISTORY_DIR);

const argv = process.argv.slice(2);
const KNOWN_FLAGS = new Set(['--qualification', '--channel', '--coconala', '--dry-run', '--force']);
for (let i = 0; i < argv.length; i++) {
  if (!KNOWN_FLAGS.has(argv[i])) {
    console.error(`ERROR: 未知の引数 ${argv[i]}（使い方はファイル冒頭）`);
    process.exit(2);
  }
  if (argv[i] === '--qualification' || argv[i] === '--channel') i++;
}
const getAll = (flag) => argv.reduce((acc, a, i) => (a === flag && argv[i + 1] ? [...acc, argv[i + 1]] : acc), []);
const DRY = argv.includes('--dry-run');
const FORCE = argv.includes('--force');
const channelArgs = getAll('--channel');
const CHANNELS = new Set(channelArgs.length ? channelArgs : ['youtube', 'note', ...(argv.includes('--coconala') ? ['coconala'] : [])]);
if (argv.includes('--coconala')) CHANNELS.add('coconala');
for (const c of CHANNELS) {
  if (!['youtube', 'note', 'coconala'].includes(c)) {
    console.error(`ERROR: --channel は youtube|note|coconala（${c}）`);
    process.exit(2);
  }
}

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
const declined = new Set(registry.qualifications.filter((q) => q.portfolio === 'declined').map((q) => q.id));
const onlyQ = getAll('--qualification');
for (const id of onlyQ) {
  if (!config.queries[id]) {
    console.error(`ERROR: market-scan.json に ${id} が無い`);
    process.exit(2);
  }
}
const targets = Object.entries(config.queries).filter(([id]) => (onlyQ.length ? onlyQ.includes(id) : !declined.has(id)));
const uniq = (xs) => [...new Set(xs)];
const keywords = uniq(targets.flatMap(([, q]) => q.keywords));
const coconalaKeywords = uniq(targets.flatMap(([, q]) => q.coconala));

const today = todayJst();
const OUT_PATH = join(HISTORY_DIR, `market-${today}.json`);
const snapshot = latestMarketSnapshot(ROOT) ?? { version: 1, youtube: {}, note: {}, youtubeChannels: {} };
const doneToday = (bucket, k) => !FORCE && snapshot[bucket]?.[k]?.fetchedAt?.slice(0, 10) === today && !snapshot[bucket][k].error;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const save = () => {
  mkdirSync(HISTORY_DIR, { recursive: true });
  snapshot.updatedAt = new Date().toISOString();
  writeFileSync(OUT_PATH, stringifyMarketSnapshot(snapshot));
};

console.log(`対象: 資格 ${targets.length} / 検索語 ${keywords.length}（YouTube・note 共通）/ ココナラ ${coconalaKeywords.length} / チャネル ${[...CHANNELS].join(',')}`);
if (DRY) {
  for (const [id, q] of targets) console.log(`  ${id}: ${q.keywords.join(' ／ ')}  ｜ ココナラ: ${q.coconala.join(' ／ ')}`);
  process.exit(0);
}

let ok = 0;
let failed = 0;

/** yt-dlp を JSON で呼ぶ。失敗は null。 */
function ytJson(args) {
  const r = spawnSync('yt-dlp', [...args, '-J', '--no-warnings'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 180_000 });
  if (r.status !== 0 || !r.stdout) return null;
  try {
    return JSON.parse(r.stdout);
  } catch {
    return null;
  }
}

if (CHANNELS.has('youtube')) {
  const n = config.results.youtube;
  for (const k of keywords) {
    if (doneToday('youtube', k)) continue;
    const j = ytJson([`ytsearch${n}:${k}`, '--flat-playlist']);
    if (!j) {
      snapshot.youtube[k] = { fetchedAt: new Date().toISOString(), error: 'yt-dlp の検索に失敗', items: [] };
      failed++;
      console.log(`  ✗ YouTube「${k}」`);
    } else {
      const items = (j.entries ?? []).map((e) => ({ videoId: e.id, title: e.title ?? '', channel: e.channel ?? e.uploader ?? '', channelId: e.channel_id ?? null, views: e.view_count ?? null }));
      snapshot.youtube[k] = { fetchedAt: new Date().toISOString(), items };
      ok++;
      console.log(`  ✓ YouTube「${k}」${items.length} 本`);
    }
    save();
    await sleep(1000);
  }
  // 追跡中チャンネルの登録者数
  const tracked = existsSync(YT_COMPETITORS_PATH) ? JSON.parse(readFileSync(YT_COMPETITORS_PATH, 'utf8')).competitors ?? [] : [];
  snapshot.youtubeChannels ??= {};
  for (const c of tracked) {
    if (!FORCE && snapshot.youtubeChannels[c.handle]?.fetchedAt?.slice(0, 10) === today) continue;
    const j = ytJson(['--flat-playlist', '--playlist-items', '0', `https://www.youtube.com/channel/${c.handle}`]);
    snapshot.youtubeChannels[c.handle] = j
      ? { fetchedAt: new Date().toISOString(), name: j.channel ?? c.label, followers: j.channel_follower_count ?? null }
      : { fetchedAt: new Date().toISOString(), error: 'チャンネル情報の取得に失敗' };
    if (j) ok++;
    else failed++;
    save();
    await sleep(1000);
  }
}

if (CHANNELS.has('note')) {
  const n = config.results.note;
  for (const k of keywords) {
    if (doneToday('note', k)) continue;
    const url = `https://note.com/api/v3/searches?context=note&q=${encodeURIComponent(k)}&size=${n}&start=0`;
    const r = spawnSync('curl', ['-sS', '-m', '30', '--ssl-no-revoke', '-H', 'User-Agent: Mozilla/5.0', '-H', 'Accept: application/json', url], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    let notes = null;
    try {
      notes = JSON.parse(r.stdout).data?.notes ?? null;
    } catch {
      notes = null;
    }
    if (!notes) {
      snapshot.note[k] = { fetchedAt: new Date().toISOString(), error: 'note 検索 API が JSON を返さなかった（403 の疑い）', items: [] };
      failed++;
      save();
      console.log(`  ✗ note「${k}」— JSON 以外が返ったので note の取得を打ち切る（連打しない）`);
      break;
    }
    const items = (notes.contents ?? []).map((c) => ({ key: c.key, title: c.name ?? '', creator: c.user?.urlname ?? '', price: c.price ?? 0, likes: c.like_count ?? 0, publishAt: c.publish_at ?? null }));
    snapshot.note[k] = { fetchedAt: new Date().toISOString(), total: notes.total_count ?? null, items };
    ok++;
    save();
    console.log(`  ✓ note「${k}」${items.length} 件（全 ${notes.total_count ?? '?'} 件）`);
    await sleep(3000);
  }
}

if (CHANNELS.has('coconala')) {
  const researchPath = join(ROOT, '.claude/state/coconala/market-research.json');
  const research = existsSync(researchPath) ? JSON.parse(readFileSync(researchPath, 'utf8')) : { queries: [] };
  const done = new Set(research.queries.filter((q) => q.complete).map((q) => q.keyword));
  const todo = coconalaKeywords.filter((k) => !done.has(k));
  if (todo.length === 0) console.log('  ココナラ: 対象の語は取得済み（取り直すなら coconala-research.mjs --force を別途）');
  else {
    console.log(`  ココナラ: 未取得 ${todo.length} 語を coconala-research.mjs で取得（2 ページ・詳細なし）`);
    const r = spawnSync('node', ['scripts/coconala-research.mjs', ...todo.flatMap((k) => ['--query', k]), '--max-pages', '2', '--details', '0'], { stdio: 'inherit', cwd: ROOT });
    if (r.status === 0) ok += todo.length;
    else failed += todo.length;
  }
}

save();
console.log(`\n取得 ${ok} ／ 失敗 ${failed} → ${OUT_PATH.replace(`${ROOT}/`, '')}`);
if (ok === 0 && failed > 0) {
  console.error('検査不成立: 1 件も取得できなかった');
  process.exit(1);
}
