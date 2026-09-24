// 台帳の本文ハッシュに一致する「記録時の版」を git 履歴から取り出す（check-note-republish の等価判定用）。
// 台帳は hash しか持たないので、旧 /docs → 新 URL の張り替えだけかを見るには記録時の本文そのものが要る。
// git log 1 回＋版の深さごとの git cat-file --batch 1 回で済ませ、記事ごとに git を起動しない
// （Windows は子プロセス 1 本ごとに数十 ms かかる）。
import { execFileSync } from 'node:child_process';
import { bodyHash } from './note-republish-hash.mjs';

/**
 * `git cat-file --batch` の出力を入力順の本文（blob 以外・missing は null）に分ける。
 * サイズはバイト数なので Buffer のまま切り出す（文字列にすると日本語で位置がずれる）。
 */
export function parseCatFileBatch(buf, count) {
  const out = [];
  let pos = 0;
  for (let i = 0; i < count && pos < buf.length; i++) {
    const nl = buf.indexOf(0x0a, pos);
    if (nl < 0) break;
    const header = buf.subarray(pos, nl).toString('utf8');
    pos = nl + 1;
    const m = header.match(/^[0-9a-f]+ (\S+) (\d+)$/);
    if (!m) { out.push(null); continue; } // "<name> missing" など本文を伴わない行
    const size = Number(m[2]);
    out.push(m[1] === 'blob' ? buf.subarray(pos, pos + size).toString('utf8') : null);
    pos += size + 1; // 本文の後ろの改行
  }
  while (out.length < count) out.push(null);
  return out;
}

/**
 * targets（[{ file, rec }]）ごとに、bodyHash が rec に一致する版を新しい方から探す。
 * 返り値: { available: 履歴を引けたか, found: Map<file, 本文> }。
 * 浅い clone（CI の fetch-depth 1）は履歴が無いので available=false を返し、呼び出し側は判定不能として扱う。
 */
export function findRecordedVersions(targets, { cwd = '.', pathspec = 'content/note', maxDepth = 30 } = {}) {
  const git = (args, opts = {}) =>
    execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd, maxBuffer: 512 * 1024 * 1024, ...opts });
  const found = new Map();
  try {
    if (git(['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim() === 'true') {
      return { available: false, found };
    }
  } catch {
    return { available: false, found };
  }

  // file → そのファイルを変えたコミット（新しい順）
  const commits = new Map();
  let head = null;
  for (const line of git(['log', '--format=%x01%H', '--name-only', '--', pathspec], { encoding: 'utf8' }).split('\n')) {
    if (line.startsWith('\x01')) { head = line.slice(1).trim(); continue; }
    const f = line.trim();
    if (!f || !head) continue;
    if (!commits.has(f)) commits.set(f, []);
    commits.get(f).push(head);
  }

  let pending = targets.filter((t) => commits.has(t.file));
  for (let depth = 0; depth < maxDepth && pending.length; depth++) {
    const batch = pending.filter((t) => commits.get(t.file).length > depth);
    if (!batch.length) break;
    const input = batch.map((t) => `${commits.get(t.file)[depth]}:${t.file}`).join('\n') + '\n';
    const texts = parseCatFileBatch(git(['cat-file', '--batch'], { input }), batch.length);
    batch.forEach((t, i) => {
      if (texts[i] != null && bodyHash(texts[i]) === t.rec) found.set(t.file, texts[i]);
    });
    pending = pending.filter((t) => !found.has(t.file));
  }
  return { available: true, found };
}
