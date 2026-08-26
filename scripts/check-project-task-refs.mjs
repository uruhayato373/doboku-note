/**
 * check-project-task-refs.mjs — 恒久文書（docs/）のタスク参照と廃止参照を検査する。
 *
 * 背景: docs/ は戦略・設計・判断条件を持つ層で、実行タスクは .claude/todo/backlog.md が
 *   唯一の台帳。両者は `DN-####` で結線する。放っておくと (a) 廃止した進捗 SSOT
 *   （task-queue.json / 旧 Project TODO）を案内する記述が残り、(b) backlog から消えた ID を
 *   指したままになり、(c) 「次のアクション」に実行タスクが書かれたまま台帳へ出てこない。
 *
 * 検査（初期ルール・指示書 §Phase5）:
 *   error   恒久文書に廃止済み task-queue.json / 旧 Project TODO の参照がある
 *   error   `DN-####` が backlog に存在しない（参照切れ）
 *   warning 「次のアクション」系見出し配下の未チェック項目に ID も `<!-- criterion -->` も無い
 *   **未チェック記法の総数だけでは失敗させない**（受入条件・判断トリガーが混ざるため）
 *
 * 2026-08-18 の情報アーキテクチャ移行で対象は `docs/project/**` から `docs/**` になった。
 * `_archive` 層は 3 件を個別に分類して消滅したので、「アーカイブは検査対象外」の分岐も廃止した
 * （履歴のために死んだパスを持てる層を残すと、そこが検査の穴になる）。
 * `content/` へ出ていくチャネル素材（note/sns/textbook/coconala-blog）は恒久文書ではないので除外する。
 *
 * **日付つき週次レビュー（`docs/reviews/weekly/**`）だけは dangling-id を warning にする**（2026-08-25）。
 *   この台帳は「完了＝カードごと削除」で完了を表すので、レビューが「DN-XXXX 完了」と実績を ID で
 *   書くたび、その ID は翌週には必ず消える。つまり**仕事を片付けるほどゲートが赤くなる**構造で、
 *   実際 319d266d6（DN-0116）と本日（DN-0126 / DN-0127）の 2 度、完了を記録しただけで CI が赤くなった。
 *   偽赤は偽緑と同じくらい信号を殺すので降格する。ただし**件数は必ず出す**（黙って消さない）。
 *   降格するのは日付つきスナップショットに限る——`docs/reviews/2026-07-11-static-ui-codebase-audit.md`
 *   のような「作業指示書として今も参照される文書」は日付を持っていても live なので error のまま。
 *   区別はディレクトリ（`reviews/weekly/`）で行い、ファイル名の日付では判定しない。
 *
 * Usage:
 *   node scripts/check-project-task-refs.mjs          全量
 *   node scripts/check-project-task-refs.mjs --json   機械可読
 *   node scripts/check-project-task-refs.mjs --warn-only  warning も一覧する（exit は同じ）
 *
 * exit: 0 合格（warning のみを含む）/ 1 error / 2 検査不成立（対象 0 件・backlog 不在）
 * 緊急回避: SKIP_PROJECT_TASK_REFS=1
 *
 * 真実源: .claude/knowledge/reference/information-architecture.md ／ todo-standards.md
 */
import { readFileSync, existsSync, readdirSync, writeSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBacklog } from './lib/backlog-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_DIR = join(ROOT, 'docs');
const BACKLOG = '.claude/todo/backlog.md';

/** 廃止済みの進捗 SSOT。ファイルを再作成して参照を成立させてはならない（2026-06-11 廃止）。 */
const RETIRED = [
  { re: /\.claude\/state\/task-queue\.json/g, name: 'task-queue.json（2026-06-11 廃止）' },
  { re: /(?<![\w/.-])task-queue\.json/g, name: 'task-queue.json（2026-06-11 廃止）' },
  { re: new RegExp(['docs/project', 'TODO\\.md'].join('/'), 'g'), name: '旧 Project TODO ビュー' },
];

const ACTION_HEADING = /^#{2,4}\s+.*(次のアクション|次にやること|アクション)/;
const UNCHECKED = /^\s*[-*]\s+\[ \]\s+(.*)$/;
const ID_RE = /DN-\d{4}/g;

const toPosix = (v) => v.split(sep).join('/');

/**
 * その週の状態を記録するスナップショット文書か。
 * 週次レビューは「DN-XXXX 完了」を実績として書くが、この台帳は完了＝カード削除なので
 * ID は必ず消える。live 文書の参照切れ（読者を存在しないタスクへ案内する実害）とは別物。
 */
export const isDatedSnapshot = (rel) => rel.startsWith('docs/reviews/weekly/');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

