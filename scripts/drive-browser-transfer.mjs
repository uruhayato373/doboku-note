#!/usr/bin/env node
/**
 * drive-browser-transfer — Drive のマウントも rclone も無い端末（会社PC）から、ログイン済みの Playwright
 * Google プロファイルで Drive vault へ PDF を置き、全バイトを読み戻して drive-connector-register 用の
 * receipt を作る。手順全体は /past-exam-archive（フォルダ作成と一覧取得は Drive MCP が担う）。
 *
 *   node scripts/drive-browser-transfer.mjs plan --group <drive group>            > plan.json
 *       Drive 台帳に無い手元ファイルを、置き先の vault フォルダごとに並べる（folderId は null で出る）
 *   node scripts/drive-browser-transfer.mjs upload --plan plan.json
 *       folderId を埋めた plan の各フォルダを開き「新規 → ファイルのアップロード」で送る
 *   node scripts/drive-browser-transfer.mjs verify --plan plan.json --listing listing.json --out <dir>
 *       listing（Drive MCP search_files の files 配列）で ID を引き、CDP で応答本文を横取りして
 *       sha256 を手元と照合し、フォルダごとの receipt を <dir> に書く
 *
 * 罠（2026-09-29 実測）:
 *   - エラーは 1 行目だけ出す。Playwright の call log は送信ヘッダー＝ログイン Cookie を丸ごと含む
 *   - Node 側の通信（ctx.request）は会社プロキシの TLS 中継で落ちる。取得はブラウザの通信を使う
 *   - ダウンロードを始めるとブラウザが閉じる。読み戻しは CDP Fetch で本文を読み、保存させずに中止する
 *   - 新しいフォルダを開いた直後の「新規」はマイドライブ直下に落ちる。タブ名が年度名になるまで待つ
 *   - アップロード後の一覧の文字は進行パネルとも一致する。実在は verify（Drive MCP の listing）で確かめる
 *   - 別プロファイルの Chrome が動いていると起動ガードが止める。別プロファイルなら DOBOKU_PW_ALLOW_PARALLEL=1
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, posix, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { loadDriveConfig, loadDriveManifest, driveGroupFor, vaultRelFor } from './lib/drive-vault.mjs';

const NAME = 'drive-browser-transfer';
const oneLine = (e) => String(e?.message || e).split(/\r?\n/)[0].slice(0, 200);
const sha = (b) => createHash('sha256').update(b).digest('hex');

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Drive 台帳に無い手元ファイルを vault フォルダごとに束ねる（純関数に近い: 走査結果を受け取る）。 */
export function buildPlan(groupId, repoPaths, { cfg, manifest }) {
  const group = cfg.groups.find((g) => g.id === groupId && g.status === 'active');
  if (!group) throw new Error(`active group が無い: ${groupId}`);
  const folders = new Map();
  for (const p of repoPaths) {
    if (driveGroupFor(p, cfg, { includePending: false })?.id !== groupId || manifest.entries?.[p]) continue;
    const vaultDir = posix.dirname(vaultRelFor(p, group));
    if (!folders.has(vaultDir)) folders.set(vaultDir, { vaultPath: vaultDir, folderId: null, files: [] });
    folders.get(vaultDir).files.push(p);
  }
  return { group: groupId, folders: [...folders.values()].sort((a, b) => a.vaultPath.localeCompare(b.vaultPath)) };
}

/** 走査の相対パス（Windows は \ 区切り）を repo 相対の / 区切りにする。 */
export function toRepoPath(prefix, rel) {
  return posix.join(prefix, rel.split(/[\\/]/).join('/'));
}

/** listing（Drive MCP の files 配列）から、フォルダ内の同名ファイルを 1 件だけ引く。 */
export function findRemote(listing, folderId, name) {
  const hit = listing.filter((f) => f.parentId === folderId && f.title === name);
  return hit.length === 1 ? hit[0] : null;
}

