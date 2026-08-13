#!/usr/bin/env node
/**
 * x-own-metrics.mjs — 自分の X 投稿の反応を採取し「型 × 時間帯 × 導線」で集計する（read-only）
 * ---------------------------------------------------------------------------
 * なぜ要るか:
 *   投稿計画（型・時間帯・導線）を決める根拠が、これまで**競合の実測しか無かった**。
 *   自投稿の反応はリポジトリのどこにも記録が無く（x-publish-log.csv は 2026-04-29 で停止・
 *   反応列なし、GA4 は「サイト到達後」でX上の反応ではない）、投稿→反応→改善の輪が閉じていない。
 *   1日3本へ増やすなら、何が効いたかを自分のデータで見る必要がある。
 *
 * 【取得できるもの / できないもの】※誇張しないため明記
 *   取得できる: いいね数・リポスト数・投稿時刻・本文
 *   取得できない: **インプレッション（表示回数）・リプライ数・プロフィール遷移**
 *     → agent-reach twitter CLI が返さない。CTR 相当は出せない。
 *        「表示は多いが反応が薄い」型は本スクリプトでは判別できない。
 *
 * 【安全弁】scout-x-competitors.mjs と同じ:
 *   - read 専用（`twitter user` / `user-posts` のみ。write コマンドは持たせない）
 *   - 個人アカ uruhayato373 のセッションで**公開プロフィールを読むだけ**。
 *     投稿アカウント @doboku373 のセッション（.local/playwright-x-profile）は触らない
 *   - 取得 0 件は「検査不成立」として exit 1（0件を緑と呼ばない）
 *
 * 使い方:
 *   node scripts/x-own-metrics.mjs                # 採取して state を更新
 *   node scripts/x-own-metrics.mjs --report       # 採取せず、保存済みデータで集計表だけ出す
 *   node scripts/x-own-metrics.mjs -n 100         # 取得件数（既定 60）
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const HANDLE = 'doboku373';
const STATE_DIR = join(ROOT, '.claude/state/x-metrics');
const HISTORY_DIR = join(STATE_DIR, 'history');
const LATEST = join(STATE_DIR, 'own-posts.json');

const argv = process.argv.slice(2);
const REPORT_ONLY = argv.includes('--report');
const MAX = Math.max(5, parseInt(argv[argv.indexOf('-n') + 1] ?? '60', 10) || 60);

const TW = [join(process.env.HOME || '', '.local/bin/twitter'), 'twitter'].find(
  (p) => p === 'twitter' || existsSync(p)
);

/** read コマンドのみ実行（二重の安全弁） */
function tw(readCmd, handle, extra = []) {
  if (!['user', 'user-posts'].includes(readCmd)) throw new Error(`read-only 違反: ${readCmd}`);
  const r = spawnSync(TW, ['-c', readCmd, handle, ...extra], {
    encoding: 'utf-8', maxBuffer: 16 * 1024 * 1024, timeout: 90000,
  });
  return r.stdout || '';
}

