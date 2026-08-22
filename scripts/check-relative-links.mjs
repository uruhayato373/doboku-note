/**
 * check-relative-links.mjs — Markdown の**相対リンク**が実在するかを検査する。
 *
 * 背景: `check-doc-refs` はリンク**テキスト**に書かれたリポジトリ相対パスを見るが、
 *   `](../../x)` の href 自体は見ない。そのため置き場を 1 段変えると href だけが黙って壊れる。
 *   2026-08-18 の情報アーキテクチャ移行で実際に 55 件が壊れ、さらに移行前から 59 件が
 *   壊れたまま放置されていた（誰も見ていなかった＝検査が無かった）。
 *
 * 誤検知の実測（2026-08-18・全 974 リンク）:
 *   - **コードスパン / フェンス内**の記法説明（`](../../x)` のような例示）→ 除外する
 *   - `{slug}` `YYYY-Www` `*` などのプレースホルダ → 除外する
 *   この 2 つを外すと残りはすべて実際の壊れリンクだった（過検知ゼロ）。
 *
 * Usage:
 *   node scripts/check-relative-links.mjs           全量
 *   node scripts/check-relative-links.mjs --staged  staged の .md のみ（pre-commit 用）
 *   node scripts/check-relative-links.mjs --json    機械可読
 *
 * exit: 0 合格 / 1 壊れリンクあり / 2 検査不成立（対象 0 件）
 * 緊急回避: SKIP_RELATIVE_LINKS=1
 *
 * 真実源: .claude/knowledge/reference/information-architecture.md「SSOT と参照規律」
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeSync } from 'node:fs';
import { dirname, join, posix, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const toPosix = (v) => v.split(sep).join('/');

/** `.agents/` は `.claude/` の写しで別途 DN-0098 の判断待ち。二重に報告しない。 */
const EXCLUDE_PREFIXES = ['.agents/'];

/**
 * コードスパン（`...`）とフェンス（```...```）の中身を空白へ潰す。
 * 位置がずれると行番号が狂うので、**長さを保ったまま**置き換える。
 */
export function maskCode(source) {
  let s = source.replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ' '));
  s = s.replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));
  return s;
}

const LINK = /\]\((\.\.?\/[^)#\s]+)(#[^)\s]*)?\)/g;
const PLACEHOLDER = /[{}*]|YYYY|N-1|\.\.\.|\bxx\b/;

/**
 * git の index に載っているパス（＋そこから導けるディレクトリ）を返す。
 *
 * なぜ existsSync だけでは足りないか: **ローカルには在るが git 未追跡**のファイルへリンクすると、
 * 手元では通るのに CI（クリーンチェックアウト）で落ちる。2026-08-21 に 2 回起きた——
 * 別セッションが作った未コミットの plan / doc を指す行が backlog.md 経由で commit され、
 * そのたび Pre-merge が赤くなった。CI で 10 分後に気づくのではなく commit 時点で止める。
 *
 * `git ls-files` は index を見るので **staged された新規ファイルも含む**。
 * リンク元と宛先を同じコミットで一緒に追加する正当なケースは通る。
 */
export function listTracked() {
  const out = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
  }).split('\0').filter(Boolean).map(toPosix);
  const set = new Set(out);
  for (const f of out) {
    let d = f.slice(0, f.lastIndexOf('/'));
    while (d) { set.add(d); d = d.slice(0, d.lastIndexOf('/')); }
  }
  return set;
}

/**
 * 1 ファイルを検査して壊れリンクを返す（純関数・テストから使う）。
 *
 * 返す `kind` は 2 種類:
 *   - `missing`   … どこにも無い
 *   - `untracked` … ローカルには在るが git 未追跡。**手元では通るが CI では落ちる**
 *
 * `tracked` を渡さないときは追跡判定をせず、従来どおり実在だけを見る。
 */