async function openContext() {
  const { loadConfig, launchContext } = await import('./lib/google-console-browser.mjs');
  return launchContext(loadConfig(), { headless: false });
}

async function upload(plan) {
  const ctx = await openContext();
  let ok = 0, ng = 0;
  try {
    const page = ctx.pages()[0] ?? await ctx.newPage();
    // 起動直後に開いた最初のフォルダでは、画面がフォルダを示していてもアップロード先がマイドライブ直下になる
    // （2026-09-29 に 2 回とも最初のフォルダで発生）。先にマイドライブを開いて落ち着かせる。
    await page.goto('https://drive.google.com/drive/my-drive', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(8000);
    for (const f of plan.folders) {
      if (!f.folderId) { console.log(`SKIP ${f.vaultPath}: folderId が未設定`); continue; }
      const name = basename(f.vaultPath);
      try {
        await page.goto(`https://drive.google.com/drive/folders/${f.folderId}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.waitForFunction((n) => document.title.startsWith(`${n} - `), name, { timeout: 60_000 });
        await page.waitForTimeout(3000);
        await page.getByRole('button', { name: /新規|New/ }).first().click({ timeout: 30_000 });
        const chooserP = page.waitForEvent('filechooser', { timeout: 30_000 });
        await page.getByRole('menuitem', { name: /ファイルのアップロード|File upload/ }).first().click();
        await (await chooserP).setFiles(f.files.map((p) => resolve(REPO_ROOT, p)));
        await page.waitForTimeout(3000);
        if (await page.getByText('アップロード オプション').count()) {
          await page.getByRole('button', { name: 'キャンセル' }).click();
          throw new Error('同名ファイルが既にある（上書きしない）');
        }
        const bytes = f.files.reduce((s, p) => s + statSync(resolve(REPO_ROOT, p)).size, 0);
        await page.waitForTimeout(20_000 + Math.ceil(bytes / 200_000) * 1000); // 実在の確認は verify が担う
        ok += f.files.length;
        console.log(`SENT ${f.vaultPath} ${f.files.length} 本`);
      } catch (e) {
        ng += f.files.length;
        console.log(`NG   ${f.vaultPath}: ${oneLine(e)}`);
      }
    }
  } finally {
    await ctx.close();
  }
  console.log(`[${NAME}] upload 送信 ${ok} / 失敗 ${ng}（実在は verify で確かめる）`);
  return ng;
}

/** CDP の Fetch で drive.usercontent の応答本文を読み、sha256 とバイト数を返す（保存はさせない）。 */
async function remoteSha(ctx, page, fileId) {
  const client = await ctx.newCDPSession(page);
  await client.send('Fetch.enable', { patterns: [{ urlPattern: '*drive.usercontent.google.com/download*', requestStage: 'Response' }] });
  const done = new Promise((resolveP, rejectP) => {
    const timer = setTimeout(() => rejectP(new Error('読み戻しが 180 秒で終わらない')), 180_000);
    client.on('Fetch.requestPaused', async (ev) => {
      try {
        const code = ev.responseStatusCode;
        if (code >= 300 && code < 400) { await client.send('Fetch.continueRequest', { requestId: ev.requestId }); return; }
        if (code !== 200) { await client.send('Fetch.failRequest', { requestId: ev.requestId, errorReason: 'Aborted' }); throw new Error(`HTTP ${code}`); }
        const { stream } = await client.send('Fetch.takeResponseBodyAsStream', { requestId: ev.requestId });
        const hash = createHash('sha256');
        let bytes = 0, head = null;
        for (;;) {
          const r = await client.send('IO.read', { handle: stream, size: 1 << 20 });
          const buf = Buffer.from(r.data, r.base64Encoded ? 'base64' : 'utf8');
          if (head === null) head = buf.subarray(0, 5).toString('latin1');
          hash.update(buf);
          bytes += buf.length;
          if (r.eof) break;
        }
        await client.send('IO.close', { handle: stream });
        await client.send('Fetch.failRequest', { requestId: ev.requestId, errorReason: 'Aborted' }).catch(() => {});
        clearTimeout(timer);
        resolveP({ bytes, sha256: hash.digest('hex'), head });
      } catch (e) { clearTimeout(timer); rejectP(e); }
    });
  });
  page.goto(`https://drive.usercontent.google.com/download?id=${fileId}&export=download`).catch(() => {});
  try { return await done; } finally {
    await client.send('Fetch.disable').catch(() => {});
    await client.detach().catch(() => {});
  }
}

async function verify(plan, listing, outDir) {
  mkdirSync(outDir, { recursive: true });
  const ctx = await openContext();
  let ok = 0, ng = 0;
  try {
    const page = ctx.pages()[0] ?? await ctx.newPage();
    for (const f of plan.folders) {
      const files = [];
      for (const repoPath of f.files) {
        const name = basename(repoPath);
        const remote = findRemote(listing, f.folderId, name);
        if (!remote) { ng++; console.log(`NG   ${repoPath}: Drive のフォルダに同名 1 件が無い（未着・重複）`); continue; }
        try {
          const r = await remoteSha(ctx, page, remote.id);
          const local = readFileSync(resolve(REPO_ROOT, repoPath));
          if (r.bytes !== local.length || r.sha256 !== sha(local)) throw new Error(`不一致 remote=${r.bytes} local=${local.length}`);
          files.push({ repoPath, id: remote.id, parentId: f.folderId, name, bytes: r.bytes, sha256: r.sha256, verification: 'remote-bytes-sha256', verifiedAt: new Date().toISOString() });
          ok++;
        } catch (e) { ng++; console.log(`NG   ${repoPath}: ${oneLine(e)}`); }
      }
      if (files.length && files.length === f.files.length) {
        writeFileSync(join(outDir, `${f.folderId}.json`), JSON.stringify({ group: plan.group, folder: { id: f.folderId, vaultPath: f.vaultPath }, files }, null, 2));
        console.log(`OK   ${f.vaultPath} ${files.length} 本 → receipt`);
      }
    }
  } finally {
    await ctx.close();
  }
  console.log(`[${NAME}] verify 一致 ${ok} / 失敗 ${ng}（receipt は全件一致したフォルダだけ）`);
  return ng;
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  if (cmd === 'plan') {
    const groupId = opt('--group');
    const cfg = loadDriveConfig();
    const group = cfg.groups.find((g) => g.id === groupId);
    const prefix = String(group?.keyFrom || '').replace(/^stripPrefix:/, '');
    if (!group || !prefix || prefix === group.keyFrom) throw new Error('--group は keyFrom が stripPrefix の group を指定する');
    const base = join(REPO_ROOT, prefix);
    const repoPaths = walk(base).map((p) => toRepoPath(prefix, relative(base, p)));
    const plan = buildPlan(groupId, repoPaths, { cfg, manifest: loadDriveManifest() });
    console.log(JSON.stringify(plan, null, 2));
    console.error(`[${NAME}] plan: 手元 ${repoPaths.length} 件を走査 / 未登録 ${plan.folders.reduce((s, f) => s + f.files.length, 0)} 件・${plan.folders.length} フォルダ`);
    return;
  }
  const plan = JSON.parse(readFileSync(opt('--plan'), 'utf8'));
  if (cmd === 'upload') process.exitCode = (await upload(plan)) ? 1 : 0;
  else if (cmd === 'verify') process.exitCode = (await verify(plan, JSON.parse(readFileSync(opt('--listing'), 'utf8')), opt('--out'))) ? 1 : 0;
  else throw new Error('使い方: plan --group G | upload --plan P | verify --plan P --listing L --out DIR');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`[${NAME}] ${oneLine(e)}`); process.exit(2); });
}
