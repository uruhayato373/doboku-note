import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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

/** git を同期実行し、かつ一覧/差分/履歴を読んでいる呼び出しを抽出する。 */
function findGitCalls(source) {
  const CALL = /exec(?:File)?Sync\(\s*(?:"git"|'git')[\s\S]{0,400}?\)/g;
  return [...(source.match(CALL) ?? [])].filter((c) =>
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
