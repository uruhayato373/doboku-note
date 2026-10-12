#!/usr/bin/env node
/**
 * replay-onto-develop.mjs — commit を最新の origin/develop の上へ載せ直す（DN-0559）。
 *
 *   node scripts/replay-onto-develop.mjs <sha...> [--push]
 *
 * 並行セッションと CI の自動コミットで develop は数分おきに進む。載せ直しを `;` で繋いだ手順は、前の失敗の後も
 * 先へ進んで事故になった（commit が止まったのに reset して空の枝を force push、など）。ここでは 1 段ずつ確かめ、
 * 失敗したら何が残ったかを出して非 0 で終える。
 *
 * 処理: (1) 全 sha が commit として在り、マージでないことを確かめる（失敗した commit の後に呼ばれたときはここで止まり、
 * 何も動かさない）→ (2) 元のパッチ ID を控える → (3) git fetch → (4) git reset --keep origin/develop →
 * (5) sha を指定順に git cherry-pick → (6) 載せ直した後のパッチ ID が元と同じか比べる → (7) --push のときだけ push
 * （同じパッチのときだけ。develop 以外は --force-with-lease。main へは push しない）。
 *
 * 終了コード: 0 = 完了 / 1 = 途中で止まった・パッチが違った（標準エラーに状態と戻し方）/ 2 = 使い方の誤り・着手前の検査で停止。
 * cherry-pick が止まったら `git cherry-pick --quit` で抜けるだけで、作業ツリーには触れない。
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const REMOTE = 'origin';
const BASE = 'develop';
const MAX_BUFFER = 1 << 28;

/** git を cwd で実行して標準出力を返す。失敗は例外（stderr を含む）。 */
function git(cwd, args, input) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', input, maxBuffer: MAX_BUFFER, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

/** git が失敗しても例外にせず { ok, out, err } で返す。 */
function gitTry(cwd, args, input) {
  try {
    return { ok: true, out: git(cwd, args, input), err: '' };
  } catch (e) {
    return { ok: false, out: String(e.stdout ?? '').trim(), err: String(e.stderr ?? e.message).trim() };
  }
}

/** commit 1 本のパッチ ID（コミットメッセージ・base に依存しない）。 */
function patchId(cwd, rev) {
  const diff = git(cwd, ['show', '--format=', '--no-color', rev]);
  return git(cwd, ['patch-id', '--stable'], `${diff}\n`).split(/\s+/)[0] ?? '';
}

/**
 * @param {{ cwd: string, shas: string[], push?: boolean }} opts
 * @returns {{ code: 0 | 1 | 2, messages: string[], head?: string, previousHead?: string }}
 */
export function replay({ cwd, shas, push = false }) {
  const messages = [];
  const fail = (code, ...lines) => ({ code, messages: [...messages, ...lines] });
  if (shas.length === 0) return fail(2, '使い方: node scripts/replay-onto-develop.mjs <sha...> [--push]');

  // (1) 着手前の検査: ここで止まるときは HEAD も作業ツリーも動かしていない
  const resolved = [];
  for (const sha of shas) {
    const r = gitTry(cwd, ['rev-parse', '--verify', '--quiet', `${sha}^{commit}`]);
    if (!r.ok || !r.out) return fail(2, `commit が在りません: ${sha}（直前の commit が失敗していないか確認。何も動かしていません）`);
    if (gitTry(cwd, ['rev-parse', '--verify', '--quiet', `${r.out}^2`]).ok) return fail(2, `マージ commit は載せ直せません: ${sha}`);
    resolved.push(r.out);
  }
  if (gitTry(cwd, ['rev-parse', '--verify', '--quiet', 'CHERRY_PICK_HEAD']).ok) {
    return fail(2, `cherry-pick の途中です。git cherry-pick --quit か --abort で抜けてから呼んでください`);
  }
  const branch = git(cwd, ['branch', '--show-current']);
  if (push && !branch) return fail(2, 'HEAD が分離しています。--push はブランチの上でだけ使えます');
  if (push && branch === 'main') return fail(2, 'main へは push しません');

  const previousHead = git(cwd, ['rev-parse', 'HEAD']);
  const restore = `元に戻すには: git reset --keep ${previousHead}`;
  const expected = resolved.map((sha) => patchId(cwd, sha));

  // (3) fetch
  const fetched = gitTry(cwd, ['fetch', '-q', REMOTE]);
  if (!fetched.ok) return fail(1, `git fetch に失敗しました（何も動かしていません）: ${fetched.err}`);

  // (4) reset --keep
  const reset = gitTry(cwd, ['reset', '--keep', `${REMOTE}/${BASE}`]);
  if (!reset.ok) return fail(1, `git reset --keep ${REMOTE}/${BASE} に失敗しました（作業ツリーの未コミットが衝突）: ${reset.err}`, restore);
  messages.push(`reset --keep ${REMOTE}/${BASE} -> ${git(cwd, ['rev-parse', '--short', 'HEAD'])}`);

  // (5) cherry-pick を 1 本ずつ
  for (const [i, sha] of resolved.entries()) {
    const pick = gitTry(cwd, ['cherry-pick', sha]);
    if (!pick.ok) {
      gitTry(cwd, ['cherry-pick', '--quit']);
      return fail(
        1,
        `cherry-pick が止まりました（${i + 1}/${resolved.length} 本目 ${sha.slice(0, 9)}）: ${pick.err.split('\n')[0]}`,
        `載せ終えたのは ${i} 本。git cherry-pick --quit で抜けただけで、作業ツリーには触れていません（衝突したファイルはそのまま）`,
        restore,
      );
    }
  }
  const head = git(cwd, ['rev-parse', 'HEAD']);

  // (6) パッチ照合
  const actual = git(cwd, ['rev-list', '--reverse', `${head}~${resolved.length}..${head}`]).split('\n').filter(Boolean).map((sha) => patchId(cwd, sha));
  if (actual.length !== expected.length || actual.some((id, i) => id !== expected[i])) {
    return fail(1, '載せ直した後のパッチが元と違います（push しません）。develop 側の変更が重なって内容が変わった可能性', restore);
  }
  messages.push(`パッチ照合 OK（${resolved.length} 本が元と同じ）`);

  // (7) push
  if (push) {
    const args = branch === BASE ? ['push', REMOTE, `HEAD:${BASE}`] : ['push', `--force-with-lease=${branch}`, REMOTE, `HEAD:${branch}`];
    const pushed = gitTry(cwd, args);
    if (!pushed.ok) return fail(1, `push に失敗しました（載せ直しは済んでいます）: ${pushed.err}`, restore);
    messages.push(`push 済み: ${REMOTE} ${branch}`);
  }
  return { code: 0, messages, head, previousHead };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv.slice(2);
  const pushFlag = argv.includes('--push');
  const shas = argv.filter((a) => !a.startsWith('-'));
  const unknown = argv.filter((a) => a.startsWith('-') && a !== '--push');
  if (unknown.length) {
    console.error(`未知のフラグ: ${unknown.join(' ')}`);
    process.exit(2);
  }
  const r = replay({ cwd: process.cwd(), shas, push: pushFlag }); // root-ok: 載せ直す対象は呼び出した場所のリポジトリ
  for (const m of r.messages) (r.code === 0 ? console.log : console.error)(m);
  process.exit(r.code);
}
