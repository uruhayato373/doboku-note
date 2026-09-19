#!/usr/bin/env node
// note-cover-rollout.mjs — note カバー全量差し替え（V5）の照合・公開反映・検証を 1 つの作業場で回す。
//
// 作業場は <repo>/.tmp/note-cover-rollout/（generated/manifest.json = generate-note-character-covers の出力）。
// 描画・供給は既存ツール（generate-note-character-covers / asset-offload / drive-vault-sync）、公開反映も既存 CLI
// （note-update-cover / note-magazine-cover）に委ね、本スクリプトは「何を・どこまで・何が保留か」を機械で決めて記録する。
// 仕様: .claude/knowledge/design-system/note-cover-character-v5.md「全件生成と差し替えの境界」
//
//   node scripts/note-cover-rollout.mjs reconcile --source-root <checkout> [--apply]
//       生成済み manifest を最新原稿と照合し、新規・原稿変更・隣接ポーズ変更だけ再生成（--apply）。verification.json を書く
//   node scripts/note-cover-rollout.mjs snapshot [--magazine-source <checkout>] [--magazines-only]
//       公開 API で記事（status/price/eyecatch/is_limited）とマガジン（cover）の現在値を live-before.json へ
//   node scripts/note-cover-rollout.mjs plan [--chunk 25]
//       live-before から更新対象と保留（下書き・予約・API 取得不能・マガジン未同定）を決め、lists/ を書く
//   node scripts/note-cover-rollout.mjs run [--magazines] [--chunk 25]
//       未 OK の対象だけを chunk 逐次で既存 CLI に流す（回線待ち・chunk 即死の再試行つき。共有プロファイル＝並列不可）
//   node scripts/note-cover-rollout.mjs verify
//       ログの OK/FAIL と公開 API を突合（eyecatch/cover 変化・price/status/is_limited 不変）→ live-verification.json
//   node scripts/note-cover-rollout.mjs record --date YYYY-MM-DD [--status in-progress|done]
//       .claude/state/note/cover-rollout/<date>.json へ対象数・成功数・失敗数・保留理由を書く
//
// 終了コード: 0 = 成功 / 1 = 検証不一致・失敗あり・対象 0 件
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync, unlinkSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { loadNoteCoverInventory } from './lib/note-cover-inventory.mjs';
import { renderNoteCharacterCover } from './lib/note-character-cover.mjs';
import { fetchNoteDetails } from './lib/note-api.mjs';
import { parseNoteText } from './lib/note-meta.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORK = join(ROOT, '.tmp/note-cover-rollout');
const OUT = join(WORK, 'generated');
const LOGS = join(WORK, 'logs');
const LISTS = join(WORK, 'lists');
const args = process.argv.slice(2);
const cmd = args[0];
const opt = (n, d = null) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
const flag = (n) => args.includes(n);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, v) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p + '.tmp', JSON.stringify(v, null, 2) + '\n'); renameSync(p + '.tmp', p); };
const CREATOR = 'dobokunote';
// note掲載文.txt が live の説明文と一致しないマガジンは src/lib/note-magazines.ts の noteUrl で同定する（2026-09-17 時点 2 誌）
const MAGAZINE_KEY_OVERRIDE = { 'magazine:river-consultant': 'm32132ecb3033', 'magazine:general-contractor': 'm32aaa137f22e' };

