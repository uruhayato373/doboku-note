/**
 * backlog 健全性 surfacer — 台帳が「台帳として使えるか」の候補を列挙する。
 *
 * **本スクリプトは判定しない**。鮮度・矛盾・重複候補は「古い＝不要」「似ている＝同一」を
 * 意味しないので、処分の判定は人／backlog-curator が行う。ここは決定論で拾える候補を出すだけ。
 * 非ブロッキング（常に exit 0）。ただし**カード 0 件は検査不成立として exit 2**（§9）。
 *
 * 機械（本スクリプト）＝候補の列挙 / LLM（backlog-curator + /backlog-sweep --audit）＝判定と適用。
 * check-doc-lifecycle.mjs → doc-curator と同じ分業。
 *
 * 出力:
 *   S1 種類別の内訳と未付与残（移行進捗メーター）
 *   S2 🟢/🟣 に居る不具合（tier が緊急度を表していない）
 *   S3 [種類:意思決定] なのに tier≠🟣（および逆）
 *   S4 [種類:定期] の存在＝backlog の役割違反（monthly/weekly か check-*-due へ）
 *   S5 [起票:] から N 日超（既定 90）／[起票:] 欠落
 *   S6 カテゴリ別名の残数（baseline の返済メーター）
 *   S7 sweep 到達不能率（executor 別 × [検証:] の有無＝陳腐化が永久に検出されない枚数）
 *   S8 重複候補ペア（本文が共有する固有トークンが k 個以上一致）
 *   S9 .claude/todo/ の 4 層以外のファイル（影のバックログ）
 *   S10 ID の再利用（一度消した DN-#### が別のタスクとして復活している）
 *
 * Usage:
 *   node scripts/check-backlog-health.mjs           人間向け
 *   node scripts/check-backlog-health.mjs --json    機械可読（backlog-curator への入力）
 *   node scripts/check-backlog-health.mjs --days 60 鮮度のしきい値
 *
 * 真実源: .claude/todo/backlog.md 冒頭の凡例
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, writeSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  parseBacklog,
  KINDS,
  SELF_EXECUTABLE,
  CANONICAL_CATEGORIES,
  TODO_LAYER_FILES,
} from './lib/backlog-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TODO_LAYERS = new Set(TODO_LAYER_FILES);

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const DUE = argv.includes('--due');
const RECORD = argv.includes('--record-audit');
const AUDIT_LOG = '.claude/state/backlog/audit-log.json';
const DAYS = (() => {
  const i = argv.indexOf('--days');
  const n = i >= 0 ? Number(argv[i + 1]) : NaN;
  return Number.isFinite(n) ? n : 90;
})();

/**
 * 本文から「固有トークン」を抜く。スクリプト名・パス・noteId・npm script 名だけを採り、
 * 裸の数値は採らない（年・価格・件数は別作業でも普通に一致するのでペアがノイズになる。
 * 2026-08-18 の初回実行で「2026 / 980 / 800」の一致だけで無関係な 2 枚が候補に出た）。
 */
export function signatureTokens(body) {
  const out = new Set();
  for (const m of body.matchAll(/[a-z0-9-]+\.(?:mjs|ts|json)|[a-z][a-z0-9-]*\/[a-z0-9-]+|\bn[0-9a-f]{12}\b|\bmbe?[0-9a-f]{10,}\b/gi)) {
    out.add(m[0]);
  }
  return out;
}

export function duplicateCandidates(cards, minShared = 4) {
  const sigs = cards.map((c) => ({ c, s: signatureTokens(c.body) }));
  const pairs = [];
  for (let i = 0; i < sigs.length; i += 1) {
    for (let j = i + 1; j < sigs.length; j += 1) {
      const shared = [...sigs[i].s].filter((t) => sigs[j].s.has(t));
      if (shared.length >= minShared) {
        pairs.push({ a: sigs[i].c, b: sigs[j].c, shared });
      }
    }
  }
  return pairs.sort((x, y) => y.shared.length - x.shared.length);
}

const daysSince = (iso) => {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(ms) ? Math.floor((Date.now() - ms) / 86400000) : null;
};

// import 時に CLI を走らせない（テストから signatureTokens / duplicateCandidates を使うため）。
// ガードが無いと、この下の process.exit がテスト実行そのものを殺す。
const isMain = process.argv[1] && process.argv[1].endsWith('check-backlog-health.mjs');
// 呼び出しはファイル末尾（この下の const 群が TDZ で未初期化のため、ここで呼ぶと落ちる）。

/**
 * /backlog-sweep --audit の起動条件。backlog-sweep/SKILL.md に散文で書いてあった条件を
 * そのままコードにしたもの（**散文のままでは誰も判定しない**＝人の記憶に依存する）。
 * しきい値を変えるときは SKILL の「起動条件」節と同時に直す。
 */
