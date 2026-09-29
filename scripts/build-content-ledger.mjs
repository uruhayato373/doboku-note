#!/usr/bin/env node
/**
 * build-content-ledger.mjs — 管理画面「コンテンツ台帳」（/content/ledger）が読む note 記事の索引を作る（DN-0438）。
 *
 * なぜ索引が要るか: この端末では EDR のスキャンで 1 ファイル 20〜45ms かかり、note の原稿約 920 本を読むだけで
 * 1 分を超える（memory: reference_local_build_io_bound）。同期の計画（note-sync-plan）も約 20 秒かかる。
 * 画面を開くたびに走らせず、この索引を読む。マガジン・ココナラ・Kindle の商品は件数が少なく速いので索引に入れない
 * （画面が既存の台帳から直接読む）。
 *
 * 記事ごとに持つもの: パス・タイトル・テーマ（scripts/lib/content-theme.mjs）・価格区分・マガジン・公開 URL・
 * 導線マーカー（<!-- cta:<id> -->）・同期の状態（note-sync-plan と同じ判定）。
 * 原稿は更新時刻が前回の索引と同じなら読み直さない（2 回目以降は速い）。同期の計画は毎回作り直す。
 *
 * 使い方:
 *   npm run content-ledger                         # 索引を作る（.claude/state/content-ledger.json・git 管理外）
 *   node scripts/build-content-ledger.mjs --spawn-if-stale 6   # 6 時間より古ければ裏で作り直して即終了（npm run admin の前段）
 *   node scripts/build-content-ledger.mjs --refresh-cta          # 導線の公開照合を全部やり直す（既定は ok の記事を 24 時間は見直さない）
 *   node scripts/build-content-ledger.mjs --no-live              # 公開 API を叩かない（導線の照合は前回の結果のまま）
 *
 * 導線の公開照合（scripts/lib/note-cta-live.mjs）: 導線マーカーのある公開記事について、公開 API の本文に原稿の
 * リンク先が順番・位置どおり出ているかを見る。導線は note-append-cta で公開記事へ直接入れることがあり、同期の記録から
 * 推測できないため。ok 以外（missing / order / position / 取得失敗 unknown）は毎回照合し直す。
 *
 * exit: 0 作成 / 1 失敗（同期の計画が作れない・記事 0 本）
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

import { classifyNote, loadThemes, themeLabel } from './lib/content-theme.mjs';
import { fetchNoteDetails } from './lib/note-api.mjs';
import { classifyArticleCtas, extractCtaExpectations } from './lib/note-cta-live.mjs';
import { BLOCKERS, buildSyncPlan } from './lib/note-sync-plan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LEDGER_PATH = join(ROOT, '.claude', 'state', 'content-ledger.json');
const NOTE_ROOT = join(ROOT, 'content', 'note');
const TAG = '[content-ledger]';
const VERSION = 3; // 2: 導線の公開照合（ctaExpect / ctaLive）を追加　3: 導線の種類ごとに照合（ctaExpect を配列に）
const argv = process.argv.slice(2);
const REFRESH_CTA = argv.includes('--refresh-cta');
const NO_LIVE = argv.includes('--no-live');
const CTA_OK_TTL_MS = 24 * 3_600_000;

function readPrevious() {
  try {
    return JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));
  } catch {
    return null;
  }
}

/** 裏で作り直すか（索引が無い・指定時間より古い）。 */
function spawnIfStale(hours) {
  const prev = readPrevious();
  const age = prev?.generatedAt ? (Date.now() - Date.parse(prev.generatedAt)) / 3_600_000 : Infinity;
  if (age < hours) {
    console.log(`${TAG} 索引は ${age.toFixed(1)} 時間前のもの。作り直さない。`);
    return;
  }
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], { cwd: ROOT, detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
  console.log(`${TAG} 索引が${prev ? '古い' : '無い'}ので裏で作り直す（管理画面は待たずに起動する）。`);
}

function walkNotes() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name !== 'img') walk(join(dir, e.name));
      } else if (/^article(-[^/\\]+)?\.md$/.test(e.name)) {
        out.push(join(dir, e.name));
      }
    }
  };
  if (existsSync(NOTE_ROOT)) walk(NOTE_ROOT);
  return out;
}