export function auditLinks(file, source, exists = (p) => existsSync(resolve(ROOT, p)), tracked = null) {
  const out = [];
  const masked = maskCode(source);
  for (const m of masked.matchAll(LINK)) {
    const raw = m[1];
    if (PLACEHOLDER.test(raw)) continue;
    let target;
    try { target = decodeURIComponent(raw); } catch { target = raw; }
    // リポジトリ相対の仮想パスとして解くので posix.resolve を使う。node:path の resolve は
    // Windows だとカレントドライブを足して `C:\...` を返し、.slice(1) が `C` を削って
    // `:/docs/...` になる（＝実在するリンクが全滅する）。
    const resolved = posix.resolve('/' + posix.dirname(toPosix(file)), target).slice(1);
    const inGit = tracked ? tracked.has(resolved) : true;
    const onDisk = exists(resolved);
    if (onDisk && inGit) continue;
    const line = masked.slice(0, m.index).split('\n').length;
    out.push({ file, line, link: raw, resolved, kind: onDisk ? 'untracked' : 'missing' });
  }
  return out;
}

export function listTargets({ staged = false } = {}) {
  const args = staged
    ? ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']
    : ['-c', 'core.quotepath=false', 'ls-files', '-z'];
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    .split('\0').filter(Boolean).map(toPosix)
    .filter((f) => f.endsWith('.md') && !EXCLUDE_PREFIXES.some((p) => f.startsWith(p)));
}

function main() {
  if (process.env.SKIP_RELATIVE_LINKS === '1') {
    console.log('[check-relative-links] SKIP_RELATIVE_LINKS=1 のためスキップ');
    process.exit(0);
  }
  const staged = process.argv.includes('--staged');
  const jsonOut = process.argv.includes('--json');
  const files = listTargets({ staged });

  if (!staged && files.length === 0) {
    console.error('✗ 検査不成立: .md が 1 件も取れない（走査の破損を疑う）');
    process.exit(2);
  }

  // 追跡集合を先に作る。「ローカルには在るが git 未追跡」を CI より前に捕まえるため。
  const tracked = listTracked();

  let links = 0;
  const broken = [];
  for (const f of files) {
    let source;
    try { source = readFileSync(join(ROOT, f), 'utf8'); } catch { continue; }
    const masked = maskCode(source);
    links += [...masked.matchAll(LINK)].length;
    broken.push(...auditLinks(f, source, undefined, tracked));
  }
  const untracked = broken.filter((b) => b.kind === 'untracked');

  // 検査ゼロを PASS と呼ばない（§9）: 対象数と実検査数を必ず出す
  // --json のときは stdout を JSON だけにする（人間向けサマリは stderr へ）
  (jsonOut ? console.error : console.log)(
    `[check-relative-links] ${staged ? 'staged ' : ''}${files.length} ファイル / 相対リンク ${links} 件を実検査 / ` +
      `壊れ ${broken.length}（うち未追跡 ${untracked.length}）`,
  );

  if (jsonOut) {
    writeSync(1, JSON.stringify({ files: files.length, links, broken }, null, 2) + '\n');
    process.exit(broken.length ? 1 : 0);
  }
  if (broken.length === 0) {
    console.log('[check-relative-links] ✓ 相対リンクは全て実在');
    process.exit(0);
  }
  for (const b of broken.slice(0, 40)) {
    const why = b.kind === 'untracked' ? 'はローカルに在るが git 未追跡（CI では存在しない）' : 'が無い';
    console.error(`  ${b.file}:${b.line}  ${b.link}  → ${b.resolved} ${why}`);
  }
  if (broken.length > 40) console.error(`  … 他 ${broken.length - 40} 件`);
  if (untracked.length) {
    console.error(
      '\n**未追跡**は「手元では通るが CI で落ちる」形。宛先を同じコミットに含めるか、' +
        '\n宛先を持つセッションが commit するまでリンクを書かない。' +
        '\n別セッションの作業中ファイルを指す行を巻き込んで commit したときに起きやすい。',
    );
  }
  console.error('\n移動先へ書き換えるか、宛先が消えているならリンクを外して記録の所在を書く。');
  console.error('記法の例示はコードスパン（`](../x)`）にすれば検査対象外になる。');
  process.exit(1);
}

if (process.argv[1] && toPosix(process.argv[1]).endsWith('check-relative-links.mjs')) main();
