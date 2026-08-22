#!/usr/bin/env node
/**
 * scout-x-competitors.mjs — X(旧Twitter) 競合の時系列偵察（read-only）
 * ---------------------------------------------------------------------------
 * .claude/config/x-competitors.json の各競合の公開プロフィール統計（フォロワー/総投稿数）と
 * 直近投稿（エンゲージ・更新頻度）を **agent-reach の twitter CLI** で取得し、共通 snapshot
 * schema（profile/counts/cadence/platformExtra/drift）へ正規化して時系列に落とす。前回比 drift
 *（フォロワー増減・投稿増・エンゲージ変化）を機械検出する。
 *
 * 【安全弁・重要】
 *   - **read 専用**: `twitter user` / `twitter user-posts` のみ実行。post/like/follow/retweet 等の
 *     書込みコマンドはこのスクリプトに一切持たせない（X 規約 platform manipulation 回避）。
 *   - **投稿アカウント（@doboku373）は使わない**: twitter CLI は運営者の個人アカウント
 *     `uruhayato373` セッションで認証されており、凍結復帰中の投稿アカウントには触れない
 *     （x-post-policy.md §11・x-suspension-guardrail）。未ログイン公開読取は X 側が 404 で遮断する
 *     ため、read はログイン済み CLI 経由が唯一の経路。
 *   - 低頻度（四半期）・少数（config の ≤15 プロフィール）・呼び出し間に jitter 遅延。
 *   - CLI がエラー/認証切れを返したら該当社を failed 記録し、他社の取得は続行（自動リトライしない）。
 *
 * 使い方:
 *   node scripts/scout-x-competitors.mjs                 # config 全社→時系列＋drift
 *   node scripts/scout-x-competitors.mjs --handle kaminoblog   # ad-hoc（履歴汚さない）
 *   node scripts/scout-x-competitors.mjs --posts 30      # 直近投稿の取得件数（既定20）
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { todayJst } from './lib/jst-date.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_PATH = join(ROOT, '.claude/config/x-competitors.json');
const STATE_DIR = join(ROOT, '.claude/state/x-competitors');
const HISTORY_DIR = join(STATE_DIR, 'history');
const LATEST_PATH = join(STATE_DIR, 'snapshot.json');

// twitter CLI の解決（agent-reach バックエンド。~/.local/bin を優先）
const TW = [join(process.env.HOME || '', '.local/bin/twitter'), 'twitter'].find(
  (p) => p === 'twitter' || existsSync(p)
);

const argv = process.argv.slice(2);
const getOne = (f, d) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const HANDLE_OVERRIDE = getOne('--handle', null);
const POSTS_N = Math.max(5, parseInt(getOne('--posts', '20'), 10) || 20);

/** twitter CLI を read コマンドで実行し stdout を返す（write コマンドは呼ばない）。 */
function tw(readCmd, handle, extra = []) {
  if (!['user', 'user-posts'].includes(readCmd)) throw new Error(`read-only 違反: ${readCmd}`); // 二重の安全弁
  const r = spawnSync(TW, ['-c', readCmd, handle, ...extra], { encoding: 'utf-8', maxBuffer: 16 * 1024 * 1024, timeout: 45000 });
  return r.stdout || '';
}

/** user の YAML から数値/文字列フィールドを取り出す（簡易・compact 出力用）。 */
function parseUser(yaml) {
  if (!/ok:\s*true/.test(yaml)) return null;
  const g = (k) => yaml.match(new RegExp(`^\\s*${k}:\\s*(.+)$`, 'm'))?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? null;
  const n = (k) => {
    const v = g(k);
    return v == null ? null : parseInt(String(v).replace(/[,]/g, ''), 10);
  };
  return {
    name: g('name'),
    screenName: g('screenName'),
    bio: g('bio'),
    followers: n('followers'),
    following: n('following'),
    tweets: n('tweets'),
    likes: n('likes'),
    verified: g('verified') === 'true',
    createdAtISO: g('createdAtISO'),
  };
}

