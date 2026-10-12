import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

/**
 * git の一覧・差分・履歴を同期で読む箇所は maxBuffer を明示する。
 *
 * 既定は 1MB しかなく、大規模なコミット（数千ファイルの移動など）で ENOBUFS 例外になる。
 * そのとき落ちるのは「検査が不合格」ではなく **検査が実行不能**で、しかも例外なので
 * pre-commit ごと止まる。2026-08-18 の情報アーキテクチャ移行で check-doc-coupling と
 * check-handoff-extraction が実際にこれで落ち、commit が通らなくなった。
 *
 * 「緑」と「そもそも走っていない」を区別できない状態を作らない（CLAUDE.md §9）。
 */

/**
 * `execSync(` / `execFileSync(` の呼び出し全体（閉じ括弧まで）を切り出す。
 *
 * 文字列（'…' "…" `…`）・テンプレートの ${…}（入れ子可）・コメントの中の括弧は数えず、
 * 括弧の深さで終端を決める。以前の「最初の ) まで」の正規表現は、引数に
 * `--since=${since.toISOString()}` のような呼び出しを含むと、そこで途切れて
 * 後ろの { maxBuffer } を見落とし、maxBuffer を書いているのに未指定と誤判定した（DN-0590）。
 * firstArg には第 1 引数の先頭が一致する正規表現を渡す（先頭固定）。
 */
function sliceSyncCalls(source, firstArg) {
  const START = /exec(?:File)?Sync\(/g;
  const calls = [];
  let m;
  while ((m = START.exec(source)) !== null) {
    const bodyStart = m.index + m[0].length;
    if (!firstArg.test(source.slice(bodyStart, bodyStart + 16).trimStart())) continue;
    const end = findCloseParen(source, bodyStart);
    if (end === -1) continue;
    calls.push(source.slice(m.index, end + 1));
    START.lastIndex = end + 1;
  }
  return calls;
}

/** i は開き括弧の直後。対応する ) の位置を返す（無ければ -1）。 */
function findCloseParen(src, i) {
  let depth = 1;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "'" || ch === '"') {
      i = skipQuoted(src, i);
    } else if (ch === '`') {
      i = skipTemplate(src, i);
    } else if (ch === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i);
      i = nl === -1 ? src.length : nl;
    } else if (ch === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      i = e === -1 ? src.length : e + 2;
    } else {
      if (ch === '(') depth += 1;
      else if (ch === ')' && --depth === 0) return i;
      i += 1;
    }
    if (i === -1) return -1;
  }
  return -1;
}

function skipQuoted(src, i) {
  const q = src[i];
  for (i += 1; i < src.length; i += 1) {
    if (src[i] === '\\') i += 1;
    else if (src[i] === q || src[i] === '\n') return i + 1;
  }
  return src.length;
}

/** テンプレートリテラル。${ … } の中は式なので括弧・文字列・入れ子テンプレートを再帰で読む。 */
function skipTemplate(src, i) {
  for (i += 1; i < src.length; i += 1) {
    if (src[i] === '\\') i += 1;
    else if (src[i] === '`') return i + 1;
    else if (src[i] === '$' && src[i + 1] === '{') {
      let depth = 1;
      i += 2;
      while (i < src.length && depth > 0) {
        const ch = src[i];
        if (ch === "'" || ch === '"') i = skipQuoted(src, i);
        else if (ch === '`') i = skipTemplate(src, i);
        else {
          if (ch === '{') depth += 1;
          else if (ch === '}') depth -= 1;
          i += 1;
        }
      }
      i -= 1; // for の i += 1 と合わせる
    }
  }
  return src.length;
}

/** git を同期実行し、かつ一覧/差分/履歴を読んでいる呼び出しを抽出する。 */
function findGitCalls(source) {
  return sliceSyncCalls(source, /^(?:"git"|'git')/).filter((c) =>
    /--cached|ls-files|name-only|name-status|\bdiff\b|\blog\b|ls-tree|rev-list/.test(c),
  );
}

