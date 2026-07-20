#!/usr/bin/env node
/**
 * scout-note-competitors.mjs
 * ---------------------------------------------------------------------------
 * note.com の競合クリエイターの「マガジン・単品記事・価格・スキ数・投稿日」を
 * public API（認証不要）から取得し、価格帯・品揃え・更新頻度を機械集計して
 * JSON スナップショットに落とす偵察ツール。意味的な差別化分析（価格帯マップ・
 * 品揃えギャップ）は note-competitor-analyst エージェントが本 JSON を読んで行う
 * ＝機械（本スクリプト）と判断（Evaluator）の分離。
 *
 * 対象ハンドルは .claude/config/note-competitors.json（--handle で ad-hoc 上書き）。
 * 分析記録の真実源は docs/project/01_戦略/09_note競合分析2026.md。
 *
 * 取得経路（会社 PC プロキシ対策・verify-note-magazines.mjs と同方式）:
 *   - HTTP(S)_PROXY を curl が自動利用 ／ curl に --ssl-no-revoke（失効確認回避が必須）
 *   - creators/{handle}                         … プロフィール（follower/note/magazine 数）
 *   - creators/{handle}/contents?kind=magazine  … マガジン一覧（name/key/price/description）
 *   - creators/{handle}/contents?kind=note      … 単品記事（name/key/price/likeCount/publishAt）
 *   - magazines/{key}/notes                      … マガジン収録記事（--contents 時のみ）
 *
 * 制約（正直な明示）: 有料記事の本文は paywall で取得不可。取れるのは
 *   タイトル・価格・スキ数・投稿日・無料プレビューまで。
 *
 * 使い方:
 *   npm run scout-note-competitors                     # config 全社を偵察→JSON保存
 *   npm run scout-note-competitors -- --handle sosou_nino,chansato_st  # ad-hoc 指定
 *   npm run scout-note-competitors -- --note-pages 20  # 単品記事を直近20ページまで（既定5）
 *   npm run scout-note-competitors -- --contents       # 各マガジンの収録記事も取得（重い）
 * ---------------------------------------------------------------------------
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_PATH = join(ROOT, '.claude/config/note-competitors.json');
const SNAPSHOT_DIR = join(ROOT, '.claude/state/note');
const SNAPSHOT_PATH = join(SNAPSHOT_DIR, 'competitors-snapshot.json');

const args = process.argv.slice(2);
function argVal(flag, def) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}
const WANT_CONTENTS = args.includes('--contents');
const NOTE_PAGES = Math.max(1, parseInt(argVal('--note-pages', '5'), 10) || 5);
const HANDLE_OVERRIDE = argVal('--handle', null);

/** curl で JSON を取得（プロキシ + 失効チェック無効化）。HTML/空はリトライ。 */
function curlJson(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = spawnSync(
      'curl',
      ['-sS', '-m', '30', '--ssl-no-revoke', '-H', 'User-Agent: Mozilla/5.0', '-H', 'Accept: application/json', url],
      { encoding: 'utf-8', maxBuffer: 48 * 1024 * 1024 }
    );
    const body = (r.stdout || '').trim();
    if (body.startsWith('{') || body.startsWith('[')) {
      try {
        return JSON.parse(body);
      } catch {
        /* retry */
      }
    }
  }
  return null;
}

function fetchProfile(handle) {
  const d = curlJson(`https://note.com/api/v2/creators/${handle}`)?.data;
  if (!d) return null;
  return {
    nickname: d.nickname ?? null,
    followerCount: d.followerCount ?? null,
    noteCount: d.noteCount ?? null,
    magazineCount: d.magazineCount ?? null,
  };
}

/** kind=magazine|note のコンテンツを取得（page 上限つき）。 */
function fetchContents(handle, kind, maxPages) {
  const out = [];
  let totalHint = null;
  for (let page = 1; page <= maxPages; page++) {
    const d = curlJson(
      `https://note.com/api/v2/creators/${handle}/contents?kind=${kind}&page=${page}`
    );
    const data = d?.data;
    const contents = data?.contents ?? [];
    if (contents.length === 0) break;
    for (const c of contents) {
      out.push({
        key: c.key,
        name: c.name,
        price: c.price ?? 0,
        likeCount: c.likeCount ?? null,
        publishAt: c.publishAt ?? null,
        description: kind === 'magazine' ? c.description ?? '' : undefined,
        isMembershipConnected: c.isMembershipConnected ?? false,
        hashtags: Array.isArray(c.hashtags) ? c.hashtags.map((h) => h?.hashtag?.name ?? h?.name).filter(Boolean) : undefined,
      });
    }
    if (data?.isLastPage) {
      totalHint = out.length;
      break;
    }
  }
  return { items: out, complete: totalHint != null };
}

function fetchMagazineNotes(key) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const d = curlJson(`https://note.com/api/v1/magazines/${key}/notes?page=${page}`);
    const notes = d?.data?.notes ?? [];
    if (notes.length === 0) break;
    for (const n of notes) out.push({ key: n.key, name: n.name, price: n.price ?? 0 });
    if (d?.data?.isLastPage) break;
  }
  return out;
}

