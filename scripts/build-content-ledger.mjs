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
 * 記事・出品ごとに「前回から変わったか」で読み直し・照合し直しを決める（2026-09-29）。note の原稿は git の中身の
 * ハッシュ（未コミットの変更がある原稿だけ更新時刻と大きさ）を鍵にするので、worktree を替えても中身が同じなら読み直さない。
 * 照合は、鍵が変わった・前回ずれていた・取得できなかった・24 時間たった ものだけやり直す。--refresh で全件やり直す。
 *
 * ココナラの公開照合: 出品中（listed）の全サービスの公開ページを、正本（カタログ・listings）と照合する
 * （check-coconala-live と同じ lib）。画像は承認済み POP 画像（coconala-thumb-approved.json）の登録で見る。
 * 出品ごとに正本（カタログの項目・listings・承認済み画像）のハッシュを持ち、上と同じ条件の出品だけ照合する。
 * --no-live のときは前回の結果のまま。
 *
 * exit: 0 作成 / 1 失敗（同期の計画が作れない・記事 0 本）
 */
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

import { classifyNote, loadThemes, themeLabel } from './lib/content-theme.mjs';
import { classifyNoteCover, loadNoteCoverCategories, noteCoverCategoryLabel } from './lib/note-cover-category.mjs';
import { fetchNoteDetails } from './lib/note-api.mjs';
import { readCatalog, readListings } from './lib/coconala-catalog.mjs';
import { checkListedServices, groupLiveIssues } from './lib/coconala-live.mjs';
import { classifyArticleCtas, extractCtaExpectations } from './lib/note-cta-live.mjs';
import { artifactRelPaths, loadKindleCatalog } from './lib/kindle-catalog.mjs';
import { fileSha256, isOnKdp } from './lib/kindle-uploaded.mjs';
import { BLOCKERS, buildSyncPlan } from './lib/note-sync-plan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LEDGER_PATH = join(ROOT, '.claude', 'state', 'content-ledger.json');
const NOTE_ROOT = join(ROOT, 'content', 'note');
const TAG = '[content-ledger]';
const VERSION = 5; // 2: 導線照合　3: 導線別　4: 内容鍵　5: note カバー分類
const argv = process.argv.slice(2);
const REFRESH = argv.includes('--refresh') || argv.includes('--refresh-cta');
const NO_LIVE = argv.includes('--no-live');
const LIVE_TTL_MS = 24 * 3_600_000;

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
  if (prev?.version === VERSION && age < hours) {
    console.log(`${TAG} 索引は ${age.toFixed(1)} 時間前のもの。作り直さない。`);
    return;
  }
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], { cwd: ROOT, detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
  console.log(`${TAG} 索引が${prev ? '古い' : '無い'}ので裏で作り直す（管理画面は待たずに起動する）。`);
}

/**
 * 原稿ごとの鍵。git 管理下で変更の無い原稿は index の blob ハッシュ（中身が同じなら worktree を替えても同じ）。
 * 未コミットの変更がある・未追跡の原稿だけ、更新時刻と大きさを鍵にする（読むと遅いので中身は読まない）。
 */