const DUE_RULES = [
  { id: 'S2', why: '🟢/🟣 に沈んだ不具合', hit: (r) => r.sunkDefects.length >= 1 },
  { id: 'S4', why: '定期（backlog の役割違反）', hit: (r) => r.recurring.length >= 1 },
  { id: 'S5', why: `起票から ${DAYS} 日超が 15 件以上`, hit: (r) => r.stale.length >= 15 },
  { id: 'S6', why: '語彙外カテゴリ 10 件以上', hit: (r) => r.aliasCategories >= 10 },
  { id: 'S8', why: '重複候補 3 ペア以上', hit: (r) => r.duplicateTotal >= 3 },
  { id: 'S9', why: '.claude/todo に 4 層以外のファイル', hit: (r) => r.strayTodoFiles.length >= 1 },
  { id: 'S10', why: 'ID の再利用（過去の参照が別タスクを指す）', hit: (r) => (r.reusedIds ?? []).length >= 1 },
];

/** JST の YYYY-MM-DD（UTC 実行で前日付になる事故を避ける・check-jst-date と同じ規律）。 */
function jstToday() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function readAuditLog() {
  const p = join(ROOT, AUDIT_LOG);
  if (!existsSync(p)) return { version: 1, runs: [] };
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return { version: 1, runs: [] };
  }
}

/** 月初（7 日まで）で、その月にまだ棚卸しを記録していないか。 */
function monthlyDue(log, today) {
  if (Number(today.slice(8, 10)) > 7) return false;
  return !log.runs.some((r) => String(r.date).slice(0, 7) === today.slice(0, 7));
}

function recordAudit(cards) {
  const p = join(ROOT, AUDIT_LOG);
  mkdirSync(dirname(p), { recursive: true });
  const log = readAuditLog();
  const date = jstToday();
  log.runs = [...log.runs.filter((r) => r.date !== date), { date, cards }].slice(-24);
  writeFileSync(p, JSON.stringify(log, null, 2) + '\n');
  console.log(`[check-backlog-health] 棚卸しを記録: ${date}（カード ${cards} 件）→ ${AUDIT_LOG}`);
}

/**
 * 一度削除された ID が、あとから**別のタスク**として復活していないかを履歴から拾う。
 *
 * 完了カードはセクションごと削除する運用なので ID は歯抜けになる。そこへ新しいカードが
 * 空き番を拾うと、**過去のコミットメッセージ・plan・レビューが指す DN-#### が別物になる**
 * （2026-08-20 に DN-0096 と DN-0097 で実際に発生。同日に 2 件）。
 *
 * 判定は「その commit で **正味** 消えた ID」→「あとの commit で **正味** 追加された ID」の順序。
 * tier セクション間の移動は同一 commit 内で削除＋追加になるので、commit 単位の差集合で除く。
 * backlog.md は docs/todo → .claude/todo へ移設したので両方のパスを渡す。
 */