/** "Jul 31 03:40"(UTC) → JST の {iso, hour}。年は当年、未来なら前年へ補正 */
function toJst(t, now) {
  const m = String(t || '').match(/^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const mo = months[m[1]];
  if (mo == null) return null;
  let d = new Date(Date.UTC(now.getUTCFullYear(), mo, +m[2], +m[3], +m[4]));
  if (d.getTime() - now.getTime() > 7 * 86400000) {
    d = new Date(Date.UTC(now.getUTCFullYear() - 1, mo, +m[2], +m[3], +m[4]));
  }
  const jst = new Date(d.getTime() + 9 * 3600000);
  return { iso: jst.toISOString().replace('Z', '+09:00'), hour: jst.getUTCHours(), date: jst.toISOString().slice(0, 10) };
}

/** 時間帯スロット（x-post-policy §7.1）。境界は policy と揃える */
function slotOf(hour) {
  if (hour == null) return '?';
  if (hour >= 6 && hour < 11) return 'A(朝)';
  if (hour >= 11 && hour < 15) return 'B(昼)';
  if (hour >= 18 && hour < 23) return 'C(夜)';
  return 'その他';
}

/** 本文から導線を判定（status.json に funnel が無い世代の投稿もあるため本文で見る） */
function funnelOf(text) {
  if (/coconala\.com/.test(text)) return 'coconala';
  if (/brain-market\.com/.test(text)) return 'brain';
  if (/note\.com/.test(text)) return 'note';
  if (/doboku-note\.com/.test(text)) return 'site';
  if (/https?:\/\/(t\.co|)/.test(text)) return 'url(不明)';
  return 'linkless';
}

/** docs/sns/x/**\/status.json を読み、本文冒頭 → {exam,title} の索引を作る */
function loadStatusIndex() {
  const idx = [];
  for (const base of ['docs/sns/x/draft', 'docs/sns/x/published']) {
    const dir = join(ROOT, base);
    if (!existsSync(dir)) continue;
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      if (!d.isDirectory() || d.name.startsWith('_')) continue; // _archive = 旧アカウント epoch
      const f = join(dir, d.name, 'status.json');
      if (!existsSync(f)) continue;
      let raw;
      try { raw = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
      const tweets = raw.tweets && !Array.isArray(raw.tweets) ? Object.values(raw.tweets) : (raw.tweets ?? []);
      for (const t of tweets) {
        const key = String(t.text || '').slice(0, 20).replace(/\s+/g, ' ').trim();
        if (key) idx.push({ key, exam: raw.exam ?? null, title: t.title ?? null, pack: d.name });
      }
    }
  }
  return idx;
}

/** 投稿本文から型ラベルを引く。status.json の title（"03 civil-1・個別支援"）の後半を使う */
function typeOf(hit) {
  if (!hit?.title) return '(未分類)';
  const m = String(hit.title).match(/・(.+)$/);
  return (m ? m[1] : hit.title).trim();
}

// ── 採取 ────────────────────────────────────────────────────────────────────
const now = new Date();
let store;
if (REPORT_ONLY) {
  if (!existsSync(LATEST)) {
    console.error('[x-own-metrics] NG: 保存済みデータが無い。まず採取する: node scripts/x-own-metrics.mjs');
    process.exit(1);
  }
  store = JSON.parse(readFileSync(LATEST, 'utf8'));
  console.log(`[x-own-metrics] 保存済み ${store.posts.length} 件で集計（採取 ${store.fetchedAt}）`);
} else {
  if (!TW) {
    console.error('[x-own-metrics] NG: twitter CLI が見つからない（~/.local/bin/twitter）');
    process.exit(1);
  }
  const profileYaml = tw('user', HANDLE);
  const followers = profileYaml.match(/^\s*followers:\s*(\d+)/m)?.[1] ?? null;
  const rawJson = tw('user-posts', HANDLE, ['-n', String(MAX), '--json']);
  const jsonStart = rawJson.indexOf('[');
  let arr = [];
  try { arr = JSON.parse(jsonStart >= 0 ? rawJson.slice(jsonStart) : rawJson); } catch { arr = []; }
  if (!Array.isArray(arr) || arr.length === 0) {
    console.error('[x-own-metrics] NG: 投稿を 0 件しか取得できなかった（検査不成立）。');
    console.error('  CLI の認証切れ・レート制限・ハンドル誤りを確認する。0 件を「反応なし」と解釈しないこと。');
    process.exit(1);
  }
  const posts = arr.map((p) => {
    const t = toJst(p.time, now);
    return {
      id: p.id,
      text: p.text,
      likes: Number(p.likes ?? 0),
      rts: Number(p.rts ?? 0),
      postedAtJst: t?.iso ?? null,
      date: t?.date ?? null,
      hour: t?.hour ?? null,
    };
  });
  store = {
    handle: HANDLE,
    fetchedAt: new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 19) + '+09:00',
    followers: followers ? Number(followers) : null,
    // 取得できない指標を明記しておく（後で「反応が無い」と誤読しないため）
    unavailableMetrics: ['impressions', 'replies', 'profileClicks'],
    source: 'agent-reach twitter CLI（read-only: user/user-posts）・個人アカ uruhayato373 経由',
    posts,
  };
  mkdirSync(HISTORY_DIR, { recursive: true });
  writeFileSync(LATEST, JSON.stringify(store, null, 2) + '\n');
  writeFileSync(join(HISTORY_DIR, `${store.fetchedAt.slice(0, 10)}.json`), JSON.stringify(store, null, 2) + '\n');
  console.log(`[x-own-metrics] 実採取 ${posts.length} 件 / フォロワー ${store.followers ?? '?'}`);
}

