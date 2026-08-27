#!/usr/bin/env node
// メンバーシップ（土木セコカン合格ラボ）の会員配信ドリップが、配信表どおりに
// 実行されているかを検査する。
//
// なぜ要るか（2026-08-27 の見落とし）:
//   学科記述予想 02_コンクリート工 は配信表で 2026-08-25 予定だったが draft のまま
//   2 日過ぎており、誰も気づいていなかった。backlog カードの見出しは「次回 8/28 金:
//   学科記述 02」と書いてあり、**カード側の日付が正典の配信表とずれていた**ため、
//   カードを読んでも遅れに気づけない状態だった。
//   会費を払っている会員への配信が止まるのは、リンク切れと同格の不具合として扱う。
//
// 真実源: content/note/1級・2級土木/メンバーシップ/README.md の「公開予定日 | 記事」表。
//   日付はカード・handoff・memory に複製しない（複製すると必ずずれる）。
//
// 何を見るか:
//   A. 配信漏れ    — 予定日を GRACE_DAYS 以上過ぎているのに noteStatus が published でない
//   B. 実体欠落    — 予定日が来ているのに記事ディレクトリ / article*.md が無い
//   C. ID 欠落     — published なのに noteId が無い（公開したつもりで実体が無い偽成功）
//   D. 早出し      — notePublishedAt が予定日より前（ドリップが崩れる）＝ WARN
//   E. 未制作      — 予定日がまだ先で実体が無い＝計画どおり（WARN・落とさない）
//
// 「対象 0 件」と「表を読めなかった」を区別して報告する（検査ゼロを PASS と呼ばない）。
//
// 使い方:
//   node scripts/check-membership-drip.mjs            # 検査（CI 用・違反があれば exit 1）
//   node scripts/check-membership-drip.mjs --json     # 機械可読
//   SKIP_MEMBERSHIP_DRIP=1 で緊急回避（配信できない事情が続くときだけ）
//
// 射程外（黙って通さないため明示する）:
//   経験記述 W1〜W11 の表には公開予定日の列が無く、日程は README の散文にしかないため
//   この検査では扱えない。表へ日付列を足せば同じ仕組みで見られる。

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { todayJst } from './lib/jst-date.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SSOT_REL = 'content/note/1級・2級土木/メンバーシップ/README.md';
const MEMBERSHIP_REL = 'content/note/1級・2級土木/メンバーシップ';

// 予定日を何日過ぎたら「配信漏れ」とみなすか。当日中の公開を許すため 1 日の猶予を置く。
export const GRACE_DAYS = 1;

// 配信表のラベルとディレクトリ名は一致しない（例: ラベル「添削練習01」→ dir
// 添削事例アーカイブ/事例01_*）。この対応表がずれると行が解決できなくなるので、
// 命名を変えたらここも直す。
export const SERIES = [
  { re: /^学科\s*(\d+)/, dir: '学科記述予想', prefix: '' },
  { re: /^添削練習\s*(\d+)/, dir: '添削事例アーカイブ', prefix: '事例' },
];

/** README の「| 公開予定日 | 記事 |」表を行の配列にする。 */
export function parseSchedule(text) {
  const rows = [];
  let inTable = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\|\s*公開予定日\s*\|/.test(line)) { inTable = true; continue; }
    if (!inTable) continue;
    if (!line.startsWith('|')) { inTable = false; continue; }
    if (/^\|\s*-+/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim()).filter((c, i, a) => !(i === 0 || i === a.length - 1));
    if (cells.length < 2) continue;
    const m = cells[0].match(/(\d{4}-\d{2}-\d{2})/);
    if (!m) continue;
    rows.push({ date: m[1], label: cells[1] });
  }
  return rows;
}

/** JST 日付文字列どうしの日数差（b - a）。 */
export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

/**
 * 1 行分の判定。副作用なし。
 * @param {{date:string,label:string}} row
 * @param {{today:string, graceDays?:number, resolved:boolean, resolveReason?:string,
 *          status?:string|null, noteId?:string|null, publishedAt?:string|null, rel?:string}} ctx
 * @returns {{level:'fail'|'warn'|'ok', kind:string, detail:string}}
 */
export function classifyRow(row, ctx) {
  const grace = ctx.graceDays ?? GRACE_DAYS;
  const late = daysBetween(row.date, ctx.today);

  if (!ctx.resolved) {
    return late >= 0
      ? { level: 'fail', kind: 'unresolved', detail: ctx.resolveReason ?? '記事の実体が無い' }
      : { level: 'warn', kind: 'not-built-yet', detail: ctx.resolveReason ?? '記事の実体が無い（予定日は未来）' };
  }

  const rel = ctx.rel ?? row.label;

  if (ctx.status === 'published') {
    if (!ctx.noteId) return { level: 'fail', kind: 'published-no-id', detail: `${rel}: published なのに noteId が無い` };
    if (ctx.publishedAt && daysBetween(ctx.publishedAt, row.date) > 0) {
      return { level: 'warn', kind: 'early', detail: `${rel}: 予定 ${row.date} に対し ${ctx.publishedAt} に公開（早出し）` };
    }
    return { level: 'ok', kind: 'published', detail: rel };
  }

  if (late >= grace) {
    return { level: 'fail', kind: 'overdue', detail: `${rel}: 予定 ${row.date} を ${late} 日超過（noteStatus=${ctx.status ?? '不明'}）` };
  }
  return { level: 'ok', kind: 'pending', detail: rel };
}

