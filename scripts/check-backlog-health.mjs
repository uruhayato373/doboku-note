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
 *   S7 検証ゲート欠落（不具合/改善なのに [検証:] が無い＝完了を機械で判定できない枚数。
 *      旧「sweep 到達不能率」は [実行:] 軸の廃止〔2026-08-26〕で概念ごと消滅し再定義）
 *   S8 重複候補ペア（本文が共有する固有トークンが k 個以上一致）
 *   S9 .claude/todo/ の 4 層以外のファイル（影のバックログ）
 *   S10 ID の再利用（一度消した DN-#### が別のタスクとして復活している）
 *   S11 実績コミット後にカード本文が未更新（DN-#### を件名に含む直近コミットより
 *       カード全体の最終編集の方が古い＝作業はコミット済みなのに「残」が追随していない）
 *   S12 完了 prose の蓄積（本文に「済み」「完了し」等の完了報告表現が閾値以上＝TRIM 候補）
 *   S13 チャネル状態複製の疑い（noteStatus/status/published の値や「残N本」がカードに写されている＝
 *       SSOT が真実源のはずが本文へ複製され、後で陳腐化する候補。todo-standards.md §1-2 の対象）
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
 * リポジトリのどこにでも出てくる置き場の入口。**2 セグメントで終わるならカードの固有性を
 * 何も語らない**ので署名から外す（`src/lib` は 100 枚近いカードが書く）。
 * 3 セグメント以上・拡張子つきは残す＝そこまで具体なら偶然一致しない。
 */
const GENERIC_ROOTS = new Set([
  'claude', 'docs', 'src', 'content', 'scripts', 'tools', 'public', 'tests',
  'state', 'config', 'skills', 'agents', 'knowledge', 'todo', 'plans', 'lib',
  'app', 'components', 'note', 'site', 'sns', 'query', 'page',
]);

/**
 * 本文から「固有トークン」を抜く。スクリプト名・パス・noteId・npm script 名だけを採り、
 * 裸の数値は採らない（年・価格・件数は別作業でも普通に一致するのでペアがノイズになる。
 * 2026-08-18 の初回実行で「2026 / 980 / 800」の一致だけで無関係な 2 枚が候補に出た）。
 *
 * 2026-08-25: 同じ理由で**一般的な置き場の入口**（`src/lib` `claude/state` `docs/strategy`
 * `query/page` …）も外した。これだけで DN-0106↔DN-0107（GSC の取得課題 ↔ index coverage の
 * 回復プログラム）や、法人向け再包装 ↔ PWA 買い切り導線という
 * **中身が全く違う 2 ペア**が候補に居座り、S8 が 0 にならない状態が続いていた。
 */