// ── 集計 ────────────────────────────────────────────────────────────────────
const index = loadStatusIndex();
const joined = store.posts.map((p) => {
  const head = String(p.text || '').slice(0, 20).replace(/\s+/g, ' ').trim();
  const hit = index.find((i) => head.startsWith(i.key.slice(0, 12)) || i.key.startsWith(head.slice(0, 12)));
  return { ...p, exam: hit?.exam ?? '(不明)', type: typeOf(hit), funnel: funnelOf(p.text || ''), matched: !!hit };
});
const matched = joined.filter((j) => j.matched).length;
console.log(`[x-own-metrics] status.json と突合: ${matched}/${joined.length} 件（未突合は型が "(未分類)" になる）`);

// 平均だけ見ると 1 本のバズに全体が引きずられる（実際 linkless は 57/35 の 2 本が牽引）。
// **中央値と最大値を併記**して、外れ値かどうかを読み手が判断できるようにする。
const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const agg = (keyFn) => {
  const m = new Map();
  for (const j of joined) {
    const k = keyFn(j);
    if (!m.has(k)) m.set(k, { likes: [], rts: 0 });
    const e = m.get(k);
    e.likes.push(j.likes); e.rts += j.rts;
  }
  return [...m.entries()]
    .map(([k, v]) => ({
      k, n: v.likes.length, rts: v.rts,
      avg: +(v.likes.reduce((s, x) => s + x, 0) / v.likes.length).toFixed(2),
      med: median(v.likes),
      max: Math.max(...v.likes),
    }))
    .sort((a, b) => b.med - a.med || b.avg - a.avg);
};
const table = (title, rows) => {
  console.log(`\n── ${title} ──（中央値の降順。平均は1本のバズで動くので中央値を主に見る）`);
  console.log('  ' + '区分'.padEnd(18) + '本数'.padStart(4) + '中央値'.padStart(7) + '平均'.padStart(8) + '最大'.padStart(6) + 'RT計'.padStart(6));
  for (const r of rows) {
    console.log('  ' + String(r.k).padEnd(18) + String(r.n).padStart(4) + String(r.med).padStart(8) + String(r.avg).padStart(9) + String(r.max).padStart(7) + String(r.rts).padStart(7));
  }
};

table('時間帯スロット別', agg((j) => slotOf(j.hour)));
table('導線別', agg((j) => j.funnel));
table('資格別', agg((j) => j.exam));
const types = agg((j) => j.type).filter((r) => r.k !== '(未分類)');
if (types.length) table('型別（status.json と突合できた分のみ）', types.slice(0, 12));

const top = [...joined].sort((a, b) => b.likes - a.likes).slice(0, 5);
console.log('\n── 反応が大きかった投稿 上位5 ──');
for (const t of top) {
  console.log(`  ♥${String(t.likes).padStart(3)} RT${String(t.rts).padStart(2)}  ${t.postedAtJst?.slice(5, 16) ?? '?'}  ${slotOf(t.hour).padEnd(7)} ${t.funnel.padEnd(9)} ${String(t.text).slice(0, 40)}…`);
}
console.log(`\n注意: インプレッション・リプライは取得できない（${store.unavailableMetrics?.join(' / ')}）。`);
console.log('      いいね数だけで「効かない型」と断じないこと。');