/** "Jul 17 11:26" → その投稿からの経過日数（年は当年、未来なら前年に補正）。 */
function daysAgoFromPostTime(t, now) {
  if (!t) return null;
  const m = t.match(/^([A-Za-z]{3})\s+(\d{1,2})/);
  if (!m) return null;
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const mo = months[m[1]];
  if (mo == null) return null;
  let d = new Date(Date.UTC(now.getUTCFullYear(), mo, parseInt(m[2], 10)));
  if (d.getTime() - now.getTime() > 7 * 86400000) d = new Date(Date.UTC(now.getUTCFullYear() - 1, mo, parseInt(m[2], 10)));
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

const median = (arr) => {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

function analyze(comp, now) {
  const user = parseUser(tw('user', comp.handle));
  if (!user) return { handle: comp.handle, label: comp.label ?? null, exams: comp.exams ?? [], note: comp.note ?? null, profile: null, error: 'not_found_or_auth' };

  let posts = [];
  try {
    const raw = tw('user-posts', comp.handle, ['-n', String(POSTS_N)]);
    const jsonStart = raw.indexOf('[');
    if (jsonStart >= 0) posts = JSON.parse(raw.slice(jsonStart));
  } catch {
    /* 投稿取得失敗はプロフィールのみで続行 */
  }
  const eng = posts.map((p) => (p.likes || 0) + (p.rts || 0));
  const days = posts.map((p) => daysAgoFromPostTime(p.time, now)).filter((d) => d != null);
  const recent30 = days.filter((d) => d <= 30).length;
  const recent90 = days.filter((d) => d <= 90).length;
  const latestDaysAgo = days.length ? Math.min(...days) : null;

  return {
    handle: comp.handle,
    label: comp.label ?? user.name ?? null,
    exams: comp.exams ?? [],
    note: comp.note ?? null,
    profile: { nickname: user.name, screenName: user.screenName, followerCount: user.followers },
    counts: { tweetsTotal: user.tweets, postsSampled: posts.length },
    cadence: { recent30, recent90, latestDaysAgo },
    platformExtra: {
      following: user.following,
      verified: user.verified,
      avgEngagement: eng.length ? Math.round(eng.reduce((s, x) => s + x, 0) / eng.length) : null,
      medianEngagement: median(eng),
      engagementRate: eng.length && user.followers ? +((eng.reduce((s, x) => s + x, 0) / eng.length / user.followers) * 100).toFixed(3) : null,
      accountAgeYears: user.createdAtISO ? +((now.getTime() - Date.parse(user.createdAtISO)) / (365.25 * 86400000)).toFixed(1) : null,
    },
    // エンゲージ上位（伸びてる投稿レーダー）。text は型/トピック判定に足る長さのみ保持し丸写しはしない。
    // vsAvg = 自分の平均比（>1.5 は自アカ基準で明確に伸びた投稿＝勝ち型の候補）。
    engagementLeaders: (() => {
      const avg = eng.length ? eng.reduce((s, x) => s + x, 0) / eng.length : 0;
      return [...posts]
        .map((p) => ({ ...p, e: (p.likes || 0) + (p.rts || 0) }))
        .sort((a, b) => b.e - a.e)
        .slice(0, 10)
        .map((p) => ({ text: String(p.text || '').replace(/\s+/g, ' ').slice(0, 90), likes: p.likes, rts: p.rts, engagement: p.e, vsAvg: avg ? +(p.e / avg).toFixed(1) : null }));
    })(),
  };
}

// --- 時系列・drift（scout-note と同型）---
function todayStamp() {
  return todayJst();
}
function loadPreviousSnapshot(todayFile) {
  let files = [];
  try {
    files = readdirSync(HISTORY_DIR).filter((f) => /^competitors-\d{4}-\d{2}-\d{2}\.json$/.test(f));
  } catch {
    return null;
  }
  const prior = files.filter((f) => f < todayFile).sort();
  if (prior.length === 0) return null;
  try {
    return { file: prior[prior.length - 1], data: JSON.parse(readFileSync(join(HISTORY_DIR, prior[prior.length - 1]), 'utf-8')) };
  } catch {
    return null;
  }
}
function computeDrift(current, previous) {
  if (!previous) return { basis: null, entries: [] };
  const prevBy = new Map((previous.data.competitors ?? []).map((c) => [c.handle, c]));
  const curBy = new Map(current.map((c) => [c.handle, c]));
  const entries = [];
  for (const cur of current) {
    const prev = prevBy.get(cur.handle);
    if (!prev) { entries.push({ handle: cur.handle, type: 'new-entrant', detail: '新規追跡（前回比較なし）' }); continue; }
    const pf = prev.profile?.followerCount, cf = cur.profile?.followerCount;
    if (pf != null && cf != null && cf !== pf) entries.push({ handle: cur.handle, type: 'followers', before: pf, after: cf, detail: `フォロワー ${pf}→${cf}（${cf > pf ? '+' : ''}${cf - pf}）` });
    const pt = prev.counts?.tweetsTotal, ct = cur.counts?.tweetsTotal;
    if (pt != null && ct != null && ct !== pt) entries.push({ handle: cur.handle, type: 'posts', before: pt, after: ct, detail: `総投稿 ${pt}→${ct}（${ct > pt ? '+' : ''}${ct - pt}）` });
    const pd = prev.cadence?.latestDaysAgo, cd = cur.cadence?.latestDaysAgo;
    if (pd != null && cd != null) {
      if (pd < 30 && cd >= 30) entries.push({ handle: cur.handle, type: 'slowdown', before: pd, after: cd, detail: `更新鈍化（最新 ${cd}日前）` });
      if (pd >= 30 && cd < 30) entries.push({ handle: cur.handle, type: 'revived', before: pd, after: cd, detail: `更新再開（最新 ${cd}日前）` });
    }
  }
  for (const prev of previous.data.competitors ?? []) if (!curBy.has(prev.handle)) entries.push({ handle: prev.handle, type: 'dropped', detail: '今回取得なし（凍結/改名/config除外の疑い）' });
  return { basis: previous.file, entries };
}
const fmt = (n) => (n == null ? '—' : n.toLocaleString('ja-JP'));

function sleep(ms) {
  spawnSync(process.execPath, ['-e', `setTimeout(()=>{}, ${ms})`], { timeout: ms + 2000 }); // 同期 jitter
}

function main() {
  if (!TW) {
    console.error('ERROR: twitter CLI（agent-reach）が見つかりません（~/.local/bin/twitter）。');
    process.exit(1);
  }
  let competitors;
  if (HANDLE_OVERRIDE) competitors = [{ handle: HANDLE_OVERRIDE }];
  else competitors = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')).competitors ?? [];
  if (competitors.length === 0) { console.error('ERROR: 対象ハンドルがありません。'); process.exit(1); }
  if (competitors.length > 15) { console.error('ERROR: 安全弁＝1回 ≤15 プロフィール。config を分割してください。'); process.exit(1); }
  const PARTIAL = Boolean(HANDLE_OVERRIDE);

  console.log('=== X 競合偵察（twitter CLI・read専用・個人アカ uruhayato373 経由）===');
  console.log(`対象: ${competitors.length} 社 / 直近投稿 ${POSTS_N} 件サンプル\n`);

  const now = new Date();
  const results = [];
  let failed = 0;
  for (const comp of competitors) {
    let r;
    try { r = analyze(comp, now); } catch (e) { r = { handle: comp.handle, label: comp.label ?? null, error: e?.message }; }
    results.push(r);
    if (r.error || !r.profile) {
      failed++;
      console.log(`✗ ${comp.handle}${comp.label ? `（${comp.label}）` : ''}: ${r.error || '取得失敗'}`);
    } else {
      const pe = r.platformExtra;
      console.log(`● @${r.handle}（${r.label}）  ${(r.exams || []).join('/')}`);
      console.log(`   follower ${fmt(r.profile.followerCount)} / 総投稿 ${fmt(r.counts.tweetsTotal)} / ${pe.accountAgeYears}年 / ${pe.verified ? '認証済' : '一般'}`);
      console.log(`   更新: 30日${r.cadence.recent30}本 / 最新${r.cadence.latestDaysAgo ?? '—'}日前  エンゲージ平均${fmt(pe.avgEngagement)}(率${pe.engagementRate ?? '—'}%)`);
    }
    sleep(1500 + Math.floor(now.getTime() % 1500)); // jitter 1.5〜3.0s（礼節・bot 足跡最小化）
  }

  const stamp = todayStamp();
  const todayFile = `competitors-${stamp}.json`;
  const previous = PARTIAL ? null : loadPreviousSnapshot(todayFile);
  const drift = computeDrift(results, previous);

  console.log('\n--- 前回比ドリフト ---');
  if (!previous) console.log(PARTIAL ? '  （--handle 部分実行のため比較・履歴保存なし）' : '  （初回＝比較対象なし。次回から差分検出）');
  else if (drift.entries.length === 0) console.log(`  変化なし（基準: ${drift.basis}）`);
  else { console.log(`  基準: ${drift.basis}`); for (const e of drift.entries) console.log(`  [${e.type}] ${e.handle}: ${e.detail}`); }

  const snapshot = {
    fetchedAt: new Date().toISOString(),
    platform: 'x',
    source: 'agent-reach twitter CLI（read-only: user/user-posts）・個人アカ uruhayato373 経由・投稿アカ@doboku373 不使用',
    caveat: 'フォロワー/総投稿は公開プロフィール由来。エンゲージ/更新頻度は直近投稿サンプル基準の推定（year は投稿時刻に無く当年補正）。有料DM/限定は取得不可。',
    driftBasis: drift.basis,
    drift: drift.entries,
    competitors: results,
  };
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(LATEST_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
  if (!PARTIAL) {
    mkdirSync(HISTORY_DIR, { recursive: true });
    writeFileSync(join(HISTORY_DIR, todayFile), JSON.stringify(snapshot, null, 2), 'utf-8');
    console.log(`\n時系列保存: .claude/state/x-competitors/history/${todayFile}`);
  }
  console.log(`最新ポインタ: ${LATEST_PATH}`);
  console.log(`完了: ${results.length} 社（失敗 ${failed}）→ 分析は competitor-analyst --platform x`);
  process.exit(failed === results.length ? 1 : 0);
}

main();
