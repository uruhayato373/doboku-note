#!/usr/bin/env node
/**
 * todo-add.mjs — backlog へカードを 1 枚起票し、origin/develop へ直接積む（作業ツリー・ブランチに触れない）。
 *
 * なぜ要るか: 「その場で直さない不具合は同じセッションで起票する」（CLAUDE.md §12）は、手で採番・タグ付け・
 * 見出しへの差し込み・commit をするので摩擦が大きく、忘れられる。共有 checkout で commit すると、別セッションが
 * 切り替えたブランチへ載る事故も起きた（2026-10-07 の DN-0567）。ここでは 1 コマンドで次をまとめる:
 *   採番（backlog の全ブランチの履歴から最大＋1）→ カードの組み立て → 重要度の見出しの先頭へ差し込み →
 *   check-backlog-schema と同じ検査 → origin/develop へ commit・push（lib/git-direct-commit.mjs）
 *
 * Usage:
 *   npm run todo:add -- --title "…" --tier 高|中|低|判断待ち --kind 不具合|改善|意思決定|制作 --domain 商品 \
 *     --body-file .tmp/card.md [--category 収益化] [--when 2026-10[..2026-11]] [--due 2026-10-12] [--verify <npm script>]
 *     [--trailer "Co-Authored-By: …"] [--commit]
 *   --body "…" でも可（起点・やること・完了条件を書く）。--commit が無ければ組み立てたカードを表示するだけ。
 *   最後の行に起票した ID だけを出す（報告にそのまま書く）。手元の checkout へは git pull で取り込む。
 * exit: 0 成功 / 1 検査違反・push 失敗 / 2 引数不正
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANONICAL_CATEGORIES, KINDS, TIER, findOrphanHeadings, parseBacklog } from './lib/backlog-lib.mjs';
import { backlogGitLog, nextId } from './backlog-edit.mjs';
import { validateCards } from './check-backlog-schema.mjs';
import { loadDomains } from './lib/domains.mjs';
import { commitFileToRemoteBranch } from './lib/git-direct-commit.mjs';
import { todayJst } from './lib/jst-date.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKLOG = '.claude/todo/backlog.md';
const BASELINE = '.claude/config/backlog-vocab-baseline.json';

const TIER_ALIASES = { 高: '🔴', high: '🔴', '🔴': '🔴', 中: '🟡', mid: '🟡', '🟡': '🟡', 低: '🟢', low: '🟢', '🟢': '🟢', 判断待ち: '🟣', hold: '🟣', '🟣': '🟣' };

/** 重要度の指定を絵文字へ。不明なら null。 */
export function resolveTier(raw) {
  return TIER_ALIASES[String(raw ?? '').trim()] ?? null;
}

/**
 * 起票前の注意（止めはしない）。不具合を 🟢・🟣 に置くと check-backlog-health の S2（沈んだ不具合）に出る
 * （2026-10-07 に DN-0568・DN-0569 を 🟢 へ起票し、同日に 🟡 へ上げ直した）。
 */
export function filingWarnings({ kind, tierEmoji }) {
  const out = [];
  if (kind === '不具合' && (tierEmoji === '🟢' || tierEmoji === '🟣')) {
    out.push('不具合を 🟢/🟣 に置くと check-backlog-health の S2（沈んだ不具合）に出る。今も壊れているなら --tier 中 以上（[時期:] は自動で付く）、壊れていないなら --kind 改善 にする');
  }
  return out;
}

/** カードの Markdown（行の配列）を組み立てる。値の検査は validateNewCard が行う。 */
export function buildCard({ id, title, kind, domain, category, when, due, verify, today, body }) {
  const tags = [category && `[${category}]`, `[領域:${domain}]`, when && `[時期:${when}]`, `[種類:${kind}]`, verify && `[検証:${verify}]`, `[起票:${today}]`, due && `[期日:${due}]`].filter(Boolean);
  return [`### [${id}] ${title}`, `タグ: ${tags.join(' ')}`, '', ...String(body).replace(/\r\n/g, '\n').trim().split('\n')];
}

/** 重要度の見出しの直後へカードを差し込む。見出しが無ければ throw。改行コードは元の文書に合わせる。 */
export function insertCard(text, tierEmoji, cardLines) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(eol);
  const h = lines.findIndex((l) => l.startsWith('## ') && l.includes(tierEmoji));
  if (h < 0) throw new Error(`${BACKLOG} に「## ${tierEmoji}」の見出しが無い`);
  lines.splice(h + 1, 0, '', ...cardLines, '');
  return lines.join(eol);
}

/**
 * 差し込んだ後の文書で、新しいカードが check-backlog-schema の規則に合うか・構造を壊していないかを見る。
 * @returns {string[]} 違反（空なら合格）
 */
