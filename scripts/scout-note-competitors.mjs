#!/usr/bin/env node
/**
 * scout-note-competitors.mjs
 * ---------------------------------------------------------------------------
 * note.com の競合クリエイターの「マガジン・単品記事・価格・スキ数・投稿日」を
 * public API（認証不要）から取得し、価格帯・品揃え・更新頻度を機械集計して
 * 時系列スナップショットに落とす偵察ツール。前回スナップショットとの差分
 * （価格改定・新商品・休眠・新規参入）を機械検出して drift[] に載せる。
 * 意味的な差別化分析（価格帯マップ・品揃えギャップ・09 反映パッチ）は
 * note-competitor-analyst エージェントが本 JSON を読んで行う＝機械（本
 * スクリプト）と判断（Evaluator）の分離。
 *
 * 出力（SSOT）:
 *   - .claude/state/note/history/competitors-YYYY-MM-DD.json … 日付つき時系列（コミット）
 *   - .claude/state/note/competitors-snapshot.json           … 最新へのポインタ（上書き）
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
 *   タイトル・価格・スキ数・投稿日・無料プレビューまで。単品記事は直近ページの
 *   サンプル（--note-pages）＝頻度・人気は直近サンプル基準の推定。
 *
 * 使い方:
 *   npm run scout-note-competitors                     # config 全社を偵察→時系列保存＋前回比ドリフト
 *   npm run scout-note-competitors -- --handle sosou_nino,chansato_st  # ad-hoc 指定
 *   npm run scout-note-competitors -- --note-pages 20  # 単品記事を直近20ページまで（既定5）
 *   npm run scout-note-competitors -- --contents       # 各マガジンの収録記事も取得（重い）
 * ---------------------------------------------------------------------------
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_PATH = join(ROOT, '.claude/config/note-competitors.json');
const STATE_DIR = join(ROOT, '.claude/state/note');
const HISTORY_DIR = join(STATE_DIR, 'history');
const LATEST_PATH = join(STATE_DIR, 'competitors-snapshot.json');

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
  let complete = false;
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
      });
    }
    if (data?.isLastPage) {
      complete = true;
      break;
    }
  }
  return { items: out, complete };
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

  const recent30 = notes.items.filter((n) => (daysAgo(n.publishAt) ?? 9999) <= 30).length;
  const recent90 = notes.items.filter((n) => (daysAgo(n.publishAt) ?? 9999) <= 90).length;
  const latest = notes.items.map((n) => n.publishAt).filter(Boolean).sort().slice(-1)[0] ?? null;
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

// --- 時系列・ドリフト -------------------------------------------------------

function todayStamp() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD（UTC。日単位の履歴には十分）
}

/** 今日より前の最新 history スナップショットを読む（比較対象）。 */
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

/** 前回比の差分を検出。type = new-entrant|dropped|price|new-product|dormant|revived|cadence。 */
function computeDrift(current, previous) {
  if (!previous) return { basis: null, entries: [] };
  const prevBy = new Map((previous.data.competitors ?? []).map((c) => [c.handle, c]));
  const curBy = new Map(current.map((c) => [c.handle, c]));
  const entries = [];

  for (const cur of current) {
    const prev = prevBy.get(cur.handle);
    if (!prev) {
      entries.push({ handle: cur.handle, type: 'new-entrant', detail: `新規追跡対象（前回比較なし）` });
      continue;
    }
    // 価格（max=フラグシップ価格の代理）
    const pa = prev.price ?? {}, ca = cur.price ?? {};
    if (ca.max != null && pa.max != null && ca.max !== pa.max) {
      entries.push({ handle: cur.handle, type: 'price', field: 'max', before: pa.max, after: ca.max, detail: `フラグシップ価格 ¥${pa.max}→¥${ca.max}` });
    }
    if (ca.median != null && pa.median != null && ca.median !== pa.median) {
      entries.push({ handle: cur.handle, type: 'price', field: 'median', before: pa.median, after: ca.median, detail: `価格中央値 ¥${pa.median}→¥${ca.median}` });
    }
    // 有料商品数（新商品/撤収の代理）
    const pc = prev.counts?.magazinesPaid ?? 0, cc = cur.counts?.magazinesPaid ?? 0;
    if (cc !== pc) {
      entries.push({ handle: cur.handle, type: cc > pc ? 'new-product' : 'removed', before: pc, after: cc, detail: `有料マガジン ${pc}→${cc}本` });
    }
    // 休眠/復活（最終投稿日の遠近が閾値をまたいだか）
    const pd = prev.cadence?.latestDaysAgo, cd = cur.cadence?.latestDaysAgo;
    if (pd != null && cd != null) {
      if (pd < 90 && cd >= 90) entries.push({ handle: cur.handle, type: 'dormant', before: pd, after: cd, detail: `休眠化（最終投稿 ${cd}日前）` });
      if (pd >= 90 && cd < 90) entries.push({ handle: cur.handle, type: 'revived', before: pd, after: cd, detail: `更新再開（最終投稿 ${cd}日前）` });
    }
  }
  for (const prev of previous.data.competitors ?? []) {
    if (!curBy.has(prev.handle)) entries.push({ handle: prev.handle, type: 'dropped', detail: `今回取得なし（config から除外 or 非公開/疎通不可）` });
  }
  return { basis: previous.file, entries };
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

  // 前回比ドリフト（ad-hoc --handle 時は履歴を汚さない/比較しない）
  const stamp = todayStamp();
  const todayFile = `competitors-${stamp}.json`;
  const previous = HANDLE_OVERRIDE ? null : loadPreviousSnapshot(todayFile);
  const drift = computeDrift(results, previous);

  console.log('--- 前回比ドリフト ---');
  if (!previous) {
    console.log(HANDLE_OVERRIDE ? '  （--handle 指定のため比較・履歴保存なし）' : '  （初回＝比較対象なし。次回から差分検出）');
  } else if (drift.entries.length === 0) {
    console.log(`  変化なし（基準: ${drift.basis}）`);
  } else {
    console.log(`  基準: ${drift.basis}`);
    for (const e of drift.entries) console.log(`  [${e.type}] ${e.handle}: ${e.detail}`);
  }

  const snapshot = {
    fetchedAt: new Date().toISOString(),
    notePagesPerCreator: NOTE_PAGES,
    withMagazineContents: WANT_CONTENTS,
    caveat: '単品記事は直近ページのみのサンプル。有料記事の本文は paywall で取得不可（タイトル・価格・スキ数・投稿日まで）。',
    driftBasis: drift.basis,
    drift: drift.entries,
    competitors: results,
  };

  mkdirSync(STATE_DIR, { recursive: true });
  // 最新ポインタは常に更新
  writeFileSync(LATEST_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
  // 履歴は config 対象の通常実行時のみ（ad-hoc --handle は履歴を汚さない）
  if (!HANDLE_OVERRIDE) {
    mkdirSync(HISTORY_DIR, { recursive: true });
    writeFileSync(join(HISTORY_DIR, todayFile), JSON.stringify(snapshot, null, 2), 'utf-8');
    console.log(`\n時系列保存: .claude/state/note/history/${todayFile}`);
  }
  console.log(`最新ポインタ: ${LATEST_PATH}`);
  console.log(`完了: ${results.length} 社（失敗 ${failed} 社 / ドリフト ${drift.entries.length} 件）`);
  console.log('→ 差別化分析＋09反映パッチは note-competitor-analyst エージェントに本 JSON を渡す');
  process.exit(failed === results.length ? 1 : 0);
}

main();