test('git の一覧・差分・履歴を読む同期呼び出しは maxBuffer を明示している', () => {
  const files = execFileSync(
    'git',
    ['-c', 'core.quotepath=false', 'ls-files', '-z', 'scripts', '.claude/scripts', 'tests'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  ).split('\0').filter(Boolean).filter((f) => f.endsWith('.mjs'));

  let inspected = 0;
  const missing = [];
  for (const rel of files) {
    const source = readFileSync(join(ROOT, rel), 'utf8');
    for (const call of findGitCalls(source)) {
      inspected += 1;
      if (!/maxBuffer/.test(call)) {
        const line = source.slice(0, source.indexOf(call)).split('\n').length;
        missing.push(`${rel}:${line}`);
      }
    }
  }

  // 検査ゼロを PASS と呼ばない: 抽出そのものが壊れていないことを先に確かめる
  assert.ok(inspected > 30, `git 呼び出しの抽出が異常に少ない（正規表現の破損を疑う）: ${inspected}`);
  assert.deepEqual(missing, [], `maxBuffer 未指定: ${missing.join(', ')}`);
});

test('抽出は「maxBuffer が無い呼び出し」を実際に検出できる（負検証）', () => {
  // フィクスチャは**連結して組み立てる**。ベタ書きするとこのファイル自身が上のテストに
  // 引っかかる（実際に、このテストを追跡下へ入れた瞬間に自分で自分を落とした）。
  const CALL = (opts) => `exec${'File'}Sync(${"'git'"}, ['diff', '--cached', '--name-only'], { ${opts} })`;
  const bad = CALL("encoding: 'utf8'");
  const good = CALL("encoding: 'utf8', maxBuffer: 1");
  assert.equal(findGitCalls(bad).length, 1);
  assert.equal(/maxBuffer/.test(findGitCalls(bad)[0]), false);
  assert.equal(/maxBuffer/.test(findGitCalls(good)[0]), true);
  // git 以外や、一覧/差分を読まない git 呼び出しは対象外
  assert.deepEqual(findGitCalls(`exec${'File'}Sync('node', ['-e', 'diff'], { encoding: 'utf8' })`), []);
  assert.deepEqual(findGitCalls(`exec${'File'}Sync(${"'git'"}, ['rev-parse', 'HEAD'], { encoding: 'utf8' })`), []);
});

test('引数にテンプレート文字列（${…}・入れ子の括弧）を含む呼び出しでも maxBuffer の有無を正しく判定する（DN-0590）', () => {
  // フィクスチャは連結して組み立てる（ベタ書きするとこのファイル自身が上のテストに掛かる）。
  const CALL = (opts) =>
    'exec' + 'File' + "Sync('git', ['log', `--since=${since.toISOString()}`, `--until=${fmt({ d: (1 + 2) })}`, '--name-only'], { " + opts + ' })';
  const good = CALL("encoding: 'utf8', maxBuffer: 1");
  const bad = CALL("encoding: 'utf8'");
  assert.equal(findGitCalls(good).length, 1);
  assert.equal(/maxBuffer/.test(findGitCalls(good)[0]), true, '括弧を含む ${} で途切れて maxBuffer を見落とした');
  assert.equal(findGitCalls(bad).length, 1);
  assert.equal(/maxBuffer/.test(findGitCalls(bad)[0]), false);
  // 文字列中の ) ・コメント中の ) では終端しない
  const tricky = 'exec' + 'File' + "Sync('git', ['diff', 'a)b', \"c)d\"], /* ) */ { maxBuffer: 1 })";
  assert.equal(/maxBuffer/.test(findGitCalls(tricky)[0]), true);
  // 呼び出しが 2 つ並んでも、後ろの呼び出しの maxBuffer を前の呼び出しに混ぜない
  const two = bad + ';\n' + good;
  const found = findGitCalls(two);
  assert.equal(found.length, 2);
  assert.equal(/maxBuffer/.test(found[0]), false);
  assert.equal(/maxBuffer/.test(found[1]), true);
  // パス列挙側も同じ切り出しを使う（quotepath が ${} の後ろにあっても拾う）
  const path = 'exec' + 'File' + "Sync('git', ['ls-files', `${a(b)}`, '-c', 'core.quotepath=false'], {})";
  assert.equal(/quotepath/.test(findPathListingGitCalls(path)[0]), true);
});

/**
 * partial clone で「遅い」ではなく「履歴を再ダウンロードしている」コマンドを止める。
 *
 * このリポジトリは `--filter=blob:none` の partial clone。rev-list でオブジェクトを
 * 列挙すると欠損 blob を promisor remote から遅延取得しに行き、`.git` が数 GB 膨らむ。
 * **memory に書いても再発した** —— 2026-08-22 に規則を記録した本人が、同じセッション内で
 * 教材 PDF の突合をするときに付け忘れ、10 分間の再ダウンロードを起こした。
 * 覚えていることを前提にせず、機械で止める。
 *
 * repack を全体に掛ける系も同様に危険で、2026-08-21 に到達可能な commit を 21 個
 * 落としている（promisor pack 内の commit が取りこぼされる）。
 *
 * **「呼び出し」だけを見る。** 「使うな」と書いてある警告文字列まで拾うと、
 * 注意書きを書いた人が自分の注意書きで落ちる（実際に一度そうなった）。
 */
const INVOCATION = /exec(?:File)?Sync\(|spawnSync\(|spawn\(|\bgit\(/;

function findHazardousGitCalls(source) {
  const out = [];
  const revList = new RegExp("rev-" + "list");
  const objects = new RegExp("--obj" + "ects");
  const repackAll = new RegExp("rep" + "ack\\b[^\\n]{0,40}(-a\\b|--all)");
  const gcAggressive = new RegExp("\\bgc\\b[^\\n]{0,40}--aggr" + "essive");
  for (const line of source.split("\n")) {
    if (/^\s*(\/\/|\*|#)/.test(line)) continue; // コメントは対象外
    if (!INVOCATION.test(line)) continue;          // 実行していない言及は対象外
    if (revList.test(line) && objects.test(line) && !/--missing/.test(line)) {
      out.push({ line, why: "rev-list でのオブジェクト列挙に --missing=allow-any が無い" });
    }
    if (repackAll.test(line)) out.push({ line, why: "repack を全体に掛けると到達可能 commit を落とすことがある" });
    if (gcAggressive.test(line)) out.push({ line, why: "gc --aggressive は内部で repack -a を使う" });
  }
  return out;
}

test("partial clone で履歴を再ダウンロードする git 呼び出しを書かない", () => {
  const files = execFileSync(
    "git",
    ["-c", "core.quotepath=false", "ls-files", "-z", "scripts", ".claude/scripts", "tests"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  ).split("\0").filter(Boolean).filter((f) => f.endsWith(".mjs"));

  let inspected = 0;
  const hits = [];
  for (const rel of files) {
    inspected += 1;
    for (const h of findHazardousGitCalls(readFileSync(join(ROOT, rel), "utf8"))) {
      hits.push(`${rel}: ${h.why}`);
    }
  }
  assert.ok(inspected > 100, `走査ファイルが異常に少ない（${inspected}）`);
  assert.deepEqual(hits, [], `partial clone を壊す git 呼び出し: ${hits.join(" / ")}`);
});

test("危険な git 呼び出しの検出が実際に効く（負検証）", () => {
  // リテラルを直接書くとこのファイル自身が上のテストに引っかかるので、必ず連結で組む。
  const RL = "rev-" + "list", OBJ = "--obj" + "ects", RP = "rep" + "ack";
  const call = (args) => `exec${"File"}Sync('git', [${args}], { maxBuffer: 1 })`;
  const bad1 = call(`'${RL}', '${OBJ}', '--all'`);
  const bad2 = `exec${"Sync"}('git ${RP} -a -d')`;
  const good1 = call(`'${RL}', '${OBJ}', '--all', '--missing=allow-any'`);
  const good2 = call(`'${RL}', '--count', 'HEAD'`);
  const mention = `const msg = 'git ${RP} -a -d は使わない';`; // 呼び出しでない言及
  assert.equal(findHazardousGitCalls(bad1).length, 1);
  assert.equal(findHazardousGitCalls(bad2).length, 1);
  assert.deepEqual(findHazardousGitCalls(good1), []);
  assert.deepEqual(findHazardousGitCalls(good2), []);
  assert.deepEqual(findHazardousGitCalls(mention), []);
});

/**
 * パスを列挙する git 呼び出しは core.quotepath=false を明示する。
 *
 * 既定の git は非 ASCII を含むパスを 8 進エスケープした `"content/note/\346\212\200…"`
 * の形（両端のダブルクォート込み）で返す。このリポジトリは .md の 38%（975/2553）が
 * 日本語パス配下なので、付け忘れると **その全てが「存在しないファイル名」になる**。
 *
 * 厄介なのは落ち方で、例外にならず件数が静かに減るだけ。2026-08-30 に実測した被害:
 *   - check-dead-handles      : 5,769 件しか検査しておらず ✓ を出していた（正しくは 7,728 件）
 *   - note-essay-charcount    : 対象の模範論文が全件「ファイルなし」。それでも exit 0
 *   - asset-inbox-push        : 選択 0 件。check-asset-storage が案内する復旧コマンドが無反応
 *
 * 「緑」と「そもそも走っていない」を区別できない状態を作らない（CLAUDE.md §9）。
 */

/** git 呼び出しのうち、出力を**ファイルパスとして使う**ものを抽出する。 */
function findPathListingGitCalls(source) {
  return sliceSyncCalls(source, /^(?:"git |'git |"git"|'git')/).filter((c) =>
    /ls-files|--name-only|--name-status|ls-tree/.test(c),
  );
}

test('パスを列挙する git 呼び出しは core.quotepath=false を明示している', () => {
  const files = execFileSync(
    'git',
    ['-c', 'core.quotepath=false', 'ls-files', '-z', 'scripts', '.claude/scripts'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  ).split('\0').filter(Boolean).filter((f) => f.endsWith('.mjs'));

  let inspected = 0;
  const missing = [];
  for (const rel of files) {
    const source = readFileSync(join(ROOT, rel), 'utf8');
    for (const call of findPathListingGitCalls(source)) {
      inspected += 1;
      if (!/quotepath/.test(call)) {
        const line = source.slice(0, source.indexOf(call)).split('\n').length;
        missing.push(`${rel}:${line}`);
      }
    }
  }

  // 検査ゼロを PASS と呼ばない: 抽出そのものが壊れていないことを先に確かめる
  assert.ok(inspected > 20, `パス列挙の抽出が異常に少ない（正規表現の破損を疑う）: ${inspected}`);
  assert.deepEqual(missing, [], `core.quotepath=false 未指定: ${missing.join(', ')}`);
});

test('抽出は「quotepath 無しのパス列挙」を実際に検出できる（負検証）', () => {
  // フィクスチャは連結して組み立てる（ベタ書きするとこのファイル自身が上のテストに掛かる）。
  const FILE_CALL = (args) => `exec${'File'}Sync(${"'git'"}, [${args}], { encoding: 'utf8' })`;
  const bad = FILE_CALL(`'ls-files', '--others'`);
  const good = FILE_CALL(`'-c', 'core.quotepath=false', 'ls-files', '--others'`);
  assert.equal(findPathListingGitCalls(bad).length, 1);
  assert.equal(/quotepath/.test(findPathListingGitCalls(bad)[0]), false);
  assert.equal(/quotepath/.test(findPathListingGitCalls(good)[0]), true);

  // shell 文字列形式（execSync('git ls-files …')）も同じ規則で拾う
  const shellBad = `exec${'Sync'}('git ls-files "content/note/x/*.md"', { encoding: 'utf8' })`;
  assert.equal(findPathListingGitCalls(shellBad).length, 1);

  // パスを列挙しない git 呼び出しは対象外（付ける意味がないので強制しない）
  assert.deepEqual(findPathListingGitCalls(FILE_CALL(`'rev-parse', 'HEAD'`)), []);
  assert.deepEqual(findPathListingGitCalls(FILE_CALL(`'log', '--oneline', '-3'`)), []);
});