export function signatureTokens(body) {
  const out = new Set();
  for (const m of body.matchAll(/[a-z0-9-]+\.(?:mjs|ts|json)|[a-z][a-z0-9-]*\/[a-z0-9-]+|\bn[0-9a-f]{12}\b|\bmbe?[0-9a-f]{10,}\b/gi)) {
    const t = m[0];
    // `a/b` の形で a が一般ルート、かつ拡張子を持たない＝置き場の入口だけ。署名にしない。
    const seg = t.split('/');
    if (seg.length === 2 && GENERIC_ROOTS.has(seg[0].toLowerCase()) && !/\.[a-z]+$/i.test(t)) continue;
    out.add(t);
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
  { id: 'S11', why: '実績コミット後にカード本文が未更新', hit: (r) => (r.staleAfterCommitTotal ?? 0) >= 2 },
  { id: 'S12', why: '完了 prose 蓄積（TRIM 候補）3 件以上', hit: (r) => (r.completionProseHeavy?.length ?? 0) >= 3 },
  { id: 'S13', why: 'チャネル状態複製の疑い 3 件以上', hit: (r) => (r.ssotDuplicationSuspects?.length ?? 0) >= 3 },
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

/**
 * `git log --format=%ct\t%s` の生テキスト → DN-#### ごとの最新コミット unix 秒。
 * commit 件名の DN-#### は必ずしも backlog.md に触れるとは限らない（scripts/*.mjs の
 * 実装 commit がそう）ので、対象は全 commit（backlog.md への差分に限らない）。
 */
export function parseCommitTimesByCardId(raw) {
  const out = new Map();
  for (const l of raw.split('\n')) {
    const tab = l.indexOf('\t');
    if (tab < 0) continue;
    const ct = Number(l.slice(0, tab));
    const ids = l.slice(tab + 1).match(/DN-\d{4}/g);
    if (!ids || !Number.isFinite(ct)) continue;
    for (const id of new Set(ids)) {
      if (!out.has(id) || out.get(id) < ct) out.set(id, ct);
    }
  }
  return out;
}

/** カード全体（見出し行〜本文末）で最も新しい blame の unix 秒（=最大値）。1 行も拾えなければ null。 */
function cardLastTouchedSec(c, blameSec) {
  let max = null;
  for (let ln = c.startLine; ln <= c.endLine; ln += 1) {
    const s = blameSec.get(ln);
    if (s != null && (max == null || s > max)) max = s;
  }
  return max;
}

/**
 * DN-#### を件名に含む直近コミットと、そのカード本文の突き合わせ（2026-08-26）。
 * DN-0093 で「claim/release/complete の共通 CLI を実装する」commit が push されたのに、
 * カードの「残」欄は旧内容（未実装）のまま残り続けていた実例の再発防止。
 *
 * 秒単位で比較する（日単位だと同日内の「実装commit→カード未更新」が判定できない。
 * 2026-08-26 実測: DN-0093 は同日午前中に実装commitがあったが日単位比較では検出できなかった）。
 * bufferSec は同一commit内での blame/commit-time の秒単位の順序ゆれ（ほぼ同時編集）を
 * ノイズとして除くための猶予（既定 1 時間）。
 */
export function computeStaleAfterCommit(cards, commitTimeById, blameSec, bufferSec = 3600) {
  return cards
    .filter((c) => c.id && commitTimeById.has(c.id))
    .map((c) => ({ card: c, commitSec: commitTimeById.get(c.id), cardSec: cardLastTouchedSec(c, blameSec) }))
    // カード最終編集がコミットより buffer 以上前＝実績はコミット済みなのに本文が追随していない
    .filter((x) => x.cardSec != null && x.commitSec - x.cardSec > bufferSec)
    .map((x) => ({ line: x.card.line, id: x.card.id, title: x.card.title, hoursBehind: Math.round((x.commitSec - x.cardSec) / 3600) }))
    .sort((a, b) => b.hoursBehind - a.hoursBehind);
}

/**
 * 完了 prose の蓄積（2026-08-26）。check-backlog-schema.mjs の DONE_PATTERNS は staged 新規行の
 * ハードブロックだが、既存カードが少しずつ「〜済み」を積み増して膨らむ形は staged 検査を
 * すり抜ける（1 行ずつは違反にならない）。閾値以上ならタイトルと実態が乖離した TRIM 候補として拾う。
 */
const COMPLETION_PROSE_RE = /済み|完了し/g;
export function computeCompletionProseHeavy(cards, threshold = 5) {
  return cards
    .map((c) => ({ line: c.line, title: c.title, count: (c.body.match(COMPLETION_PROSE_RE) || []).length }))
    .filter((c) => c.count >= threshold)
    .sort((a, b) => b.count - a.count);
}

/**
 * チャネル状態複製の疑い（2026-08-27・todo-standards.md §1-2）。
 * backlog カードへ noteStatus / status / published の値や「残N本」を書くと、SSOT（frontmatter /
 * catalog.json / posted.json / *-services.ts 等）の実際の値が変わってもカードは追随せず陳腐化する
 * （実例: DN-0031 は brain-products.ts が listed に変わった後もカードは「審査待ち」を配り続けた）。
 * コードフェンス内は実装スニペットの引用でありカードの主張ではないため対象外にする。
 */
const SSOT_DUP_PATTERNS = [
  /noteStatus:\s*(published|draft|reserved)/g,
  /status:\s*['"]?(listed|paused|draft|in_review|live|ready|submitted|rejected|full)['"]?/g,
  /published:\s*(true|false)/g,
  /残\s*\d+\s*(本|件|冊|枚)/g,
];
function stripCodeFences(body) {
  return body.replace(/```[\s\S]*?```/g, '');
}
export function computeSsotDuplicationSuspects(cards, threshold = 2) {
  return cards
    .map((c) => {
      const text = stripCodeFences(c.body);
      const samples = [];
      let count = 0;
      for (const re of SSOT_DUP_PATTERNS) {
        const m = text.match(re) || [];
        count += m.length;
        for (const s of m) if (samples.length < 2) samples.push(s);
      }
      return { line: c.line, title: c.title, count, samples };
    })
    .filter((c) => c.count >= threshold)
    .sort((a, b) => b.count - a.count);
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
/**
 * 履歴が切り詰められているか。2026-08-22 に単一 commit へ切り詰めたので、
 * blame も `git log -p` も「全部その 1 commit」を返す。
 * それを黙って使うと **全カードが今日更新・ID 再利用 0 件** という嘘の緑になる（§9）。
 */
function historyTruncated() {
  try {
    const n = Number(execFileSync("git", ["rev-list", "--count", "HEAD"], {
      cwd: ROOT, encoding: "utf8", timeout: 10_000, maxBuffer: 1024 * 1024,
    }).trim() || "0");
    return n < 50;
  } catch {
    return true; // 数えられないなら信用しない
  }
}
const HISTORY_TRUNCATED = historyTruncated();

/**
 * line(1-based) -> author-time の unix 秒。git blame は 1 回しか呼ばない
 * （S5 の日単位 blameAge と S11 の秒単位比較の両方をこの 1 回の結果から作る）。
 */
function blameSeconds() {
  const out = new Map();
  if (HISTORY_TRUNCATED) { out.degraded = true; return out; }
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
        out.set(ln, Number(l.slice(12)));
      }
    }
  } catch {
    // git が無い／遅すぎる環境では補完しない（タグのある分だけで判定する）
    out.degraded = true;
  }
  return out;
}
/** S5 用：line -> 経過日数（日単位）。blameSeconds() から導出する。 */
function daysFromSeconds(secMap) {
  const out = new Map();
  if (secMap.degraded) { out.degraded = true; return out; }
  const nowSec = Date.now() / 1000;
  for (const [ln, sec] of secMap) out.set(ln, Math.floor((nowSec - sec) / 86400));
  return out;
}
function reusedIds() {
  if (HISTORY_TRUNCATED) { const o = []; o.degraded = true; return o; }
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

const blameSec = blameSeconds();
const blameAge = daysFromSeconds(blameSec);
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
// S7: [検証:] 欠落。旧 S7「sweep 到達不能」は [実行:] 軸廃止（2026-08-26）で概念ごと消滅した
// （全カードが選定対象になったため）。残る有用シグナル＝「完了を機械で判定できないカード」だけを出す。
// `[検証:]` を**期待してよいのは 不具合 / 改善 だけ**。制作は「成果物が在ること」、意思決定は
// 「決まったこと」で完了するので、赤→緑になる npm script を指しようがない（無理に付けると
// 常時緑の token が増えて、DN-0129 ① で 5 枚から外したのと同じ状態へ戻る）。
const noVerify = cards.filter((c) => c.tier !== 'hold' && !c.verify);
const GATEABLE_KINDS = new Set(['不具合', '改善']);
const noVerifyGateable = noVerify.filter((c) => GATEABLE_KINDS.has(c.kind));
const noVerifyInherent = noVerify.filter((c) => !GATEABLE_KINDS.has(c.kind));
const dups = duplicateCandidates(cards);
const strayTodo = existsSync(join(ROOT, '.claude/todo'))
  ? readdirSync(join(ROOT, '.claude/todo')).filter((f) => f.endsWith('.md') && !TODO_LAYERS.has(f))
  : [];

const reuse = reusedIds();
const liveIds = new Set(cards.map((c) => c.id).filter(Boolean));
const reusedLive = reuse.filter((r) => liveIds.has(r.id));

function commitTimeByCardId() {
  if (HISTORY_TRUNCATED) { const o = new Map(); o.degraded = true; return o; }
  try {
    const raw = execFileSync('git', ['log', '--format=%ct\t%s', '-n', '200'], {
      cwd: ROOT, encoding: 'utf8', timeout: 15_000, maxBuffer: 16 * 1024 * 1024,
    });
    return parseCommitTimesByCardId(raw);
  } catch {
    const o = new Map(); o.degraded = true; return o;
  }
}
const commitTimeById = commitTimeByCardId();
const s11Degraded = Boolean(blameSec.degraded) || Boolean(commitTimeById.degraded);
const staleAfterCommit = s11Degraded ? [] : computeStaleAfterCommit(cards, commitTimeById, blameSec);
const proseHeavy = computeCompletionProseHeavy(cards);
const ssotSuspects = computeSsotDuplicationSuspects(cards);

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
  noVerifyTotal: noVerify.length,
  noVerifyGateable: noVerifyGateable.map((c) => ({ line: c.line, kind: c.kind, title: c.title })),
  noVerifyInherent: noVerifyInherent.length,
  duplicateTotal: dups.length,
  duplicateCandidates: dups.slice(0, 10).map((p) => ({
    a: { line: p.a.line, title: p.a.title },
    b: { line: p.b.line, title: p.b.title },
    shared: p.shared.slice(0, 6),
  })),
  strayTodoFiles: strayTodo,
  reusedIds: reuse.degraded ? null : reusedLive.map((r) => ({ id: r.id, removedAt: r.removedAt, readdedAt: r.readdedAt })),
  staleAfterCommitTotal: s11Degraded ? null : staleAfterCommit.length,
  staleAfterCommit,
  completionProseHeavy: proseHeavy,
  ssotDuplicationSuspects: ssotSuspects,
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
if (blameAge.degraded) console.log(HISTORY_TRUNCATED
  ? `      ※ git 履歴が切り詰められているため blame で鮮度を補完できない（[起票:] のある ${cards.length - noFiled.length} 枚だけで判定）`
  : `      ※ git blame が 30 秒で完了せず鮮度を補完できていない（[起票:] のある ${cards.length - noFiled.length} 枚だけで判定）`);
for (const c of stale.slice(0, 8)) console.log(`      L${c.line} ${c.age}日 ${c.title}`);
line('S6 語彙外カテゴリの残', aliasCats.length);
// **0 にする対象ではない**（backlog.md「[検証:] を付けない判断」）。付けられる script が
// 実在するカードだけを名指しして、探す手間を省くための数として出す。
line('S7 検証ゲート欠落', `${noVerify.length} / ${cards.length}`
  + `（不具合/改善 ${noVerifyGateable.length}〔gate が実在するなら付ける〕`
  + ` ＋ 制作/意思決定 ${noVerifyInherent.length}〔原則付かない〕）`);
for (const c of noVerifyGateable.slice(0, 8)) {
  console.log(`      候補: L${c.line} ${c.kind} ${c.title.slice(0, 52)}`);
}
if (noVerifyGateable.length > 8) console.log(`      …ほか ${noVerifyGateable.length - 8} 件`);
line('S8 重複候補ペア', dups.length);
for (const p of dups.slice(0, 5)) console.log(`      L${p.a.line} ↔ L${p.b.line}  共有: ${p.shared.slice(0, 4).join(' ')}`);
line('S9 .claude/todo の 4 層以外', strayTodo.length ? strayTodo.join(' ') : '0');
line('S10 ID の再利用（現役カード）', reuse.degraded ? (HISTORY_TRUNCATED ? '判定不能（git 履歴が切り詰められている）' : '判定不能（git 履歴を読めない）') : reusedLive.length);
for (const r of reusedLive.slice(0, 8)) {
  console.log(`      ${r.id}  削除 ${r.removedAt.slice(0, 9)} → 別タスクとして再登場 ${r.readdedAt.slice(0, 9)}`);
}
line('S11 実績コミット後に本文未更新', s11Degraded ? (HISTORY_TRUNCATED ? '判定不能（git 履歴が切り詰められている）' : '判定不能（blame/log を読めない）') : staleAfterCommit.length);
for (const c of staleAfterCommit.slice(0, 8)) console.log(`      L${c.line} ${c.id} ${Math.round(c.hoursBehind / 24 * 10) / 10}日遅れ ${c.title}`);
line('S12 完了 prose 蓄積（TRIM 候補・本文 5 件以上）', proseHeavy.length);
for (const c of proseHeavy.slice(0, 8)) console.log(`      L${c.line} ${c.count}件 ${c.title}`);
line('S13 チャネル状態複製の疑い（SSOT が真実源・カードから剥がす候補）', ssotSuspects.length);
for (const c of ssotSuspects.slice(0, 8)) console.log(`      L${c.line} ${c.count}件 ${c.title}`);
console.log('\n判定と適用は /backlog-sweep --audit（backlog-curator）が行う。ここは候補の列挙のみ。');
process.exit(0);
}

// import 時は純関数だけを提供し、CLI 実行のときだけ走らせる。
if (isMain) main();