export function validateNewCard(before, after, id, tierEmoji, opts) {
  const problems = [];
  const cards = parseBacklog(after);
  const mine = cards.filter((c) => c.id === id);
  if (mine.length !== 1) return [`${id} が ${mine.length} 枚見つかった（1 枚のはず）`];
  const card = mine[0];
  if (card.tier !== TIER[tierEmoji]) problems.push(`${id} の重要度が ${card.tier}（${TIER[tierEmoji]} のはず）`);
  if (cards.length !== parseBacklog(before).length + 1) problems.push('差し込みでカードの数が 1 枚以外に変わった（境界を壊している）');
  if (findOrphanHeadings(after).length !== findOrphanHeadings(before).length) problems.push('差し込みで見出しの外のカードが増えた');
  if (!card.kind) problems.push('[種類:] が無い');
  for (const v of validateCards([card], [], { rawHeadingCount: 1, ...opts })) problems.push(`[${v.rule}] ${v.msg}`);
  return problems;
}

function parseArgs(argv) {
  const o = { trailers: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--commit') o.commit = true;
    else if (a === '--trailer') o.trailers.push(argv[++i]);
    else if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
  }
  return o;
}

function usage(msg) {
  console.error(`[todo-add] ${msg}`);
  console.error('使い方: npm run todo:add -- --title "…" --tier 高|中|低|判断待ち --kind 不具合|改善|意思決定|制作 --domain <領域> (--body "…" | --body-file <path>) [--category <カテゴリ>] [--when YYYY-MM] [--due YYYY-MM-DD] [--verify <npm script>] [--trailer "…"] [--commit]');
  process.exit(2);
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  const tierEmoji = resolveTier(a.tier);
  if (!a.title) usage('--title が要る');
  if (!tierEmoji) usage(`--tier は 高 / 中 / 低 / 判断待ち（指定: ${a.tier ?? 'なし'}）`);
  if (!KINDS.includes(a.kind)) usage(`--kind は ${KINDS.join(' / ')}（指定: ${a.kind ?? 'なし'}）`);
  if (a.kind === '定期') usage('定期の作業は backlog に置かない（todo-standards.md §1-2）');
  for (const w of filingWarnings({ kind: a.kind, tierEmoji })) console.error(`[todo-add] 注意: ${w}`);
  const body = a['body-file'] ? readFileSync(a['body-file'], 'utf8') : a.body;
  if (!body || !body.trim()) usage('--body か --body-file で本文（起点・やること・完了条件）を書く');
  const today = todayJst();
  // 🔴・🟡 は [時期:] が必須。指定が無ければ期日の月、それも無ければ今月にする
  const when = a.when ?? (['🔴', '🟡'].includes(tierEmoji) ? (a.due ? a.due.slice(0, 7) : today.slice(0, 7)) : undefined);

  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const baseline = existsSync(join(ROOT, BASELINE)) ? JSON.parse(readFileSync(join(ROOT, BASELINE), 'utf8')) : { categories: {} };
  const opts = {
    npmScripts: new Set(Object.keys(pkg.scripts ?? {})),
    allowedCategories: new Set([...CANONICAL_CATEGORIES, ...Object.keys(baseline.categories ?? {})]),
    domainLabels: new Set(loadDomains(ROOT).domains.map((d) => d.label)),
  };

  const assemble = (current) => {
    const r = nextId(current, backlogGitLog({ cwd: ROOT }));
    if (r.degraded) throw new Error('git の履歴を読めず採番できない（削除済みの番号と衝突しうるので止める）');
    const cardLines = buildCard({ id: r.next, title: a.title.trim(), kind: a.kind, domain: a.domain, category: a.category, when, due: a.due, verify: a.verify, today, body });
    const text = insertCard(current, tierEmoji, cardLines);
    const problems = validateNewCard(current, text, r.next, tierEmoji, opts);
    if (problems.length) throw new Error(`カードが検査に通らない:\n  - ${problems.join('\n  - ')}`);
    const message = [`todo: ${r.next} を起票する（${a.title.trim()}）`, ...(a.trailers.length ? ['', ...a.trailers] : [])].join('\n') + '\n';
    return { text, message, result: { id: r.next, cardLines } };
  };

  try {
    const out = commitFileToRemoteBranch({ root: ROOT, path: BACKLOG, transform: assemble, push: Boolean(a.commit) });
    const { id, cardLines } = out.result;
    console.log(cardLines.join('\n'));
    console.log('');
    if (a.commit) console.log(`[todo-add] origin/develop へ push した（${out.commit.slice(0, 9)}）。手元の checkout へは git pull で取り込む`);
    else console.log('[todo-add] dry-run（--commit で origin/develop へ積む。番号は積む時点で取り直す）');
    console.log(id);
  } catch (error) {
    console.error(`[todo-add] ${error.message}`);
    process.exit(1);
  }
}

const isMain = process.argv[1] && process.argv[1].endsWith('todo-add.mjs');
if (isMain) main();