function noteKeys(dir = 'content/note') {
  const keys = new Map();
  try {
    const ls = execFileSync('git', ['ls-files', '-s', '-z', '--', dir], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    for (const rec of ls.split('\0')) {
      const m = rec.match(/^\d+ ([0-9a-f]+) \d+\t(.+)$/);
      if (m) keys.set(m[2], `blob:${m[1]}`);
    }
    const st = execFileSync('git', ['status', '--porcelain', '-z', '--', dir], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    for (const rec of st.split('\0')) if (rec.length > 3) keys.delete(rec.slice(3));
  } catch { /* git が無い・壊れている → 全部が更新時刻の鍵になるだけ */ }
  return keys;
}

const fresh = (at) => Boolean(at) && Date.now() - Date.parse(at) < LIVE_TTL_MS;

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
  const coverCategories = loadNoteCoverCategories(ROOT);
  const prev = readPrevious();
  // 索引の形を変えたら VERSION を上げる（古い索引の記事はキャッシュせず読み直す）
  const prevByPath = new Map((prev?.version === VERSION ? prev.notes : []).map((n) => [n.path, n]));
  const gitKeys = noteKeys();
  let reread = 0;

  const notes = [];
  for (const abs of walkNotes()) {
    const path = relative(ROOT, abs).replace(/\\/g, '/');
    const key = gitKeys.get(path) ?? (() => { const st = statSync(abs); return `mtime:${st.mtimeMs}:${st.size}`; })();
    const cached = prevByPath.get(path);
    if (cached && cached.key === key) {
      notes.push({ ...cached, sync: null, ctaLive: cached.ctaLive ?? null });
      continue;
    }
    reread += 1;
    const raw = readFileSync(abs, 'utf8');
    const fm = matter(raw).data ?? {};
    const rel = relative(NOTE_ROOT, abs);
    const theme = classifyNote(themes, rel, fm);
    const coverCategory = classifyNoteCover(coverCategories, rel, fm, theme, theme ? themes.themes.get(theme)?.kind ?? null : null);
    notes.push({
      path,
      key,
      title: fm.title || rel.split(/[\\/]/).slice(-2, -1)[0] || path,
      theme,
      themeLabel: themeLabel(themes, theme),
      coverCategory,
      coverCategoryLabel: noteCoverCategoryLabel(coverCategories, coverCategory),
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
    const reuse = prevLive?.state === 'ok' && prevByPath.get(n.path)?.key === n.key && fresh(prevLive.checkedAt);
    if (NO_LIVE || (reuse && !REFRESH)) {
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

  // ココナラ: 出品中のサービスを、出品ごとに正本が変わった・前回ずれていた・24 時間たったものだけ公開ページと照合する
  let coconala = prev?.version === VERSION ? prev.coconala ?? null : null;
  if (!NO_LIVE) {
    const catalog = readCatalog();
    const listings = readListings();
    let approved = {};
    try { approved = JSON.parse(readFileSync(join(ROOT, '.claude/config/coconala-thumb-approved.json'), 'utf8')).images ?? {}; } catch { /* 画像の鍵だけ空 */ }
    let sellerName = '';
    try { sellerName = JSON.parse(readFileSync(join(ROOT, '.claude/config/coconala-account.json'), 'utf8')).sellerName || ''; } catch { /* 出品者名の照合だけ省く */ }
    const listed = Object.values(catalog).filter((s) => s.status === 'listed');
    const keyOf = (s) => createHash('sha1').update(JSON.stringify([s, listings[s.id] ?? null, approved[s.id] ?? null, sellerName])).digest('hex');
    const items = {};
    const toCheck = {};
    for (const s of listed) {
      const was = coconala?.items?.[s.id];
      const clean = was?.fetched && !was.text.length && !was.price.length && !was.sale.length;
      if (!REFRESH && clean && was.key === keyOf(s) && fresh(was.checkedAt)) items[s.id] = was;
      else toCheck[s.id] = s;
    }
    const results = await checkListedServices(toCheck, listings, { sellerName, execFileSync });
    const now = new Date().toISOString();
    for (const r of results) {
      items[r.id] = { key: keyOf(catalog[r.id]), checkedAt: now, fetched: r.fetched, ...(r.fetched ? groupLiveIssues(r.issues) : { text: [], price: [], sale: r.issues }) };
    }
    const fetched = results.filter((r) => r.fetched).length;
    if (results.length && fetched === 0) throw new Error(`ココナラの公開照合が全件取得失敗（${results.length} 件）。ネットワークを確認するか --no-live で作る`);
    coconala = { checkedAt: now, targets: listed.length, fetched: Object.values(items).filter((i) => i.fetched).length, items };
    console.log(`${TAG} ココナラの公開照合: 出品中 ${listed.length} 件 / 照合 ${results.length} 件（取得 ${fetched}・食い違い ${results.filter((r) => r.fetched && !r.ok).length}）/ 前回を再利用 ${listed.length - results.length} 件`);
  }

  // Kindle: KDP に上がっている本（公開中・審査中）の手元の EPUB・表紙の sha256。上げた版（catalog の uploaded）と
  // 管理画面で比べる。ファイルは中身の鍵（git の blob・未コミットは更新時刻）が変わったときだけ読み直す
  const prevKindle = prev?.version === VERSION ? prev.kindle?.files ?? {} : {};
  const kindleKeys = noteKeys('scripts');
  const kindleFiles = {};
  let kindleRehashed = 0;
  for (const b of loadKindleCatalog().filter(isOnKdp)) {
    const rel = artifactRelPaths(b);
    for (const path of [rel.epub, rel.cover].filter(Boolean)) {
      const abs = join(ROOT, path);
      if (!existsSync(abs)) { kindleFiles[path] = { key: null, sha256: null }; continue; }
      const key = kindleKeys.get(path) ?? (() => { const st = statSync(abs); return `mtime:${st.mtimeMs}:${st.size}`; })();
      if (prevKindle[path]?.key === key) { kindleFiles[path] = prevKindle[path]; continue; }
      kindleFiles[path] = { key, sha256: fileSha256(abs) };
      kindleRehashed += 1;
    }
  }
  console.log(`${TAG} Kindle: 手元の版 ${Object.keys(kindleFiles).length} ファイル（読み直し ${kindleRehashed}）`);

  const ledger = {
    _doc: 'scripts/build-content-ledger.mjs が作る管理画面「コンテンツ台帳」用の note 記事の索引（生成物・git 管理外）。正本は原稿と同期の台帳。',
    version: VERSION,
    generatedAt: new Date().toISOString(),
    tookMs: Date.now() - started,
    counts: { notes: notes.length, reread, sync: plan.counts, cta },
    blockers: BLOCKERS,
    notes,
    coconala,
    kindle: { files: kindleFiles },
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