export function detectReuse(raw) {
  const out = [];
  const removedAt = new Map(); // id -> 消えた commit
  let sha = null, added = new Set(), removed = new Set();
  const flush = () => {
    if (!sha) return;
    for (const id of removed) if (!added.has(id)) removedAt.set(id, sha);
    for (const id of added) {
      if (removed.has(id)) continue;
      if (removedAt.has(id)) { out.push({ id, removedAt: removedAt.get(id), readdedAt: sha }); removedAt.delete(id); }
    }
    added = new Set(); removed = new Set();
  };
  for (const l of raw.split(/\r?\n/)) {
    if (l.startsWith('COMMIT ')) { flush(); sha = l.slice(7).trim(); continue; }
    const m = l.match(/^([+-])### \[(DN-\d+)\]/);
    if (!m) continue;
    (m[1] === '+' ? added : removed).add(m[2]);
  }
  flush();
  return out;
}

function main() {
const backlogPath = join(ROOT, '.claude/todo/backlog.md');
if (!existsSync(backlogPath)) {
  console.error('✗ 検査不成立: .claude/todo/backlog.md が無い');
  process.exit(2);
}
const cards = parseBacklog(readFileSync(backlogPath, 'utf8'));
if (!cards.length) {
  console.error('✗ 検査不成立: カードを 1 件も抽出できなかった（パース契約の破損を疑う）');
  process.exit(2);
}

const kindCount = cards.reduce((a, c) => ((a[c.kind ?? '未分類'] = (a[c.kind ?? '未分類'] ?? 0) + 1), a), {});
const defects = cards.filter((c) => c.kind === '不具合');
const sunkDefects = defects.filter((c) => c.tier === 'low' || c.tier === 'hold');
const decisionMisplaced = cards.filter((c) => c.kind === '意思決定' && c.tier !== 'hold');
const holdWithoutDecision = cards.filter((c) => c.tier === 'hold' && c.kind && c.kind !== '意思決定');
const recurring = cards.filter((c) => c.kind === '定期');
// [起票:] は手入力なので 91 枚中 61 枚が欠落しており、S5（起票 90 日超）が構造的に発火しない
// （2026-08-18 実測）。タグの欠落を「新しい」と読み替えるのは検査ゼロを PASS と呼ぶのと同じなので、
// **git が既に知っている情報で補う**。blame の author-time は厳密には「起票日」ではなく
// 「その行が最後に変わった日」だが、鮮度の判定にはむしろこちらが適切
// （半年前に書かれても先週書き直したカードは古くない）。タグがあればタグを優先する。
function blameDays() {
  const out = new Map(); // line(1-based) -> 経過日数
  // **必ず時間で打ち切る**。このリポジトリは partial clone（blob:none）なので、
  // 大量の同期直後などキャッシュがコールドだと blame が各リビジョンの blob をリモートへ
  // 取りに行き、20 秒経っても返らないことがある（2026-08-18 実測。34 コミット同期直後に発生し、
  // surfacer が無出力のままハング＝常に exit 0 の設計と相まって「異常なし」と見分けがつかなかった）。
  // ウォーム時は約 1 秒で終わるので、上限は「コールドでも大抵は間に合う」30 秒に置く。
  // 打ち切ったらタグのある分だけで判定し、**補完できなかったことを出力に明示する**（黙って劣化させない・§9）。
  try {
    const raw = execFileSync("git", ["blame", "--line-porcelain", "--", '.claude/todo/backlog.md'], {
      cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 30_000,
    });
    let ln = 0;
    for (const l of raw.split(/\r?\n/)) {
      if (l.startsWith("author-time ")) {
        ln += 1;
        out.set(ln, Math.floor((Date.now() / 1000 - Number(l.slice(12))) / 86400));
      }
    }
  } catch {
    // git が無い／遅すぎる環境では補完しない（タグのある分だけで判定する）
    out.degraded = true;
  }
  return out;
}
function reusedIds() {
  try {
    const raw = execFileSync(
      'git',
      ['log', '--reverse', '-p', '--format=COMMIT %H', '--', '.claude/todo/backlog.md', 'docs/todo/backlog.md'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 30_000 },
    );
    return detectReuse(raw);
  } catch {
    const out = [];
    out.degraded = true; // git が無い / 遅い環境では判定しない（黙って緑にしない・§9）
    return out;
  }
}

const blameAge = blameDays();
/** カードの経過日数。[起票:] があればそれ、無ければ blame（最終更新）で代替する。 */
const ageOf = (c) => (c.filed ? daysSince(c.filed) : blameAge.get(c.line)) ?? null;

const stale = cards
  .map((c) => ({ ...c, age: ageOf(c), ageFrom: c.filed ? "起票" : "blame" }))
  .filter((c) => c.age != null && c.age > DAYS)
  .sort((a, b) => b.age - a.age);
const noFiled = cards.filter((c) => !c.filed);
const aliasCats = cards.flatMap((c) =>
  [c.category, ...(c.extraCategories ?? [])].filter((x) => x && x !== '未分類' && !CANONICAL_CATEGORIES.includes(x)),
);
const unreachable = cards.filter((c) => c.tier !== 'hold' && (!c.executor || !SELF_EXECUTABLE.has(c.executor)));
const unreachableNoVerify = unreachable.filter((c) => !c.verify);
const dups = duplicateCandidates(cards);
const strayTodo = existsSync(join(ROOT, '.claude/todo'))
  ? readdirSync(join(ROOT, '.claude/todo')).filter((f) => f.endsWith('.md') && !TODO_LAYERS.has(f))
  : [];

const reuse = reusedIds();
const liveIds = new Set(cards.map((c) => c.id).filter(Boolean));
const reusedLive = reuse.filter((r) => liveIds.has(r.id));

const report = {
  cards: cards.length,
  kindCount,
  kindMissing: cards.filter((c) => !c.kind).length,
  sunkDefects: sunkDefects.map((c) => ({ line: c.line, tier: c.tier, title: c.title })),
  decisionMisplaced: decisionMisplaced.map((c) => ({ line: c.line, tier: c.tier, title: c.title })),
  holdWithoutDecision: holdWithoutDecision.map((c) => ({ line: c.line, kind: c.kind, title: c.title })),
  recurring: recurring.map((c) => ({ line: c.line, title: c.title })),
  staleOver: DAYS,
  stale: stale.map((c) => ({ line: c.line, age: c.age, title: c.title })),
  noFiled: noFiled.length,
  aliasCategories: aliasCats.length,
  unreachableTotal: unreachable.length,
  unreachableNoVerify: unreachableNoVerify.length,
  duplicateTotal: dups.length,
  duplicateCandidates: dups.slice(0, 10).map((p) => ({
    a: { line: p.a.line, title: p.a.title },
    b: { line: p.b.line, title: p.b.title },
    shared: p.shared.slice(0, 6),
  })),
  strayTodoFiles: strayTodo,
  reusedIds: reuse.degraded ? null : reusedLive.map((r) => ({ id: r.id, removedAt: r.removedAt, readdedAt: r.readdedAt })),
};

if (RECORD) {
  recordAudit(cards.length);
  process.exit(0);
}

if (DUE) {
  // SessionStart フックから呼ばれる。**回すべきときだけ喋る**（毎回出すと読まれなくなる）。
  const log = readAuditLog();
  const today = jstToday();
  const hits = DUE_RULES.filter((r) => r.hit(report));
  const monthly = monthlyDue(log, today);
  if (!hits.length && !monthly) process.exit(0);

  const last = log.runs.at(-1);
  console.log('');
  console.log('─── backlog 棚卸しの期限 ───────────────────────');
  if (monthly) console.log(`  月初の棚卸しが未実施（前回: ${last ? last.date : '記録なし'}）`);
  for (const h of hits) console.log(`  ${h.id} ${h.why}`);
  console.log(`  → /backlog-sweep --audit（カード ${cards.length} 件・詳細は npm run check-backlog-health）`);
  console.log('────────────────────────────────────────────────');
  console.log('');
  process.exit(0);
}

if (JSON_OUT) {
  writeSync(1, JSON.stringify(report, null, 2) + '\n');
  process.exit(0);
}

const line = (label, n, extra = '') => console.log(`  ${label}: ${n}${extra}`);
console.log(`[check-backlog-health] カード ${cards.length} 件を実検査（判定はしない・候補の列挙のみ）`);
line('S1 種類の内訳', Object.entries(kindCount).map(([k, v]) => `${k}:${v}`).join(' '));
if (report.kindMissing) console.log(`      種類 未付与 ${report.kindMissing} 件`);
line('S2 🟢/🟣 に沈んだ不具合', `${sunkDefects.length} / 不具合 ${defects.length}`);
for (const c of sunkDefects) console.log(`      L${c.line} [${c.tier}] ${c.title}`);
line('S3 意思決定なのに tier≠🟣', decisionMisplaced.length);
for (const c of decisionMisplaced.slice(0, 8)) console.log(`      L${c.line} [${c.tier}] ${c.title}`);
if (holdWithoutDecision.length) line('   🟣 なのに意思決定でない', holdWithoutDecision.length);
line('S4 定期（backlog の役割違反）', recurring.length);
for (const c of recurring) console.log(`      L${c.line} ${c.title}`);
line(`S5 起票から ${DAYS} 日超`, `${stale.length}（[起票:] 欠落 ${noFiled.length}${blameAge.degraded ? '・blame 補完なし' : ''}）`);
if (blameAge.degraded) console.log(`      ※ git blame が 30 秒で完了せず鮮度を補完できていない（[起票:] のある ${cards.length - noFiled.length} 枚だけで判定）`);
for (const c of stale.slice(0, 8)) console.log(`      L${c.line} ${c.age}日 ${c.title}`);
line('S6 語彙外カテゴリの残', aliasCats.length);
line('S7 sweep 到達不能', `${unreachable.length} / ${cards.length}（うち [検証:] 無し ${unreachableNoVerify.length}＝陳腐化が永久に検出されない）`);
line('S8 重複候補ペア', dups.length);
for (const p of dups.slice(0, 5)) console.log(`      L${p.a.line} ↔ L${p.b.line}  共有: ${p.shared.slice(0, 4).join(' ')}`);
line('S9 .claude/todo の 4 層以外', strayTodo.length ? strayTodo.join(' ') : '0');
line('S10 ID の再利用（現役カード）', reuse.degraded ? '判定不能（git 履歴を読めない）' : reusedLive.length);
for (const r of reusedLive.slice(0, 8)) {
  console.log(`      ${r.id}  削除 ${r.removedAt.slice(0, 9)} → 別タスクとして再登場 ${r.readdedAt.slice(0, 9)}`);
}
console.log('\n判定と適用は /backlog-sweep --audit（backlog-curator）が行う。ここは候補の列挙のみ。');
process.exit(0);
}

// import 時は純関数だけを提供し、CLI 実行のときだけ走らせる。
if (isMain) main();