function curlJson(url) {
  const r = spawnSync('curl', ['-sS', '-m', '30', '--ssl-no-revoke', '-H', 'User-Agent: Mozilla/5.0', url], { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
  const b = (r.stdout || '').trim();
  if (b.startsWith('{') || b.startsWith('[')) { try { return JSON.parse(b); } catch { return null; } }
  return null;
}
const isDefaultCover = (url) => !url || /\/assets\/default\/default_magazine_header/.test(url);
async function liveMagazines() {
  const live = [];
  for (let p = 1; p <= 12; p++) {
    const d = curlJson(`https://note.com/api/v2/creators/${CREATOR}/contents?kind=magazine&page=${p}`);
    const c = d?.data?.contents ?? [];
    live.push(...c.map((m) => ({ key: m.key, name: m.name, description: m.description, price: m.price, status: m.status, cover: isDefaultCover(m.cover) ? null : m.cover })));
    if (d?.data?.isLastPage || c.length === 0) break;
    await sleep(300);
  }
  return live;
}
const online = () => /^[23]/.test(spawnSync('curl', ['-sS', '-m', '8', '-o', '/dev/null', '-w', '%{http_code}', 'https://note.com/'], { encoding: 'utf8' }).stdout || '');
async function waitOnline(maxSec = 1800) { for (let t = 0; t < maxSec; t += 30) { if (online()) return true; await sleep(30000); } return false; }

/** ログから記事ごとの最終結果を集める（後のログの OK が優先）。 */
function loggedResults() {
  const logged = {};
  if (!existsSync(LOGS)) return logged;
  for (const f of readdirSync(LOGS).filter((x) => /^(articles|retry|resume|sweep|fix|run)-.*\.log$/.test(x)).sort()) {
    let cur = null, del = false;
    for (const l of readFileSync(join(LOGS, f), 'utf8').split('\n')) {
      const m = l.match(/^\[article\] (n[0-9a-f]+) /);
      if (m) { cur = m[1]; del = false; if (logged[cur]?.result === 'ok') { cur = null; continue; } logged[cur] = { log: f, result: null, afterDelete: false }; continue; }
      if (!cur) continue;
      if (/^\[del\]/.test(l)) del = true;
      if (/^\[OK\]/.test(l)) logged[cur].result = 'ok';
      else if (/^\[(FAIL|ABORT|skip|ERR)\]/.test(l)) { logged[cur].result = logged[cur].result || l.slice(0, 120); logged[cur].afterDelete = del; }
    }
  }
  return logged;
}
function magazineLogged() {
  const out = {};
  if (!existsSync(LOGS)) return out;
  for (const f of readdirSync(LOGS).filter((x) => /^mag-.*\.log$/.test(x)).sort()) {
    const s = readFileSync(join(LOGS, f), 'utf8');
    const key = (s.match(/\[prep\] key=(m[0-9a-f]+)/) || [])[1];
    if (key && out[key]?.exit !== '0') out[key] = { log: f, exit: (s.match(/\(exit (\d+)\)/) || [])[1] ?? null };
  }
  return out;
}

// ---------------------------------------------------------------- reconcile
async function reconcile() {
  const sourceRoot = resolve(opt('--source-root', ROOT));
  const manifestPath = join(OUT, 'manifest.json');
  const manifest = readJson(manifestPath);
  const byKey = new Map(manifest.targets.map((t) => [t.key, t]));
  const inventory = await loadNoteCoverInventory(sourceRoot, { configRoot: ROOT });
  const sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8' }).trim();
  const sourceDirty = execFileSync('git', ['status', '--porcelain', '--', 'content/note', 'scripts/generate-magazine-covers.mjs', '.claude/config'], { cwd: sourceRoot, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const rendererSha256 = sha(readFileSync(join(ROOT, 'scripts/lib/note-character-cover.mjs')));
  const report = { checkedAt: new Date().toISOString(), sourceRoot, sourceHead, sourceDirty, rendererSha256, manifestRendererSha256: manifest.rendererSha256,
    inventoryCount: inventory.targets.length, manifestCount: manifest.targets.length, integrityErrors: [], newTargets: [], changedInputs: [], changedPoses: [], changedOldCovers: [], removed: [], inventoryErrors: inventory.errors };
  const seen = new Set();
  for (const t of inventory.targets) {
    seen.add(t.key);
    const e = byKey.get(t.key);
    if (!e) { report.newTargets.push({ key: t.key, kind: t.kind, pose: t.input.poseSelection.pose }); continue; }
    const img = join(OUT, e.imagePath);
    if (!existsSync(img)) report.integrityErrors.push({ key: t.key, error: 'image missing' });
    else if (sha(readFileSync(img)) !== e.outputSha256) report.integrityErrors.push({ key: t.key, error: 'image hash mismatch' });
    if (e.sourceSha256 !== t.sourceSha256) report.changedInputs.push({ key: t.key, kind: t.kind });
    else if (e.input.poseSelection.pose !== t.input.poseSelection.pose) report.changedPoses.push({ key: t.key, from: e.input.poseSelection.pose, to: t.input.poseSelection.pose });
    if ((e.previousImageSha256 || null) !== (t.previousImageSha256 || null)) report.changedOldCovers.push({ key: t.key });
  }
  for (const e of manifest.targets) if (!seen.has(e.key)) report.removed.push({ key: e.key, imagePath: e.imagePath });
  const todo = [...report.newTargets, ...report.changedInputs, ...report.changedPoses].map((x) => x.key);
  console.log(JSON.stringify({ inventory: report.inventoryCount, manifest: report.manifestCount, new: report.newTargets.length, changedInputs: report.changedInputs.length, changedPoses: report.changedPoses.length,
    changedOldCovers: report.changedOldCovers.length, removed: report.removed.length, integrityErrors: report.integrityErrors.length, inventoryErrors: inventory.errors.length, sourceDirty: sourceDirty.length, rendererChanged: rendererSha256 !== manifest.rendererSha256 }));
  if (flag('--apply')) {
    const refreshed = [], failed = [];
    for (const key of todo) {
      const t = inventory.targets.find((x) => x.key === key);
      try {
        const result = await renderNoteCharacterCover(sourceRoot, t.input);
        const destination = join(OUT, t.imagePath);
        mkdirSync(dirname(destination), { recursive: true });
        writeFileSync(destination + '.tmp', result.buffer); renameSync(destination + '.tmp', destination);
        const { buffer, ...design } = result;
        const entry = { ...t, design, outputSha256: sha(buffer), byteLength: buffer.length };
        const idx = manifest.targets.findIndex((x) => x.key === key);
        if (idx >= 0) manifest.targets[idx] = entry; else manifest.targets.push(entry);
        refreshed.push({ key, generatedAt: new Date().toISOString(), sourceHead, pose: result.pose });
      } catch (error) { failed.push({ key, error: error.message }); console.error(`[失敗] ${key}: ${error.message}`); }
    }
    for (const r of report.removed) {
      const idx = manifest.targets.findIndex((x) => x.key === r.key);
      if (idx >= 0) manifest.targets.splice(idx, 1);
      if (existsSync(join(OUT, r.imagePath))) unlinkSync(join(OUT, r.imagePath));
    }
    const order = new Map(inventory.targets.map((t, i) => [t.key, i]));
    manifest.targets.sort((a, b) => order.get(a.key) - order.get(b.key));
    Object.assign(manifest, { targetCount: manifest.targets.length, generatedCount: manifest.targets.length, failedCount: failed.length, errors: failed, sourceHead, sourceDirty, rendererSha256,
      generatorHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(), retired: inventory.retired, refreshes: [...(manifest.refreshes || []), ...refreshed], reconciledAt: report.checkedAt });
    manifest.poseCounts = {};
    for (const t of manifest.targets) manifest.poseCounts[t.design.pose] = (manifest.poseCounts[t.design.pose] || 0) + 1;
    writeJson(manifestPath, manifest);
    report.applied = { refreshed: refreshed.length, failed, removed: report.removed.length, targetCount: manifest.targetCount, poseCounts: manifest.poseCounts };
    console.log(JSON.stringify(report.applied));
  }
  writeJson(join(OUT, 'verification.json'), report);
  if (report.integrityErrors.length || inventory.errors.length || report.applied?.failed.length) process.exitCode = 1;
}

// ---------------------------------------------------------------- snapshot
async function snapshot() {
  const out = join(WORK, 'live-before.json');
  const magazineSource = resolve(opt('--magazine-source', ROOT));
  const manifest = readJson(join(OUT, 'manifest.json'));
  const prev = existsSync(out) ? readJson(out) : { articles: {}, magazines: {} };
  const articles = flag('--magazines-only') ? prev.articles : {};
  if (!flag('--magazines-only')) {
    const arts = manifest.targets.filter((t) => t.kind === 'article' && t.noteId);
    let i = 0;
    for (const t of arts) {
      i++;
      const r = await fetchNoteDetails(t.noteId, { retries: 2 });
      const d = r.data;
      articles[t.key] = d ? { noteId: t.noteId, fetchedAt: new Date().toISOString(), status: d.status, price: d.price, eyecatch: d.eyecatch || null, isLimited: d.is_limited, canRead: d.can_read, isReserved: d.is_reserved, isDraft: d.is_draft, publishAt: d.publish_at, name: d.name }
        : { noteId: t.noteId, fetchedAt: new Date().toISOString(), error: r.error };
      if (i % 50 === 0) { console.log(`articles ${i}/${arts.length}`); writeJson(out, { ...prev, articles }); }
      await sleep(250);
    }
  }
  const live = await liveMagazines();
  const normT = (s) => (s || '').normalize('NFKC').replace(/\s+/g, '');
  const commonPrefix = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
  const magazines = {};
  for (const t of manifest.targets.filter((x) => x.kind === 'magazine')) {
    const dir = t.imagePath.replace(/\/_cover\.png$/, '');
    const txtPath = join(magazineSource, dir, 'note掲載文.txt');
    let best = null, bs = 0, method = null;
    if (existsSync(txtPath)) {
      const m = parseNoteText(readFileSync(txtPath, 'utf8'));
      for (const n of live) { const s = commonPrefix(normT(m.description), normT(n.description)); if (s > bs) { bs = s; best = n; } }
      if (bs >= 25) method = `description-prefix:${bs}`; else best = null;
    }
    if (!best && MAGAZINE_KEY_OVERRIDE[t.key]) { best = live.find((n) => n.key === MAGAZINE_KEY_OVERRIDE[t.key]) || null; method = best ? 'note-magazines.ts noteUrl' : null; }
    magazines[t.key] = best ? { magazineDir: dir, noteKey: best.key, name: best.name, price: best.price, status: best.status, method, cover: best.cover, fetchedAt: new Date().toISOString() }
      : { magazineDir: dir, noteKey: null, reason: existsSync(txtPath) ? 'note掲載文.txt が公開一覧に一致しない' : 'note掲載文.txt が無い（単発記事の名残など）' };
  }
  writeJson(out, { fetchedAt: new Date().toISOString(), liveMagazineCount: live.length, articles, magazines });
  const a = Object.values(articles);
  console.log(JSON.stringify({ articles: a.length, ok: a.filter((x) => !x.error).length, errors: a.filter((x) => x.error).length, magazines: Object.keys(magazines).length, magazinesResolved: Object.values(magazines).filter((m) => m.noteKey).length, liveMagazines: live.length }));
  if (!a.length && !flag('--magazines-only')) process.exitCode = 1;
}

// ---------------------------------------------------------------- plan
function plan() {
  const CHUNK = Number(opt('--chunk', '25'));
  const manifest = readJson(join(OUT, 'manifest.json'));
  const before = readJson(join(WORK, 'live-before.json'));
  const out = { plannedAt: new Date().toISOString(), articles: { update: [], hold: [] }, magazines: { update: [], hold: [] } };
  for (const t of manifest.targets.filter((x) => x.kind === 'article')) {
    const b = before.articles[t.key];
    const hold = (reason) => out.articles.hold.push({ key: t.key, noteId: t.noteId || null, noteStatus: t.noteStatus, reason });
    if (!t.noteId) { hold(t.noteStatus === 'draft' ? '下書き（noteId 無し）' : 'noteId 無し（未公開）'); continue; }
    if (!b || b.error) { hold(`公開 API で取得不能（${b?.error || 'no snapshot'}）＝${t.noteStatus === 'reserved' ? '予約公開中' : '下書き・非公開・削除のいずれか'}`); continue; }
    if (b.isReserved || t.noteStatus === 'reserved') { hold(`予約公開中（publish_at ${b.publishAt}）`); continue; }
    if (b.isDraft || b.status !== 'published') { hold(`status=${b.status}`); continue; }
    if (!existsSync(join(ROOT, t.source))) { hold('原稿がこの checkout に無い'); continue; }
    out.articles.update.push({ key: t.key, noteId: t.noteId, price: b.price, isLimited: b.isLimited, eyecatch: b.eyecatch });
  }
  for (const t of manifest.targets.filter((x) => x.kind === 'magazine')) {
    const b = before.magazines[t.key];
    if (!b?.noteKey) { out.magazines.hold.push({ key: t.key, reason: b?.reason || '公開マガジンに紐付かない' }); continue; }
    if (b.status && b.status !== 'public') { out.magazines.hold.push({ key: t.key, noteKey: b.noteKey, reason: `status=${b.status}` }); continue; }
    out.magazines.update.push({ key: t.key, noteKey: b.noteKey, magazineDir: b.magazineDir, name: b.name, price: b.price, cover: b.cover, method: b.method });
  }
  const byKey = new Map();
  for (const m of out.magazines.update) byKey.set(m.noteKey, [...(byKey.get(m.noteKey) || []), m]);
  for (const [k, list] of byKey) if (list.length > 1) for (const m of list) { out.magazines.update.splice(out.magazines.update.indexOf(m), 1); out.magazines.hold.push({ key: m.key, noteKey: k, reason: `同定が重複（${list.map((x) => x.key).join(' / ')}）` }); }
  mkdirSync(LISTS, { recursive: true });
  writeFileSync(join(LISTS, 'magazines.tsv'), out.magazines.update.map((m) => `${m.noteKey}\t${m.magazineDir}\t${m.key}`).join('\n') + '\n');
  out.chunk = CHUNK;
  writeJson(join(WORK, 'live-plan.json'), out);
  console.log(JSON.stringify({ articlesUpdate: out.articles.update.length, articlesHold: out.articles.hold.length, magazinesUpdate: out.magazines.update.length, magazinesHold: out.magazines.hold.length }));
  if (!out.articles.update.length && !out.magazines.update.length) process.exitCode = 1;
}

// ---------------------------------------------------------------- run
function remainingArticles() {
  const planned = readJson(join(WORK, 'live-plan.json'));
  const logged = loggedResults();
  return planned.articles.update.filter((a) => logged[a.noteId]?.result !== 'ok');
}
function runCli(argv, logPath) {
  const r = spawnSync(process.execPath, argv, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, DOBOKU_PW_MIN_FREE_MB: process.env.DOBOKU_PW_MIN_FREE_MB || '1024' } });
  writeFileSync(logPath, (r.stdout || '') + (r.stderr || ''));
  return r.status ?? 1;
}
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
function log(line) { mkdirSync(LOGS, { recursive: true }); writeFileSync(join(LOGS, 'run-live.log'), `[run-live] ${line} ${new Date().toISOString()}\n`, { flag: 'a' }); }
async function run() {
  mkdirSync(LISTS, { recursive: true }); mkdirSync(LOGS, { recursive: true });
  const CHUNK = Number(opt('--chunk', '25'));
  if (flag('--magazines')) {
    const planned = readJson(join(WORK, 'live-plan.json'));
    const done = magazineLogged();
    const todo = planned.magazines.update.filter((m) => done[m.noteKey]?.exit !== '0');
    log(`magazines start remaining=${todo.length}`);
    let ok = 0, fail = 0;
    for (const m of todo) {
      if (!(await waitOnline())) { log('offline 30 分・中断'); break; }
      const code = runCli([join(ROOT, 'scripts/note-magazine-cover.mjs'), '--key', m.noteKey, '--dir', m.magazineDir, '--commit'], join(LOGS, `mag-${m.key.replace(/[/:]/g, '_')}.log`));
      log(`magazine ${m.key} key=${m.noteKey} exit=${code}`); code === 0 ? ok++ : fail++;
      await sleep(3000);
    }
    console.log(JSON.stringify({ magazines: todo.length, ok, fail }));
    if (fail) process.exitCode = 1;
    return;
  }
  // 記事: 未 OK だけを chunk 逐次。1 件も記事に到達しない chunk（回線断・Chrome 起動失敗）は 60 秒待って最大 5 回やり直す。
  // 記事単位の失敗は次のラウンドで拾う。1 ラウンドで 1 件も進まなければ止める（最大 6 ラウンド）。
  let round = 1;
  while (round <= 6) {
    const rem = remainingArticles();
    log(`round=${round} remaining=${rem.length}`);
    console.log(`round ${round}: remaining ${rem.length}`);
    if (!rem.length) break;
    let gained = 0;
    for (let i = 0; i < rem.length; i += CHUNK) {
      const list = join(LISTS, `run-${stamp()}-r${round}-${String(i / CHUNK + 1).padStart(2, '0')}.txt`);
      writeFileSync(list, rem.slice(i, i + CHUNK).map((a) => a.key).join('\n') + '\n');
      for (let attempt = 1; attempt <= 5; attempt++) {
        if (!(await waitOnline())) { log('offline 30 分・中断'); return; }
        const logPath = list.replace(/\.txt$/, `.a${attempt}.log`).replace(LISTS, LOGS);
        const code = runCli([join(ROOT, 'scripts/note-update-cover.mjs'), '--list', list, '--commit'], logPath);
        const text = readFileSync(logPath, 'utf8');
        const processed = (text.match(/^\[article\]/gm) || []).length, ok = (text.match(/^\[OK\]/gm) || []).length;
        gained += ok;
        log(`${list.split('/').pop()} attempt=${attempt} exit=${code} processed=${processed} ok=${ok}`);
        if (processed > 0 || code === 0) break;
        await sleep(60000);
      }
      await sleep(5000);
    }
    log(`round=${round} gained=${gained}`);
    if (!gained) break;
    round++;
  }
  const rem = remainingArticles();
  console.log(JSON.stringify({ remaining: rem.length }));
  if (rem.length) process.exitCode = 1;
}

// ---------------------------------------------------------------- verify
async function verify() {
  const before = readJson(join(WORK, 'live-before.json'));
  const planned = readJson(join(WORK, 'live-plan.json'));
  const logged = loggedResults();
  const result = { verifiedAt: new Date().toISOString(), articles: { ok: [], failed: [], notRun: [] }, magazines: { ok: [], failed: [], notRun: [] } };
  let i = 0;
  for (const a of planned.articles.update) {
    i++;
    const lg = logged[a.noteId];
    if (!lg) { result.articles.notRun.push({ key: a.key, noteId: a.noteId }); continue; }
    const r = await fetchNoteDetails(a.noteId, { retries: 2 });
    const d = r.data, b = before.articles[a.key];
    const after = d ? { status: d.status, price: d.price, eyecatch: d.eyecatch || null, isLimited: d.is_limited, canRead: d.can_read } : null;
    const problems = [];
    if (!d) problems.push(`API 取得不能: ${r.error}`);
    else {
      if (after.eyecatch === b.eyecatch) problems.push('eyecatch 不変');
      if (!after.eyecatch) problems.push('eyecatch 無し（coverless）');
      if (after.price !== b.price) problems.push(`price ${b.price} -> ${after.price}`);
      if (after.status !== b.status) problems.push(`status ${b.status} -> ${after.status}`);
      if (after.isLimited !== b.isLimited) problems.push(`is_limited ${b.isLimited} -> ${after.isLimited}`);
      if (after.canRead !== b.canRead) problems.push(`can_read ${b.canRead} -> ${after.canRead}`);
    }
    const row = { key: a.key, noteId: a.noteId, cli: lg.result, log: lg.log, before: { price: b.price, status: b.status, isLimited: b.isLimited, eyecatch: b.eyecatch }, after, problems };
    (lg.result === 'ok' && !problems.length ? result.articles.ok : result.articles.failed).push(row);
    if (i % 50 === 0) { console.log(`verify ${i}/${planned.articles.update.length}`); writeJson(join(WORK, 'live-verification.json'), result); }
    await sleep(250);
  }
  const live = new Map((await liveMagazines()).map((m) => [m.key, m]));
  const magLogged = magazineLogged();
  for (const m of planned.magazines.update) {
    const lg = magLogged[m.noteKey];
    if (!lg) { result.magazines.notRun.push({ key: m.key, noteKey: m.noteKey }); continue; }
    const n = live.get(m.noteKey);
    const problems = [];
    const after = n ? { name: n.name, price: n.price, status: n.status, cover: n.cover } : null;
    if (!n) problems.push('公開一覧に無い');
    else { if (!after.cover) problems.push('cover 無し'); if (after.cover === m.cover) problems.push('cover 不変'); if (after.price !== m.price) problems.push(`price ${m.price} -> ${after.price}`); if (after.status !== 'public') problems.push(`status ${after.status}`); }
    (lg.exit === '0' && !problems.length ? result.magazines.ok : result.magazines.failed).push({ key: m.key, noteKey: m.noteKey, cli: lg, before: { price: m.price, cover: m.cover }, after, problems });
  }
  result.summary = { articles: { planned: planned.articles.update.length, ok: result.articles.ok.length, failed: result.articles.failed.length, notRun: result.articles.notRun.length, held: planned.articles.hold.length },
    magazines: { planned: planned.magazines.update.length, ok: result.magazines.ok.length, failed: result.magazines.failed.length, notRun: result.magazines.notRun.length, held: planned.magazines.hold.length } };
  writeJson(join(WORK, 'live-verification.json'), result);
  console.log(JSON.stringify(result.summary));
  for (const f of result.articles.failed.slice(0, 20)) console.log('FAIL', f.key, f.cli, f.problems.join(' / '));
  for (const f of result.magazines.failed) console.log('FAIL', f.key, JSON.stringify(f.cli), f.problems.join(' / '));
  if (result.articles.failed.length || result.magazines.failed.length) process.exitCode = 1;
}

// ---------------------------------------------------------------- record
function record() {
  const date = opt('--date');
  if (!date) { console.error('--date YYYY-MM-DD が必要'); process.exit(1); }
  const status = opt('--status', 'done');
  const manifest = readJson(join(OUT, 'manifest.json'));
  const reconcileReport = existsSync(join(OUT, 'verification.json')) ? readJson(join(OUT, 'verification.json')) : null;
  const planned = readJson(join(WORK, 'live-plan.json'));
  const verified = readJson(join(WORK, 'live-verification.json'));
  const grab = (file, re) => { const p = join(LOGS, file); return existsSync(p) ? readFileSync(p, 'utf8').match(re) : null; };
  const r2 = grab('r2-offload.log', /upload (\d+) \/ 検証通過 (\d+) \/ skip (\d+) \/ 失敗 (\d+)/);
  const drive = grab('drive-sync.log', /コピー (\d+) \/ 既存採用\(adopt\) (\d+) \/ 変更なし (\d+) \/ 失敗 (\d+)/);
  const holdReason = (h) => (/civil-[12]-anki/.test(h.key) ? '単発記事（note マガジンではない）。記事カバー img/cover.png 側で反映' : h.reason);
  const out = {
    version: 1, date, status, design: 'note-cover-character-v5', recordedAt: new Date().toISOString(),
    generator: { head: manifest.generatorHead, rendererSha256: manifest.rendererSha256 },
    source: { root: manifest.sourceRoot, head: manifest.sourceHead, dirty: manifest.sourceDirty || [] },
    generated: { targets: manifest.targetCount, articles: manifest.targets.filter((t) => t.kind === 'article').length, magazines: manifest.targets.filter((t) => t.kind === 'magazine').length, failed: manifest.failedCount, poseCounts: manifest.poseCounts, retired: manifest.retired,
      reconcile: reconcileReport ? { checkedAt: reconcileReport.checkedAt, newTargets: reconcileReport.newTargets.length, changedInputs: reconcileReport.changedInputs.length, changedPoses: reconcileReport.changedPoses.length, removed: reconcileReport.removed.length } : null },
    supply: { articleCoversR2: r2 ? { group: 'note-cover-png', uploaded: +r2[1], verified: +r2[2], skipped: +r2[3], failed: +r2[4] } : null, magazineCoversDrive: drive ? { group: 'note-magazine-cover-png', copied: +drive[1], adopted: +drive[2], unchanged: +drive[3], failed: +drive[4] } : null },
    live: {
      verifiedAt: verified.verifiedAt,
      articles: { ...verified.summary.articles, failed: verified.articles.failed.map((f) => ({ key: f.key, noteId: f.noteId, cli: f.cli, problems: f.problems })), notRun: verified.articles.notRun.length, held: planned.articles.hold.map((h) => ({ key: h.key, noteId: h.noteId, reason: holdReason(h) })) },
      magazines: { ...verified.summary.magazines, failed: verified.magazines.failed.map((f) => ({ key: f.key, noteKey: f.noteKey, problems: f.problems })), notRun: verified.magazines.notRun, held: planned.magazines.hold.map((h) => ({ key: h.key, noteKey: h.noteKey || null, reason: holdReason(h) })) },
      checks: ['eyecatch / cover が更新前と異なる', 'price 不変', 'status 不変', 'is_limited / can_read 不変（記事）'],
    },
    resume: status === 'done' ? null : { command: 'node scripts/note-cover-rollout.mjs run → verify → record --status done', remaining: verified.summary.articles.planned - verified.summary.articles.ok, notes: ['作業場 .tmp/note-cover-rollout/（generated・live-before・live-plan・logs）を残したまま同じ checkout で再開する', '別 checkout にしか無い原稿は article.md を一時展開してから run（materialized-articles.txt）'] },
  };
  const p = join(ROOT, '.claude/state/note/cover-rollout', `${date}.json`);
  writeJson(p, out);
  console.log(JSON.stringify({ path: p.replace(ROOT + '/', ''), status, generated: out.generated.targets, live: { articles: verified.summary.articles, magazines: verified.summary.magazines } }));
}

const commands = { reconcile, snapshot, plan, run, verify, record };
if (!commands[cmd]) { console.error('usage: node scripts/note-cover-rollout.mjs <reconcile|snapshot|plan|run|verify|record> [options]'); process.exit(1); }
await commands[cmd]();