const median = (arr) => {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/** 価格帯バンド（09 の分析軸に合わせる）。 */
function priceBands(prices) {
  const b = { low: 0, mid: 0, high: 0, premium: 0 }; // ~999 / 1000-2999 / 3000-11999 / 12000+
  for (const p of prices) {
    if (p < 1000) b.low++;
    else if (p < 3000) b.mid++;
    else if (p < 12000) b.high++;
    else b.premium++;
  }
  return b;
}

function daysAgo(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

function analyze(comp) {
  const profile = fetchProfile(comp.handle);
  const mags = fetchContents(comp.handle, 'magazine', 20);
  const notes = fetchContents(comp.handle, 'note', NOTE_PAGES);

  const paidMagazines = mags.items.filter((m) => m.price > 0);
  const paidNotes = notes.items.filter((n) => n.price > 0);
  const allPaidPrices = [...paidMagazines.map((m) => m.price), ...paidNotes.map((n) => n.price)];

  // 直近サンプル（notes は page 上限のため）から更新頻度・人気を推定
  const recent30 = notes.items.filter((n) => (daysAgo(n.publishAt) ?? 9999) <= 30).length;
  const recent90 = notes.items.filter((n) => (daysAgo(n.publishAt) ?? 9999) <= 90).length;
  const latest = notes.items
    .map((n) => n.publishAt)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] ?? null;
  const topLiked = [...notes.items]
    .filter((n) => n.likeCount != null)
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 5)
    .map((n) => ({ name: String(n.name).slice(0, 48), likeCount: n.likeCount, price: n.price }));
  const hasMembership = mags.items.some((m) => m.isMembershipConnected) || notes.items.some((n) => n.isMembershipConnected);

  if (WANT_CONTENTS) {
    for (const m of paidMagazines) m.notes = fetchMagazineNotes(m.key);
  }

  return {
    handle: comp.handle,
    label: comp.label ?? null,
    exams: comp.exams ?? [],
    note: comp.note ?? null,
    profile,
    counts: {
      magazinesTotal: mags.items.length,
      magazinesPaid: paidMagazines.length,
      notesSampled: notes.items.length,
      notesComplete: notes.complete,
      notesPaidInSample: paidNotes.length,
    },
    price: {
      min: allPaidPrices.length ? Math.min(...allPaidPrices) : null,
      median: median(allPaidPrices),
      max: allPaidPrices.length ? Math.max(...allPaidPrices) : null,
      bands: priceBands(allPaidPrices),
    },
    cadence: { recent30, recent90, latestPublishAt: latest, latestDaysAgo: daysAgo(latest) },
    hasMembership,
    topLiked,
    paidMagazines: paidMagazines.map((m) => ({
      key: m.key,
      name: m.name,
      price: m.price,
      description: String(m.description ?? '').slice(0, 160),
      ...(m.notes ? { noteCount: m.notes.length, notes: m.notes } : {}),
    })),
    paidNotesSample: paidNotes.slice(0, 30).map((n) => ({ key: n.key, name: n.name, price: n.price, likeCount: n.likeCount, publishAt: n.publishAt })),
  };
}

function fmt(n) {
  return n == null ? '—' : n.toLocaleString('ja-JP');
}

function main() {
  let competitors;
  if (HANDLE_OVERRIDE) {
    competitors = HANDLE_OVERRIDE.split(',').map((h) => ({ handle: h.trim() })).filter((c) => c.handle);
  } else {
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    competitors = cfg.competitors ?? [];
  }
  if (competitors.length === 0) {
    console.error('ERROR: 対象ハンドルがありません（config が空 or --handle 未指定）。');
    process.exit(1);
  }

  console.log('=== note 競合偵察 ===');
  console.log(`対象: ${competitors.length} 社 / 単品記事 直近${NOTE_PAGES}ページ${WANT_CONTENTS ? ' / マガジン収録も取得' : ''}\n`);

  const results = [];
  let failed = 0;
  for (const comp of competitors) {
    const r = analyze(comp);
    results.push(r);
    if (!r.profile && r.counts.magazinesTotal === 0 && r.counts.notesSampled === 0) {
      failed++;
      console.log(`✗ ${comp.handle}: 取得失敗（ハンドル誤り or 非公開 or 疎通不可）`);
      continue;
    }
    const p = r.profile ?? {};
    const pr = r.price;
    console.log(`● ${comp.handle}${r.label ? `（${r.label}）` : ''}  ${(r.exams || []).join('/') || ''}`);
    console.log(`   follower ${fmt(p.followerCount)} / note ${fmt(p.noteCount)} / magazine ${fmt(p.magazineCount)}${r.hasMembership ? ' / メンバーシップ有' : ''}`);
    console.log(`   有料: マガジン${r.counts.magazinesPaid}本・単品${r.counts.notesPaidInSample}本(直近${r.counts.notesSampled}中)  価格 ¥${fmt(pr.min)}〜¥${fmt(pr.max)}(中央¥${fmt(pr.median)})  帯[低${pr.bands.low}/中${pr.bands.mid}/高${pr.bands.high}/超${pr.bands.premium}]`);
    console.log(`   更新: 30日${r.cadence.recent30}本 / 90日${r.cadence.recent90}本 / 最新${r.cadence.latestDaysAgo ?? '—'}日前`);
    if (r.topLiked.length) console.log(`   人気: ${r.topLiked.slice(0, 3).map((t) => `♡${t.likeCount}${t.price ? `¥${t.price}` : ''}「${t.name.slice(0, 22)}」`).join('  ')}`);
    console.log('');
  }

  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const snapshot = {
    fetchedAt: new Date().toISOString(),
    notePagesPerCreator: NOTE_PAGES,
    withMagazineContents: WANT_CONTENTS,
    caveat: '単品記事は直近ページのみのサンプル。有料記事の本文は paywall で取得不可（タイトル・価格・スキ数・投稿日まで）。',
    competitors: results,
  };
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`スナップショット保存: ${SNAPSHOT_PATH}`);
  console.log(`完了: ${results.length} 社（失敗 ${failed} 社）`);
  console.log('→ 差別化分析は note-competitor-analyst エージェントに本 JSON を渡す');
  process.exit(failed === results.length ? 1 : 0);
}

main();