/** 1 文書を検査して {errors, warnings} を返す（純関数・テストから使う）。 */
export function auditProjectDoc(rel, content, knownIds) {
  const errors = [];
  const warnings = [];
  const lines = content.split(/\r?\n/);

  for (const { re, name } of RETIRED) {
    for (const m of content.matchAll(re)) {
      const line = content.slice(0, m.index).split(/\r?\n/).length;
      errors.push({ rule: 'retired-ref', at: `${rel}:${line}`, msg: `廃止済み参照: ${name}` });
    }
  }
  const snapshot = isDatedSnapshot(rel);
  for (const id of new Set(content.match(ID_RE) ?? [])) {
    if (knownIds.has(id)) continue;
    const f = { rule: 'dangling-id', at: rel, msg: `${id} は backlog に存在しない` };
    // 日付つきスナップショットでは「完了してカードが消えた」が正常な経路なので warning。
    if (snapshot) warnings.push({ ...f, msg: f.msg + '（完了して削除された可能性・週次スナップショットなので warning）' });
    else errors.push(f);
  }

  // 「次のアクション」配下の未チェック項目に ID も criterion 注記も無い＝台帳へ出ていない疑い
  let inAction = false;
  lines.forEach((l, i) => {
    if (/^#{2,4}\s/.test(l)) inAction = ACTION_HEADING.test(l);
    if (!inAction) return;
    const m = l.match(UNCHECKED);
    if (!m) return;
    if (ID_RE.test(m[1])) { ID_RE.lastIndex = 0; return; }
    ID_RE.lastIndex = 0;
    if (/<!--\s*criterion\s*-->/.test(l)) return;
    warnings.push({
      rule: 'action-without-id',
      at: `${rel}:${i + 1}`,
      msg: `次のアクション配下の未チェック項目に ID が無い: ${m[1].slice(0, 50)}`,
    });
  });

  return { errors, warnings };
}

function main() {
  if (process.env.SKIP_PROJECT_TASK_REFS === '1') {
    console.log('[check-project-task-refs] SKIP_PROJECT_TASK_REFS=1 のためスキップ');
    process.exit(0);
  }
  const JSON_OUT = process.argv.includes('--json');

  const backlogPath = join(ROOT, BACKLOG);
  if (!existsSync(backlogPath)) {
    console.error(`✗ 検査不成立: ${BACKLOG} が無い（ID の実在を確かめられない）`);
    process.exit(2);
  }
  const knownIds = new Set(parseBacklog(readFileSync(backlogPath, 'utf8')).map((c) => c.id).filter(Boolean));
  if (knownIds.size === 0) {
    console.error('✗ 検査不成立: backlog から ID を 1 件も抽出できなかった');
    process.exit(2);
  }

  const files = walk(PROJECT_DIR);
  if (files.length === 0) {
    console.error('✗ 検査不成立: docs/ に恒久文書の .md が 1 件も無い');
    process.exit(2);
  }

  const errors = [];
  const warnings = [];
  let uncheckedTotal = 0;
  for (const abs of files) {
    const rel = `docs/${toPosix(relative(PROJECT_DIR, abs))}`;
    const content = readFileSync(abs, 'utf8');
    uncheckedTotal += (content.match(/^\s*[-*]\s+\[ \]\s/gm) ?? []).length;
    const r = auditProjectDoc(rel, content, knownIds);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }

  // 検査ゼロを PASS と呼ばない（§9）: 対象数と実検査数を必ず出す
  // --json のときは stdout を JSON だけにする（人間向けサマリは stderr へ）
  // 降格した dangling-id は黙って消さない。件数を必ず出す（降格が事故を隠す経路にならないように）。
  const snapshotDangling = warnings.filter((w) => w.rule === 'dangling-id').length;
  (JSON_OUT ? console.error : console.log)(
    `[check-project-task-refs] 文書 ${files.length} 件 / backlog ID ${knownIds.size} 件を実検査` +
      ` / error ${errors.length} / warning ${warnings.length}（未チェック記法 ${uncheckedTotal} 件は件数だけでは失敗にしない）` +
      (snapshotDangling ? `\n  うち週次スナップショットの参照切れ ${snapshotDangling} 件は warning へ降格（完了＝カード削除の正常経路）` : ''),
  );

  if (JSON_OUT) {
    writeSync(1, JSON.stringify({ files: files.length, ids: knownIds.size, errors, warnings, uncheckedTotal }, null, 2) + '\n');
    process.exit(errors.length ? 1 : 0);
  }

  for (const w of warnings.slice(0, 20)) console.log(`  [warn] ${w.at}  ${w.msg}`);
  if (warnings.length > 20) console.log(`  … 他 ${warnings.length - 20} 件の warning`);

  if (errors.length === 0) {
    console.log('[check-project-task-refs] ✓ live 文書の廃止参照 0・ID 参照切れ 0'
      + (snapshotDangling ? `（週次スナップショットの ${snapshotDangling} 件は上記のとおり warning）` : ''));
    process.exit(0);
  }
  for (const e of errors) console.error(`  [${e.rule}] ${e.at}  ${e.msg}`);
  console.error(
    '\n廃止済み経路はファイルを作り直して参照を成立させない。現行経路（.claude/todo/backlog.md）へ' +
      '書き換えるか、記述ごと削除する。参照切れ ID は backlog を確認してから直す。\n',
  );
  process.exit(1);
}

const isMain = process.argv[1] && process.argv[1].endsWith('check-project-task-refs.mjs');
if (isMain) main();
