#!/usr/bin/env node
/**
 * check-drive-readable.mjs — 土曜の収集（launchd）の先頭で、Google Drive の vault を本当に読めるかを 1 本読んで確かめる。
 * ---------------------------------------------------------------------------
 * 2026-10-31〜11-14、launchd から起動した収集は Drive の未ダウンロードのファイルを読めず（node は Unknown system error -11）、
 * note 同期が配布 PDF の要る記事を毎週翌週へ回していた。原因は macOS 側（フルディスクアクセスと、取り寄せの禁止）で、
 * note 同期は「Drive を再起動」と誤った手当てをしていた。ここで先に読み、原因の候補を名指しで出す。
 *
 * 読むのは vault の `制作物/note配布PDF/` から、未ダウンロード（dataless）のファイルを優先して 1 本。
 * 未ダウンロードが無ければ手元にある 1 本を読む（このときはフルディスクアクセスだけを確かめたことになると出す）。
 *
 *   node scripts/check-drive-readable.mjs          # exit 0 読めた / 1 読めない / 2 検査不成立（vault・ファイルが無い）
 *   node scripts/check-drive-readable.mjs --json
 * ---------------------------------------------------------------------------
 */
import { openSync, readSync, closeSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveVaultRoot } from './lib/drive-vault.mjs';
import { listFiles } from './lib/fs-walk.mjs';

const TAG = '[check-drive-readable]';
const PROBE_DIR = '制作物/note配布PDF';
const MAX_SCAN = 400;

/**
 * 読めなかった理由を、運営者が直せる言葉にする（pure）。
 * @param {{ code?: string, errno?: number, message?: string }} err
 * @param {string} nodePath node の実体のパス
 */
export function classifyDriveReadError(err, nodePath) {
  const code = err?.code ?? '';
  const errno = err?.errno;
  if (code === 'EPERM' || code === 'EACCES') {
    return `macOS のフルディスクアクセスが無い（${code}）。システム設定 → プライバシーとセキュリティ → フルディスクアクセスで /bin/bash と node の実体（${nodePath}）をオンにする。node の版が上がると場所が変わり、付け直しが要る`;
  }
  if (code === 'EDEADLK' || errno === -11 || /system error -11/.test(err?.message ?? '')) {
    return '未ダウンロードのファイルの取り寄せが禁止されている（EDEADLK）。scripts/scheduled/weekly-review.sh 冒頭の取り寄せの切り替え（DOBOKU_DATALESS_ON）が効いていない。Drive の再起動では直らない';
  }
  if (['ETIMEDOUT', 'ENOTCONN', 'ESTALE', 'ECANCELED', 'EIO'].includes(code)) {
    return `Drive の応答が無い（${code}）。Google ドライブ アプリが動いているか・同期中でないかを確かめる`;
  }
  return `読めない（${code || errno || err?.message || '不明'}）`;
}

/** macOS の stat でファイルのフラグを読み、未ダウンロードかを返す（macOS 以外は false） */
function isDataless(path) {
  if (process.platform !== 'darwin') return false;
  const r = spawnSync('/usr/bin/stat', ['-f', '%Sf', path], { encoding: 'utf8' });
  return r.status === 0 && /dataless/.test(r.stdout);
}

/** 読む候補を探す。未ダウンロードを優先し（先頭 MAX_SCAN 本まで）、無ければ最初のファイル */
function pickProbe(dir) {
  const files = listFiles(dir, { allowMissing: true, match: (_p, name) => !name.startsWith('.') }).slice(0, MAX_SCAN);
  const dataless = files.find(isDataless);
  if (dataless) return { path: dataless, dataless: true, scanned: files.length };
  return { path: files[0] ?? null, dataless: false, scanned: files.length };
}

function main() {
  const json = process.argv.includes('--json');
  const nodePath = (() => { try { return realpathSync(process.execPath); } catch { return process.execPath; } })();
  const out = (r, code) => {
    if (json) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(`${TAG} 対象 ${r.path ? 1 : 0} 本・実検査 ${r.checked} 本${r.path ? `（${r.dataless ? '未ダウンロード' : '手元にある'}・${r.path.split('/').slice(-2).join('/')}）` : ''}`);
      if (r.ok) console.log(`${TAG} ✓ 読めた（${r.bytes} バイト）${r.dataless ? '' : '。未ダウンロードのファイルが見つからず、取り寄せは確かめていない'}`);
      else console.error(`${TAG} ✗ ${r.reason}`);
    }
    process.exitCode = code;
    return code;
  };

  const root = resolveVaultRoot();
  if (!root?.root) return out({ ok: false, checked: 0, reason: 'Drive の vault が見つからない（Google ドライブ アプリが起動していない・マウントされていない）' }, 2);
  const probe = pickProbe(join(root.root, PROBE_DIR));
  if (!probe.path) return out({ ok: false, checked: 0, reason: `${PROBE_DIR} に読めるファイルが無い（検査不成立）` }, 2);

  let fd;
  try {
    fd = openSync(probe.path, 'r');
    const buf = Buffer.alloc(64 * 1024);
    const bytes = readSync(fd, buf, 0, buf.length, 0);
    out({ ok: true, checked: 1, path: probe.path, dataless: probe.dataless, bytes, nodePath }, 0);
  } catch (err) {
    out({ ok: false, checked: 1, path: probe.path, dataless: probe.dataless, code: err.code ?? null, errno: err.errno ?? null, reason: classifyDriveReadError(err, nodePath), nodePath }, 1);
  } finally {
    if (fd !== undefined) try { closeSync(fd); } catch { /* 読めた後の close の失敗は判定に使わない */ }
  }
}

if (process.argv[1]?.endsWith('check-drive-readable.mjs')) main();