/** frontmatter のトップレベル 1 行を読む（クォートは剥がす）。 */
export function readField(text, key) {
  const m = text.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'));
  return m ? m[1].replace(/^["']|["']$/g, '') : null;
}

/** 配信表のラベルから記事 article*.md を解決する。 */
export function resolveArticle(label, root = ROOT) {
  for (const s of SERIES) {
    const m = label.match(s.re);
    if (!m) continue;
    const want = `${s.prefix}${m[1].padStart(2, '0')}_`;
    const base = join(root, MEMBERSHIP_REL, s.dir);
    if (!existsSync(base)) return { ok: false, reason: `シリーズ dir が無い: ${s.dir}/` };
    const hit = readdirSync(base, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith(want))
      .map((e) => join(base, e.name));
    if (hit.length === 0) return { ok: false, reason: `記事 dir が無い: ${s.dir}/${want}*` };
    if (hit.length > 1) return { ok: false, reason: `記事 dir が ${hit.length} 件に一致（一意でない）: ${s.dir}/${want}*` };
    const art = readdirSync(hit[0]).find((f) => /^article(-[^/\\]+)?\.md$/.test(f));
    if (!art) return { ok: false, reason: `article*.md が無い: ${hit[0].slice(root.length + 1)}` };
    return { ok: true, path: join(hit[0], art) };
  }
  return { ok: false, reason: 'シリーズを判別できない（学科NN / 添削練習NN 以外）' };
}

function main() {
  const NAME = 'check-membership-drip';
  const asJson = process.argv.includes('--json');

  if (process.env.SKIP_MEMBERSHIP_DRIP === '1') {
    console.log(`[${NAME}] SKIP_MEMBERSHIP_DRIP=1 のため検査していません（0 件検査）。`);
    return 0;
  }

  const ssot = join(ROOT, SSOT_REL);
  if (!existsSync(ssot)) {
    console.error(`[${NAME}] [error] 配信表が読めない: ${SSOT_REL}`);
    console.error('  検査不成立（「違反 0 件」ではない）。');
    return 2;
  }

  const rows = parseSchedule(readFileSync(ssot, 'utf-8'));
  if (rows.length === 0) {
    console.error(`[${NAME}] [error] 配信表から 1 行も読めなかった（表の見出しが「公開予定日 | 記事」から変わった可能性）。`);
    console.error('  検査不成立（「違反 0 件」ではない）。');
    return 2;
  }

  const today = todayJst();
  const fails = [];
  const warns = [];
  let inspected = 0;
  let published = 0;
  let pending = 0;

  for (const row of rows) {
    const r = resolveArticle(row.label);
    let ctx = { today, resolved: r.ok, resolveReason: r.reason };
    if (r.ok) {
      inspected += 1;
      const text = readFileSync(r.path, 'utf-8');
      ctx = {
        ...ctx,
        rel: r.path.slice(ROOT.length + 1),
        status: readField(text, 'noteStatus'),
        noteId: readField(text, 'noteId'),
        publishedAt: readField(text, 'notePublishedAt'),
      };
      if (ctx.status === 'published') published += 1; else pending += 1;
    }
    const v = classifyRow(row, ctx);
    if (v.level === 'fail') fails.push({ ...v, row });
    else if (v.level === 'warn') warns.push({ ...v, row });
  }

  if (asJson) {
    console.log(JSON.stringify({ today, graceDays: GRACE_DAYS, rows: rows.length, inspected, published, pending, fails, warns }, null, 2));
  } else {
    console.log(`[${NAME}] 配信表 ${rows.length} 行 / 実検査 ${inspected} 件（公開済み ${published} / 未公開 ${pending}）・基準日 ${today}（JST）`);
    console.log(`[${NAME}]   射程外: 経験記述 W1〜W11 は表に公開予定日の列が無いため未検査`);
    for (const w of warns) console.log(`  [WARN] ${w.kind} ${w.row.label}（予定 ${w.row.date}） — ${w.detail}`);
    for (const f of fails) console.log(`  [FAIL] ${f.kind} ${f.row.label}（予定 ${f.row.date}） — ${f.detail}`);
    if (fails.length === 0) {
      console.log(`[${NAME}] ✓ 予定日を過ぎた未配信は無し（WARN ${warns.length} 件）`);
    } else {
      console.log(`[${NAME}] ✗ 配信の不整合 ${fails.length} 件`);
      console.log('  配信は node scripts/note-publish.mjs --article <article.md> --commit（会員限定は公開範囲を選べなければ自動中断）。');
      console.log('  cover.png が無くて止まる場合は先に node scripts/generate-note-covers.mjs <dir名>。');
    }
  }

  return fails.length > 0 ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