async function build() {
  const started = Date.now();
  const themes = loadThemes(ROOT);
  const prev = readPrevious();
  // 索引の形を変えたら VERSION を上げる（古い索引の記事はキャッシュせず読み直す）
  const prevByPath = new Map((prev?.version === VERSION ? prev.notes : []).map((n) => [n.path, n]));
  let reread = 0;

  const notes = [];
  for (const abs of walkNotes()) {
    const path = relative(ROOT, abs).replace(/\\/g, '/');
    const mtimeMs = statSync(abs).mtimeMs;
    const cached = prevByPath.get(path);
    if (cached && cached.mtimeMs === mtimeMs) {
      notes.push({ ...cached, sync: null, ctaLive: cached.ctaLive ?? null });
      continue;
    }
    reread += 1;
    const raw = readFileSync(abs, 'utf8');
    const fm = matter(raw).data ?? {};
    const rel = relative(NOTE_ROOT, abs);
    const theme = classifyNote(themes, rel, fm);
    notes.push({
      path,
      mtimeMs,
      title: fm.title || rel.split(/[\\/]/).slice(-2, -1)[0] || path,
      theme,
      themeLabel: themeLabel(themes, theme),
      pricing: fm.notePricing || 'unknown',
      magazine: fm.noteMagazine || null,
      noteUrl: fm.noteUrl || null,
      published: Boolean(fm.noteUrl),
      ctas: [...new Set([...raw.matchAll(/<!-- cta:([a-z0-9-]+) -->/g)].map((m) => m[1]))],
      ctaExpect: extractCtaExpectations(raw, { paid: (fm.notePricing || 'unknown') !== 'free' }),
      ctaLive: null,
      sync: null,
    });
  }
  if (notes.length === 0) throw new Error('note の記事を 1 本も読めなかった');

  // 同期の状態は note-sync-plan と同じ判定（画面だけの判定を作らない）
  const plan = await buildSyncPlan(ROOT);
  const syncByPath = new Map(plan.items.map((i) => [i.path, i]));
  for (const n of notes) {
    const s = syncByPath.get(n.path);
    n.sync = s ? { status: s.status, parts: s.parts, reasons: s.reasons, blocker: s.blocker } : null;
  }

  // 導線の公開照合（原稿の導線ブロックのリンク先が、公開記事に順番・位置どおり出ているか）
  const cta = { targets: 0, checked: 0, reused: 0, unknown: 0, states: {} };
  for (const n of notes) {
    const key = n.noteUrl?.match(/\/n\/(n[0-9a-f]+)/)?.[1];
    if (!n.ctaExpect?.length || !key) { n.ctaLive = null; continue; }
    cta.targets += 1;
    const prevLive = prevByPath.get(n.path)?.ctaLive;
    const fresh = prevLive?.state === 'ok' && prevByPath.get(n.path)?.mtimeMs === n.mtimeMs
      && Date.now() - Date.parse(prevLive.checkedAt) < CTA_OK_TTL_MS;
    if (NO_LIVE || (fresh && !REFRESH_CTA)) {
      n.ctaLive = prevLive ?? null;
      if (prevLive) cta.reused += 1;
    } else {
      const { data, error } = await fetchNoteDetails(key);
      if (error || typeof data?.body !== 'string') {
        n.ctaLive = { state: 'unknown', byId: {}, error: error ?? 'body なし', checkedAt: new Date().toISOString() };
        cta.unknown += 1;
      } else {
        n.ctaLive = { ...classifyArticleCtas(data.body, n.ctaExpect), checkedAt: new Date().toISOString() };
      }
      cta.checked += 1;
    }
    const st = n.ctaLive?.state ?? 'unchecked';
    cta.states[st] = (cta.states[st] ?? 0) + 1;
  }
  if (cta.checked > 0 && cta.unknown === cta.checked) throw new Error(`導線の公開照合が全件取得失敗（${cta.unknown} 本）。ネットワークを確認するか --no-live で作る`);

  const ledger = {
    _doc: 'scripts/build-content-ledger.mjs が作る管理画面「コンテンツ台帳」用の note 記事の索引（生成物・git 管理外）。正本は原稿と同期の台帳。',
    version: VERSION,
    generatedAt: new Date().toISOString(),
    tookMs: Date.now() - started,
    counts: { notes: notes.length, reread, sync: plan.counts, cta },
    blockers: BLOCKERS,
    notes,
  };
  mkdirSync(dirname(LEDGER_PATH), { recursive: true });
  writeFileSync(LEDGER_PATH, JSON.stringify(ledger));
  console.log(`${TAG} 導線の公開照合: 対象 ${cta.targets} 本 / 照合 ${cta.checked} 本（取得失敗 ${cta.unknown}）/ 前回を再利用 ${cta.reused} 本 → ${Object.entries(cta.states).map(([k, v]) => `${k} ${v}`).join('・') || 'なし'}`);
  console.log(`${TAG} note ${notes.length} 本（読み直し ${reread} 本）・同期 反映済み ${plan.counts.synced} / 反映待ち ${plan.counts.ready} / 止まっている ${plan.counts.blocked}・${((Date.now() - started) / 1000).toFixed(1)} 秒 → ${relative(ROOT, LEDGER_PATH)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const i = argv.indexOf('--spawn-if-stale');
  if (i >= 0) {
    spawnIfStale(Number(argv[i + 1] || 6));
  } else {
    await build().catch((e) => {
      console.error(`${TAG} ERROR: ${e.message}`);
      process.exitCode = 1;
    });
  }
}
