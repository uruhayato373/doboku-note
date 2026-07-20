#!/usr/bin/env node
/**
 * scout-ig-competitors.mjs — Instagram 競合の時系列偵察（read-only・未ログイン）
 * ---------------------------------------------------------------------------
 * .claude/config/ig-competitors.json の各競合の公開プロフィール統計（フォロワー/フォロー/
 * 投稿数）を **未ログインの公開ページ（og:description メタ）** から curl で取得し、共通
 * snapshot schema（profile/counts/cadence/platformExtra/drift）へ正規化して時系列に落とす。
 * 前回比 drift（フォロワー増減・投稿数増＝投稿活動）を機械検出する。
 *
 * 【安全弁】
 *   - **投稿アカウント（@dobokunotecom の IG セッション・.local/playwright-ig-bs-profile）は使わない**。
 *     IG は og:description メタにフォロワー/フォロー/投稿数を載せており、**未ログイン curl で取得可能**
 *     （2026-07-20 実証）。ログイン自動化の足跡をゼロにできる（X が 404 遮断だったのと対照的）。
 *   - read 専用（curl のみ）・低頻度（四半期）。
 *
 * 制約（正直な明示）: 未ログインでは**個別投稿のエンゲージ（いいね/コメント）は取得不可**
 *   （投稿グリッドがログイン壁）。取れるのはフォロワー/フォロー/投稿数まで。投稿数の前回比
 *   増減が「その期間の投稿活動」の代理。伸びてる投稿の型抽出は IG では未対応（要ログイン）。
 *
 * 使い方:
 *   node scripts/scout-ig-competitors.mjs                # config 全社→時系列＋drift
 *   node scripts/scout-ig-competitors.mjs --handle chiiki.sekokan  # ad-hoc（履歴汚さない）
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_PATH = join(ROOT, '.claude/config/ig-competitors.json');
const STATE_DIR = join(ROOT, '.claude/state/ig-competitors');
const HISTORY_DIR = join(STATE_DIR, 'history');
const LATEST_PATH = join(STATE_DIR, 'snapshot.json');

const argv = process.argv.slice(2);
const hi = argv.indexOf('--handle');
const HANDLE_OVERRIDE = hi >= 0 && argv[hi + 1] ? argv[hi + 1] : null;

/** 公開プロフィールページを curl 取得（未ログイン）。 */
function curlHtml(handle) {
  const r = spawnSync(
    'curl',
    ['-sS', '-m', '25', '--ssl-no-revoke', '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', `https://www.instagram.com/${handle}/`],
    { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 }
  );
  return r.stdout || '';
}

const toNum = (s) => (s == null ? null : parseInt(String(s).replace(/[,]/g, ''), 10));

/** og:description = "677 Followers, 488 Following, 47 Posts - See ... from Nick (@handle)" */
function parseProfile(html) {
  const m = html.match(/<meta property="og:description" content="([^"]*)"/);
  if (!m) return null;
  const d = m[1];
  const fm = d.match(/([\d,]+)\s+Followers,\s+([\d,]+)\s+Following,\s+([\d,]+)\s+Posts/i);
  if (!fm) return null;
  // ニックネーム（HTMLエンティティは概ねそのまま・"from X (@handle)" の X 部分）
  const nm = d.match(/from\s+(.+?)\s+\(@/);
  const nick = nm ? nm[1].replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, '&') : null;
  return { nickname: nick, followers: toNum(fm[1]), following: toNum(fm[2]), posts: toNum(fm[3]) };
}

// --- 時系列・drift（scout-note と同型）---
function todayStamp() {
  return new Date().toISOString().slice(0, 10);
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
    const pp = prev.counts?.posts, cp = cur.counts?.posts;
    if (pp != null && cp != null && cp !== pp) entries.push({ handle: cur.handle, type: cp > pp ? 'new-posts' : 'removed-posts', before: pp, after: cp, detail: `投稿数 ${pp}→${cp}（${cp > pp ? '+' : ''}${cp - pp}＝この期間の投稿活動）` });
  }
  for (const prev of previous.data.competitors ?? []) if (!curBy.has(prev.handle)) entries.push({ handle: prev.handle, type: 'dropped', detail: '今回取得なし（非公開化/改名/config除外の疑い）' });
  return { basis: previous.file, entries };
}
const fmt = (n) => (n == null ? '—' : n.toLocaleString('ja-JP'));

function main() {
  let competitors;
  if (HANDLE_OVERRIDE) competitors = [{ handle: HANDLE_OVERRIDE }];
  else competitors = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')).competitors ?? [];
  if (competitors.length === 0) { console.error('ERROR: 対象ハンドルがありません。'); process.exit(1); }
  const PARTIAL = Boolean(HANDLE_OVERRIDE);

  console.log('=== Instagram 競合偵察（未ログイン公開プロフィール・投稿アカ不使用）===');
  console.log(`対象: ${competitors.length} 社\n`);

  const results = [];
  let failed = 0;
  for (const comp of competitors) {
    const prof = parseProfile(curlHtml(comp.handle));
    if (!prof) {
      failed++;
      results.push({ handle: comp.handle, label: comp.label ?? null, exams: comp.exams ?? [], note: comp.note ?? null, profile: null, error: 'og:description 取得失敗（非公開/レート制限/改名の疑い）' });
      console.log(`✗ @${comp.handle}${comp.label ? `（${comp.label}）` : ''}: 取得失敗`);
      continue;
    }
    results.push({
      handle: comp.handle,
      label: comp.label ?? prof.nickname ?? null,
      exams: comp.exams ?? [],
      note: comp.note ?? null,
      profile: { nickname: prof.nickname, followerCount: prof.followers },
      counts: { posts: prof.posts },
      cadence: null, // 未ログインでは投稿日時が取れない＝投稿数の前回比が活動の代理
      platformExtra: { following: prof.following, followerPerPost: prof.posts ? +(prof.followers / prof.posts).toFixed(1) : null },
    });
    console.log(`● @${comp.handle}（${prof.nickname || comp.label || ''}）  ${(comp.exams || []).join('/')}`);
    console.log(`   follower ${fmt(prof.followers)} / following ${fmt(prof.following)} / posts ${fmt(prof.posts)}  (投稿あたり follower ${prof.posts ? Math.round(prof.followers / prof.posts) : '—'})`);
    spawnSync('sleep', ['1']); // 礼節
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
    platform: 'ig',
    source: '未ログイン公開プロフィール（og:description メタ・curl）。投稿アカ@dobokunotecom の IG セッションは不使用。',
    caveat: 'フォロワー/フォロー/投稿数は og:description 由来（clean）。個別投稿のエンゲージ（いいね/コメント）は未ログインでは取得不可＝投稿グリッドがログイン壁。投稿数の前回比増減が投稿活動の代理。伸びてる投稿の型抽出は IG では未対応。',
    driftBasis: drift.basis,
    drift: drift.entries,
    competitors: results,
  };
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(LATEST_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
  if (!PARTIAL) {
    mkdirSync(HISTORY_DIR, { recursive: true });
    writeFileSync(join(HISTORY_DIR, todayFile), JSON.stringify(snapshot, null, 2), 'utf-8');
    console.log(`\n時系列保存: .claude/state/ig-competitors/history/${todayFile}`);
  }
  console.log(`最新ポインタ: ${LATEST_PATH}`);
  console.log(`完了: ${results.length} 社（失敗 ${failed}）→ 分析は competitor-analyst --platform ig`);
  process.exit(failed === results.length ? 1 : 0);
}

main();
